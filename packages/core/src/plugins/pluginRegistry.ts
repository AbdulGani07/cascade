import {
  LanguagePlugin,
  ParseContext,
  ParseResult,
  ExtractionContext,
  DependencyExtractionResult,
  SymbolContext,
  SymbolExtractionResult,
  ResolutionContext,
  ResolvedModuleResult,
  ParseDiagnostic,
} from "@cascade/plugin-api";
import { CascadeConfig, PluginConfigSetting } from "@cascade/config";

export interface RegisteredPluginEntry {
  plugin: LanguagePlugin;
  enabled: boolean;
  priority: number;
}

export class PluginRegistry {
  private entries: RegisteredPluginEntry[] = [];

  registerPlugin(plugin: LanguagePlugin, options?: { enabled?: boolean; priority?: number }): void {
    const existingIndex = this.entries.findIndex((e) => e.plugin.id === plugin.id);
    const entry: RegisteredPluginEntry = {
      plugin,
      enabled: options?.enabled ?? true,
      priority: options?.priority ?? 50,
    };

    if (existingIndex >= 0) {
      this.entries[existingIndex] = entry;
    } else {
      this.entries.push(entry);
    }

    this.entries.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.plugin.id.localeCompare(b.plugin.id);
    });
  }

  configureWithCascadeConfig(config: CascadeConfig): void {
    if (!config.plugins) return;

    for (const pSetting of config.plugins as PluginConfigSetting[]) {
      const entry = this.entries.find((e) => e.plugin.id === pSetting.id);
      if (entry) {
        if (pSetting.enabled !== undefined) entry.enabled = pSetting.enabled;
        if (pSetting.priority !== undefined) entry.priority = pSetting.priority;
      }
    }

    this.entries.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.plugin.id.localeCompare(b.plugin.id);
    });
  }

  getRegisteredPlugins(): LanguagePlugin[] {
    return this.entries.filter((e) => e.enabled).map((e) => e.plugin);
  }

  findPluginForFile(filePath: string, _relativePath?: string): LanguagePlugin | null {
    const enabledEntries = this.entries.filter((e) => e.enabled);

    for (const entry of enabledEntries) {
      const plugin = entry.plugin;

      const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
      if (plugin.supportedExtensions.some((e) => e.toLowerCase() === ext)) {
        return plugin;
      }

      for (const rule of plugin.fileDetectionRules) {
        if (rule.type === "extension" && ext === rule.pattern.toLowerCase()) {
          return plugin;
        }
        if (rule.type === "filename" && filePath.endsWith(rule.pattern)) {
          return plugin;
        }
      }
    }

    return null;
  }

  /**
   * Isolated Parse Execution Wrapper.
   */
  safeParse(plugin: LanguagePlugin, context: ParseContext): ParseResult {
    try {
      return plugin.parser.parse(context) as ParseResult;
    } catch (err) {
      const diag: ParseDiagnostic = {
        file: context.relativePath,
        message: `Plugin '${plugin.id}' crashed during parse: ${(err as Error).message}`,
        severity: "error",
      };
      return {
        status: "failed",
        diagnostics: [diag],
      };
    }
  }

  /**
   * Isolated Dependency Extraction Wrapper.
   */
  safeExtractDependencies(
    plugin: LanguagePlugin,
    context: ExtractionContext
  ): DependencyExtractionResult {
    try {
      return plugin.dependencyExtractor.extractDependencies(context) as DependencyExtractionResult;
    } catch (err) {
      const diag: ParseDiagnostic = {
        file: context.relativePath,
        message: `Plugin '${plugin.id}' crashed during dependency extraction: ${(err as Error).message}`,
        severity: "error",
      };
      return {
        dependencies: [],
        diagnostics: [diag],
      };
    }
  }

  /**
   * Isolated Symbol Extraction Wrapper.
   */
  safeExtractSymbols(plugin: LanguagePlugin, context: SymbolContext): SymbolExtractionResult {
    if (!plugin.symbolExtractor || !plugin.capabilities.symbolExtraction) {
      return { declarations: [], references: [], diagnostics: [] };
    }

    try {
      return plugin.symbolExtractor.extractSymbols(context) as SymbolExtractionResult;
    } catch (err) {
      const diag: ParseDiagnostic = {
        file: context.relativePath,
        message: `Plugin '${plugin.id}' crashed during symbol extraction: ${(err as Error).message}`,
        severity: "warning",
      };
      return {
        declarations: [],
        references: [],
        diagnostics: [diag],
      };
    }
  }

  /**
   * Isolated Module Resolution Wrapper.
   */
  safeResolveModule(plugin: LanguagePlugin, context: ResolutionContext): ResolvedModuleResult {
    try {
      return plugin.moduleResolver.resolveModule(context) as ResolvedModuleResult;
    } catch (err) {
      const diag: ParseDiagnostic = {
        file: context.importerRelativePath,
        message: `Plugin '${plugin.id}' crashed during module resolution: ${(err as Error).message}`,
        severity: "warning",
      };
      return {
        resolutionStatus: "unresolved",
        confidence: 0,
        resolverId: `${plugin.id}-fallback-resolver`,
        diagnostics: [diag],
      };
    }
  }
}
