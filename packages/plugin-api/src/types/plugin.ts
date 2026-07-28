import {
  DependencyNode,
  DependencyEdge,
  ParseDiagnostic,
  SourceLocation,
  SymbolDeclaration,
  SymbolReference,
  ImportKind,
} from "./graph.js";

/** Declared plugin functional capabilities */
export interface PluginCapabilities {
  astParsing: boolean;
  symbolExtraction: boolean;
  dynamicDependencies: boolean;
  reExports: boolean;
  typeOnlyDependencies: boolean;
  moduleResolution: boolean;
  entryPointDetection: boolean;
  testFileDetection: boolean;
  generatedFileDetection: boolean;
  crossLanguageEdges: boolean;
}

/** Declared plugin limitations */
export interface PluginLimitations {
  knownIssues: string[];
  unsupportedFeatures: string[];
}

export type AnalysisLevel =
  | "file-dependency"
  | "module-dependency"
  | "symbol-dependency"
  | "build-dependency"
  | "runtime-dynamic-dependency";

export interface FileDetectionRule {
  type: "extension" | "filename" | "shebang" | "content-pattern" | "glob";
  pattern: string;
}

export interface ParseContext {
  filePath: string;
  relativePath: string;
  content: string;
  options?: Record<string, unknown>;
}

export interface ParseResult {
  ast?: unknown;
  status: "success" | "partial" | "failed";
  diagnostics: ParseDiagnostic[];
}

export interface ParserAdapter {
  parse(context: ParseContext): Promise<ParseResult> | ParseResult;
}

export interface ExtractedDependency {
  specifier: string;
  importKind: ImportKind;
  isStatic: boolean;
  isDynamic: boolean;
  isTypeOnly: boolean;
  isReExport: boolean;
  isConditional: boolean;
  sourceLocation?: SourceLocation;
  rawText?: string;
  importedNames?: string[];
  confidence?: number;
  evidence?: string[];
}

export interface ExtractionContext {
  filePath: string;
  relativePath: string;
  content: string;
  ast?: unknown;
}

export interface DependencyExtractionResult {
  dependencies: ExtractedDependency[];
  diagnostics: ParseDiagnostic[];
}

export interface DependencyExtractor {
  extractDependencies(
    context: ExtractionContext
  ): Promise<DependencyExtractionResult> | DependencyExtractionResult;
}

export interface SymbolContext {
  filePath: string;
  relativePath: string;
  content: string;
  ast?: unknown;
}

export interface SymbolExtractionResult {
  declarations: SymbolDeclaration[];
  references: SymbolReference[];
  diagnostics: ParseDiagnostic[];
}

export interface SymbolExtractor {
  extractSymbols(context: SymbolContext): Promise<SymbolExtractionResult> | SymbolExtractionResult;
}

export interface ResolutionContext {
  specifier: string;
  importerFilePath: string;
  importerRelativePath: string;
  projectRoot: string;
  extractedDependency: ExtractedDependency;
  allKnownFiles: string[];
}

export interface ResolvedModuleResult {
  resolvedFilePath?: string;
  resolvedRelativePath?: string;
  resolutionStatus: "resolved" | "unresolved" | "external" | "ambiguous";
  confidence: number;
  resolverId: string;
  diagnostics?: ParseDiagnostic[];
  dependencyCategory?: "internal" | "standard-library" | "external" | "unresolved";
  evidence?: string[];
}

export interface ModuleResolver {
  resolveModule(context: ResolutionContext): Promise<ResolvedModuleResult> | ResolvedModuleResult;
}

export interface EntryPointHint {
  filePath: string;
  relativePath: string;
  reason: string;
  confidence: number;
}

export interface EntryPointHintProvider {
  detectEntryPoints(
    projectRoot: string,
    files: string[]
  ): Promise<EntryPointHint[]> | EntryPointHint[];
}

export interface TestFileDetector {
  isTestFile(filePath: string, relativePath: string): boolean;
}

export interface GeneratedFileDetector {
  isGeneratedFile(filePath: string, relativePath: string, content?: string): boolean;
}

export interface ConfigFileDetector {
  isConfigFile(filePath: string, relativePath: string): boolean;
}

export interface FrameworkMetadata {
  frameworkName: string;
  version?: string;
  routes?: Array<{ path: string; handlerFile: string }>;
  metadata?: Record<string, unknown>;
}

export interface FrameworkMetadataProvider {
  detectMetadata(
    projectRoot: string,
    files: string[]
  ): Promise<FrameworkMetadata[]> | FrameworkMetadata[];
}

export interface AnalysisContext {
  nodes: Map<string, DependencyNode>;
  edges: DependencyEdge[];
  projectRoot: string;
}

export interface LanguageAnalysisResult {
  customDiagnostics: ParseDiagnostic[];
  additionalEdges?: DependencyEdge[];
}

export interface AnalysisProvider {
  analyzeGraph(context: AnalysisContext): Promise<LanguageAnalysisResult> | LanguageAnalysisResult;
}

/**
 * Core Language Plugin interface required for any programming language adapter in Cascade.
 */
export interface LanguagePlugin {
  /** Unique plugin identifier (e.g. "cascade-language-typescript") */
  id: string;
  /** Human-readable plugin name */
  name: string;
  /** Semantic version string */
  version: string;
  /** Supported file extensions including dot (e.g. [".ts", ".tsx"]) */
  supportedExtensions: string[];
  /** Rules used to match files to this plugin */
  fileDetectionRules: FileDetectionRule[];
  /** Capability flags declared by this plugin */
  capabilities: PluginCapabilities;
  /** Declared limitations */
  limitations: PluginLimitations;
  /** Explicit granularity this plugin can evidence; absence of a level is not implied support. */
  analysisLevels: readonly AnalysisLevel[];

  /** Parser implementation */
  parser: ParserAdapter;
  /** Dependency extraction sub-adapter */
  dependencyExtractor: DependencyExtractor;
  /** Module resolution sub-adapter */
  moduleResolver: ModuleResolver;

  /** Optional symbol extraction sub-adapter */
  symbolExtractor?: SymbolExtractor;
  /** Optional entry point hints detector */
  entryPointHints?: EntryPointHintProvider;
  /** Optional test file detector */
  testFileDetector?: TestFileDetector;
  /** Optional generated file detector */
  generatedFileDetector?: GeneratedFileDetector;
  /** Optional configuration file detector */
  configFileDetector?: ConfigFileDetector;
  /** Optional framework metadata provider */
  frameworkMetadata?: FrameworkMetadataProvider;
  /** Optional custom language graph analyzer */
  analysisProvider?: AnalysisProvider;
}
