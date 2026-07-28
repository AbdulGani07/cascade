import { useState } from "react";
import { Search, X, Play, AlertTriangle, Trash2, FileCode } from "lucide-react";
import type { AnalysisResult } from "../lib/api";

interface SidebarProps {
  analysisData: AnalysisResult;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onCloseMobile?: () => void;
}

type FilterType = "all" | "entry" | "cycle" | "dead" | "normal";

/**
 * Provides a searchable, filterable file explorer with status badges for graph selection.
 */
export default function Sidebar({
  analysisData,
  selectedId,
  onSelect,
  onCloseMobile,
}: SidebarProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [language, setLanguage] = useState("all");
  const [project, setProject] = useState("all");
  const [buildSystem, setBuildSystem] = useState("all");

  const cycleFiles = new Set(analysisData.cycles.flat());

  const getFileStatus = (id: string): "entry" | "cycle" | "dead" | "normal" => {
    if (analysisData.entryPoints.includes(id)) return "entry";
    if (cycleFiles.has(id)) return "cycle";
    if (analysisData.deadFiles.includes(id)) return "dead";
    return "normal";
  };

  const filteredFiles = analysisData.nodes.filter((node) => {
    const matchesSearch = node.id.toLowerCase().includes(search.toLowerCase());
    const status = getFileStatus(node.id);
    const matchesFilter = filter === "all" || status === filter;
    const matchesLanguage = language === "all" || node.language === language;
    const matchesProject = project === "all" || node.project === project;
    const nodeProject = analysisData.projects?.find((candidate) => candidate.id === node.project);
    const matchesBuild = buildSystem === "all" || nodeProject?.buildSystem === buildSystem;
    return matchesSearch && matchesFilter && matchesLanguage && matchesProject && matchesBuild;
  });

  const counts = {
    all: analysisData.nodes.length,
    entry: analysisData.entryPoints.length,
    cycle: cycleFiles.size,
    dead: analysisData.deadFiles.length,
    normal:
      analysisData.nodes.length -
      analysisData.entryPoints.length -
      cycleFiles.size -
      analysisData.deadFiles.length,
  };

  const handleSelectFile = (id: string | null) => {
    onSelect(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <aside className="flex h-full w-80 flex-col border-r border-slate-800 bg-slate-950/95 backdrop-blur-xl p-4 text-slate-200 select-none flex-shrink-0">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileCode className="w-5 h-5 text-cyan-400" />
          <h2 className="font-semibold text-sm tracking-wide text-slate-100 whitespace-nowrap">
            Project Files
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono whitespace-nowrap">
            {filteredFiles.length} / {analysisData.nodes.length}
          </span>
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="xl:hidden p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value)}
        aria-label="Filter by language"
        className="mb-3 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-300"
      >
        <option value="all">All languages</option>
        {[...new Set(analysisData.nodes.map((node) => node.language))].sort().map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <select
          value={project}
          onChange={(event) => setProject(event.target.value)}
          aria-label="Filter by project"
          className="w-full rounded-xl border border-slate-800 bg-slate-900 px-2 py-2 text-xs text-slate-300"
        >
          <option value="all">All projects</option>
          {(analysisData.projects ?? []).map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          value={buildSystem}
          onChange={(event) => setBuildSystem(event.target.value)}
          aria-label="Filter by build system"
          className="w-full rounded-xl border border-slate-800 bg-slate-900 px-2 py-2 text-xs text-slate-300"
        >
          <option value="all">All builds</option>
          {[
            ...new Set(
              (analysisData.projects ?? []).map((item) => item.buildSystem).filter(Boolean)
            ),
          ]
            .sort()
            .map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
        </select>
      </div>
      <div className="mb-3 flex flex-wrap gap-1" aria-label="Language capabilities">
        {(analysisData.pluginManifests ?? []).map((plugin) => (
          <span
            key={plugin.id}
            title={Object.entries(plugin.capabilities)
              .filter(([, enabled]) => enabled)
              .map(([name]) => name)
              .join(", ")}
            className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-400"
          >
            {plugin.id.replace("cascade-language-", "")} ·{" "}
            {plugin.analysisLevels?.map((level) => level.replace("-dependency", "")).join("/")}
          </span>
        ))}
        {new Set(analysisData.nodes.map((node) => node.language)).size > 1 && (
          <span className="rounded border border-violet-500/40 bg-violet-950/40 px-1.5 py-0.5 text-[10px] text-violet-300">
            mixed-language
          </span>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search modules..."
          className="w-full rounded-xl border border-slate-800 bg-slate-900/90 py-2 pl-9 pr-8 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {[
          { id: "all", label: "All", count: counts.all, color: "text-slate-300" },
          { id: "entry", label: "Entry", count: counts.entry, color: "text-amber-400" },
          { id: "cycle", label: "Cycles", count: counts.cycle, color: "text-rose-400" },
          { id: "dead", label: "Dead", count: counts.dead, color: "text-slate-400" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id as FilterType)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              filter === tab.id
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                : "bg-slate-900/60 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <span className={tab.color}>{tab.label}</span>
            <span className="text-[10px] px-1 rounded bg-slate-800/80 text-slate-400 font-mono">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Selected File Banner */}
      {selectedId && (
        <div className="mb-3 p-2.5 rounded-xl border border-cyan-500/30 bg-cyan-950/30 text-xs flex items-center justify-between">
          <div className="truncate pr-2">
            <span className="text-slate-400 block text-[10px]">Selected Module</span>
            <span className="font-mono text-cyan-300 font-semibold truncate block">
              {selectedId}
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleSelectFile(null)}
            className="p-1 rounded-lg hover:bg-cyan-900/50 text-cyan-400 hover:text-cyan-200 transition-colors"
            title="Deselect"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* File List */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-1.5">
        {filteredFiles.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            No files match your search or filter.
          </div>
        ) : (
          filteredFiles.map((node) => {
            const status = getFileStatus(node.id);
            const isSelected = selectedId === node.id;
            const filename = node.id.split("/").pop() ?? node.id;
            const pathDir = node.id.includes("/")
              ? node.id.substring(0, node.id.lastIndexOf("/"))
              : "";

            return (
              <button
                key={node.id}
                type="button"
                onClick={() => handleSelectFile(node.id)}
                className={`w-full group text-left rounded-xl p-2.5 transition-all duration-150 border flex items-center justify-between gap-2 ${
                  isSelected
                    ? "bg-cyan-950/60 border-cyan-500/80 shadow-[0_0_15px_rgba(6,182,212,0.2)] text-white"
                    : "bg-slate-900/40 border-slate-800/60 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {status === "entry" && (
                      <Play className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    )}
                    {status === "cycle" && (
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                    )}
                    {status === "dead" && (
                      <Trash2 className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    )}
                    {status === "normal" && (
                      <FileCode className="w-3.5 h-3.5 text-cyan-400/80 flex-shrink-0" />
                    )}

                    <span className="font-mono text-xs font-medium truncate group-hover:text-cyan-300">
                      {filename}
                    </span>
                  </div>
                  {pathDir && (
                    <span className="text-[10px] text-slate-500 block truncate pl-5 font-mono">
                      {pathDir}/
                    </span>
                  )}
                </div>

                {status === "entry" && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Entry
                  </span>
                )}
                {status === "cycle" && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Cycle
                  </span>
                )}
                {status === "dead" && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    Dead
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
