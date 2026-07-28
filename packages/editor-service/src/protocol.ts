import type {
  ArchitectureViolation,
  DependencyEdge,
  EntryPointEvidence,
  ParseDiagnostic,
} from "@cascade/plugin-api";

export const EDITOR_PROTOCOL_VERSION = "1.0";

export type EditorRequestMethod =
  | "initialize"
  | "workspace/add"
  | "workspace/remove"
  | "workspace/refresh"
  | "workspace/updateFile"
  | "query/dependencies"
  | "query/dependents"
  | "query/impact"
  | "query/diagnostics"
  | "query/entryPoint"
  | "query/affectedTests"
  | "query/explanationPath"
  | "health"
  | "cancel"
  | "shutdown";

export interface EditorRequest {
  id: string;
  method: EditorRequestMethod;
  params?: Record<string, unknown>;
}

export interface EditorResponse {
  id: string;
  result?: unknown;
  error?: { code: string; message: string; retryable: boolean };
}

export interface WorkspaceDescriptor {
  id: string;
  root: string;
  name?: string;
}

export interface ServiceLimits {
  maxFiles: number;
  maxEdges: number;
  maxTraversalDepth: number;
  debounceMs: number;
  cacheEntries: number;
}

export interface QueryOptions {
  transitive?: boolean;
  maxDepth?: number;
}

export interface FileUpdate {
  workspaceId: string;
  file: string;
  version?: number;
  kind: "created" | "changed" | "deleted";
  saved: boolean;
}

export interface DependencyLookup {
  file: string;
  direction: "dependencies" | "dependents";
  direct: string[];
  transitive: string[];
  edges: DependencyEdge[];
  truncated: boolean;
}

export interface ImpactLookup {
  file: string;
  directDependents: string[];
  transitiveDependents: string[];
  projects: string[];
  entryPoints: string[];
  confidence: "high" | "medium" | "low";
  evidence: string[];
}

export interface EditorDiagnostic {
  kind: "cycle" | "architecture" | "unresolved" | "parse";
  file: string;
  severity: "error" | "warning" | "info";
  message: string;
  code: string;
  path?: string[];
  location?: ParseDiagnostic["location"];
  violation?: ArchitectureViolation;
  edge?: DependencyEdge;
}

export interface AffectedTest {
  file: string;
  confidence: "high" | "medium" | "low";
  evidence: string[];
  dependencyPath?: string[];
}

export interface EntryPointLookup {
  file: string;
  isEntryPoint: boolean;
  evidence?: EntryPointEvidence;
}

export interface ExplanationPath {
  from: string;
  to: string;
  direction: "dependency" | "dependent";
  nodes: string[];
  edges: DependencyEdge[];
  found: boolean;
  truncated: boolean;
}

export interface WorkspaceHealth {
  id: string;
  root: string;
  status: "idle" | "analyzing" | "ready" | "stale" | "error" | "limited";
  generation: number;
  files: number;
  edges: number;
  lastAnalysisMs?: number;
  lastUpdatedAt?: string;
  message?: string;
}
