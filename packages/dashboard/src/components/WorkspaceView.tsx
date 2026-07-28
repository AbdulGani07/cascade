import { useMemo, useState } from "react";
import type { AnalysisResult } from "../lib/api";
import type { ViewId } from "../lib/views";
import type { WorkspaceFilters } from "../lib/filters";

const confidenceRank: Record<string, number> = { high: 3, medium: 2, low: 1 };
const Panel = ({
  title,
  detail,
  children,
}: {
  title: string;
  detail: string;
  children: React.ReactNode;
}) => (
  <section
    className="h-full overflow-auto bg-slate-950 p-4 text-slate-100 sm:p-6"
    aria-labelledby="workspace-view-title"
  >
    <h2 id="workspace-view-title" className="text-xl font-bold">
      {title}
    </h2>
    <p className="mt-1 text-sm text-slate-400">{detail}</p>
    <div className="mt-5">{children}</div>
  </section>
);
const Empty = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">
    {children}
  </div>
);
const Rows = ({
  rows,
  onSelect,
}: {
  rows: Array<{ id: string; meta: string; detail?: string; severity?: string }>;
  onSelect: (id: string) => void;
}) =>
  rows.length ? (
    <div className="overflow-hidden rounded-xl border border-slate-800">
      <div className="max-h-[65vh] overflow-auto">
        {rows.slice(0, 2000).map((row) => (
          <button
            key={`${row.id}:${row.meta}`}
            type="button"
            onClick={() => onSelect(row.id)}
            className="grid w-full gap-1 border-b border-slate-800 p-3 text-left hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-cyan-400 sm:grid-cols-[minmax(0,1fr)_auto]"
          >
            <span className="truncate font-mono text-xs text-slate-200">{row.id}</span>
            <span className="text-xs text-slate-400">
              {row.severity ? `${row.severity} · ` : ""}
              {row.meta}
            </span>
            {row.detail && (
              <span className="text-xs text-slate-500 sm:col-span-2">{row.detail}</span>
            )}
          </button>
        ))}
      </div>
      {rows.length > 2000 && (
        <p className="p-3 text-xs text-amber-300">
          Showing 2,000 of {rows.length.toLocaleString()} rows. Narrow the filters to continue.
        </p>
      )}
    </div>
  ) : (
    <Empty>No findings are available in this analysis snapshot.</Empty>
  );

export default function WorkspaceView({
  view,
  data,
  onSelect,
  filters,
}: {
  view: Exclude<ViewId, "overview" | "graph" | "projects" | "matrix" | "cycles" | "deadcode">;
  data: AnalysisResult;
  onSelect: (id: string) => void;
  filters: WorkspaceFilters;
}) {
  const [query, setQuery] = useState("");
  const rows = useMemo<
    Array<{ id: string; meta: string; detail?: string; severity?: string }>
  >(() => {
    if (view === "packages")
      return (data.projectGraph?.nodes ?? [])
        .filter(
          (node) =>
            node.role === "package" || node.projectType === "package" || node.role === "library"
        )
        .map((node) => ({
          id: node.id,
          meta: `${node.files?.length ?? 0} files`,
          detail: `${node.languages.join(", ")} · ${node.buildSystem ?? "metadata"}`,
        }));
    if (view === "services")
      return (data.projectGraph?.nodes ?? [])
        .filter(
          (node) =>
            node.role === "service" || node.role === "application" || node.projectType === "service"
        )
        .map((node) => ({
          id: node.id,
          meta: node.role ?? node.projectType,
          detail: `${node.languages.join(", ")} · ${node.buildSystem ?? "metadata"}`,
        }));
    if (view === "impact")
      return (data.gitImpact?.affected ?? []).map((item) => ({
        id: item.id,
        meta: `${item.category} · ${item.confidence}`,
        detail: item.evidence?.map((e) => e.detail).join("; "),
      }));
    if (view === "tests")
      return (data.gitImpact?.affectedTests ?? [])
        .sort((a, b) => (confidenceRank[b.confidence] ?? 0) - (confidenceRank[a.confidence] ?? 0))
        .map((item) => ({
          id: item.id,
          meta: item.confidence,
          detail: item.evidence?.map((e) => e.detail).join("; "),
        }));
    if (view === "violations")
      return (data.governance?.violations ?? []).map((item) => ({
        id: item.from,
        meta: `${item.ruleId} → ${item.to}`,
        detail: `${item.message}; ${item.evidence.join("; ")}`,
        severity: item.severity,
      }));
    if (view === "unresolved")
      return data.edges
        .filter((edge) => edge.resolutionStatus === "unresolved")
        .map((edge) => ({
          id: edge.from,
          meta: edge.to,
          detail: edge.evidence?.join("; ") ?? "No resolver evidence supplied",
        }));
    if (view === "languages")
      return [...new Set(data.nodes.map((node) => node.language))].sort().map((language) => ({
        id: language,
        meta: `${data.nodes.filter((node) => node.language === language).length} files`,
        detail: data.pluginManifests
          ?.find((plugin) => plugin.id.endsWith(language))
          ?.analysisLevels.join(", "),
      }));
    if (view === "hotspots")
      return data.nodes
        .map((node) => {
          const incoming = data.edges.filter((edge) => edge.to === node.id).length;
          const outgoing = data.edges.filter((edge) => edge.from === node.id).length;
          return {
            id: node.id,
            meta: `${incoming + outgoing} coupling`,
            detail: `${incoming} dependents · ${outgoing} dependencies · ${data.impact[node.id]?.allAffected.length ?? 0} blast radius`,
          };
        })
        .sort((a, b) => Number.parseInt(b.meta) - Number.parseInt(a.meta));
    return [];
  }, [data, view]);
  const filtered = rows.filter(
    (row) =>
      `${row.id} ${row.meta} ${row.detail ?? ""}`
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()) &&
      (filters.severity === "all" || row.severity === filters.severity) &&
      (filters.confidence === "all" || row.meta.includes(filters.confidence))
  );
  if (view === "pull-request") {
    const report = data.gitImpact;
    return (
      <Panel
        title="Pull-request impact"
        detail="Evidence-backed change summary; risk is an indicator, not a prediction."
      >
        {report ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <span className="text-sm text-slate-400">Risk</span>
              <strong className="block text-4xl text-amber-300">{report.risk.score}/100</strong>
              <p className="mt-2 text-xs text-slate-400">{report.risk.disclaimer}</p>
              <h3 className="mt-4 text-sm font-semibold">Factor contributions</h3>
              {report.risk.contributions?.length ? (
                <ul className="mt-2 space-y-2">
                  {report.risk.contributions.map((factor) => (
                    <li key={factor.factor} className="flex justify-between gap-4 text-xs">
                      <span>{factor.factor}</span>
                      <strong>{factor.contribution.toFixed(1)}</strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-slate-500">No factor breakdown supplied.</p>
              )}
            </div>
            <Rows
              rows={report.changedFiles.map((file) => ({
                id: file.path,
                meta: file.kind,
                detail: file.changedLines?.map((line) => `${line.start}-${line.end}`).join(", "),
              }))}
              onSelect={onSelect}
            />
          </div>
        ) : (
          <Empty>No Git comparison is attached to this snapshot.</Empty>
        )}
      </Panel>
    );
  }
  if (view === "timeline")
    return (
      <Panel
        title="Snapshot comparison"
        detail="Current snapshot metadata and Git comparison boundaries."
      >
        <dl className="grid gap-3 rounded-xl border border-slate-800 bg-slate-900 p-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-400">Generated</dt>
            <dd>{data.generatedAt}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Schema</dt>
            <dd>{data.version}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Base</dt>
            <dd>{data.gitImpact?.base ?? "Not supplied"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Head</dt>
            <dd>{data.gitImpact?.head ?? "Not supplied"}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-slate-400">
          Load an analysis containing Git impact data to compare introduced and removed cycles.
          Introduced: {data.gitImpact?.introducedCycles.length ?? 0}; removed:{" "}
          {data.gitImpact?.removedCycles?.length ?? 0}.
        </p>
      </Panel>
    );
  const labels: Record<string, [string, string]> = {
    packages: ["Package graph", "Packages and libraries grouped from the project graph."],
    services: ["Service graph", "Applications and services with deployment/runtime roles."],
    impact: ["Change-impact explorer", "Affected items ranked by static evidence and confidence."],
    tests: ["Affected tests", "Candidate tests; this does not prove test sufficiency."],
    violations: ["Architecture violations", "Rules, severities, dependency paths, and evidence."],
    unresolved: ["Unresolved dependencies", "Imports and references that could not be resolved."],
    languages: ["Languages and frameworks", "Language coverage and plugin analysis levels."],
    hotspots: ["Hotspots and coupling", "High-connectivity modules and estimated blast radius."],
  };
  const [title, detail] = labels[view];
  return (
    <Panel title={title} detail={detail}>
      <label className="sr-only" htmlFor="workspace-filter">
        Filter findings
      </label>
      <input
        id="workspace-filter"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Filter this view…"
        className="mb-3 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
      />
      <Rows rows={filtered} onSelect={onSelect} />
    </Panel>
  );
}
