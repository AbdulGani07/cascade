import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { defaultConfig, loadCascadeConfig } from "../../packages/config/src/index.js";
import { analyze } from "../../packages/core/src/index.js";
import { toJson } from "../../packages/core/src/export/jsonExporter.js";
import { MarkdownReporter } from "../../packages/reporters/src/markdownReporter.js";
import { SarifReporter } from "../../packages/reporters/src/sarifReporter.js";

const roots: string[] = [];
function root(): string {
  const value = fs.mkdtempSync(path.join(os.tmpdir(), "cascade-security-"));
  roots.push(value);
  return value;
}
afterEach(() => {
  delete process.env.CASCADE_CONFIG_PATH;
  for (const value of roots.splice(0)) fs.rmSync(value, { recursive: true, force: true });
});

describe("hostile repository boundaries", () => {
  it("rejects unknown and prototype-sensitive configuration keys", () => {
    const project = root();
    fs.writeFileSync(path.join(project, "cascade.config.json"), '{"unexpected":true}');
    expect(() => loadCascadeConfig(project)).toThrow(/Unknown Cascade configuration key/);
    fs.writeFileSync(
      path.join(project, "cascade.config.json"),
      '{"pathAliases":{"__proto__":"x"}}'
    );
    expect(() => loadCascadeConfig(project)).toThrow(/Unsafe configuration key/);
  });

  it("rejects oversized files before parsing", () => {
    const project = root();
    fs.writeFileSync(path.join(project, "large.ts"), "x".repeat(128));
    expect(() =>
      analyze(project, {
        config: { ...defaultConfig, maxFileSizeBytes: 64 },
      })
    ).toThrow(/RESOURCE_LIMIT/);
  });

  it("does not follow symlinks by default", () => {
    const project = root();
    const outside = root();
    fs.writeFileSync(path.join(outside, "secret.ts"), "export const secret = 1;");
    try {
      fs.symlinkSync(outside, path.join(project, "linked"), "junction");
    } catch {
      return;
    }
    expect(analyze(project).nodes).toHaveLength(0);
    expect(() => analyze(project, { config: { ...defaultConfig, symlinks: "internal" } })).toThrow(
      /SECURITY_PATH_ESCAPE/
    );
  });

  it("emits relative paths and redacts credentials", () => {
    const project = root();
    const file = path.join(project, "token.ts");
    fs.writeFileSync(file, "export const value = 1;");
    const result = analyze(project);
    const fakeToken = ["github", "pat", "abcdefghijklmnopqrstuvwxyz123456"].join("_");
    result.warnings.push({
      file,
      message: `token=${fakeToken}`,
    });
    const output = toJson(result);
    expect(output).not.toContain(project);
    expect(output).not.toContain(fakeToken);
    expect(JSON.parse(output).projectRoot).toBe(".");
    expect(JSON.parse(output).nodes[0].absolutePath).toBe("token.ts");
  });

  it("rejects configuration paths outside the project", () => {
    const project = root();
    const outside = root();
    const config = path.join(outside, "cascade.config.json");
    fs.writeFileSync(config, "{}");
    process.env.CASCADE_CONFIG_PATH = config;
    expect(() => loadCascadeConfig(project)).toThrow(/inside the analyzed project root/);
  });

  it("neutralizes Markdown and SARIF filename injection", () => {
    const project = root();
    fs.writeFileSync(path.join(project, "safe.ts"), "export const safe = 1;");
    const result = analyze(project);
    result.deadFiles = ["bad`\n<script>alert(1)</script>.ts"];
    const markdown = new MarkdownReporter().render(result);
    expect(markdown).not.toContain("<script>");
    expect(markdown).not.toContain("bad`\n");
    const sarif = JSON.parse(new SarifReporter().render(result));
    const uri = sarif.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri;
    expect(uri).not.toContain("\n");
    expect(uri).not.toMatch(/^file:/);
  });

  it("keeps the dashboard loopback-only and token protected", () => {
    const source = fs.readFileSync(path.resolve("packages/cli/src/commands/dashboard.ts"), "utf8");
    expect(source).toContain('server.listen(4000, "127.0.0.1"');
    expect(source).toContain("HttpOnly; SameSite=Strict");
    expect(source).toContain("Content-Security-Policy");
    expect(source).not.toContain('path.join(absPath, "analysis.json")');
  });
});
