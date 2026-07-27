import { Handle, Position } from "reactflow";

export interface FileNodeData {
  label: string;
  status: "normal" | "cycle" | "dead" | "entry";
}

/**
 * Renders a single file as a React Flow graph node.
 */
export default function FileNode(props: { data: FileNodeData }) {
  const statusStyles = {
    entry: "border-yellow-500 bg-yellow-50",
    cycle: "border-red-500 bg-red-100",
    dead: "border-gray-400 bg-gray-100",
    normal: "border-blue-400 bg-blue-50",
  };

  return (
    <div
      className={`w-40 rounded-lg border-2 p-3 text-sm shadow-sm ${
        statusStyles[props.data.status]
      }`}
    >
      <Handle type="target" position={Position.Top} />

      <div className="truncate text-center font-medium">
        {props.data.label}
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}