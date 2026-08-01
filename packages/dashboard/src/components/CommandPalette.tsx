import { useEffect, useMemo, useRef, useState } from "react";
import type { AnalysisResult } from "../lib/api";
import { viewDefinitions, type ViewId } from "../lib/views";

export default function CommandPalette({
  data,
  open,
  onClose,
  onView,
  onNode,
}: {
  data: AnalysisResult;
  open: boolean;
  onClose: () => void;
  onView: (view: ViewId) => void;
  onNode: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) {
      setQuery("");
      requestAnimationFrame(() => input.current?.focus());
    }
  }, [open]);
  const results = useMemo(() => {
    const needle = query.toLocaleLowerCase();
    const views = viewDefinitions
      .filter(([, label, detail]) => `${label} ${detail}`.toLocaleLowerCase().includes(needle))
      .slice(0, 8)
      .map(([id, label, detail]) => ({ id, label, detail, kind: "view" as const }));
    const nodes = data.nodes
      .filter((node) =>
        [
          node.id,
          node.language,
          node.packageOrWorkspace,
          node.project,
          ...(node.symbols?.map((symbol) => symbol.name) ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase()
          .includes(needle)
      )
      .slice(0, 20)
      .map((node) => ({
        id: node.id,
        label: node.id,
        detail: [node.language, node.packageOrWorkspace].filter(Boolean).join(" · "),
        kind: "node" as const,
      }));
    return [...views, ...nodes];
  }, [data.nodes, query]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[70] bg-slate-950/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Search and command palette"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <div className="mx-auto mt-[10vh] max-w-2xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <label className="sr-only" htmlFor="cascade-command-search">
          Search views and repository nodes
        </label>
        <input
          ref={input}
          id="cascade-command-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") onClose();
          }}
          placeholder="Search files, symbols, packages, languages, or views…"
          className="w-full border-b border-slate-700 bg-slate-950 p-4 text-sm text-white outline-none focus:ring-2 focus:ring-inset focus:ring-cyan-400"
        />
        <ul className="max-h-[55vh] overflow-auto p-2" role="listbox">
          {results.map((result) => (
            <li key={`${result.kind}:${result.id}`}>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-lg p-3 text-left hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                onClick={() => {
                  result.kind === "view" ? onView(result.id as ViewId) : onNode(result.id);
                  onClose();
                }}
              >
                <span className="truncate text-sm text-slate-100">{result.label}</span>
                <span className="ml-4 shrink-0 text-xs text-slate-500">{result.detail}</span>
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className="p-6 text-center text-sm text-slate-400" role="status">
              No matching files, symbols, packages, languages, or views.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
