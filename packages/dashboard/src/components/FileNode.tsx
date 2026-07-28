import { Handle, Position } from "reactflow";
import { Play, AlertTriangle, Trash2, FileCode, ArrowDownRight, ArrowUpRight } from "lucide-react";

export interface FileNodeData {
  label: string;
  fullPath?: string;
  status: "normal" | "cycle" | "dead" | "entry";
  isSelected?: boolean;
  isHighlighted?: boolean;
  inDegree?: number;
  outDegree?: number;
  language?: string;
  layoutDirection?: "TB" | "LR";
}

/**
 * Renders an interactive file node for the dependency graph with rich status cues.
 */
export default function FileNode({ data }: { data: FileNodeData }) {
  const isLR = data.layoutDirection === "LR";
  const targetPos = isLR ? Position.Left : Position.Top;
  const sourcePos = isLR ? Position.Right : Position.Bottom;

  const ext = data.label.includes(".")
    ? (data.label.split(".").pop()?.toUpperCase() ?? "CODE")
    : "FILE";

  const getStatusBadge = () => {
    switch (data.status) {
      case "entry":
        return {
          icon: <Play className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />,
          label: "Entry",
          bg: "bg-amber-950/60 border-amber-500/80 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.25)]",
          badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/30",
        };
      case "cycle":
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />,
          label: "Cycle",
          bg: "bg-rose-950/60 border-rose-500/80 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.3)]",
          badgeBg: "bg-rose-500/20 text-rose-300 border-rose-500/30",
        };
      case "dead":
        return {
          icon: <Trash2 className="w-3.5 h-3.5 text-slate-400" />,
          label: "Unused",
          bg: "bg-slate-900/80 border-slate-700 text-slate-400 opacity-80",
          badgeBg: "bg-slate-800 text-slate-400 border-slate-700",
        };
      case "normal":
      default:
        return {
          icon: <FileCode className="w-3.5 h-3.5 text-cyan-400" />,
          label: "Module",
          bg: "bg-slate-900/90 border-slate-700/80 text-slate-200 shadow-lg",
          badgeBg: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
        };
    }
  };

  const statusInfo = getStatusBadge();

  let borderStyle = statusInfo.bg;
  if (data.isSelected) {
    borderStyle =
      "bg-slate-900 border-cyan-400 text-white ring-2 ring-cyan-400/80 shadow-[0_0_25px_rgba(34,211,238,0.5)] scale-105 z-20";
  } else if (data.isHighlighted) {
    borderStyle =
      "bg-slate-900/95 border-amber-400/90 text-amber-100 ring-1 ring-amber-400/50 shadow-[0_0_20px_rgba(251,191,36,0.3)] z-10";
  }

  return (
    <div
      className={`relative min-w-[180px] max-w-[220px] rounded-xl border p-3 transition-all duration-200 backdrop-blur-md cursor-pointer group ${borderStyle}`}
    >
      <Handle
        type="target"
        position={targetPos}
        className="!w-3 !h-3 !bg-cyan-400 !border-2 !border-slate-900 hover:!scale-125 transition-transform"
      />

      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {statusInfo.icon}
          <span
            className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded border ${statusInfo.badgeBg}`}
          >
            {ext}
          </span>
        </div>
        <span
          className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${statusInfo.badgeBg} whitespace-nowrap`}
        >
          {statusInfo.label}
        </span>
      </div>

      <div
        className="font-mono text-xs font-semibold truncate text-slate-100 group-hover:text-cyan-300 transition-colors"
        title={data.fullPath || data.label}
      >
        {data.label}
      </div>

      {(data.inDegree !== undefined || data.outDegree !== undefined) && (
        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-800 text-[10px] text-slate-400 font-mono">
          <div
            className="flex items-center gap-0.5 text-emerald-400"
            title="Dependents (imported by)"
          >
            <ArrowUpRight className="w-3 h-3" />
            <span>{data.inDegree ?? 0}</span>
          </div>
          <div className="flex items-center gap-0.5 text-cyan-400" title="Dependencies (imports)">
            <ArrowDownRight className="w-3 h-3" />
            <span>{data.outDegree ?? 0}</span>
          </div>
        </div>
      )}

      <Handle
        type="source"
        position={sourcePos}
        className="!w-3 !h-3 !bg-cyan-400 !border-2 !border-slate-900 hover:!scale-125 transition-transform"
      />
    </div>
  );
}
