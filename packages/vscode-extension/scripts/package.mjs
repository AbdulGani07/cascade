import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const repositoryRoot = path.resolve(root, "../..");
const stage = path.join(root, ".vsix-stage");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
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
];
const forbidden = [
  /(^|\/)\.env/i,
  /^(src|scripts|docs|release-artifacts)(\/|$)/i,
  /(^|\/)(tests?|fixtures)(\/|$)/i,
  /(^|\/)\.?(git|cache)(\/|$)/i,
  /\.map$/i,
  /\.(tgz|vsix)$/i,
  /\.tsbuildinfo$/i,
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runPackageManager(command, args, cwd) {
  if (process.platform === "win32") {
    execFileSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", command, ...args], {
      cwd,
      stdio: "inherit",
    });
  } else {
    execFileSync(command, args, { cwd, stdio: "inherit" });
  }
}

function validateManifest() {
  assert(manifest.publisher === "cascade-code", "publisher must be cascade-code");
  assert(manifest.name === "cascade-code-intelligence", "unexpected extension name");
  assert(manifest.private === true, "extension must remain private on npm");
  assert(/^\d+\.\d+\.\d+$/.test(manifest.version), "Marketplace version must be numeric SemVer");
  assert(manifest.repository?.url === "https://github.com/AbdulGani07/cascade.git", "repository URL");
  assert(manifest.repository?.directory === "packages/vscode-extension", "repository directory");
  assert(manifest.homepage && manifest.bugs?.url, "homepage and issue tracker are required");
  assert(manifest.dependencies?.["@cascade-code/editor-service"], "editor service must be bundled");
  assert(manifest.dependencies?.["@cascade-code/cli"], "CLI must be bundled");
  assert(manifest.engines?.vscode && manifest.main, "VS Code engine and entry point are required");
  assert(manifest.contributes?.commands?.length === 6, "expected six contributed commands");
  const missing = required.filter((file) => !fs.existsSync(path.join(root, file)));
  assert(!missing.length, `extension package is missing: ${missing.join(", ")}`);
}

function cleanStage() {
  const resolved = path.resolve(stage);
  assert(
    path.dirname(resolved) === root && path.basename(resolved).startsWith(".vsix-stage"),
    `refusing to remove unsafe staging path ${resolved}`
  );
  fs.rmSync(resolved, { recursive: true, force: true });
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
  fs.writeFileSync(path.join(stage, "package.json"), `${JSON.stringify(stagedManifest, null, 2)}\n`);
  runPackageManager(
    "npm",
    ["install", "--omit=dev", "--no-audit", "--no-fund", "--ignore-scripts"],
    stage
  );
  for (const file of required) {
    assert(fs.existsSync(path.join(stage, file)), `staged extension is missing ${file}`);
  }
  assert(
    fs.existsSync(
      path.join(stage, "node_modules", "@cascade-code", "editor-service", "dist", "server.js")
    ),
    "staged extension is missing the editor-service server"
  );
  assert(
    fs.existsSync(path.join(stage, "node_modules", "@cascade-code", "cli", "dist", "index.js")),
    "staged extension is missing the CLI"
  );
  const files = (await listFiles({ cwd: stage, dependencies: true })).sort();
  const unexpected = files.filter((file) => forbidden.some((pattern) => pattern.test(file)));
  assert(!unexpected.length, `forbidden VSIX content: ${unexpected.join(", ")}`);
  for (const file of required) assert(files.includes(file), `VSIX file list is missing ${file}`);
  return files;
}

validateManifest();

if (process.argv.includes("--clean")) {
  cleanStage();
  for (const file of fs.readdirSync(root)) {
    if (file.endsWith(".vsix") || file.endsWith(".vsix-manifest.json")) {
      fs.rmSync(path.join(root, file), { force: true });
    }
  }
  console.log("Removed generated VSIX and staging artifacts.");
} else if (process.argv.includes("--validate")) {
  console.log(
    JSON.stringify(
      {
        id: `${manifest.publisher}.${manifest.name}`,
        version: manifest.version,
        prereleaseVersionFormat: "numeric SemVer",
        validation: "passed",
      },
      null,
      2
    )
  );
} else {
  try {
    const files = await prepareStage();
    if (process.argv.includes("--list")) {
      console.log(files.join("\n"));
    } else {
      const prerelease = process.argv.includes("--pre-release");
      const suffix = prerelease ? "-prerelease" : "";
      const output = path.join(root, `${manifest.name}-${manifest.version}${suffix}.vsix`);
      await createVSIX({
        cwd: stage,
        packagePath: output,
        dependencies: true,
        useYarn: false,
        preRelease: prerelease,
      });
      fs.writeFileSync(
        `${output}-manifest.json`,
        `${JSON.stringify(
          {
            id: `${manifest.publisher}.${manifest.name}`,
            version: manifest.version,
            prerelease,
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
