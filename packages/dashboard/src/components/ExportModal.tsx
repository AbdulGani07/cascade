import { useState } from "react";
import { X, Copy, Download, Check, FileJson, FileText } from "lucide-react";
import type { AnalysisResult } from "../lib/api";

interface ExportModalProps {
  analysisData: AnalysisResult;
  onClose: () => void;
}

/**
 * Modal dialogue for exporting JSON analysis report or copyable executive summary.
 */
export default function ExportModal({ analysisData, onClose }: ExportModalProps) {
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"json" | "summary">("json");

  const jsonString = JSON.stringify(analysisData, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cascade-analysis.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const cycleCount = new Set(analysisData.cycles.flat()).size;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 select-none">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <FileJson className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">Export Analysis Data</h3>
              <p className="text-xs text-slate-400">
                Download or copy full dependency analysis report
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-5 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setTab("json")}
            className={`flex items-center gap-2 pb-2 text-xs font-semibold border-b-2 transition-colors ${
              tab === "json"
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileJson className="w-3.5 h-3.5" /> Full JSON Report
          </button>
          <button
            type="button"
            onClick={() => setTab("summary")}
            className={`flex items-center gap-2 pb-2 text-xs font-semibold border-b-2 transition-colors ${
              tab === "summary"
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Executive Summary
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto font-mono text-xs text-slate-300 bg-slate-950/80">
          {tab === "json" ? (
            <pre className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {jsonString}
            </pre>
          ) : (
            <div className="space-y-4 font-sans text-xs">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <h4 className="font-bold text-slate-100 text-sm">Codebase Architecture Overview</h4>
                <ul className="space-y-1.5 text-slate-300 text-xs">
                  <li>
                    • Total Analyzed Modules:{" "}
                    <strong className="text-cyan-400 font-mono">{analysisData.nodes.length}</strong>
                  </li>
                  <li>
                    • Total Dependency Connections:{" "}
                    <strong className="text-blue-400 font-mono">{analysisData.edges.length}</strong>
                  </li>
                  <li>
                    • Identified Entry Points:{" "}
                    <strong className="text-amber-400 font-mono">
                      {analysisData.entryPoints.length}
                    </strong>
                  </li>
                  <li>
                    • Circular Import Loops:{" "}
                    <strong className="text-rose-400 font-mono">{cycleCount}</strong>
                  </li>
                  <li>
                    • Dead Unused Files:{" "}
                    <strong className="text-slate-400 font-mono">
                      {analysisData.deadFiles.length}
                    </strong>
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <h4 className="font-bold text-slate-100 text-sm">Health Rating</h4>
                <p className="text-slate-400 leading-relaxed">
                  {cycleCount === 0 && analysisData.deadFiles.length === 0
                    ? "✨ Pristine Architecture: 0 cycles and 0 unused files. Perfect modular isolation."
                    : `⚠️ Recommended Refactoring: ${cycleCount} cycle(s) and ${analysisData.deadFiles.length} unused file(s) require attention.`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition-colors border border-slate-700"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copied ? "Copied!" : "Copy JSON"}</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shadow-lg shadow-cyan-600/30 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .json</span>
          </button>
        </div>
      </div>
    </div>
  );
}
