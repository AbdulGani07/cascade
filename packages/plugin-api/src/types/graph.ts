/**
 * Language-agnostic graph model, node metadata, edge provenance, and analysis schema definitions.
 */

export type FileCategory =
  "source" | "test" | "config" | "generated" | "documentation" | "asset" | "unknown";

export type ParseStatus = "success" | "partial" | "failed";

export interface SourceLocation {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export interface ParseDiagnostic {
  file: string;
  message: string;
  severity: "error" | "warning" | "info";
  code?: string;
  location?: SourceLocation;
}

export interface SymbolDeclaration {
  id: string;
  name: string;
  kind: "function" | "class" | "interface" | "type" | "variable" | "enum" | "module" | "other";
  exported: boolean;
  location?: SourceLocation;
}

export interface SymbolReference {
  name: string;
  sourceFile: string;
  targetSymbolId?: string;
  location?: SourceLocation;
}

export interface PluginProvenance {
  pluginId: string;
  pluginVersion: string;
}

export interface ResolverProvenance {
  resolverId: string;
  pluginId: string;
}

export interface FileMetrics {
  lineCount: number;
  byteSize: number;
  symbolCount: number;
  dependencyCount: number;
}

/** Represents a file node in the dependency graph. */
export interface DependencyNode {
  /** Stable relative POSIX path ID (e.g. "src/utils/math.ts") */
  id: string;
  /** Absolute path on host system */
  absolutePath: string;
  /** Relative path for display */
  relativePath: string;
  /** Primary language identifier (e.g. "typescript", "javascript", "python", "go") */
  language: string;
  /** Functional category of file */
  fileCategory: FileCategory;
  /** Workspace or sub-package name */
  packageOrWorkspace?: string;
  /** Associated sub-project */
  project?: string;
  /** Is designated as an entry point */
  isEntryPoint: boolean;
  /** Is identified as a test file */
  isTestFile: boolean;
  /** Is identified as machine-generated code */
  isGeneratedFile: boolean;
  /** AST / dependency parsing status */
  parseStatus: ParseStatus;
  /** File metrics */
  metrics?: FileMetrics;
  /** Extracted symbol declarations */
  symbols?: SymbolDeclaration[];
  /** Provenance of the plugin that processed this node */
  pluginProvenance: PluginProvenance;
  /** Parse or resolution warnings/diagnostics */
  diagnostics?: ParseDiagnostic[];
}

export type ImportKind =
  | "static"
  | "dynamic"
  | "re-export"
  | "type-only"
  | "side-effect"
  | "conditional"
  | "reference"
  | "asset";

export type EdgeType =
  | "import"
  | "export"
  | "re-export"
  | "dynamic-import"
  | "type-import"
  | "asset-import"
  | "cross-language"
  | "reference";

export type ResolutionStatus = "resolved" | "unresolved" | "external" | "ambiguous";

/** Represents a directed edge (dependency) between two nodes in the graph. */
export interface DependencyEdge {
  /** Stable unique edge identifier */
  id: string;
  /** Source node ID (importer / consumer) */
  from: string;
  /** Target node ID or unresolved specifier */
  to: string;
  /** Structural edge type */
  edgeType: EdgeType;
  /** Legacy kind alias for backwards compatibility */
  kind?: ImportKind;
  /** Import execution semantics */
  importKind: ImportKind;
  /** Is evaluated at static module load time */
  isStatic: boolean;
  /** Is evaluated lazily or dynamically at runtime */
  isDynamic: boolean;
  /** Is purely a type-level import removed at emit time */
  isTypeOnly: boolean;
  /** Is a re-export statement (export * from ...) */
  isReExport: boolean;
  /** Is conditional (e.g. within an if block or dynamic flag) */
  isConditional: boolean;
  /** Resolution outcome */
  resolutionStatus: ResolutionStatus;
  /** Source location in importer file */
  sourceLocation?: SourceLocation;
  /** Extracted raw specifier or code evidence string */
  extractedText?: string;
  /** Provenance of module resolver */
  resolverProvenance: ResolverProvenance;
  /** Resolution confidence (0.0 to 1.0) */
  confidence: number;
  dependencyCategory?: "internal" | "standard-library" | "external" | "unresolved";
  evidence?: string[];
}

/** Complete Graph data structure with query methods. */
export interface Graph {
  nodes: Map<string, DependencyNode>;
  edges: DependencyEdge[];
  neighborsOf(id: string): string[];
  incomingTo(id: string): string[];
}

export interface ImpactReport {
  target: string;
  directlyAffected: string[];
  allAffected: string[];
  isSafeToDelete: boolean;
}

export interface EntryPointEvidence {
  file: string;
  confidence: number;
  reason: string;
  project?: string;
  kind: "configured" | "package" | "framework" | "convention" | "test";
}

export interface DeadCodeFinding {
  file: string;
  confidence: number;
  evidence: string[];
}

export interface Warning {
  file: string;
  message: string;
}

export interface PluginSummary {
  id: string;
  name: string;
  version: string;
  supportedExtensions: string[];
  capabilities: Record<string, boolean>;
  analysisLevels: readonly import("./plugin.js").AnalysisLevel[];
  limitations: {
    knownIssues: string[];
    unsupportedFeatures: string[];
  };
}

/** Schema version 2.0 analysis result payload with backwards compatibility for 1.0 */
export interface AnalysisResult {
  version: "2.0" | "1.0";
  generatedAt: string;
  projectRoot: string;
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  cycles: string[][];
  deadFiles: string[];
  deadCodeFindings?: DeadCodeFinding[];
  entryPoints: string[];
  entryPointEvidence?: EntryPointEvidence[];
  impact: Record<string, ImpactReport>;
  warnings: Warning[];
  diagnostics?: ParseDiagnostic[];
  pluginManifests?: PluginSummary[];
  projects?: import("./project.js").ProjectInfo[];
  projectGraph?: import("./project.js").ProjectGraph;
  projectImpact?: Record<string, import("./project.js").ProjectImpactReport>;
  governance?: import("./governance.js").ArchitectureGovernanceReport;
  /** Optional Git comparison attached for dashboard and exported dataset views. */
  gitImpact?: import("./gitImpact.js").GitImpactReport;
}
