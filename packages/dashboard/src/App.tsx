import { useState } from "react";
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

/**
 * Top-level layout component for the Cascade dependency analysis dashboard.
 */
export default function App() {
  const { data, isLoading, error } = useGraphData();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"graph" | "projects" | "matrix" | "cycles" | "deadcode">(
    "graph"
  );
  const [layoutDirection, setLayoutDirection] = useState<"TB" | "LR">("TB");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mobile drawer states
  const [isMobileLeftOpen, setIsMobileLeftOpen] = useState(false);
  const [isMobileRightOpen, setIsMobileRightOpen] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 400);
  };

  const handleSelectNode = (id: string | null) => {
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
            />
          )}
          {viewMode === "projects" && (
            <GraphView
              analysisData={data}
              selectedId={selectedId}
              highlightedIds={highlightedIds}
              onSelect={handleSelectNode}
              layoutDirection={layoutDirection}
              onToggleLayout={() => setLayoutDirection((prev) => (prev === "TB" ? "LR" : "TB"))}
              graphKind="project"
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
        </main>

        {/* Desktop Right Impact Inspector Side Panel */}
        <div className="hidden xl:block h-full">
          <ImpactPanel
            selectedId={selectedId}
            impact={data.impact}
            analysisData={data}
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
                onSelectNode={handleSelectNode}
                onCloseMobile={() => setIsMobileRightOpen(false)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Export Report Modal */}
      {isExportOpen && <ExportModal analysisData={data} onClose={() => setIsExportOpen(false)} />}
    </div>
  );
}
