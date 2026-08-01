import type { AnalysisResult } from "../lib/api";
import { AlertTriangle, ArrowRight, ShieldCheck } from "lucide-react";

interface CyclesViewProps {
  analysisData: AnalysisResult;
  onSelectNode: (id: string) => void;
}

/**
 * Inspector view for analyzing circular dependencies.
 */
export default function CyclesView({ analysisData, onSelectNode }: CyclesViewProps) {
  const { cycles } = analysisData;

  if (!cycles || cycles.length === 0) {
    return (
      <div className="h-full w-full bg-slate-950 p-8 text-slate-200 flex flex-col items-center justify-center select-none">
        <div className="w-16 h-16 rounded-3xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center mb-4 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-100 mb-2">No Circular Dependencies Found</h2>
        <p className="text-sm text-slate-400 max-w-md text-center leading-relaxed">
          No circular import loops were detected in this analysis snapshot.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-slate-950 p-6 text-slate-200 overflow-auto select-none">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-rose-500" /> Circular Dependency Inspector
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Found <strong className="text-rose-400 font-mono">{cycles.length}</strong> circular
              dependency loop(s). Circular imports can cause undefined runtime errors, tree-shaking
              failures, and memory leaks.
            </p>
          </div>

          <span className="px-3 py-1 rounded-full bg-rose-950/80 text-rose-300 border border-rose-500/40 font-mono text-xs font-semibold">
            Action Needed
          </span>
        </div>

        <div className="space-y-4">
          {cycles.slice(0, 500).map((cyclePath, index) => (
            <div
              key={index}
              className="p-5 rounded-2xl border border-rose-500/30 bg-rose-950/20 backdrop-blur-xl shadow-xl space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-rose-300 uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" /> Cycle Loop #{index + 1}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {cyclePath.length} modules involved
                </span>
              </div>

              {/* Loop path flow */}
              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center gap-2 font-mono text-xs">
                {cyclePath.slice(0, 200).map((file, fIdx) => (
                  <div key={file} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectNode(file)}
                      className="px-2.5 py-1 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-200 hover:text-white hover:border-rose-400 transition-colors"
                    >
                      {file}
                    </button>
                    {fIdx < Math.min(cyclePath.length, 200) - 1 && (
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                    )}
                  </div>
                ))}
                <ArrowRight className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                <span className="text-rose-400 font-bold">↻ (Loops back)</span>
              </div>

              {/* Recommendation Box */}
              <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
                <strong className="text-amber-400 block mb-1">💡 How to fix this cycle:</strong>
                Extract shared types or helper functions into a separate utility module (e.g.,{" "}
                <code className="text-cyan-300">types.ts</code> or{" "}
                <code className="text-cyan-300">helpers.ts</code>) that both modules import
                independently.
              </div>
            </div>
          ))}
          {cycles.length > 500 && (
            <p className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-3 text-xs text-amber-200">
              Showing 500 of {cycles.length.toLocaleString()} cycles to protect browser
              responsiveness. Export the report for the complete result.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
