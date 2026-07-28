import type { AnalysisResult } from "../lib/api";
import { Trash2, ShieldCheck, FileCode, Sparkles } from "lucide-react";

interface DeadCodeViewProps {
  analysisData: AnalysisResult;
  onSelectNode: (id: string) => void;
}

/**
 * Inspector view for analyzing dead (unreferenced) files in the codebase.
 */
export default function DeadCodeView({ analysisData, onSelectNode }: DeadCodeViewProps) {
  const { deadFiles } = analysisData;

  if (!deadFiles || deadFiles.length === 0) {
    return (
      <div className="h-full w-full bg-slate-950 p-8 text-slate-200 flex flex-col items-center justify-center select-none">
        <div className="w-16 h-16 rounded-3xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center mb-4 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
          <Sparkles className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-100 mb-2">Zero Dead Code Detected</h2>
        <p className="text-sm text-slate-400 max-w-md text-center leading-relaxed">
          Every file in your project is properly referenced and part of an active execution graph!
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
              <Trash2 className="w-6 h-6 text-amber-400" /> Unused Code Cleaner Inspector
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Found <strong className="text-amber-400 font-mono">{deadFiles.length}</strong>{" "}
              unreferenced file(s). These files are never imported anywhere in the project and can
              safely be removed to reduce bundle size.
            </p>
          </div>

          <span className="px-3 py-1 rounded-full bg-amber-950/80 text-amber-300 border border-amber-500/40 font-mono text-xs font-semibold">
            Safe to Delete
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {deadFiles.map((file) => {
            const filename = file.split("/").pop() ?? file;
            const pathDir = file.includes("/") ? file.substring(0, file.lastIndexOf("/")) : "";

            return (
              <div
                key={file}
                onClick={() => onSelectNode(file)}
                className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-amber-500/50 transition-all cursor-pointer group shadow-lg flex items-center justify-between"
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2 mb-1">
                    <FileCode className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span className="font-mono text-sm font-semibold text-slate-100 group-hover:text-amber-300 truncate">
                      {filename}
                    </span>
                  </div>
                  {pathDir && (
                    <span className="text-xs text-slate-500 font-mono block truncate pl-6">
                      {pathDir}/
                    </span>
                  )}
                </div>

                <span className="text-xs font-mono font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1 flex-shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" /> Safe
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
