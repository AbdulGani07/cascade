export type WorkspaceFilters = {
  language: string;
  project: string;
  packageName: string;
  fileType: string;
  dependencyType: string;
  status: string;
  confidence: string;
  severity: string;
};
export const emptyFilters: WorkspaceFilters = {
  language: "all",
  project: "all",
  packageName: "all",
  fileType: "all",
  dependencyType: "all",
  status: "all",
  confidence: "all",
  severity: "all",
};
