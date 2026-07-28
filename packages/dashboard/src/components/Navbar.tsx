import {
  Layers,
  Network,
  Play,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Download,
  Grid,
  PanelLeft,
  Flame,
} from "lucide-react";
import type { AnalysisResult } from "../lib/api";

interface NavbarProps {
  analysisData: AnalysisResult;
  viewMode: "graph" | "projects" | "matrix" | "cycles" | "deadcode";
  onViewModeChange: (mode: "graph" | "projects" | "matrix" | "cycles" | "deadcode") => void;
  onOpenExport: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  onToggleLeftSidebar?: () => void;
  onToggleRightImpact?: () => void;
  isLeftSidebarOpen?: boolean;
  isRightImpactOpen?: boolean;
}

/**
 * Top navigation bar with project metadata, quick stats metrics, view mode tabs, and export actions.
 */
export default function Navbar({
  analysisData,
  viewMode,
  onViewModeChange,
  onOpenExport,
  onRefresh,
  isRefreshing = false,
  onToggleLeftSidebar,
  onToggleRightImpact,
  isLeftSidebarOpen = false,
  isRightImpactOpen = false,
}: NavbarProps) {
  const cycleCount = new Set(analysisData.cycles.flat()).size;

  return (
    <header className="h-16 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-xl px-4 flex items-center justify-between select-none z-30 flex-shrink-0">
      {/* Brand & Project Info */}
      <div className="flex items-center gap-3">
        {/* Mobile Left Sidebar Toggle */}
        <button
          type="button"
          onClick={onToggleLeftSidebar}
          className={`xl:hidden p-2 rounded-xl border transition-colors ${
            isLeftSidebarOpen
              ? "bg-cyan-950/80 border-cyan-500/50 text-cyan-300"
              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
          }`}
          title="Toggle Module Explorer Sidebar"
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-teal-500 to-blue-600 p-0.5 shadow-[0_0_20px_rgba(6,182,212,0.4)] flex-shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Network className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-400 whitespace-nowrap">
                CASCADE
              </h1>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 whitespace-nowrap">
                v1.0
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono truncate hidden sm:block">
              Dependency Architecture & Blast Radius Analyzer
            </p>
          </div>
        </div>

        <div className="h-8 w-px bg-slate-800 hidden xl:block" />

        {/* Quick Stat Badges */}
        <div className="hidden xl:flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 whitespace-nowrap">
            <Layers className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
            <span>Modules:</span>
            <strong className="font-mono text-cyan-300">{analysisData.nodes.length}</strong>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 whitespace-nowrap">
            <Network className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
            <span>Edges:</span>
            <strong className="font-mono text-blue-300">{analysisData.edges.length}</strong>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 whitespace-nowrap">
            <Play className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span>Entry:</span>
            <strong className="font-mono text-amber-300">{analysisData.entryPoints.length}</strong>
          </div>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs cursor-pointer transition-colors whitespace-nowrap ${
              cycleCount > 0
                ? "bg-rose-950/40 border-rose-500/40 text-rose-300 hover:bg-rose-900/50"
                : "bg-slate-900 border-slate-800 text-slate-300"
            }`}
            onClick={() => onViewModeChange("cycles")}
            title="Inspect Circular Dependencies"
          >
            <AlertTriangle
              className={`w-3.5 h-3.5 flex-shrink-0 ${cycleCount > 0 ? "text-rose-400" : "text-slate-500"}`}
            />
            <span>Cycles:</span>
            <strong className="font-mono">{cycleCount}</strong>
          </div>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs cursor-pointer transition-colors whitespace-nowrap ${
              analysisData.deadFiles.length > 0
                ? "bg-amber-950/40 border-amber-500/40 text-amber-300 hover:bg-amber-900/50"
                : "bg-slate-900 border-slate-800 text-slate-300"
            }`}
            onClick={() => onViewModeChange("deadcode")}
            title="Inspect Unused Dead Code"
          >
            <Trash2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span>Dead Files:</span>
            <strong className="font-mono">{analysisData.deadFiles.length}</strong>
          </div>
        </div>
      </div>

      {/* View Switcher & Action Buttons */}
      <div className="flex items-center gap-2">
        {/* Navigation View Modes */}
        <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          {[
            { id: "graph", label: "Graph", icon: Network },
            { id: "projects", label: "Projects", icon: Layers },
            { id: "matrix", label: "Matrix", icon: Grid },
            { id: "cycles", label: "Cycles", icon: AlertTriangle, badge: cycleCount },
            {
              id: "deadcode",
              label: "Dead Code",
              icon: Trash2,
              badge: analysisData.deadFiles.length,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = viewMode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() =>
                  onViewModeChange(
                    tab.id as "graph" | "projects" | "matrix" | "cycles" | "deadcode"
                  )
                }
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="hidden sm:inline whitespace-nowrap">{tab.label}</span>
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500/30 text-rose-300 border border-rose-500/40 font-mono">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <button
          type="button"
          onClick={onRefresh}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40 transition-colors flex-shrink-0"
          title="Re-run Codebase Analysis"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-cyan-400" : ""}`} />
        </button>

        <button
          type="button"
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all whitespace-nowrap flex-shrink-0"
        >
          <Download className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="whitespace-nowrap">Export Report</span>
        </button>

        {/* Mobile Right Impact Inspector Toggle */}
        <button
          type="button"
          onClick={onToggleRightImpact}
          className={`xl:hidden p-2 rounded-xl border transition-colors ${
            isRightImpactOpen
              ? "bg-rose-950/80 border-rose-500/50 text-rose-300"
              : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
          }`}
          title="Toggle Impact Inspector Panel"
        >
          <Flame className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
