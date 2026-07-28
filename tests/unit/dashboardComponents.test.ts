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
});
