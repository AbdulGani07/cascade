import {
  LanguagePlugin,
  PluginCapabilities,
  DependencyNode,
  DependencyEdge,
  Graph,
  ParseContext,
  ExtractionContext,
  ResolutionContext,
} from "@cascade/plugin-api";

export function createMockLanguagePlugin(overrides?: Partial<LanguagePlugin>): LanguagePlugin {
  const defaultPlugin: LanguagePlugin = {
    id: "mock-plugin",
    name: "Mock Language Plugin",
    version: "1.0.0",
    supportedExtensions: [".mock"],
    fileDetectionRules: [{ type: "extension", pattern: ".mock" }],
    capabilities: {
      astParsing: true,
      symbolExtraction: false,
      dynamicDependencies: false,
      reExports: false,
      typeOnlyDependencies: false,
      moduleResolution: true,
      entryPointDetection: false,
      testFileDetection: false,
      generatedFileDetection: false,
      crossLanguageEdges: false,
    },
    limitations: {
      knownIssues: [],
      unsupportedFeatures: [],
    },
    analysisLevels: ["file-dependency", "module-dependency"],
    parser: {
      parse(context: ParseContext) {
        return { status: "success", diagnostics: [], ast: { mockFile: context.relativePath } };
      },
    },
    dependencyExtractor: {
      extractDependencies(_context: ExtractionContext) {
        return { dependencies: [], diagnostics: [] };
      },
    },
    moduleResolver: {
      resolveModule(_context: ResolutionContext) {
        return {
          resolutionStatus: "unresolved",
          confidence: 0,
          resolverId: "mock-resolver",
        };
      },
    },
  };

  return { ...defaultPlugin, ...overrides };
}

export function assertPluginCapabilities(
  plugin: LanguagePlugin,
  required: Partial<PluginCapabilities>
): void {
  for (const [key, val] of Object.entries(required)) {
    const capKey = key as keyof PluginCapabilities;
    if (val && !plugin.capabilities[capKey]) {
      throw new Error(
        `Capability assertion failed: Plugin '${plugin.id}' missing required capability '${String(capKey)}'`
      );
    }
  }
}

export async function runIsolatedPluginTest(
  plugin: LanguagePlugin,
  fileContent: string,
  relativePath: string
) {
  const parseContext = {
    filePath: `/test/${relativePath}`,
    relativePath,
    content: fileContent,
  };

  const parseResult = await plugin.parser.parse(parseContext);
  const extractContext = {
    filePath: parseContext.filePath,
    relativePath,
    content: fileContent,
    ast: parseResult.ast,
  };

  const depsResult = await plugin.dependencyExtractor.extractDependencies(extractContext);
  return { parseResult, depsResult };
}

export function createTestGraph(nodesList: DependencyNode[], edgesList: DependencyEdge[]): Graph {
  const map = new Map<string, DependencyNode>();
  nodesList.forEach((n) => map.set(n.id, n));

  return {
    nodes: map,
    edges: edgesList,
    neighborsOf(id: string) {
      return edgesList.filter((e) => e.from === id).map((e) => e.to);
    },
    incomingTo(id: string) {
      return edgesList.filter((e) => e.to === id).map((e) => e.from);
    },
  };
}
