import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyze } from "@cascade/core";

describe("framework and application detection", () => {
  const cases = [
    { name: "React", dependencies: { react: "19.0.0" }, entry: "src/main.tsx" },
    { name: "Vite", dependencies: { vite: "8.0.0" }, entry: "src/main.ts" },
    { name: "Next.js", dependencies: { next: "16.0.0" }, entry: "app/page.tsx" },
    { name: "Express", dependencies: { express: "5.0.0" }, entry: "src/server.ts" },
    { name: "NestJS", dependencies: { "@nestjs/core": "11.0.0" }, entry: "src/main.ts" },
  ];

  for (const fixture of cases) {
    it(`detects ${fixture.name} and its entry root`, () => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), "cascade-framework-"));
      try {
        fs.writeFileSync(
          path.join(root, "package.json"),
          JSON.stringify({ name: fixture.name.toLowerCase(), dependencies: fixture.dependencies })
        );
        const entry = path.join(root, fixture.entry);
        fs.mkdirSync(path.dirname(entry), { recursive: true });
        fs.writeFileSync(entry, "export default function bootstrap() {}");

        const result = analyze(root);
        expect(result.projects?.[0].frameworks).toContain(fixture.name);
        expect(result.entryPoints).toContain(fixture.entry.replace(/\\/g, "/"));
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    });
  }
});
