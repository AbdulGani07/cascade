import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  ChevronRight,
  X,
} from "lucide-react";
import type { AnalysisResult } from "../lib/api";
import { shortestDependencyPath } from "../lib/graphModel";

interface ImpactReport {
  directlyAffected: string[];
  allAffected: string[];
  isSafeToDelete: boolean;
}

interface ImpactPanelProps {
  selectedId: string | null;
  impact: Record<string, ImpactReport> | undefined;
  analysisData?: AnalysisResult;
  onSelectNode?: (id: string) => void;
  onCloseMobile?: () => void;
  selectedEdge?: AnalysisResult["edges"][number] | null;
}

/**
 * Displays rich impact analysis, blast radius, and dependency breakdown for the selected file.
 */
export default function ImpactPanel({
  selectedId,
  impact,
  analysisData,
  onSelectNode,
  onCloseMobile,
  selectedEdge,
}: ImpactPanelProps) {
  const [activeTab, setActiveTab] = useState<"blast" | "imports" | "dependents">("blast");
  const [traceTarget, setTraceTarget] = useState<string | null>(null);

  if (!selectedId && !selectedEdge) {
    return (
      <aside className="flex h-full w-80 flex-col items-center justify-center p-6 text-center text-slate-400 bg-slate-950/95 backdrop-blur-xl select-none flex-shrink-0 relative">
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="xl:hidden absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-3 text-cyan-400 shadow-inner">
          <Layers className="w-6 h-6" />
        </div>
        <h3 className="font-semibold text-slate-200 text-sm mb-1">Impact Inspector</h3>
        <p className="text-xs text-slate-500 max-w-[200px]">
          Select any module on the graph or sidebar to inspect its blast radius and dependencies.
        </p>
      </aside>
    );
  }

  if (selectedEdge) {
    return (
      <aside
        className="flex h-full w-80 shrink-0 flex-col overflow-auto border-l border-slate-800 bg-slate-950/95 p-4 text-slate-200"
        aria-label="Dependency explanation"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Why these nodes connect</h2>
          {onCloseMobile && (
            <button type="button" onClick={onCloseMobile} aria-label="Close explanation panel">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <dl className="mt-4 space-y-3 text-xs">
          <div>
            <dt className="text-slate-500">From</dt>
            <dd className="break-all font-mono">{selectedEdge.from}</dd>
          </div>
          <div>
            <dt className="text-slate-500">To</dt>
            <dd className="break-all font-mono">{selectedEdge.to}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Relationship</dt>
            <dd>{selectedEdge.dependencyCategory ?? selectedEdge.kind}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Resolution</dt>
            <dd>{selectedEdge.resolutionStatus ?? "resolved"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Confidence</dt>
            <dd>
              {selectedEdge.confidence == null
                ? "not supplied"
                : `${Math.round(selectedEdge.confidence * 100)}%`}
            </dd>
          </div>
        </dl>
        <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Evidence
        </h3>
        {selectedEdge.evidence?.length ? (
          <ul className="mt-2 list-disc space-y-2 pl-4 text-xs">
            {selectedEdge.evidence.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-slate-500">
            No source evidence was supplied for this edge.
          </p>
        )}
      </aside>
    );
  }

  const activeId = selectedId as string;
  const report = impact?.[activeId];
  const filename = activeId.split("/").pop() ?? activeId;

  // Calculate imports (outgoing edges) and dependents (incoming edges)
  const imports =
    analysisData?.edges.filter((edge) => edge.from === activeId).map((edge) => edge.to) ?? [];

  const dependents =
    analysisData?.edges.filter((edge) => edge.to === activeId).map((edge) => edge.from) ?? [];

  const totalProjectNodes = analysisData?.nodes.length ?? 1;
  const blastPercentage = Math.round(
    ((report?.allAffected.length ?? 0) / Math.max(1, totalProjectNodes - 1)) * 100
  );
  const forwardTrace =
    traceTarget && analysisData
      ? shortestDependencyPath(analysisData.edges, activeId, traceTarget)
      : [];
  const tracePath =
    forwardTrace.length || !traceTarget || !analysisData
      ? forwardTrace
      : shortestDependencyPath(analysisData.edges, traceTarget, activeId);

  return (
    <aside className="flex h-full w-80 flex-col border-l border-slate-800 bg-slate-950/95 backdrop-blur-xl p-4 text-slate-200 select-none flex-shrink-0">
      {/* Module Title Header */}
      <div className="pb-3 border-b border-slate-800">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-mono tracking-wider uppercase text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded whitespace-nowrap">
            Module Analysis
          </span>
          <div className="flex items-center gap-1.5">
            {report?.isSafeToDelete ? (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded whitespace-nowrap">
                <ShieldCheck className="w-3 h-3" /> Safe
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] text-rose-400 bg-rose-950/60 border border-rose-500/30 px-2 py-0.5 rounded whitespace-nowrap">
                <Flame className="w-3 h-3" /> Impact Risk
              </span>
            )}
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="xl:hidden p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <h3 className="font-mono font-bold text-sm text-slate-100 truncate" title={activeId}>
          {filename}
        </h3>
        <p className="text-[10px] text-slate-500 font-mono truncate">{activeId}</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 my-3 gap-1">
        <button
          type="button"
          onClick={() => setActiveTab("blast")}
          className={`flex-1 py-1.5 text-xs font-medium text-center border-b-2 transition-all whitespace-nowrap ${
            activeTab === "blast"
              ? "border-cyan-400 text-cyan-300 font-semibold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Blast Radius
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("dependents")}
          className={`flex-1 py-1.5 text-xs font-medium text-center border-b-2 transition-all whitespace-nowrap ${
            activeTab === "dependents"
              ? "border-cyan-400 text-cyan-300 font-semibold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Dependents ({dependents.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("imports")}
          className={`flex-1 py-1.5 text-xs font-medium text-center border-b-2 transition-all whitespace-nowrap ${
            activeTab === "imports"
              ? "border-cyan-400 text-cyan-300 font-semibold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Imports ({imports.length})
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {traceTarget && (
          <section
            className="rounded-lg border border-cyan-500/30 bg-cyan-950/20 p-2 text-xs"
            aria-live="polite"
          >
            <h4 className="font-semibold text-cyan-300">Dependency path</h4>
            {tracePath.length ? (
              <ol className="mt-1 space-y-1 font-mono text-[10px]">
                {tracePath.map((item, index) => (
                  <li key={item}>
                    {index + 1}. {item}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-1 text-slate-400">No directed path was found.</p>
            )}
          </section>
        )}
        {activeTab === "blast" && (
          <>
            {/* Safe / Unsafe Status Card */}
            {report?.isSafeToDelete ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3.5 text-xs text-emerald-200">
                <div className="flex items-center gap-2 mb-1.5 font-semibold text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Safe to Delete / Refactor
                </div>
                <p className="text-[11px] text-emerald-300/80 leading-relaxed">
                  No other files in the codebase depend on this module. Deleting it won't break
                  downstream imports.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3.5 text-xs text-rose-200">
                <div className="flex items-center gap-2 mb-1.5 font-semibold text-rose-300">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  Impact Warning
                </div>
                <p className="text-[11px] text-rose-300/80 leading-relaxed">
                  Modifying or deleting this module will directly or transitively affect{" "}
                  <strong className="text-white font-mono">{report?.allAffected.length}</strong>{" "}
                  other file(s).
                </p>
              </div>
            )}

            {/* Blast Gauge */}
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-400 font-medium">Blast Radius Severity</span>
                <span className="font-mono font-bold text-cyan-400">
                  {blastPercentage}% of codebase
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    report?.isSafeToDelete
                      ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                      : blastPercentage > 30
                        ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"
                        : "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                  }`}
                  style={{ width: `${Math.max(5, blastPercentage)}%` }}
                />
              </div>
            </div>

            {/* Directly Affected */}
            {report?.directlyAffected && report.directlyAffected.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                  <span>Directly Affected</span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {report.directlyAffected.length}
                  </span>
                </h4>
                <div className="space-y-1.5">
                  {report.directlyAffected.map((file) => (
                    <button
                      key={file}
                      type="button"
                      onClick={() => setTraceTarget(file)}
                      className="w-full text-left p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-xs text-slate-300 font-mono flex items-center justify-between group transition-colors"
                    >
                      <span className="truncate group-hover:text-cyan-300">{file}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Transitive Impact List */}
            {report?.allAffected && report.allAffected.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
                  <span>All Affected Downstream</span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {report.allAffected.length}
                  </span>
                </h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {report.allAffected.map((file) => (
                    <button
                      key={file}
                      type="button"
                      onClick={() => setTraceTarget(file)}
                      className="w-full text-left p-2 rounded-lg bg-slate-900/50 border border-slate-800/80 hover:border-cyan-500/50 text-xs text-slate-400 font-mono flex items-center justify-between group transition-colors"
                    >
                      <span className="truncate group-hover:text-cyan-300">{file}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "dependents" && (
          <div>
            <p className="text-[11px] text-slate-400 mb-3">
              Files that import{" "}
              <code className="text-cyan-300 bg-slate-900 px-1 py-0.5 rounded">{filename}</code>:
            </p>
            {dependents.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
                No files import this module.
              </div>
            ) : (
              <div className="space-y-1.5">
                {dependents.map((dep) => (
                  <button
                    key={dep}
                    type="button"
                    onClick={() => onSelectNode?.(dep)}
                    className="w-full text-left p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-xs text-slate-300 font-mono flex items-center justify-between group transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span className="truncate group-hover:text-emerald-300">{dep}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-emerald-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "imports" && (
          <div>
            <p className="text-[11px] text-slate-400 mb-3">
              Modules imported inside{" "}
              <code className="text-cyan-300 bg-slate-900 px-1 py-0.5 rounded">{filename}</code>:
            </p>
            {imports.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
                This module has no internal imports.
              </div>
            ) : (
              <div className="space-y-1.5">
                {imports.map((imp) => (
                  <button
                    key={imp}
                    type="button"
                    onClick={() => onSelectNode?.(imp)}
                    className="w-full text-left p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-xs text-slate-300 font-mono flex items-center justify-between group transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <ArrowDownRight className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                      <span className="truncate group-hover:text-cyan-300">{imp}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
