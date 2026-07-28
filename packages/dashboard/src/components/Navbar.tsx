import { Download, Flame, Menu, Moon, Network, RefreshCw, Search, Sun } from "lucide-react";
import type { AnalysisResult } from "../lib/api";
import { viewDefinitions, type ViewId } from "../lib/views";

interface NavbarProps {
  analysisData: AnalysisResult;
  viewMode: ViewId;
  onViewModeChange: (mode: ViewId) => void;
  onOpenExport: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  onToggleLeftSidebar?: () => void;
  onToggleRightImpact?: () => void;
  isLeftSidebarOpen?: boolean;
  isRightImpactOpen?: boolean;
  onOpenPalette: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

export default function Navbar({
  analysisData,
  viewMode,
  onViewModeChange,
  onOpenExport,
  onRefresh,
  isRefreshing = false,
  onToggleLeftSidebar,
  onToggleRightImpact,
  onOpenPalette,
  theme,
  onToggleTheme,
}: NavbarProps) {
  return (
    <header
      className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/95 px-3 text-slate-200"
      role="banner"
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onToggleLeftSidebar}
          className="rounded-lg border border-slate-700 p-2 xl:hidden"
          aria-label="Toggle repository explorer"
        >
          <Menu className="h-4 w-4" />
        </button>
        <Network className="h-6 w-6 shrink-0 text-cyan-400" />
        <div className="hidden min-w-0 sm:block">
          <h1 className="truncate text-sm font-bold">Cascade</h1>
          <p className="truncate text-[10px] text-slate-500">
            {analysisData.nodes.length.toLocaleString()} files ·{" "}
            {analysisData.edges.length.toLocaleString()} relationships
          </p>
        </div>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <label htmlFor="workspace-view-select" className="sr-only">
          Workspace view
        </label>
        <select
          id="workspace-view-select"
          value={viewMode}
          onChange={(event) => onViewModeChange(event.target.value as ViewId)}
          className="max-w-44 rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-slate-100"
        >
          {viewDefinitions.map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onOpenPalette}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs hover:border-cyan-500/60"
          aria-label="Open search and command palette"
        >
          <Search className="h-4 w-4" />
          <span className="hidden md:inline">Search</span>
          <kbd className="hidden rounded border border-slate-700 px-1 text-[10px] lg:inline">
            Ctrl K
          </kbd>
        </button>
        <button
          type="button"
          onClick={onToggleTheme}
          className="rounded-lg border border-slate-700 bg-slate-900 p-2"
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-lg border border-slate-700 bg-slate-900 p-2"
          aria-label="Refresh analysis"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
        </button>
        <button
          type="button"
          onClick={onOpenExport}
          className="flex items-center gap-1 rounded-lg bg-cyan-700 px-2.5 py-2 text-xs font-medium text-white hover:bg-cyan-600"
        >
          <Download className="h-4 w-4" />
          <span className="hidden md:inline">Export</span>
        </button>
        <button
          type="button"
          onClick={onToggleRightImpact}
          className="rounded-lg border border-slate-700 bg-slate-900 p-2 xl:hidden"
          aria-label="Toggle explanation panel"
        >
          <Flame className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
