import ReactFlow, {
  Background,
  Controls,
  type Edge,
  type Node,
} from "reactflow";
import "reactflow/dist/style.css";

import FileNode from "./FileNode";
import type { AnalysisResult } from "../lib/api";

interface GraphViewProps {
  analysisData: AnalysisResult;
  selectedId: string | null;
  highlightedIds: Set<string>;
  onSelect: (id: string) => void;
}

const nodeTypes = {
  file: FileNode,
};

/**
 * Creates a simple top-down layered layout using BFS depth from entry points.
 */
function createLayeredLayout(
  analysisData: AnalysisResult
): Record<string, { x: number; y: number }> {
  const layers: Record<number, string[]> = {};
  const depthMap = new Map<string, number>();

  const queue: string[] = [...analysisData.entryPoints];

  analysisData.entryPoints.forEach((id) => {
    depthMap.set(id, 0);
  });

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDepth = depthMap.get(current) ?? 0;

    const outgoing = analysisData.edges
      .filter((edge) => edge.from === current)
      .map((edge) => edge.to);

    for (const next of outgoing) {
      if (!depthMap.has(next)) {
        depthMap.set(next, currentDepth + 1);
        queue.push(next);
      }
    }
  }

  for (const node of analysisData.nodes) {
    if (!depthMap.has(node.id)) {
      depthMap.set(node.id, 0);
    }

    const depth = depthMap.get(node.id)!;

    if (!layers[depth]) {
      layers[depth] = [];
    }

    layers[depth].push(node.id);
  }

  const positions: Record<string, { x: number; y: number }> = {};

  Object.entries(layers).forEach(([layer, ids]) => {
    const y = Number(layer) * 150;

    ids.forEach((id, index) => {
      positions[id] = {
        x: index * 220,
        y,
      };
    });
  });

  return positions;
}

/**
 * Renders the dependency graph using React Flow.
 */
export default function GraphView({
  analysisData,
  highlightedIds,
  onSelect,
}: GraphViewProps) {
  const positions = createLayeredLayout(analysisData);

  const cycleFiles = new Set(
    analysisData.cycles.flat()
  );

  const nodes: Node[] = analysisData.nodes.map((node) => {
    let status: "normal" | "cycle" | "dead" | "entry" = "normal";

    if (analysisData.entryPoints.includes(node.id)) {
      status = "entry";
    } else if (cycleFiles.has(node.id)) {
      status = "cycle";
    } else if (analysisData.deadFiles.includes(node.id)) {
      status = "dead";
    }

    return {
      id: node.id,
      type: "file",
      data: {
        label: node.id.split(/[\\/]/).pop() ?? node.id,
        status,
      },
      position: positions[node.id] ?? { x: 0, y: 0 },
    };
  });

  const edges: Edge[] = analysisData.edges.map((edge) => ({
    id: `${edge.from}-${edge.to}`,
    source: edge.from,
    target: edge.to,
    animated: false,
    style: {
      stroke:
        highlightedIds.has(edge.from) &&
        highlightedIds.has(edge.to)
          ? "red"
          : "#999",
    },
  }));

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => onSelect(node.id)}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}