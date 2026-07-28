export const viewDefinitions = [
  ["overview", "Repository overview", "Summary and health"],
  ["projects", "Projects & workspaces", "Typed project graph"],
  ["graph", "File dependencies", "Bounded file graph"],
  ["packages", "Packages", "Package relationships"],
  ["services", "Services", "Runtime and deployment units"],
  ["cycles", "Cycles", "Strongly connected components"],
  ["deadcode", "Dead code", "Unreachable modules"],
  ["impact", "Change impact", "Affected code and entry points"],
  ["pull-request", "Pull request", "Change summary and risk"],
  ["tests", "Affected tests", "Evidence-ranked candidates"],
  ["violations", "Architecture", "Governance violations"],
  ["unresolved", "Unresolved", "Missing internal dependencies"],
  ["languages", "Languages", "Language and framework coverage"],
  ["hotspots", "Hotspots", "Coupling and blast radius"],
  ["matrix", "Matrix", "Bounded adjacency matrix"],
  ["timeline", "Snapshots", "Snapshot comparison"],
] as const;

export type ViewId = (typeof viewDefinitions)[number][0];
export const isViewId = (value: string | null): value is ViewId =>
  viewDefinitions.some(([id]) => id === value);
