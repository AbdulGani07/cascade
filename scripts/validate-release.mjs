import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const packageRoot = path.join(root, "packages");
const repositoryUrl = "https://github.com/AbdulGani07/cascade.git";
const privateNames = new Set([
  "@cascade/dashboard",
  "@cascade/test-utils",
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

const failures = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

assert(manifests.length === 20, `expected 20 workspaces, found ${manifests.length}`);
for (const { directory, manifest } of manifests) {
  const isPrivate = privateNames.has(manifest.name);
  assert(manifest.version === "3.3.0", `${manifest.name}: expected lockstep version 3.3.0`);
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
      if (name.startsWith("@cascade/")) {
        assert(version === "workspace:^", `${manifest.name}: ${field}.${name} must use workspace:^`);
      }
    }
  }
}

const cli = manifests.find(({ manifest }) => manifest.name === "@cascade/cli")?.manifest;
assert(cli?.files?.includes("dist/dashboard"), "@cascade/cli: dashboard assets not allowlisted");
assert(
  statSync(path.join(packageRoot, "cli", "dist", "dashboard", "index.html")).isFile(),
  "@cascade/cli: built dashboard index is missing",
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
      const output = execFileSync(
        "pnpm",
        ["pack", ".", "--pack-destination", temp, "--json"],
        {
          cwd: path.join(packageRoot, directory),
          encoding: "utf8",
          shell: process.platform === "win32",
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
    execFileSync("npm", ["init", "-y"], {
      cwd: smoke,
      stdio: "ignore",
      shell: process.platform === "win32",
    });
    execFileSync("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", ...tarballs], {
      cwd: smoke,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    execFileSync(
      process.execPath,
      [path.join(smoke, "node_modules", "@cascade", "cli", "dist", "index.js"), "--help"],
      { cwd: smoke, stdio: "inherit" },
    );
    assert(
      statSync(
        path.join(smoke, "node_modules", "@cascade", "cli", "dist", "dashboard", "index.html"),
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
