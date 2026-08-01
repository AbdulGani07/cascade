import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const repositoryRoot = path.resolve(root, "../..");
const stage = path.join(root, ".vsix-stage");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const isPackaging = process.argv.includes("--package");
const isPrereleasePackage = process.argv.includes("--pre-release");
if (isPackaging) {
  execFileSync(
    process.execPath,
    [
      path.join(repositoryRoot, "scripts", "validate-version-state.mjs"),
      "--channel",
      isPrereleasePackage ? "prerelease" : "stable",
    ],
    { cwd: repositoryRoot, stdio: "inherit" }
  );
}
const supportedTargets = new Set([
  "win32-x64",
  "win32-arm64",
  "linux-x64",
  "linux-arm64",
  "darwin-x64",
  "darwin-arm64",
]);
const platformTarget = `${process.platform === "win32" ? "win32" : process.platform}-${process.arch}`;
const targetIndex = process.argv.indexOf("--target");
const target = targetIndex === -1 ? platformTarget : process.argv[targetIndex + 1];
const require = createRequire(import.meta.url);
const { createVSIX } = require("@vscode/vsce");
const vsceApi = require.resolve("@vscode/vsce");
const { listFiles } = require(path.join(path.dirname(vsceApi), "package.js"));
const required = [
  "dist/extension.js",
  "dist/client.js",
  "dist/controller.js",
  "README.md",
  "CHANGELOG.md",
  "LICENSE",
  "media/icon.png",
];
const repositoryRequired = ["media/icon.svg"];
const runtimeRequired = [
  "node_modules/@cascade-code/cli/dist/index.js",
  "node_modules/@cascade-code/cli/dist/dashboard/index.html",
  "node_modules/@cascade-code/editor-service/dist/server.js",
  "node_modules/@cascade-code/config/dist/index.js",
  "node_modules/@cascade-code/core/dist/index.js",
  "node_modules/@cascade-code/reporters/dist/index.js",
];
const forbidden = [
  /(^|\/)\.env/i,
  /^(src|scripts|docs)(\/|$)/i,
  /(^|\/)release-artifacts(\/|$)/i,
  /(^|\/)(tests?|fixtures)(\/|$)/i,
  /(^|\/)\.?(git|cache|gradle)(\/|$)/i,
  /(^|\/)\.vsix-stage[^/]*(\/|$)/i,
  /(^|\/)(dashboard-url[^/]*|.*audit.*)(\.txt|\.json)?$/i,
  /(^|\/)(credentials?|secrets?)(\/|$)/i,
  /(^|\/).*\.vsix-manifest\.json$/i,
  /\.svg$/i,
  /\.map$/i,
  /\.(tgz|vsix)$/i,
  /\.tsbuildinfo$/i,
];
const sensitiveContent = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bnpm_[A-Za-z0-9]{20,}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
];
const localPathContent = [
  /[A-Za-z]:\\Users\\[^\\\r\n]+/i,
  /\/(?:Users|home)\/[^/\r\n]+/,
  /[?&]token=[^&\s)"']+/i,
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function reportGitHubValidationError(error) {
  if (process.env.GITHUB_ACTIONS !== "true") return;
  const message = (error instanceof Error ? error.message : String(error))
    .replaceAll("%", "%25")
    .replaceAll("\r", "%0D")
    .replaceAll("\n", "%0A");
  console.error(`::error title=VSIX package validation failed::${message}`);
}

function runPackageManager(command, args, cwd) {
  if (process.platform === "win32") {
    const bundledNpmCli = path.join(
      path.dirname(process.execPath),
      "node_modules",
      "npm",
      "bin",
      "npm-cli.js"
    );
    if (command === "npm" && fs.existsSync(bundledNpmCli)) {
      execFileSync(process.execPath, [bundledNpmCli, ...args], { cwd, stdio: "inherit" });
      return;
    }
    execFileSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", command, ...args], {
      cwd,
      stdio: "inherit",
    });
  } else {
    execFileSync(command, args, { cwd, stdio: "inherit" });
  }
}

function capturePackageManager(command, args, cwd) {
  if (process.platform === "win32") {
    return execFileSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", command, ...args], {
      cwd,
      encoding: "utf8",
    });
  }
  return execFileSync(command, args, { cwd, encoding: "utf8" });
}

function packCandidateDependencies() {
  const directory = fs.mkdtempSync(path.join(tmpdir(), "cascade-vsix-candidate-"));
  const tarballs = [];
  for (const entry of fs.readdirSync(path.join(repositoryRoot, "packages"), {
    withFileTypes: true,
  })) {
    if (!entry.isDirectory()) continue;
    const packageDirectory = path.join(repositoryRoot, "packages", entry.name);
    const packageFile = path.join(packageDirectory, "package.json");
    if (!fs.existsSync(packageFile)) continue;
    const packageManifest = JSON.parse(fs.readFileSync(packageFile, "utf8"));
    if (packageManifest.private === true || !packageManifest.name?.startsWith("@cascade-code/")) {
      continue;
    }
    const output = capturePackageManager(
      "pnpm",
      ["pack", ".", "--pack-destination", directory, "--json"],
      packageDirectory
    );
    const parsed = JSON.parse(output);
    const result = Array.isArray(parsed) ? parsed[0] : parsed;
    tarballs.push(
      path.isAbsolute(result.filename) ? result.filename : path.join(directory, result.filename)
    );
  }
  assert(tarballs.length === 17, `expected 17 candidate tarballs, found ${tarballs.length}`);
  return { directory, tarballs };
}

function validateManifest() {
  assert(manifest.publisher === "cascade-code", "publisher must be cascade-code");
  assert(manifest.name === "cascade-code-intelligence", "unexpected extension name");
  assert(manifest.private === true, "extension must remain private on npm");
  assert(/^\d+\.\d+\.\d+$/.test(manifest.version), "Marketplace version must be numeric SemVer");
  assert(
    manifest.repository?.url === "https://github.com/AbdulGani07/cascade.git",
    "repository URL"
  );
  assert(manifest.repository?.directory === "packages/vscode-extension", "repository directory");
  assert(manifest.homepage && manifest.bugs?.url, "homepage and issue tracker are required");
  assert(manifest.dependencies?.["@cascade-code/editor-service"], "editor service must be bundled");
  assert(manifest.dependencies?.["@cascade-code/cli"], "CLI must be bundled");
  assert(manifest.engines?.vscode && manifest.main, "VS Code engine and entry point are required");
  assert(manifest.icon === "media/icon.png", "Marketplace icon must be media/icon.png");
  assert(manifest.contributes?.commands?.length === 6, "expected six contributed commands");
  const missing = required.filter((file) => !fs.existsSync(path.join(root, file)));
  assert(!missing.length, `extension package is missing: ${missing.join(", ")}`);
  const missingSources = repositoryRequired.filter((file) => !fs.existsSync(path.join(root, file)));
  assert(
    !missingSources.length,
    `extension repository source is missing: ${missingSources.join(", ")}`
  );
}

function markdownImages(markdown) {
  return [...markdown.matchAll(/!\[[^\]]*]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g)].map(
    (match) => match[1]
  );
}

function validatePresentationSources() {
  const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
  const changelog = fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf8");
  const icon = fs.readFileSync(path.join(root, manifest.icon));
  assert(
    icon.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    "Marketplace icon must be a PNG"
  );
  assert(icon.readUInt32BE(16) === 128 && icon.readUInt32BE(20) === 128, "icon must be 128x128");
  for (const reference of markdownImages(readme)) {
    if (/^(?:https?:|data:)/i.test(reference)) continue;
    const decoded = decodeURIComponent(reference.split("#")[0]);
    assert(
      fs.existsSync(path.resolve(root, decoded)),
      `README image reference does not resolve: ${reference}`
    );
  }
  for (const [name, content] of [
    ["README.md", readme],
    ["CHANGELOG.md", changelog],
  ]) {
    assert(!/icon\.svg|media\/[^)\s]*\.svg/i.test(content), `${name} must not reference SVG media`);
    assert(
      !localPathContent.some((pattern) => pattern.test(content)),
      `${name} contains a local path or access token`
    );
    assert(
      !sensitiveContent.some((pattern) => pattern.test(content)),
      `${name} contains secret-like content`
    );
  }
}

function cleanStage() {
  const resolved = path.resolve(stage);
  assert(
    path.dirname(resolved) === root && path.basename(resolved).startsWith(".vsix-stage"),
    `refusing to remove unsafe staging path ${resolved}`
  );
  fs.rmSync(resolved, { recursive: true, force: true });
}

function removePath(candidate) {
  const resolved = path.resolve(candidate);
  const relative = path.relative(stage, resolved);
  assert(
    relative &&
      relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative),
    `refusing to remove unsafe staged path ${resolved}`
  );
  fs.rmSync(resolved, { recursive: true, force: true });
}

function packageDirectories(directory) {
  const found = [];
  if (!fs.existsSync(directory)) return found;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const child = path.join(directory, entry.name);
    if (entry.name.startsWith("@")) {
      for (const scoped of fs.readdirSync(child, { withFileTypes: true })) {
        if (scoped.isDirectory()) found.push(path.join(child, scoped.name));
      }
    } else {
      found.push(child);
    }
  }
  return found;
}

function nestedPackageDirectories(directory) {
  const found = [];
  const visit = (current) => {
    for (const packageDirectory of packageDirectories(current)) {
      found.push(packageDirectory);
      visit(path.join(packageDirectory, "node_modules"));
    }
  };
  visit(directory);
  return found;
}

function prunePackageMetadata(packageDirectory) {
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const candidate = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules") continue;
        if (/^(?:test|tests|docs?|examples?|coverage)$/i.test(entry.name)) removePath(candidate);
        else visit(candidate);
      } else if (
        /^readme(?:\..+)?$/i.test(entry.name) ||
        /\.(?:d\.ts|map|tsbuildinfo)$/i.test(entry.name)
      ) {
        removePath(candidate);
      }
    }
  };
  visit(packageDirectory);
}

function pruneTreeSitterPackage(packageDirectory, packageManifest) {
  const name = packageManifest.name ?? "";
  const isParser =
    name === "tree-sitter" ||
    name.startsWith("tree-sitter-") ||
    name.startsWith("@tree-sitter-grammars/tree-sitter-");
  if (!isParser) return;

  const pruneParserContent = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const candidate = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules") continue;
        if (/^(?:src|queries|examples?|tests?)$/i.test(entry.name)) removePath(candidate);
        else pruneParserContent(candidate);
      } else if (
        /^(?:grammar\.(?:js|json)|binding\.gyp)$/i.test(entry.name) ||
        /\.(?:wasm|d\.ts)$/i.test(entry.name)
      ) {
        removePath(candidate);
      }
    }
  };
  pruneParserContent(packageDirectory);

  const prebuilds = path.join(packageDirectory, "prebuilds");
  if (fs.existsSync(prebuilds)) {
    for (const platform of fs.readdirSync(prebuilds, { withFileTypes: true })) {
      if (platform.isDirectory() && platform.name !== target) {
        removePath(path.join(prebuilds, platform.name));
      }
    }
  }
}

function pruneProductionTree() {
  assert(supportedTargets.has(target), `unsupported VSIX target ${target}`);
  const nodeModules = path.join(stage, "node_modules");
  for (const packageDirectory of nestedPackageDirectories(nodeModules)) {
    const packageFile = path.join(packageDirectory, "package.json");
    if (!fs.existsSync(packageFile)) continue;
    const packageManifest = JSON.parse(fs.readFileSync(packageFile, "utf8"));
    if (packageManifest.name === "@tree-sitter-grammars/tree-sitter-kotlin") {
      delete packageManifest.dependencies?.["npm-check-updates"];
      fs.writeFileSync(packageFile, `${JSON.stringify(packageManifest, null, 2)}\n`, "utf8");
    }
    if (packageManifest.name === "npm-check-updates") {
      removePath(packageDirectory);
      continue;
    }
    prunePackageMetadata(packageDirectory);
    pruneTreeSitterPackage(packageDirectory, packageManifest);
  }
}

function requestEditorService(server, requests) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [server], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    const responses = new Map();
    let requestIndex = 0;
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`editor-service smoke test timed out: ${stderr}`));
    }, 60_000);
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      let newline;
      while ((newline = stdout.indexOf("\n")) !== -1) {
        const line = stdout.slice(0, newline);
        stdout = stdout.slice(newline + 1);
        if (!line.trim()) continue;
        const response = JSON.parse(line);
        responses.set(response.id, response);
        if (response.error) {
          clearTimeout(timeout);
          child.kill();
          reject(
            new Error(`editor-service ${response.id} smoke failed: ${response.error.message}`)
          );
        } else if (requestIndex === requests.length) {
          clearTimeout(timeout);
          child.kill();
          resolve(responses);
        } else {
          child.stdin.write(`${JSON.stringify(requests[requestIndex++])}\n`);
        }
      }
    });
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.stdin.write(`${JSON.stringify(requests[requestIndex++])}\n`);
  });
}

async function smokeProductionTree() {
  if (target !== platformTarget) return;
  const fixture = fs.mkdtempSync(path.join(tmpdir(), "cascade vsix smoke (β)-"));
  try {
    fs.mkdirSync(path.join(fixture, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(fixture, "package.json"),
      `${JSON.stringify({ name: "cascade-vsix-smoke", private: true, main: "src/index.ts" })}\n`
    );
    fs.writeFileSync(
      path.join(fixture, "src", "index.ts"),
      'import { value } from "./value.js";\nconsole.log(value);\n'
    );
    fs.writeFileSync(path.join(fixture, "src", "value.ts"), "export const value = 42;\n");

    const cli = path.join(stage, "node_modules", "@cascade-code", "cli", "dist", "index.js");
    const analysisText = execFileSync(process.execPath, [cli, "analyze", fixture, "--json"], {
      encoding: "utf8",
    });
    const analysis = JSON.parse(analysisText);
    const analyzedPaths = new Set(analysis.nodes.map((node) => node.relativePath));
    assert(analyzedPaths.has("src/index.ts"), "VSIX CLI smoke missed src/index.ts");
    assert(analyzedPaths.has("src/value.ts"), "VSIX CLI smoke missed src/value.ts");
    assert(
      analysis.edges.length === 1,
      `VSIX CLI smoke expected 1 edge, got ${analysis.edges.length}`
    );
    assert(!analysisText.includes(fixture), "VSIX CLI analysis leaked the absolute fixture path");

    const dashboard = path.join(fixture, "reports", "dashboard.json");
    execFileSync(
      process.execPath,
      [cli, "dashboard", fixture, "--output", dashboard, "--output-only", "--no-open"],
      { stdio: "ignore" }
    );
    assert(fs.existsSync(dashboard), "VSIX CLI did not generate dashboard output");
    assert(
      !fs.readFileSync(dashboard, "utf8").includes(fixture),
      "dashboard output leaked fixture path"
    );

    const server = path.join(
      stage,
      "node_modules",
      "@cascade-code",
      "editor-service",
      "dist",
      "server.js"
    );
    const responses = await requestEditorService(server, [
      { id: "initialize", method: "initialize", params: {} },
      {
        id: "add",
        method: "workspace/add",
        params: { workspace: { id: "smoke", root: fixture, name: "smoke" } },
      },
      { id: "refresh", method: "workspace/refresh", params: { workspaceId: "smoke" } },
      { id: "health", method: "health", params: {} },
      { id: "shutdown", method: "shutdown", params: {} },
    ]);
    for (const id of ["initialize", "add", "refresh", "health", "shutdown"]) {
      assert(!responses.get(id)?.error, `editor-service ${id} smoke failed`);
    }
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}

async function prepareStage() {
  cleanStage();
  fs.mkdirSync(stage);
  for (const file of [...required, "package.json", ".vscodeignore"]) {
    const source = path.join(root, file);
    const destination = path.join(stage, file);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
  }
  const cliVersion = JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, "packages", "cli", "package.json"), "utf8")
  ).version;
  const editorServiceVersion = JSON.parse(
    fs.readFileSync(path.join(repositoryRoot, "packages", "editor-service", "package.json"), "utf8")
  ).version;
  assert(cliVersion === editorServiceVersion, "CLI and editor service versions must match");
  const stagedManifest = JSON.parse(JSON.stringify(manifest));
  stagedManifest.dependencies = {
    "@cascade-code/cli": cliVersion,
    "@cascade-code/editor-service": editorServiceVersion,
  };
  fs.writeFileSync(
    path.join(stage, "package.json"),
    `${JSON.stringify(stagedManifest, null, 2)}\n`
  );
  if (process.env.CASCADE_RELEASE_CANDIDATE === "true") {
    const candidate = packCandidateDependencies();
    try {
      runPackageManager(
        "npm",
        [
          "install",
          "--omit=dev",
          "--no-audit",
          "--no-fund",
          "--ignore-scripts",
          ...candidate.tarballs,
        ],
        stage
      );
    } finally {
      fs.rmSync(candidate.directory, { recursive: true, force: true });
    }
  } else {
    runPackageManager(
      "npm",
      ["install", "--omit=dev", "--no-audit", "--no-fund", "--ignore-scripts"],
      stage
    );
  }
  fs.writeFileSync(
    path.join(stage, "package.json"),
    `${JSON.stringify(stagedManifest, null, 2)}\n`
  );
  fs.rmSync(path.join(stage, "package-lock.json"), { force: true });
  pruneProductionTree();
  await smokeProductionTree();
  for (const file of required) {
    assert(fs.existsSync(path.join(stage, file)), `staged extension is missing ${file}`);
  }
  for (const file of runtimeRequired) {
    assert(fs.existsSync(path.join(stage, file)), `staged extension is missing ${file}`);
  }
  const files = (await listFiles({ cwd: stage, dependencies: true })).sort();
  const unexpected = files.filter((file) => forbidden.some((pattern) => pattern.test(file)));
  assert(!unexpected.length, `forbidden VSIX content: ${unexpected.join(", ")}`);
  for (const file of required) assert(files.includes(file), `VSIX file list is missing ${file}`);
  for (const file of runtimeRequired) {
    assert(files.includes(file), `VSIX runtime file list is missing ${file}`);
  }
  assert(!files.includes("media/icon.svg"), "VSIX must exclude the editable SVG icon source");
  assert(
    !files.some((file) => file.startsWith("node_modules/npm-check-updates/")),
    "VSIX must exclude the transitive npm-check-updates development CLI"
  );
  for (const file of files.filter((candidate) => !candidate.startsWith("node_modules/"))) {
    const absolute = path.join(stage, file);
    const stats = fs.statSync(absolute);
    if (!stats.isFile() || stats.size > 2_000_000) continue;
    const content = fs.readFileSync(absolute, "utf8");
    assert(
      !localPathContent.some((pattern) => pattern.test(content)),
      `${file} contains a local path or access token`
    );
    assert(
      !sensitiveContent.some((pattern) => pattern.test(content)),
      `${file} contains secret-like content`
    );
  }
  return files;
}

validateManifest();
validatePresentationSources();

if (process.argv.includes("--clean")) {
  cleanStage();
  for (const file of fs.readdirSync(root)) {
    if (file.endsWith(".vsix") || file.endsWith(".vsix-manifest.json")) {
      fs.rmSync(path.join(root, file), { force: true });
    }
  }
  console.log("Removed generated VSIX and staging artifacts.");
} else if (process.argv.includes("--validate")) {
  try {
    const files = await prepareStage();
    console.log(
      JSON.stringify(
        {
          id: `${manifest.publisher}.${manifest.name}`,
          version: manifest.version,
          prereleaseVersionFormat: "numeric SemVer",
          target,
          files: files.length,
          validation: "passed",
        },
        null,
        2
      )
    );
  } catch (error) {
    reportGitHubValidationError(error);
    throw error;
  } finally {
    cleanStage();
  }
} else {
  try {
    const files = await prepareStage();
    if (process.argv.includes("--list")) {
      console.log(files.join("\n"));
    } else {
      const prerelease = process.argv.includes("--pre-release");
      const suffix = prerelease ? "-prerelease" : "";
      const output = path.join(
        root,
        `${manifest.name}-${manifest.version}-${target}${suffix}.vsix`
      );
      await createVSIX({
        cwd: stage,
        packagePath: output,
        dependencies: true,
        useYarn: false,
        preRelease: prerelease,
        target,
      });
      fs.writeFileSync(
        `${output}-manifest.json`,
        `${JSON.stringify(
          {
            id: `${manifest.publisher}.${manifest.name}`,
            version: manifest.version,
            prerelease,
            target,
            files,
          },
          null,
          2
        )}\n`
      );
    }
  } finally {
    cleanStage();
  }
}
