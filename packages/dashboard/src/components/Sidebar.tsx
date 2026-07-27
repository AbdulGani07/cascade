import { useState } from "react";

interface SidebarProps {
  fileIds: string[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/**
 * Provides a searchable file list for selecting graph nodes.
 */
export default function Sidebar({
  fileIds,
  selectedId,
  onSelect,
}: SidebarProps) {
  const [search, setSearch] = useState("");

  const filteredFiles = fileIds.filter((id) =>
    id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-gray-50 p-4">
      <input
        type="text"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search files..."
        className="mb-4 rounded border px-3 py-2 text-sm"
      />

      <div className="flex-1 overflow-y-auto">
        <ul className="space-y-1">
          {filteredFiles.map((id) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => onSelect(id)}
                className={`w-full truncate rounded px-3 py-2 text-left text-sm ${
                  selectedId === id
                    ? "bg-blue-200"
                    : "hover:bg-gray-200"
                }`}
              >
                {id}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}