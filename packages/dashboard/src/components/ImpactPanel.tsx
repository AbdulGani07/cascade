interface ImpactReport {
  directlyAffected: string[];
  allAffected: string[];
  isSafeToDelete: boolean;
}

interface ImpactPanelProps {
  selectedId: string | null;
  impact: Record<string, ImpactReport> | undefined;
}

/**
 * Displays the impact analysis for the currently selected file.
 */
export default function ImpactPanel({
  selectedId,
  impact,
}: ImpactPanelProps) {
  if (!selectedId) {
    return (
      <aside className="p-4 text-gray-500">
        Select a file to see its impact.
      </aside>
    );
  }

  const report = impact?.[selectedId];

  if (!report) {
    return (
      <aside className="p-4 text-gray-500">
        Impact data is unavailable for this file.
      </aside>
    );
  }

  if (report.isSafeToDelete) {
    return (
      <aside className="p-4">
        <div className="rounded bg-green-100 p-3 text-green-800">
          Safe to delete - nothing depends on this file.
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-full flex-col p-4">
      <div className="mb-3 rounded bg-red-100 p-3 text-red-800">
        Deleting this file would affect{" "}
        {report.allAffected.length} file(s).
      </div>

      <div className="flex-1 overflow-y-auto">
        <ul className="space-y-1 text-sm">
          {report.allAffected.map((file) => (
            <li
              key={file}
              className="rounded bg-gray-100 px-2 py-1"
            >
              {file}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}