import type { AnalysisResult } from "../lib/api";
import type { WorkspaceFilters } from "../lib/filters";

export default function FilterBar({
  data,
  filters,
  onChange,
  onReset,
}: {
  data: AnalysisResult;
  filters: WorkspaceFilters;
  onChange: (key: keyof WorkspaceFilters, value: string) => void;
  onReset: () => void;
}) {
  const values = (items: Array<string | undefined>) =>
    [...new Set(items.filter((item): item is string => Boolean(item)))].sort();
  const controls: Array<[keyof WorkspaceFilters, string, string[]]> = [
    ["language", "Language", values(data.nodes.map((node) => node.language))],
    ["project", "Project", values(data.nodes.map((node) => node.project))],
    ["packageName", "Package", values(data.nodes.map((node) => node.packageOrWorkspace))],
    ["fileType", "File type", values(data.nodes.map((node) => node.id.split(".").pop()))],
    [
      "dependencyType",
      "Dependency",
      values(data.edges.map((edge) => edge.dependencyCategory ?? edge.kind)),
    ],
    ["status", "Status", ["entry", "cycle", "dead", "unresolved"]],
    ["confidence", "Confidence", ["high", "medium", "low"]],
    ["severity", "Severity", ["error", "warning", "info"]],
  ];
  return (
    <div
      className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-slate-800 bg-slate-950 px-3 py-2"
      aria-label="Workspace filters"
    >
      {controls.map(([key, label, options]) => (
        <label key={key} className="flex shrink-0 items-center gap-1 text-[10px] text-slate-500">
          <span>{label}</span>
          <select
            value={filters[key]}
            onChange={(event) => onChange(key, event.target.value)}
            className="max-w-32 rounded border border-slate-700 bg-slate-900 px-1.5 py-1 text-xs text-slate-200"
          >
            <option value="all">All</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      ))}
      <button
        type="button"
        onClick={onReset}
        className="shrink-0 rounded border border-slate-700 px-2 py-1 text-xs text-slate-300"
      >
        Reset
      </button>
    </div>
  );
}
