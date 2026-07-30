import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const packageRoot = path.join(root, "packages");
const repositoryUrl = "https://github.com/AbdulGani07/cascade.git";
const runPackageManager = (command, args, options) =>
  process.platform === "win32"
    ? execFileSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", command, ...args], options)
    : execFileSync(command, args, options);
const publicNames = new Set([
  "@cascade-code/cli",
  "@cascade-code/config",
  "@cascade-code/core",
  "@cascade-code/editor-service",
  "@cascade-code/language-c",
  "@cascade-code/language-cpp",
  "@cascade-code/language-csharp",
  "@cascade-code/language-expanded",
  "@cascade-code/language-go",
  "@cascade-code/language-java",
  "@cascade-code/language-javascript",
  "@cascade-code/language-kotlin",
  "@cascade-code/language-python",
  "@cascade-code/language-rust",
  "@cascade-code/language-typescript",
  "@cascade-code/plugin-api",
  "@cascade-code/reporters",
]);
const privateNames = new Set([
  "@cascade-code/dashboard",
  "@cascade-code/test-utils",
  "cascade-code-intelligence",
]);
const manifests = readdirSync(packageRoot)
  .map((directory) => ({
    directory,
    file: path.join(packageRoot, directory, "package.json"),
  }))
  .filter(({ file }) => {
    try {
      return statSync(file).isFile();
    } catch {
      return false;
    }
  })
  .map((entry) => ({
    ...entry,
    manifest: JSON.parse(readFileSync(entry.file, "utf8")),
  }));
const publicVersions = new Set(
  manifests.filter(({ manifest }) => !manifest.private).map(({ manifest }) => manifest.version),
);
const releaseVersion = [...publicVersions][0];

const failures = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

assert(manifests.length === 20, `expected 20 workspaces, found ${manifests.length}`);
assert(publicVersions.size === 1, "public packages must use one lockstep version");
assert(
  manifests.filter(({ manifest }) => !manifest.private).length === publicNames.size,
  `expected ${publicNames.size} public packages`,
);
for (const { directory, manifest } of manifests) {
  const isPrivate = privateNames.has(manifest.name);
  assert(manifest.private === isPrivate, `${manifest.name}: private must be ${isPrivate}`);
  assert(manifest.license === "MIT", `${manifest.name}: missing MIT license`);
  assert(manifest.repository?.url === repositoryUrl, `${manifest.name}: incorrect repository URL`);
  assert(
    manifest.repository?.directory === `packages/${directory}`,
    `${manifest.name}: incorrect repository directory`,
  );
  assert(manifest.engines?.node === ">=22.13.0", `${manifest.name}: incorrect Node policy`);
  if (isPrivate) {
    assert(!manifest.publishConfig, `${manifest.name}: private package has publishConfig`);
  } else {
    assert(
      manifest.version === releaseVersion,
      `${manifest.name}: expected lockstep version ${releaseVersion}`,
    );
    assert(publicNames.has(manifest.name), `${manifest.name}: unexpected public package name`);
    assert(manifest.publishConfig?.access === "public", `${manifest.name}: public access missing`);
    assert(
      manifest.publishConfig?.provenance === true,
      `${manifest.name}: npm provenance must be enabled`,
    );
    assert(Array.isArray(manifest.files) && manifest.files.includes("dist"), `${manifest.name}: files`);
    assert(manifest.main, `${manifest.name}: main missing`);
    assert(manifest.types, `${manifest.name}: types missing`);
    assert(manifest.exports?.["."], `${manifest.name}: exports missing`);
  }
  for (const field of ["dependencies", "peerDependencies", "optionalDependencies"]) {
    for (const [name, version] of Object.entries(manifest[field] ?? {})) {
      assert(!name.startsWith("@cascade/"), `${manifest.name}: stale dependency ${name}`);
      if (name.startsWith("@cascade-code/")) {
        assert(version === "workspace:^", `${manifest.name}: ${field}.${name} must use workspace:^`);
      }
    }
  }
}

const cli = manifests.find(({ manifest }) => manifest.name === "@cascade-code/cli")?.manifest;
assert(cli?.files?.includes("dist/dashboard"), "@cascade-code/cli: dashboard assets not allowlisted");
assert(
  statSync(path.join(packageRoot, "cli", "dist", "dashboard", "index.html")).isFile(),
  "@cascade-code/cli: built dashboard index is missing",
);

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

if (process.argv.includes("--pack")) {
  const outputIndex = process.argv.indexOf("--output");
  const retainedOutput =
    outputIndex === -1 ? null : path.resolve(root, process.argv[outputIndex + 1]);
  const temp = retainedOutput ?? mkdtempSync(path.join(tmpdir(), "cascade-release-"));
  if (retainedOutput) mkdirSync(retainedOutput);
  const smoke = retainedOutput
    ? mkdtempSync(path.join(tmpdir(), "cascade-release-smoke-"))
    : temp;
  try {
    const tarballs = [];
    for (const { directory, manifest } of manifests.filter(({ manifest }) => !manifest.private)) {
      const output = runPackageManager(
        "pnpm",
        ["pack", ".", "--pack-destination", temp, "--json"],
        {
          cwd: path.join(packageRoot, directory),
          encoding: "utf8",
        },
      );
      const parsed = JSON.parse(output);
      const result = Array.isArray(parsed) ? parsed[0] : parsed;
      const names = result.files.map(({ path: file }) => file);
      assert(names.includes("package.json"), `${manifest.name}: package.json missing from tarball`);
      assert(names.some((file) => file.startsWith("dist/")), `${manifest.name}: dist missing`);
      assert(
        !names.some((file) => /(^|\/)(src|tests?|fixtures|node_modules|\.env|\.git)(\/|$)/.test(file)),
        `${manifest.name}: forbidden content in tarball`,
      );
      tarballs.push(path.isAbsolute(result.filename) ? result.filename : path.join(temp, result.filename));
    }
    runPackageManager("npm", ["init", "-y"], {
      cwd: smoke,
      stdio: "ignore",
    });
    runPackageManager(
      "npm",
      ["install", "--ignore-scripts", "--no-audit", "--no-fund", ...tarballs],
      {
        cwd: smoke,
        stdio: "inherit",
      },
    );
    runPackageManager("npm", ["ls", "--all"], {
      cwd: smoke,
      stdio: "inherit",
    });
    execFileSync(
      process.execPath,
      [path.join(smoke, "node_modules", "@cascade-code", "cli", "dist", "index.js"), "--help"],
      { cwd: smoke, stdio: "inherit" },
    );
    const installedCli = path.join(
      smoke,
      "node_modules",
      "@cascade-code",
      "cli",
      "dist",
      "index.js",
    );
    const consumer = path.join(smoke, "consumer project (\u03b2)");
    mkdirSync(path.join(consumer, "src"), { recursive: true });
    writeFileSync(
      path.join(consumer, "package.json"),
      JSON.stringify({ name: "cascade-release-smoke", private: true, main: "src/index.ts" }),
    );
    writeFileSync(
      path.join(consumer, "src", "index.ts"),
      'import { value } from "./value.js";\nconsole.log(value);\n',
    );
    writeFileSync(path.join(consumer, "src", "value.ts"), "export const value = 42;\n");
    const analysisOutput = execFileSync(
      process.execPath,
      [installedCli, "analyze", consumer, "--json"],
      { cwd: smoke, encoding: "utf8" },
    );
    const analysis = JSON.parse(analysisOutput);
    const analyzedPaths = new Set(analysis.nodes.map((node) => node.relativePath));
    assert(analyzedPaths.has("src/index.ts"), "installed CLI analysis missed src/index.ts");
    assert(analyzedPaths.has("src/value.ts"), "installed CLI analysis missed src/value.ts");
    assert(
      analysis.edges.length === 1,
      `installed CLI analysis resolved ${analysis.edges.length} smoke imports instead of 1`,
    );
    assert(!analysisOutput.includes(consumer), "installed CLI output leaked the absolute project path");
    const dashboardOutput = path.join(smoke, "reports", "dashboard.json");
    execFileSync(
      process.execPath,
      [
        installedCli,
        "dashboard",
        consumer,
        "--output",
        dashboardOutput,
        "--output-only",
        "--no-open",
      ],
      { cwd: smoke, stdio: "inherit" },
    );
    assert(statSync(dashboardOutput).isFile(), "installed CLI dashboard report was not generated");
    assert(
      !readFileSync(dashboardOutput, "utf8").includes(consumer),
      "installed CLI dashboard report leaked the absolute project path",
    );
    assert(
      statSync(
        path.join(smoke, "node_modules", "@cascade-code", "cli", "dist", "dashboard", "index.html"),
      ).isFile(),
      "installed CLI dashboard asset missing",
    );
  } finally {
    rmSync(smoke, { recursive: true, force: true });
    if (!retainedOutput) rmSync(temp, { recursive: true, force: true });
  }
  if (failures.length) {
    console.error(failures.map((failure) => `- ${failure}`).join("\n"));
    process.exit(1);
  }
}

console.log(`Validated ${manifests.length} package manifests (${privateNames.size} private).`);
