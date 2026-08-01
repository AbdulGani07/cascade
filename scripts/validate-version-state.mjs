import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const PUBLIC_PACKAGE_NAMES = [
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
];

export const PRIVATE_VERSION_POLICY_NAMES = ["@cascade-code/dashboard", "@cascade-code/test-utils"];

const semver =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
const numericSemver = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const baseVersion = (version) => version?.split("-")[0];

function workspaceManifests(root) {
  const packageRoot = path.join(root, "packages");
  return readdirSync(packageRoot)
    .map((directory) => ({ directory, file: path.join(packageRoot, directory, "package.json") }))
    .filter(({ file }) => existsSync(file) && statSync(file).isFile())
    .map((entry) => ({ ...entry, manifest: readJson(entry.file) }));
}

export function validateVersionState(root, options = {}) {
  const failures = [];
  const assert = (condition, message) => {
    if (!condition) failures.push(message);
  };
  const rootManifest = readJson(path.join(root, "package.json"));
  const manifests = workspaceManifests(root);
  const byName = new Map(manifests.map((entry) => [entry.manifest.name, entry]));
  const publicEntries = PUBLIC_PACKAGE_NAMES.map((name) => byName.get(name)).filter(Boolean);
  const publicVersions = new Set(publicEntries.map(({ manifest }) => manifest.version));
  const publicVersion = [...publicVersions][0];
  const vscode = byName.get("cascade-code-intelligence")?.manifest;
  const preFile = path.join(root, ".changeset", "pre.json");
  const pre = existsSync(preFile) ? readJson(preFile) : null;
  const isPrerelease = Boolean(publicVersion?.includes("-"));

  assert(publicEntries.length === 17, `expected 17 public packages, found ${publicEntries.length}`);
  assert(publicVersions.size === 1, "all 17 public packages must use one lockstep version");
  assert(semver.test(publicVersion ?? ""), `invalid public package version ${publicVersion}`);
  for (const name of PUBLIC_PACKAGE_NAMES) {
    const entry = byName.get(name);
    assert(entry && entry.manifest.private !== true, `${name}: must be a public workspace`);
    assert(
      entry?.manifest.version === publicVersion,
      `${name}: expected public lockstep version ${publicVersion}, received ${entry?.manifest.version}`
    );
    if (entry && publicVersion) {
      const changelog = path.join(root, "packages", entry.directory, "CHANGELOG.md");
      assert(existsSync(changelog), `${name}: CHANGELOG.md is missing`);
      assert(
        existsSync(changelog) && readFileSync(changelog, "utf8").includes(`## ${publicVersion}`),
        `${name}: changelog has no ${publicVersion} entry`
      );
    }
  }

  assert(rootManifest.private === true, "root package must remain private");
  assert(numericSemver.test(rootManifest.version ?? ""), "root version must be numeric SemVer");
  for (const name of PRIVATE_VERSION_POLICY_NAMES) {
    const entry = byName.get(name);
    assert(entry?.manifest.private === true, `${name}: must remain private`);
    assert(
      entry?.manifest.version === rootManifest.version,
      `${name}: private version must match root baseline ${rootManifest.version}`
    );
  }

  if (isPrerelease) {
    assert(pre, "prerelease packages require .changeset/pre.json");
    assert(pre?.mode === "pre", "Changesets prerelease metadata must use mode=pre");
    const match = publicVersion?.match(/^[^-]+-([0-9A-Za-z-]+)\.(\d+)$/);
    assert(match, `prerelease version must end in -<tag>.<number>: ${publicVersion}`);
    assert(match?.[1] === pre?.tag, `public prerelease tag must match Changesets tag ${pre?.tag}`);
    for (const name of PUBLIC_PACKAGE_NAMES) {
      assert(pre?.initialVersions?.[name], `${name}: missing Changesets initial version`);
      assert(
        pre?.initialVersions?.[name] === rootManifest.version,
        `${name}: Changesets initial version must match root baseline ${rootManifest.version}`
      );
    }
    assert(
      baseVersion(publicVersion) !== rootManifest.version,
      "prerelease target must advance beyond the root stable baseline"
    );
  } else {
    assert(!pre, "stable package state must not contain .changeset/pre.json");
    assert(
      publicVersion === rootManifest.version,
      `stable public version ${publicVersion} must match root version ${rootManifest.version}`
    );
  }

  assert(vscode?.private === true, "VS Code extension must remain private to npm");
  assert(
    numericSemver.test(vscode?.version ?? ""),
    `Marketplace version must be numeric SemVer, received ${vscode?.version}`
  );
  assert(
    vscode?.version === baseVersion(publicVersion),
    `Marketplace version ${vscode?.version} must match npm release base ${baseVersion(publicVersion)}`
  );
  const vscodeChangelog = path.join(root, "packages", "vscode-extension", "CHANGELOG.md");
  assert(
    existsSync(vscodeChangelog) &&
      readFileSync(vscodeChangelog, "utf8").includes(`## ${vscode?.version}`),
    `VS Code changelog has no ${vscode?.version} entry`
  );

  if (options.channel === "stable") {
    assert(!isPrerelease, `stable publication rejected from prerelease source ${publicVersion}`);
    assert(vscode?.version === publicVersion, "stable npm and Marketplace versions must match");
  }
  if (options.channel === "prerelease") {
    assert(
      isPrerelease,
      `prerelease publication requires a prerelease npm version, received ${publicVersion}`
    );
  }

  return {
    failures,
    state: {
      rootVersion: rootManifest.version,
      publicVersion,
      vscodeVersion: vscode?.version,
      changesetsMode: pre?.mode ?? "stable",
      changesetsTag: pre?.tag ?? null,
      channel: isPrerelease ? "prerelease" : "stable",
    },
  };
}

function printState(state) {
  console.log(`Release state: ${state.channel}`);
  console.log(`Root/private baseline: ${state.rootVersion}`);
  console.log(`Public npm packages: ${state.publicVersion}`);
  console.log(
    `Changesets: ${state.changesetsMode}${state.changesetsTag ? ` (${state.changesetsTag})` : ""}`
  );
  console.log(`VS Code Marketplace: ${state.vscodeVersion} (${state.channel} flag)`);
}

function localStableTags(root) {
  try {
    return execFileSync("git", ["tag", "--list", "v[0-9]*", "--sort=-version:refname"], {
      cwd: root,
      encoding: "utf8",
    })
      .trim()
      .split(/\r?\n/)
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function auditPublishedState(root, state) {
  const failures = [];
  const registryStates = await Promise.all(
    PUBLIC_PACKAGE_NAMES.map(async (name) => {
      const response = await fetch(`https://registry.npmjs.org/${name.replace("/", "%2f")}`);
      if (!response.ok) throw new Error(`${name}: npm registry returned ${response.status}`);
      const metadata = await response.json();
      return { name, tags: metadata["dist-tags"] ?? {} };
    })
  );
  for (const tag of ["latest", "next"]) {
    const versions = new Set(registryStates.map(({ tags }) => tags[tag]).filter(Boolean));
    if (versions.size > 1) failures.push(`npm ${tag} tags diverge across public packages`);
  }
  const latest = registryStates[0]?.tags.latest;
  const next = registryStates[0]?.tags.next;
  console.log(`npm latest: ${latest ?? "unset"}`);
  console.log(`npm next: ${next ?? "unset"}`);

  let remoteTags = [];
  try {
    remoteTags = execFileSync("git", ["ls-remote", "--tags", "origin"], {
      cwd: root,
      encoding: "utf8",
    })
      .split(/\r?\n/)
      .map((line) => line.match(/refs\/tags\/(v[^\^\s]+)$/)?.[1])
      .filter(Boolean);
  } catch {
    failures.push("could not read remote Git tags");
  }
  remoteTags.sort((left, right) =>
    right.localeCompare(left, undefined, { numeric: true, sensitivity: "base" })
  );
  const releaseResponse = await fetch(
    "https://api.github.com/repos/AbdulGani07/cascade/releases?per_page=100",
    {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "cascade-release-state-validator",
      },
    }
  );
  if (!releaseResponse.ok)
    throw new Error(`GitHub Releases API returned ${releaseResponse.status}`);
  const releases = await releaseResponse.json();
  console.log(`Newest remote stable tag: ${remoteTags[0] ?? "none"}`);
  console.log(`GitHub releases: ${releases.length}`);
  if (latest && !remoteTags.includes(`v${latest}`)) {
    console.warn(`Historical warning: npm latest ${latest} has no matching remote Git tag v${latest}`);
  }
  if (latest && !releases.some((release) => release.tag_name === `v${latest}` && !release.draft)) {
    console.warn(
      `Historical warning: npm latest ${latest} has no matching published GitHub Release v${latest}`
    );
  }
  if (next && state.channel === "prerelease" && next !== state.publicVersion) {
    failures.push(`npm next ${next} does not match source prerelease ${state.publicVersion}`);
  }
  return failures;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const rootIndex = process.argv.indexOf("--root");
  const root =
    rootIndex === -1
      ? path.resolve(import.meta.dirname, "..")
      : path.resolve(process.argv[rootIndex + 1]);
  const channelIndex = process.argv.indexOf("--channel");
  const channel = channelIndex === -1 ? undefined : process.argv[channelIndex + 1];
  const prepare = process.argv.includes("--prepare-vscode");
  if (prepare) {
    const preliminary = validateVersionState(root);
    const desired = baseVersion(preliminary.state.publicVersion);
    const file = path.join(root, "packages", "vscode-extension", "package.json");
    const manifest = readJson(file);
    manifest.version = desired;
    writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`Prepared Marketplace version ${desired}.`);
  }
  const result = validateVersionState(root, { channel });
  printState(result.state);
  if (process.argv.includes("--state")) {
    const tags = localStableTags(root);
    console.log(`Newest local stable tag: ${tags[0] ?? "none"}`);
  }
  if (process.argv.includes("--audit-published")) {
    try {
      result.failures.push(...(await auditPublishedState(root, result.state)));
    } catch (error) {
      result.failures.push(`published-state audit failed: ${error.message}`);
    }
  }
  if (result.failures.length) {
    console.error(result.failures.map((failure) => `- ${failure}`).join("\n"));
    process.exit(1);
  }
  console.log("Version state validation passed.");
}
