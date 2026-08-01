import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("dashboard component contracts", () => {
  const component = (name: string) =>
    fs.readFileSync(
      path.join(process.cwd(), "packages", "dashboard", "src", "components", name),
      "utf8"
    );

  it("provides semantic overview drill-down controls", () => {
    const source = component("Overview.tsx");
    expect(source).toContain('aria-label="Repository overview"');
    expect(source).toContain('type="button"');
    expect(source).toContain("onOpen(view)");
  });

  it("supports keyboard search and modal dismissal", () => {
    const source = component("CommandPalette.tsx");
    expect(source).toContain('role="dialog"');
    expect(source).toContain('event.key === "Escape"');
    expect(source).toContain("input.current?.focus()");
  });

  it("renders repository values through React text interpolation", () => {
    const sources = ["Overview.tsx", "WorkspaceView.tsx", "ImpactPanel.tsx"]
      .map(component)
      .join("\n");
    expect(sources).not.toContain("dangerouslySetInnerHTML");
    expect(sources).not.toContain("innerHTML =");
  });

  it("renders explicit loading, error, empty, and partial-analysis states", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "packages", "dashboard", "src", "App.tsx"),
      "utf8"
    );
    expect(source).toContain("Loading the local analysis report");
    expect(source).toContain("Dashboard could not load this report");
    expect(source).toContain("No analyzable files found");
    expect(source).toContain("Partial analysis:");
  });

  it("supports multidimensional search and bounded oversized lists", () => {
    const sources = [component("Sidebar.tsx"), component("CommandPalette.tsx")].join("\n");
    expect(sources).toContain("node.symbols?.map");
    expect(sources).toContain("node.packageOrWorkspace");
    expect(sources).toContain("node.language");
    expect(sources).toContain("slice(0, 500)");
  });

  it("shows complete edge provenance without inventing missing values", () => {
    const source = component("ImpactPanel.tsx");
    for (const label of [
      "Source",
      "Target",
      "Relationship",
      "Resolver / plugin",
      "Confidence",
      "Analysis level",
      "Unresolved reason",
    ])
      expect(source).toContain(label);
    expect(source).toContain("not supplied");
  });
});
