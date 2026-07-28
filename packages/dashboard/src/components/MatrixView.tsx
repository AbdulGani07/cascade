import { useState } from "react";
import type { AnalysisResult } from "../lib/api";
import { Grid, Check } from "lucide-react";

interface MatrixViewProps {
  analysisData: AnalysisResult;
  onSelectNode: (id: string) => void;
}

/**
 * Renders an interactive adjacency matrix view of module dependencies.
 */
export default function MatrixView({ analysisData, onSelectNode }: MatrixViewProps) {
  const [hoveredCell, setHoveredCell] = useState<{ from: string; to: string } | null>(null);

  const matrixLimit = 200;
  const nodes = analysisData.nodes.slice(0, matrixLimit).map((n) => n.id);
  const edgeSet = new Set(analysisData.edges.map((e) => `${e.from}->${e.to}`));

  return (
    <div className="h-full w-full bg-slate-950 p-6 text-slate-200 overflow-auto select-none flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Grid className="w-5 h-5 text-cyan-400" /> Dependency Adjacency Matrix
          </h2>
          <p className="text-xs text-slate-400">
            Rows represent importing source modules (<code className="text-cyan-300">from</code>);
            Columns represent imported target modules (<code className="text-cyan-300">to</code>).
          </p>
        </div>

        {hoveredCell && (
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-cyan-500/40 text-xs font-mono text-cyan-300">
            {hoveredCell.from.split("/").pop()} ➔ {hoveredCell.to.split("/").pop()}
          </div>
        )}
      </div>
      {analysisData.nodes.length > matrixLimit && (
        <p className="mb-3 rounded-lg border border-amber-500/40 bg-amber-950/30 p-2 text-xs text-amber-200">
          Matrix is limited to the first {matrixLimit} deterministic nodes. Filter through the
          explorer before using a dense matrix for very large repositories.
        </p>
      )}

      <div className="flex-1 border border-slate-800 bg-slate-900/60 rounded-2xl p-4 overflow-auto">
        <table className="border-collapse text-xs font-mono">
          <thead>
            <tr>
              <th className="p-2 border border-slate-800 bg-slate-950 text-left min-w-[160px] text-slate-400 sticky top-0 left-0 z-20">
                Source \ Target
              </th>
              {nodes.map((targetId) => (
                <th
                  key={targetId}
                  className="p-2 border border-slate-800 bg-slate-950 text-slate-300 min-w-[100px] text-center sticky top-0 z-10 truncate cursor-pointer hover:text-cyan-300"
                  onClick={() => onSelectNode(targetId)}
                  title={targetId}
                >
                  {targetId.split("/").pop()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {nodes.map((sourceId) => (
              <tr key={sourceId} className="hover:bg-slate-800/40">
                <td
                  className="p-2 border border-slate-800 bg-slate-950 text-slate-300 font-semibold sticky left-0 z-10 truncate cursor-pointer hover:text-cyan-300 max-w-[200px]"
                  onClick={() => onSelectNode(sourceId)}
                  title={sourceId}
                >
                  {sourceId.split("/").pop()}
                </td>
                {nodes.map((targetId) => {
                  const isSelf = sourceId === targetId;
                  const hasDependency = edgeSet.has(`${sourceId}->${targetId}`);

                  return (
                    <td
                      key={targetId}
                      onMouseEnter={() => setHoveredCell({ from: sourceId, to: targetId })}
                      onMouseLeave={() => setHoveredCell(null)}
                      onClick={() => onSelectNode(sourceId)}
                      className={`p-2 border border-slate-800 text-center transition-colors cursor-pointer ${
                        isSelf
                          ? "bg-slate-950/50 text-slate-700"
                          : hasDependency
                            ? "bg-cyan-950/80 text-cyan-400 font-bold hover:bg-cyan-900/90 shadow-inner"
                            : "hover:bg-slate-800/50"
                      }`}
                    >
                      {isSelf ? (
                        "-"
                      ) : hasDependency ? (
                        <Check className="w-4 h-4 mx-auto text-cyan-400" />
                      ) : (
                        ""
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
