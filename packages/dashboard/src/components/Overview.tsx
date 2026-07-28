import type { AnalysisResult } from "../lib/api";

export default function Overview({
  data,
  onOpen,
}: {
  data: AnalysisResult;
  onOpen: (view: "projects" | "graph" | "cycles" | "deadcode") => void;
}) {
  const languages = [...new Set(data.nodes.map((node) => node.language))].sort();
  const unresolved = data.edges.filter((edge) => edge.resolutionStatus === "unresolved").length;
  const cards = [
    ["Projects", data.projectGraph?.nodes.length ?? data.projects?.length ?? 0, "projects"],
    ["Files", data.nodes.length, "graph"],
    ["Cycles", data.cycles.length, "cycles"],
    ["Unreachable", data.deadFiles.length, "deadcode"],
  ] as const;
  return (
    <section
      className="h-full overflow-auto bg-slate-950 p-6 text-slate-100"
      aria-label="Repository overview"
    >
      <h2 className="text-xl font-bold">Repository overview</h2>
      <p className="mt-1 text-sm text-slate-400">
        Start with grouped findings, then drill into a graph only when useful.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, view]) => (
          <button
            key={label}
            type="button"
            onClick={() => onOpen(view)}
            className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-left hover:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            <span className="block text-xs text-slate-400">{label}</span>
            <strong className="mt-2 block text-3xl font-mono text-cyan-300">
              {value.toLocaleString()}
            </strong>
          </button>
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h3 className="font-semibold">Language and framework coverage</h3>
          <p className="mt-2 text-sm text-slate-400">
            {languages.join(", ") || "No source languages detected"}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {data.pluginManifests?.length ?? 0} language plugins reported.
          </p>
        </section>
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <h3 className="font-semibold">Actionable findings</h3>
          <dl className="mt-2 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt>Unresolved dependencies</dt>
              <dd>{unresolved}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Entry points</dt>
              <dd>{data.entryPoints.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Changed files</dt>
              <dd>{data.gitImpact?.changedFiles.length ?? 0}</dd>
            </div>
          </dl>
        </section>
      </div>
    </section>
  );
}
