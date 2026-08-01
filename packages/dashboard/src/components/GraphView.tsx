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
import type { WorkspaceFilters } from "../lib/filters";

interface GraphViewProps {
  analysisData: AnalysisResult;
  selectedId: string | null;
  highlightedIds: Set<string>;
  onSelect: (id: string | null) => void;
  layoutDirection?: "TB" | "LR";
  onToggleLayout?: () => void;
  graphKind?: "file" | "project" | "package" | "service";
  onSelectEdge?: (edge: AnalysisResult["edges"][number] | null) => void;
  filters?: WorkspaceFilters;
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
  direction: "TB" | "LR" = "TB",
  graphKind: "file" | "project" | "package" | "service" = "file",
  maximumNodes = Number.POSITIVE_INFINITY,
  filters?: WorkspaceFilters
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

  const projectNodes = (analysisData.projectGraph?.nodes ?? []).filter((node) =>
    graphKind === "package"
      ? node.role === "package" || node.role === "library" || node.projectType === "package"
      : graphKind === "service"
        ? node.role === "service" || node.role === "application" || node.projectType === "service"
        : true
  );
  const cycleNodeIds = new Set(analysisData.cycles.flat());
  const deadNodeIds = new Set(analysisData.deadFiles);
  const unresolvedSources = new Set(
    analysisData.edges
      .filter((edge) => edge.resolutionStatus === "unresolved")
      .map((edge) => edge.from)
  );
  const allNodes =
    graphKind !== "file" && analysisData.projectGraph
      ? projectNodes.map((node) => ({
          id: node.id,
          isEntryPoint: node.role === "application" || node.role === "service",
          label: node.name,
          detail: `${node.role ?? node.projectType} · ${node.buildSystem ?? "metadata"}`,
        }))
      : analysisData.nodes
          .filter((node) => {
            if (!filters) return true;
            const extension = node.id.split(".").pop() ?? "";
            const inCycle = cycleNodeIds.has(node.id);
            const statusMatches =
              filters.status === "all" ||
              (filters.status === "entry" && node.isEntryPoint) ||
              (filters.status === "cycle" && inCycle) ||
              (filters.status === "dead" && deadNodeIds.has(node.id)) ||
              (filters.status === "unresolved" && unresolvedSources.has(node.id));
            return (
              (filters.language === "all" || node.language === filters.language) &&
              (filters.project === "all" || node.project === filters.project) &&
              (filters.packageName === "all" || node.packageOrWorkspace === filters.packageName) &&
              (filters.fileType === "all" || extension === filters.fileType) &&
              statusMatches
            );
          })
          .map((node) => ({
            ...node,
            label: node.id.split(/[\\/]/).pop() ?? node.id,
            detail: node.id,
          }));
  const allEdges =
    graphKind !== "file" && analysisData.projectGraph
      ? analysisData.projectGraph.edges.map((edge) => ({
          from: edge.from,
          to: edge.to,
          kind: edge.type,
          confidence: edge.confidence,
          architectureBoundary: analysisData.governance?.boundaries.some(
            (boundary) => boundary.from === edge.from && boundary.to === edge.to
          ),
        }))
      : analysisData.edges.filter(
          (edge) =>
            !filters ||
            ((filters.dependencyType === "all" ||
              (edge.dependencyCategory ?? edge.kind) === filters.dependencyType) &&
              (filters.confidence === "all" ||
                (filters.confidence === "high" && (edge.confidence ?? 1) >= 0.8) ||
                (filters.confidence === "medium" &&
                  (edge.confidence ?? 1) >= 0.5 &&
                  (edge.confidence ?? 1) < 0.8) ||
                (filters.confidence === "low" && (edge.confidence ?? 1) < 0.5)))
        );
  const degree = new Map<string, number>();
  for (const edge of allEdges) {
    degree.set(edge.from, (degree.get(edge.from) ?? 0) + 1);
    degree.set(edge.to, (degree.get(edge.to) ?? 0) + 1);
  }
  let sourceNodes = allNodes
    .sort(
      (left, right) =>
        (degree.get(right.id) ?? 0) - (degree.get(left.id) ?? 0) || left.id.localeCompare(right.id)
    )
    .slice(0, maximumNodes);
  if (selectedId && !sourceNodes.some((node) => node.id === selectedId)) {
    const selectedNode = allNodes.find((node) => node.id === selectedId);
    if (selectedNode)
      sourceNodes = [selectedNode, ...sourceNodes.slice(0, Math.max(0, maximumNodes - 1))];
  }
  const visibleIds = new Set(sourceNodes.map((node) => node.id));
  const sourceEdges = allEdges.filter(
    (edge) => visibleIds.has(edge.from) && visibleIds.has(edge.to)
  );
  const sourceCycles =
    graphKind !== "file" && analysisData.projectGraph
      ? analysisData.projectGraph.cycles
      : analysisData.cycles;
  const cycleFiles = new Set(sourceCycles.flat());

  // Calculate in-degrees and out-degrees
  const inDegrees: Record<string, number> = {};
  const outDegrees: Record<string, number> = {};

  sourceNodes.forEach((node) => {
    inDegrees[node.id] = 0;
    outDegrees[node.id] = 0;
  });

  sourceEdges.forEach((edge) => {
    outDegrees[edge.from] = (outDegrees[edge.from] || 0) + 1;
    inDegrees[edge.to] = (inDegrees[edge.to] || 0) + 1;
  });

  const nodeWidth = 200;
  const nodeHeight = 80;

  sourceNodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  sourceEdges.forEach((edge) => {
    dagreGraph.setEdge(edge.from, edge.to);
  });

  dagre.layout(dagreGraph);

  const nodes: Node<FileNodeData>[] = sourceNodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);

    let status: "normal" | "cycle" | "dead" | "entry" = "normal";
    if (node.isEntryPoint) {
      status = "entry";
    } else if (cycleFiles.has(node.id)) {
      status = "cycle";
    } else if (deadNodeIds.has(node.id)) {
      status = "dead";
    }

    const isSelected = selectedId === node.id;
    const isHighlighted = highlightedIds.has(node.id);

    return {
      id: node.id,
      type: "file",
      data: {
        label: node.label,
        fullPath: node.detail,
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

  const edges: Edge[] = sourceEdges.map((edge) => {
    const isHighlightedEdge =
      selectedId === edge.from || (highlightedIds.has(edge.from) && highlightedIds.has(edge.to));

    let strokeColor = "#334155"; // slate-700
    let strokeWidth = 1.8;
    const isAdded = analysisData.gitImpact?.graphDiff?.addedEdges.some(
      (item) => item.from === edge.from && item.to === edge.to
    );
    const isRemoved = analysisData.gitImpact?.graphDiff?.removedEdges.some(
      (item) => item.from === edge.from && item.to === edge.to
    );
    const isBoundary = "architectureBoundary" in edge && edge.architectureBoundary;

    if (isHighlightedEdge) {
      strokeColor = "#38bdf8"; // cyan-400
      strokeWidth = 3;
    } else if (edge.kind === "dynamic") {
      strokeColor = "#a855f7"; // purple-500
    } else if (edge.kind === "re-export") {
      strokeColor = "#f59e0b"; // amber-500
    } else if (isAdded) {
      strokeColor = "#22c55e";
    } else if (isRemoved) {
      strokeColor = "#f43f5e";
    } else if (isBoundary) {
      strokeColor = "#f97316";
    }

    return {
      id: `${edge.from}-${edge.to}`,
      source: edge.from,
      target: edge.to,
      animated: isHighlightedEdge,
      label: isAdded
        ? "added"
        : isRemoved
          ? "removed"
          : isBoundary
            ? "boundary"
            : edge.confidence !== undefined && edge.confidence < 1
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
        strokeDasharray: isRemoved || isBoundary ? "6 4" : undefined,
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
  graphKind = "file",
  onSelectEdge,
  filters,
}: GraphViewProps) {
  const [showLegend, setShowLegend] = useState(true);
  const projectNodeMatchesKind = (
    node: NonNullable<AnalysisResult["projectGraph"]>["nodes"][number]
  ) =>
    graphKind === "package"
      ? node.role === "package" || node.role === "library" || node.projectType === "package"
      : graphKind === "service"
        ? node.role === "service" || node.role === "application" || node.projectType === "service"
        : true;
  const sourceCount =
    graphKind !== "file"
      ? (analysisData.projectGraph?.nodes.filter(projectNodeMatchesKind).length ?? 0)
      : analysisData.nodes.length;
  const graphLimit = graphKind === "file" ? 400 : 800;
  const isAggregated = sourceCount > graphLimit;

  const { nodes, edges } = useMemo(() => {
    return getLayoutedElements(
      analysisData,
      selectedId,
      highlightedIds,
      layoutDirection,
      graphKind,
      isAggregated ? graphLimit : Number.POSITIVE_INFINITY,
      filters
    );
  }, [
    analysisData,
    selectedId,
    highlightedIds,
    layoutDirection,
    graphKind,
    isAggregated,
    graphLimit,
    filters,
  ]);

  return (
    <div className="relative h-full w-full bg-slate-950 overflow-hidden select-none">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => onSelect(node.id)}
        onPaneClick={() => onSelect(null)}
        onEdgeClick={(_, edge) => {
          const source = analysisData.edges.find(
            (item) => item.from === edge.source && item.to === edge.target
          );
          onSelectEdge?.(source ?? null);
        }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2.5}
        aria-label={`${graphKind === "file" ? "File" : graphKind === "package" ? "Package" : graphKind === "service" ? "Service" : "Project"} dependency graph`}
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

      {isAggregated && (
        <section
          className="absolute top-4 left-4 z-10 max-w-md rounded-xl border border-amber-500/40 bg-slate-950/95 p-3 text-xs text-slate-200 shadow-xl"
          aria-live="polite"
        >
          <strong className="block text-amber-300">
            Large graph: showing {graphLimit} highest-connected nodes
          </strong>
          <p className="mt-1 text-slate-400">
            Search or filter to narrow all {sourceCount.toLocaleString()} nodes. The layout remains
            bounded to prevent an oversized report from freezing the browser; a selected node is
            always retained.
          </p>
        </section>
      )}

      {/* Floating Toolbar Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10 bg-slate-900/80 backdrop-blur-md border border-slate-800 p-1.5 rounded-xl shadow-2xl">
        <button
          type="button"
          onClick={onToggleLayout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors border border-slate-700/50"
          title="Toggle Layout Direction"
          aria-label={`Change graph layout to ${layoutDirection === "TB" ? "left-to-right" : "top-down"}`}
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
          aria-pressed={showLegend}
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
              aria-label="Close graph legend"
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
