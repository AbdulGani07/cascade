import { useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  MarkerType,
  type Edge,
  type Node,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import dagre from "dagre";
import { LayoutGrid, Info, Compass } from "lucide-react";

import FileNode, { type FileNodeData } from "./FileNode";
import type { AnalysisResult } from "../lib/api";

interface GraphViewProps {
  analysisData: AnalysisResult;
  selectedId: string | null;
  highlightedIds: Set<string>;
  onSelect: (id: string | null) => void;
  layoutDirection?: "TB" | "LR";
  onToggleLayout?: () => void;
}

const nodeTypes = {
  file: FileNode,
};

/**
 * Calculates node positions using Dagre for optimal hierarchical layout.
 */
function getLayoutedElements(
  analysisData: AnalysisResult,
  selectedId: string | null,
  highlightedIds: Set<string>,
  direction: "TB" | "LR" = "TB"
) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isHorizontal = direction === "LR";
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 60,
    ranksep: 100,
    marginx: 40,
    marginy: 40,
  });

  const cycleFiles = new Set(analysisData.cycles.flat());

  // Calculate in-degrees and out-degrees
  const inDegrees: Record<string, number> = {};
  const outDegrees: Record<string, number> = {};

  analysisData.nodes.forEach((node) => {
    inDegrees[node.id] = 0;
    outDegrees[node.id] = 0;
  });

  analysisData.edges.forEach((edge) => {
    outDegrees[edge.from] = (outDegrees[edge.from] || 0) + 1;
    inDegrees[edge.to] = (inDegrees[edge.to] || 0) + 1;
  });

  const nodeWidth = 200;
  const nodeHeight = 80;

  analysisData.nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  analysisData.edges.forEach((edge) => {
    dagreGraph.setEdge(edge.from, edge.to);
  });

  dagre.layout(dagreGraph);

  const nodes: Node<FileNodeData>[] = analysisData.nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);

    let status: "normal" | "cycle" | "dead" | "entry" = "normal";
    if (analysisData.entryPoints.includes(node.id)) {
      status = "entry";
    } else if (cycleFiles.has(node.id)) {
      status = "cycle";
    } else if (analysisData.deadFiles.includes(node.id)) {
      status = "dead";
    }

    const isSelected = selectedId === node.id;
    const isHighlighted = highlightedIds.has(node.id);

    return {
      id: node.id,
      type: "file",
      data: {
        label: node.id.split(/[\\/]/).pop() ?? node.id,
        fullPath: node.id,
        status,
        isSelected,
        isHighlighted,
        inDegree: inDegrees[node.id] ?? 0,
        outDegree: outDegrees[node.id] ?? 0,
        layoutDirection: direction,
      },
      position: {
        x: (nodeWithPosition?.x ?? 0) - nodeWidth / 2,
        y: (nodeWithPosition?.y ?? 0) - nodeHeight / 2,
      },
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
    };
  });

  const edges: Edge[] = analysisData.edges.map((edge) => {
    const isHighlightedEdge =
      selectedId === edge.from || (highlightedIds.has(edge.from) && highlightedIds.has(edge.to));

    let strokeColor = "#334155"; // slate-700
    let strokeWidth = 1.8;

    if (isHighlightedEdge) {
      strokeColor = "#38bdf8"; // cyan-400
      strokeWidth = 3;
    } else if (edge.kind === "dynamic") {
      strokeColor = "#a855f7"; // purple-500
    } else if (edge.kind === "re-export") {
      strokeColor = "#f59e0b"; // amber-500
    }

    return {
      id: `${edge.from}-${edge.to}`,
      source: edge.from,
      target: edge.to,
      animated: isHighlightedEdge,
      label:
        edge.confidence !== undefined && edge.confidence < 1
          ? `${Math.round(edge.confidence * 100)}%`
          : undefined,
      labelStyle: { fill: "#94a3b8", fontSize: 9 },
      type: "smoothstep",
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: strokeColor,
        width: 16,
        height: 16,
      },
      style: {
        stroke: strokeColor,
        strokeWidth,
        opacity: isHighlightedEdge ? 1 : selectedId ? 0.25 : 0.75,
      },
    };
  });

  return { nodes, edges };
}

/**
 * Renders the interactive dependency graph using React Flow.
 */
export default function GraphView({
  analysisData,
  selectedId,
  highlightedIds,
  onSelect,
  layoutDirection = "TB",
  onToggleLayout,
}: GraphViewProps) {
  const [showLegend, setShowLegend] = useState(true);

  const { nodes, edges } = useMemo(() => {
    return getLayoutedElements(analysisData, selectedId, highlightedIds, layoutDirection);
  }, [analysisData, selectedId, highlightedIds, layoutDirection]);

  return (
    <div className="relative h-full w-full bg-slate-950 overflow-hidden select-none">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => onSelect(node.id)}
        onPaneClick={() => onSelect(null)}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2.5}
      >
        <Background color="#334155" gap={24} size={1.5} />
        <Controls className="!bg-slate-900/80 !border-slate-800 backdrop-blur-md" />
        <MiniMap
          nodeColor={(node) => {
            const status = (node.data as FileNodeData)?.status;
            if (status === "entry") return "#f59e0b";
            if (status === "cycle") return "#f43f5e";
            if (status === "dead") return "#64748b";
            return "#38bdf8";
          }}
          maskColor="rgba(15, 23, 42, 0.75)"
          className="!bg-slate-900/90 !border-slate-800 !rounded-xl overflow-hidden shadow-2xl"
          style={{ height: 110, width: 160 }}
        />
      </ReactFlow>

      {/* Floating Toolbar Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10 bg-slate-900/80 backdrop-blur-md border border-slate-800 p-1.5 rounded-xl shadow-2xl">
        <button
          type="button"
          onClick={onToggleLayout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors border border-slate-700/50"
          title="Toggle Layout Direction"
        >
          <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" />
          <span>Layout: {layoutDirection === "TB" ? "Top-Down" : "Left-Right"}</span>
        </button>

        <button
          type="button"
          onClick={() => setShowLegend(!showLegend)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
            showLegend
              ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
              : "text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800"
          }`}
        >
          <Info className="w-3.5 h-3.5" />
          <span>Legend</span>
        </button>
      </div>

      {/* Floating Graph Legend */}
      {showLegend && (
        <div className="absolute bottom-4 left-4 z-10 bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-3.5 rounded-2xl shadow-2xl text-xs max-w-xs space-y-2 text-slate-300">
          <div className="flex items-center justify-between font-semibold text-slate-200 border-b border-slate-800 pb-1.5 mb-2">
            <span className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-cyan-400" /> Graph Key
            </span>
            <button
              type="button"
              onClick={() => setShowLegend(false)}
              className="text-slate-500 hover:text-slate-300 text-[10px]"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
              <span>Entry Point</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]" />
              <span>Normal Module</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
              <span>Cycle File</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
              <span>Dead Code</span>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-2 text-[10px] text-slate-400 space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-4 h-0.5 bg-cyan-400 rounded-full" />
              <span>Static Import</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-0.5 bg-purple-500 rounded-full" />
              <span>Dynamic Import()</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
