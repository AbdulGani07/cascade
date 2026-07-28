import { useEffect, useState } from "react";
import { AlertCircle, Network } from "lucide-react";

import { useGraphData } from "./hooks/useGraphData";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import GraphView from "./components/GraphView";
import MatrixView from "./components/MatrixView";
import CyclesView from "./components/CyclesView";
import DeadCodeView from "./components/DeadCodeView";
import ImpactPanel from "./components/ImpactPanel";
import ExportModal from "./components/ExportModal";
import Overview from "./components/Overview";
import WorkspaceView from "./components/WorkspaceView";
import CommandPalette from "./components/CommandPalette";
import { isViewId, type ViewId } from "./lib/views";
import type { AnalysisResult } from "./lib/api";
import FilterBar from "./components/FilterBar";
import { emptyFilters, type WorkspaceFilters } from "./lib/filters";

/**
 * Top-level layout component for the Cascade dependency analysis dashboard.
 */
export default function App() {
  const { data, isLoading, error } = useGraphData();

  const initialParams = new URLSearchParams(window.location.search);
  const [selectedId, setSelectedId] = useState<string | null>(initialParams.get("node"));
  const initialView = new URLSearchParams(window.location.search).get("view");
  const [viewMode, setViewMode] = useState<ViewId>(
    isViewId(initialView) ? initialView : "overview"
  );
  const [layoutDirection, setLayoutDirection] = useState<"TB" | "LR">("TB");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mobile drawer states
  const [isMobileLeftOpen, setIsMobileLeftOpen] = useState(false);
  const [isMobileRightOpen, setIsMobileRightOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [selectedEdge, setSelectedEdge] = useState<AnalysisResult["edges"][number] | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">(() =>
    window.localStorage.getItem("cascade-theme") === "light" ? "light" : "dark"
  );
  const [filters, setFilters] = useState<WorkspaceFilters>(() => ({
    ...emptyFilters,
    ...Object.fromEntries(
      Object.keys(emptyFilters).map((key) => [key, initialParams.get(key) ?? "all"])
    ),
  }));
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsPaletteOpen(true);
      }
      if (event.key === "Escape") setIsPaletteOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("cascade-theme", theme);
  }, [theme]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("view", viewMode);
    if (selectedId) params.set("node", selectedId);
    else params.delete("node");
    for (const [key, value] of Object.entries(filters))
      value === "all" ? params.delete(key) : params.set(key, value);
    window.history.replaceState(null, "", `${window.location.pathname}?${params}`);
  }, [viewMode, selectedId, filters]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 400);
  };

  const handleSelectNode = (id: string | null) => {
    setSelectedEdge(null);
    setSelectedId(id);
    if (id && !["graph", "projects"].includes(viewMode)) {
      setViewMode("graph");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-slate-200">
        <div className="flex flex-col items-center gap-4">
          <div className="relative flex items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 animate-pulse flex items-center justify-center">
              <Network className="w-7 h-7 text-cyan-400" />
            </div>
          </div>
          <div className="text-center space-y-1">
            <h3 className="font-bold text-slate-100 text-sm">Parsing Codebase Architecture</h3>
            <p className="text-xs text-slate-500">
              Building AST dependency graph & blast radius...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 p-6 text-slate-200">
        <div className="max-w-md w-full p-6 rounded-3xl border border-rose-500/30 bg-rose-950/20 backdrop-blur-xl text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-100 text-base">Analysis Error</h3>
          <p className="text-xs text-rose-300 font-mono bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-left overflow-x-auto">
            {error}
          </p>
          <button
            type="button"
            onClick={handleRefresh}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
          >
            Retry Analysis
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-slate-400 text-sm">
        No analysis data available for this project.
      </div>
    );
  }

  const highlightedIds = selectedId
    ? new Set([
        selectedId,
        ...(viewMode === "projects"
          ? (data.projectImpact?.[selectedId]?.allAffected ?? [])
          : (data.impact[selectedId]?.allAffected ?? [])),
      ])
    : new Set<string>();

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-950 text-slate-200">
      {/* Top Header Navigation */}
      <Navbar
        analysisData={data}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onOpenExport={() => setIsExportOpen(true)}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        onToggleLeftSidebar={() => setIsMobileLeftOpen((prev) => !prev)}
        onToggleRightImpact={() => setIsMobileRightOpen((prev) => !prev)}
        isLeftSidebarOpen={isMobileLeftOpen}
        isRightImpactOpen={isMobileRightOpen}
        onOpenPalette={() => setIsPaletteOpen(true)}
        theme={theme}
        onToggleTheme={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
      />
      <FilterBar
        data={data}
        filters={filters}
        onChange={(key, value) => setFilters((current) => ({ ...current, [key]: value }))}
        onReset={() => setFilters(emptyFilters)}
      />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Desktop Left Sidebar */}
        <div className="hidden xl:block h-full">
          <Sidebar analysisData={data} selectedId={selectedId} onSelect={handleSelectNode} />
        </div>

        {/* Mobile Slide-over Left Sidebar */}
        {isMobileLeftOpen && (
          <div className="xl:hidden fixed inset-0 z-40 flex">
            <div
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setIsMobileLeftOpen(false)}
            />
            <div className="relative z-50 h-full shadow-2xl">
              <Sidebar
                analysisData={data}
                selectedId={selectedId}
                onSelect={handleSelectNode}
                onCloseMobile={() => setIsMobileLeftOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Central Dynamic Main View Area */}
        <main className="flex-1 relative overflow-hidden bg-slate-950">
          {viewMode === "graph" && (
            <GraphView
              analysisData={data}
              selectedId={selectedId}
              highlightedIds={highlightedIds}
              onSelect={handleSelectNode}
              layoutDirection={layoutDirection}
              onToggleLayout={() => setLayoutDirection((prev) => (prev === "TB" ? "LR" : "TB"))}
              onSelectEdge={setSelectedEdge}
              filters={filters}
            />
          )}
          {viewMode === "overview" && <Overview data={data} onOpen={setViewMode} />}
          {viewMode === "projects" && (
            <GraphView
              analysisData={data}
              selectedId={selectedId}
              highlightedIds={highlightedIds}
              onSelect={handleSelectNode}
              layoutDirection={layoutDirection}
              onToggleLayout={() => setLayoutDirection((prev) => (prev === "TB" ? "LR" : "TB"))}
              graphKind="project"
              filters={filters}
            />
          )}
          {(viewMode === "packages" || viewMode === "services") && (
            <GraphView
              analysisData={data}
              selectedId={selectedId}
              highlightedIds={highlightedIds}
              onSelect={handleSelectNode}
              layoutDirection={layoutDirection}
              onToggleLayout={() => setLayoutDirection((prev) => (prev === "TB" ? "LR" : "TB"))}
              graphKind={viewMode === "packages" ? "package" : "service"}
              filters={filters}
            />
          )}

          {viewMode === "matrix" && (
            <MatrixView analysisData={data} onSelectNode={handleSelectNode} />
          )}

          {viewMode === "cycles" && (
            <CyclesView analysisData={data} onSelectNode={handleSelectNode} />
          )}

          {viewMode === "deadcode" && (
            <DeadCodeView analysisData={data} onSelectNode={handleSelectNode} />
          )}
          {!(
            [
              "overview",
              "graph",
              "projects",
              "packages",
              "services",
              "matrix",
              "cycles",
              "deadcode",
            ] as ViewId[]
          ).includes(viewMode) && (
            <WorkspaceView
              view={
                viewMode as Exclude<
                  ViewId,
                  | "overview"
                  | "graph"
                  | "projects"
                  | "packages"
                  | "services"
                  | "matrix"
                  | "cycles"
                  | "deadcode"
                >
              }
              data={data}
              onSelect={handleSelectNode}
              filters={filters}
            />
          )}
        </main>

        {/* Desktop Right Impact Inspector Side Panel */}
        <div className="hidden xl:block h-full">
          <ImpactPanel
            selectedId={selectedId}
            impact={data.impact}
            analysisData={data}
            selectedEdge={selectedEdge}
            onSelectNode={handleSelectNode}
          />
        </div>

        {/* Mobile Slide-over Right Impact Panel */}
        {isMobileRightOpen && (
          <div className="xl:hidden fixed inset-0 z-40 flex justify-end">
            <div
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setIsMobileRightOpen(false)}
            />
            <div className="relative z-50 h-full shadow-2xl">
              <ImpactPanel
                selectedId={selectedId}
                impact={data.impact}
                analysisData={data}
                selectedEdge={selectedEdge}
                onSelectNode={handleSelectNode}
                onCloseMobile={() => setIsMobileRightOpen(false)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Export Report Modal */}
      {isExportOpen && <ExportModal analysisData={data} onClose={() => setIsExportOpen(false)} />}
      <CommandPalette
        data={data}
        open={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        onView={setViewMode}
        onNode={(id) => {
          setSelectedId(id);
          setViewMode("graph");
        }}
      />
    </div>
  );
}
