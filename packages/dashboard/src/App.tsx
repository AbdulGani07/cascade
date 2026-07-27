import { useState } from "react";

import { useGraphData } from "./hooks/useGraphData";
import GraphView from "./components/GraphView";
import Sidebar from "./components/Sidebar";
import ImpactPanel from "./components/ImpactPanel";

/**
 * Top-level layout component for the Cascade dashboard.
 */
export default function App() {
  const { data, isLoading, error } = useGraphData();

  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading analysis...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center text-red-600">
        Error: {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-screen items-center justify-center">
        No analysis data available.
      </div>
    );
  }

  const highlightedIds = selectedId
    ? new Set([
        selectedId,
        ...(data.impact[selectedId]?.allAffected ?? []),
      ])
    : new Set<string>();

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar
        fileIds={data.nodes.map((node) => node.id)}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      <main className="flex-1">
        <GraphView
          analysisData={data}
          selectedId={selectedId}
          highlightedIds={highlightedIds}
          onSelect={setSelectedId}
        />
      </main>

      <div className="w-80 border-l">
        <ImpactPanel
          selectedId={selectedId}
          impact={data.impact}
        />
      </div>
    </div>
  );
}