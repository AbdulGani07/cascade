import path from "node:path";
import fs from "node:fs";
import { analyze } from "@cascade-code/core";
import type { AnalysisResult, DependencyEdge } from "@cascade-code/plugin-api";
import type {
  AffectedTest,
  DependencyLookup,
  EditorDiagnostic,
  EntryPointLookup,
  ExplanationPath,
  FileUpdate,
  ImpactLookup,
  QueryOptions,
  ServiceLimits,
  WorkspaceDescriptor,
  WorkspaceHealth,
} from "./protocol.js";

export interface CancellationToken {
  readonly isCancellationRequested: boolean;
  throwIfCancellationRequested(): void;
}

export class CancellationTokenSource {
  private cancelled = false;
  readonly token: CancellationToken;
  constructor() {
    const owner = this;
    this.token = {
      get isCancellationRequested() {
        return owner.cancelled;
      },
      throwIfCancellationRequested() {
        if (owner.cancelled) throw new ServiceError("CANCELLED", "Operation cancelled.", true);
      },
    };
  }
  cancel(): void {
    this.cancelled = true;
  }
}

export class ServiceError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retryable = false
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export type Analyzer = (
  root: string,
  token?: CancellationToken
) => AnalysisResult | Promise<AnalysisResult>;
interface WorkspaceState {
  descriptor: WorkspaceDescriptor;
  result?: AnalysisResult;
  health: WorkspaceHealth;
  dirtyFiles: Set<string>;
  versions: Map<string, number>;
  timer?: NodeJS.Timeout;
  refresh?: Promise<WorkspaceHealth>;
  queryCache: Map<string, unknown>;
}

export const DEFAULT_SERVICE_LIMITS: ServiceLimits = {
  maxFiles: 100_000,
  maxEdges: 300_000,
  maxTraversalDepth: 30,
  debounceMs: 500,
  cacheEntries: 500,
};

export class WorkspaceAnalysisService {
  private readonly workspaces = new Map<string, WorkspaceState>();
  readonly limits: ServiceLimits;

  constructor(
    limits?: Partial<ServiceLimits>,
    private readonly analyzer: Analyzer = (root) => analyze(root)
  ) {
    this.limits = { ...DEFAULT_SERVICE_LIMITS, ...limits };
    for (const [name, value] of Object.entries(this.limits))
      if (!Number.isFinite(value) || value < 0)
        throw new ServiceError("INVALID_LIMIT", `${name} must be a non-negative number.`);
  }

  addWorkspace(descriptor: WorkspaceDescriptor): WorkspaceHealth {
    if (!descriptor.id.trim() || !path.isAbsolute(descriptor.root))
      throw new ServiceError("INVALID_WORKSPACE", "Workspace requires an ID and absolute root.");
    let root: string;
    try {
      root = fs.realpathSync(descriptor.root);
      if (!fs.statSync(root).isDirectory()) throw new Error("not a directory");
    } catch {
      throw new ServiceError("INVALID_WORKSPACE", "Workspace root must be an existing directory.");
    }
    const existing = this.workspaces.get(descriptor.id);
    if (existing) return { ...existing.health };
    const state: WorkspaceState = {
      descriptor: { ...descriptor, root },
      dirtyFiles: new Set(),
      versions: new Map(),
      queryCache: new Map(),
      health: { id: descriptor.id, root, status: "idle", generation: 0, files: 0, edges: 0 },
    };
    this.workspaces.set(descriptor.id, state);
    return { ...state.health };
  }

  removeWorkspace(workspaceId: string): boolean {
    const state = this.workspaces.get(workspaceId);
    if (state?.timer) clearTimeout(state.timer);
    return this.workspaces.delete(workspaceId);
  }

  listHealth(): WorkspaceHealth[] {
    return [...this.workspaces.values()]
      .map((state) => ({ ...state.health }))
      .sort((left, right) => left.id.localeCompare(right.id));
  }

  async refresh(workspaceId: string, token?: CancellationToken): Promise<WorkspaceHealth> {
    const state = this.getState(workspaceId);
    if (state.refresh) return state.refresh;
    const task = this.performRefresh(state, token).finally(() => {
      state.refresh = undefined;
    });
    state.refresh = task;
    return task;
  }

  updateFile(update: FileUpdate): { scheduled: boolean; ignoredReason?: string } {
    const state = this.getState(update.workspaceId);
    if (!update.saved)
      return {
        scheduled: false,
        ignoredReason: "Unsaved content is never copied or analyzed; refresh occurs after save.",
      };
    const relative = this.normalizeFile(state, update.file);
    const previousVersion = state.versions.get(relative) ?? -1;
    if (update.version !== undefined && update.version <= previousVersion)
      return { scheduled: false, ignoredReason: "Stale document version." };
    if (update.version !== undefined) state.versions.set(relative, update.version);
    state.dirtyFiles.add(relative);
    state.queryCache.clear();
    state.health = { ...state.health, status: state.result ? "stale" : "idle" };
    if (state.timer) clearTimeout(state.timer);
    state.timer = setTimeout(() => {
      state.timer = undefined;
      void this.refresh(update.workspaceId).catch(() => undefined);
    }, this.limits.debounceMs);
    state.timer.unref?.();
    return { scheduled: true };
  }

  async flush(workspaceId: string, token?: CancellationToken): Promise<WorkspaceHealth> {
    const state = this.getState(workspaceId);
    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = undefined;
    }
    return this.refresh(workspaceId, token);
  }

  dependencies(workspaceId: string, file: string, options: QueryOptions = {}): DependencyLookup {
    return this.lookup(workspaceId, file, "dependencies", options);
  }

  dependents(workspaceId: string, file: string, options: QueryOptions = {}): DependencyLookup {
    return this.lookup(workspaceId, file, "dependents", options);
  }

  impact(workspaceId: string, file: string): ImpactLookup {
    const state = this.readyState(workspaceId);
    const id = this.normalizeFile(state, file);
    const report = state.result!.impact[id];
    const dependents = this.dependents(workspaceId, id, { transitive: true });
    const affected = new Set([id, ...dependents.transitive]);
    return {
      file: id,
      directDependents: report?.directlyAffected ?? dependents.direct,
      transitiveDependents: report?.allAffected ?? dependents.transitive,
      projects: [
        ...new Set(
          state
            .result!.nodes.filter((node) => affected.has(node.id) && node.project)
            .map((node) => node.project!)
        ),
      ].sort(),
      entryPoints: state.result!.entryPoints.filter((entry) => affected.has(entry)).sort(),
      confidence: dependents.edges.some((edge) => edge.confidence < 0.6)
        ? "low"
        : dependents.edges.some((edge) => edge.confidence < 0.9)
          ? "medium"
          : "high",
      evidence: [
        `${dependents.direct.length} direct dependent(s)`,
        `${dependents.transitive.length} total dependent(s)`,
        "Static dependency evidence does not guarantee runtime impact.",
      ],
    };
  }

  diagnostics(workspaceId: string, file?: string): EditorDiagnostic[] {
    const state = this.readyState(workspaceId);
    const target = file ? this.normalizeFile(state, file) : undefined;
    const result = state.result!;
    const diagnostics: EditorDiagnostic[] = [];
    for (const cycle of result.cycles) {
      if (!target || cycle.includes(target))
        for (const member of cycle)
          if (!target || member === target)
            diagnostics.push({
              kind: "cycle",
              file: member,
              severity: "warning",
              code: "CASCADE_CYCLE",
              message: `Circular dependency: ${cycle.join(" → ")}`,
              path: [...cycle, cycle[0]],
            });
    }
    for (const violation of result.governance?.violations ?? [])
      if (!violation.suppressed && (!target || violation.from === target))
        diagnostics.push({
          kind: "architecture",
          file: violation.from,
          severity: violation.severity,
          code: `CASCADE_ARCH_${violation.ruleId}`,
          message: violation.message,
          path: violation.dependencyPath,
          violation,
        });
    for (const edge of result.edges)
      if (
        edge.resolutionStatus === "unresolved" &&
        edge.dependencyCategory !== "external" &&
        (!target || edge.from === target)
      )
        diagnostics.push({
          kind: "unresolved",
          file: edge.from,
          severity: "warning",
          code: "CASCADE_UNRESOLVED",
          message: `Unresolved dependency '${edge.extractedText ?? edge.to}'.`,
          location: edge.sourceLocation,
          edge,
        });
    for (const diagnostic of result.diagnostics ?? [])
      if (!target || diagnostic.file === target)
        diagnostics.push({
          kind: "parse",
          file: diagnostic.file,
          severity: diagnostic.severity,
          code: diagnostic.code ?? "CASCADE_PARSE",
          message: diagnostic.message,
          location: diagnostic.location,
        });
    return diagnostics.sort((left, right) =>
      `${left.file}:${left.code}:${left.message}`.localeCompare(
        `${right.file}:${right.code}:${right.message}`
      )
    );
  }

  entryPoint(workspaceId: string, file: string): EntryPointLookup {
    const state = this.readyState(workspaceId);
    const id = this.normalizeFile(state, file);
    return {
      file: id,
      isEntryPoint: state.result!.entryPoints.includes(id),
      evidence: state.result!.entryPointEvidence?.find((entry) => entry.file === id),
    };
  }

  affectedTests(workspaceId: string, file: string): AffectedTest[] {
    const state = this.readyState(workspaceId);
    const id = this.normalizeFile(state, file);
    const lookup = this.dependents(workspaceId, id, { transitive: true });
    const affected = new Set(lookup.transitive);
    return state
      .result!.nodes.filter((node) => node.isTestFile && affected.has(node.id))
      .map((node) => {
        const pathResult = this.explanationPath(workspaceId, node.id, id, "dependency");
        const direct = lookup.direct.includes(node.id);
        return {
          file: node.id,
          confidence: direct ? ("high" as const) : ("medium" as const),
          evidence: [
            direct ? "Test directly imports the file." : "Test transitively depends on the file.",
            "Affected tests are candidates, not a guarantee of sufficient coverage.",
          ],
          dependencyPath: pathResult.nodes,
        };
      })
      .sort((left, right) => left.file.localeCompare(right.file));
  }

  explanationPath(
    workspaceId: string,
    fromFile: string,
    toFile: string,
    direction: "dependency" | "dependent" = "dependency",
    options: QueryOptions = {}
  ): ExplanationPath {
    const state = this.readyState(workspaceId);
    const from = this.normalizeFile(state, fromFile);
    const to = this.normalizeFile(state, toFile);
    const maxDepth = this.depth(options.maxDepth);
    const edges = state.result!.edges.filter((edge) => edge.resolutionStatus === "resolved");
    const adjacency = new Map<string, DependencyEdge[]>();
    for (const edge of edges) {
      const key = direction === "dependency" ? edge.from : edge.to;
      const values = adjacency.get(key) ?? [];
      values.push(edge);
      adjacency.set(key, values);
    }
    for (const values of adjacency.values())
      values.sort((left, right) => left.id.localeCompare(right.id));
    const queue: Array<{ node: string; nodes: string[]; edges: DependencyEdge[] }> = [
      { node: from, nodes: [from], edges: [] },
    ];
    const seen = new Set([from]);
    let truncated = false;
    while (queue.length) {
      const current = queue.shift()!;
      if (current.node === to)
        return {
          from,
          to,
          direction,
          nodes: current.nodes,
          edges: current.edges,
          found: true,
          truncated,
        };
      if (current.edges.length >= maxDepth) {
        truncated = true;
        continue;
      }
      const candidates = adjacency.get(current.node) ?? [];
      for (const edge of candidates) {
        const next = direction === "dependency" ? edge.to : edge.from;
        if (!seen.has(next)) {
          seen.add(next);
          queue.push({
            node: next,
            nodes: [...current.nodes, next],
            edges: [...current.edges, edge],
          });
        }
      }
    }
    return { from, to, direction, nodes: [], edges: [], found: false, truncated };
  }

  dispose(): void {
    for (const state of this.workspaces.values()) if (state.timer) clearTimeout(state.timer);
    this.workspaces.clear();
  }

  private async performRefresh(
    state: WorkspaceState,
    token?: CancellationToken
  ): Promise<WorkspaceHealth> {
    token?.throwIfCancellationRequested();
    state.health = { ...state.health, status: "analyzing", message: undefined };
    const started = performance.now();
    try {
      await new Promise<void>((resolve) => setImmediate(resolve));
      token?.throwIfCancellationRequested();
      const result = await this.analyzer(state.descriptor.root, token);
      token?.throwIfCancellationRequested();
      if (result.nodes.length > this.limits.maxFiles || result.edges.length > this.limits.maxEdges)
        throw new ServiceError(
          "RESOURCE_LIMIT",
          `Analysis produced ${result.nodes.length} files and ${result.edges.length} edges; configured limits are ${this.limits.maxFiles} and ${this.limits.maxEdges}.`,
          true
        );
      state.result = result;
      state.dirtyFiles.clear();
      state.queryCache.clear();
      state.health = {
        ...state.health,
        status: "ready",
        generation: state.health.generation + 1,
        files: result.nodes.length,
        edges: result.edges.length,
        lastAnalysisMs: Number((performance.now() - started).toFixed(2)),
        lastUpdatedAt: new Date().toISOString(),
      };
    } catch (error) {
      const serviceError = error as ServiceError;
      state.health = {
        ...state.health,
        status: serviceError.code === "RESOURCE_LIMIT" ? "limited" : "error",
        lastAnalysisMs: Number((performance.now() - started).toFixed(2)),
        message: (error as Error).message,
      };
      throw error;
    }
    return { ...state.health };
  }

  private lookup(
    workspaceId: string,
    file: string,
    direction: DependencyLookup["direction"],
    options: QueryOptions
  ): DependencyLookup {
    const state = this.readyState(workspaceId);
    const id = this.normalizeFile(state, file);
    const maxDepth = options.transitive === false ? 1 : this.depth(options.maxDepth);
    const key = `${direction}:${id}:${maxDepth}`;
    const cached = state.queryCache.get(key) as DependencyLookup | undefined;
    if (cached) return cached;
    const edges = state.result!.edges.filter((edge) => edge.resolutionStatus === "resolved");
    const adjacency = new Map<string, DependencyEdge[]>();
    for (const edge of edges) {
      const source = direction === "dependencies" ? edge.from : edge.to;
      const values = adjacency.get(source) ?? [];
      values.push(edge);
      adjacency.set(source, values);
    }
    for (const values of adjacency.values())
      values.sort((left, right) => left.id.localeCompare(right.id));
    const directEdges = adjacency.get(id) ?? [];
    const direct = [
      ...new Set(directEdges.map((edge) => (direction === "dependencies" ? edge.to : edge.from))),
    ].sort();
    const seen = new Set([id]);
    const queue = direct.map((node) => ({ node, depth: 1 }));
    const traversedEdges = new Map(directEdges.map((edge) => [edge.id, edge]));
    let truncated = false;
    for (const item of queue) {
      if (seen.has(item.node)) continue;
      seen.add(item.node);
      if (item.depth >= maxDepth) {
        if (adjacency.has(item.node)) truncated = true;
        continue;
      }
      for (const edge of adjacency.get(item.node) ?? []) {
        traversedEdges.set(edge.id, edge);
        const next = direction === "dependencies" ? edge.to : edge.from;
        if (!seen.has(next)) queue.push({ node: next, depth: item.depth + 1 });
      }
    }
    seen.delete(id);
    const result: DependencyLookup = {
      file: id,
      direction,
      direct,
      transitive: [...seen].sort(),
      edges: [...traversedEdges.values()].sort((left, right) => left.id.localeCompare(right.id)),
      truncated,
    };
    this.cache(state, key, result);
    return result;
  }

  private readyState(workspaceId: string): WorkspaceState {
    const state = this.getState(workspaceId);
    if (!state.result)
      throw new ServiceError(
        "NOT_ANALYZED",
        `Workspace '${workspaceId}' has not been analyzed.`,
        true
      );
    return state;
  }

  private getState(workspaceId: string): WorkspaceState {
    const state = this.workspaces.get(workspaceId);
    if (!state)
      throw new ServiceError("WORKSPACE_NOT_FOUND", `Unknown workspace '${workspaceId}'.`);
    return state;
  }

  private normalizeFile(state: WorkspaceState, file: string): string {
    let absolute = path.isAbsolute(file)
      ? path.resolve(file)
      : path.resolve(state.descriptor.root, file);
    try {
      absolute = fs.realpathSync(absolute);
    } catch {
      // Queries may refer to unresolved or deleted files; retain the lexical check below.
    }
    const relative = path.relative(state.descriptor.root, absolute).replace(/\\/g, "/");
    if (relative === ".." || relative.startsWith("../") || path.isAbsolute(relative))
      throw new ServiceError("FILE_OUTSIDE_WORKSPACE", `'${file}' is outside the workspace.`);
    return relative;
  }

  private depth(value?: number): number {
    return Math.max(
      1,
      Math.min(value ?? this.limits.maxTraversalDepth, this.limits.maxTraversalDepth)
    );
  }

  private cache(state: WorkspaceState, key: string, value: unknown): void {
    state.queryCache.set(key, value);
    while (state.queryCache.size > this.limits.cacheEntries)
      state.queryCache.delete(state.queryCache.keys().next().value!);
  }
}
