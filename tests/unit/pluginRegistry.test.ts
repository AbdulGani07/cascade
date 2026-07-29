import { describe, it, expect } from "vitest";
import { PluginRegistry } from "@cascade-code/core";
import { createMockLanguagePlugin, assertPluginCapabilities } from "@cascade-code/test-utils";

describe("PluginRegistry & Plugin Architecture", () => {
  it("registers plugins deterministically and sorts by priority", () => {
    const registry = new PluginRegistry();

    const pluginLow = createMockLanguagePlugin({
      id: "plugin-low",
      supportedExtensions: [".low"],
    });

    const pluginHigh = createMockLanguagePlugin({
      id: "plugin-high",
      supportedExtensions: [".high"],
    });

    registry.registerPlugin(pluginLow, { priority: 10 });
    registry.registerPlugin(pluginHigh, { priority: 100 });

    const registered = registry.getRegisteredPlugins();
    expect(registered.length).toBe(2);
    expect(registered[0].id).toBe("plugin-high");
    expect(registered[1].id).toBe("plugin-low");
  });

  it("selects highest-priority matching plugin for a given file extension", () => {
    const registry = new PluginRegistry();

    const pluginBase = createMockLanguagePlugin({
      id: "js-base",
      supportedExtensions: [".js"],
    });

    const pluginOverride = createMockLanguagePlugin({
      id: "js-override",
      supportedExtensions: [".js"],
    });

    registry.registerPlugin(pluginBase, { priority: 10 });
    registry.registerPlugin(pluginOverride, { priority: 50 });

    const match = registry.findPluginForFile("/project/src/index.js", "src/index.js");
    expect(match).not.toBeNull();
    expect(match?.id).toBe("js-override");
  });

  it("handles capability negotiation correctly", () => {
    const plugin = createMockLanguagePlugin({
      capabilities: {
        astParsing: true,
        symbolExtraction: true,
        dynamicDependencies: false,
        reExports: false,
        typeOnlyDependencies: false,
        moduleResolution: true,
        entryPointDetection: false,
        testFileDetection: false,
        generatedFileDetection: false,
        crossLanguageEdges: false,
      },
    });

    expect(() => {
      assertPluginCapabilities(plugin, { astParsing: true, symbolExtraction: true });
    }).not.toThrow();

    expect(() => {
      assertPluginCapabilities(plugin, { dynamicDependencies: true });
    }).toThrow("missing required capability");
  });

  it("isolates plugin crashes during parse without halting execution", async () => {
    const registry = new PluginRegistry();

    const buggyPlugin = createMockLanguagePlugin({
      id: "buggy-plugin",
      supportedExtensions: [".bug"],
      parser: {
        parse() {
          throw new Error("Unexpected parser crash inside plugin!");
        },
      },
    });

    registry.registerPlugin(buggyPlugin);

    const parseResult = await registry.safeParse(buggyPlugin, {
      filePath: "/app/test.bug",
      relativePath: "test.bug",
      content: "buggy code",
    });

    expect(parseResult.status).toBe("failed");
    expect(parseResult.diagnostics.length).toBe(1);
    expect(parseResult.diagnostics[0].message).toContain("crashed during parse");
  });
});
