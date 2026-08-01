import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  npmRegistryMetadataUrl,
  PUBLIC_PACKAGE_NAMES,
  validateVersionState,
} from "./validate-version-state.mjs";

const extensionId = "cascade-code.cascade-code-intelligence";
const repository = "AbdulGani07/cascade";

export function evaluatePublishPreconditions({
  channel,
  source,
  npmTags,
  marketplaceVersions,
  releases,
  candidate = false,
}) {
  const failures = [];
  if (!["prerelease", "stable"].includes(channel)) failures.push(`unsupported channel ${channel}`);
  const expectedNpmTag = channel === "stable" ? "latest" : "next";
  const compare = (left, right) =>
    left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
  for (const name of PUBLIC_PACKAGE_NAMES) {
    const published = npmTags[name]?.[expectedNpmTag];
    const valid = candidate
      ? published && compare(published, source.publicVersion) < 0
      : published === source.publicVersion;
    if (!valid) {
      failures.push(
        `${name}: npm ${expectedNpmTag} is ${published ?? "unset"}, expected ${candidate ? `a version below candidate ${source.publicVersion}` : source.publicVersion}`
      );
    }
  }
  const alreadyExists = marketplaceVersions.some((entry) => entry.version === source.vscodeVersion);
  if (alreadyExists)
    failures.push(`${extensionId} ${source.vscodeVersion} (${channel}) already exists`);
  if (!candidate && channel === "stable" && !releases.includes(`v${source.vscodeVersion}`)) {
    failures.push(`stable GitHub Release v${source.vscodeVersion} does not exist`);
  }
  if (candidate && releases.includes(`v${source.vscodeVersion}`)) {
    failures.push(`candidate GitHub Release v${source.vscodeVersion} already exists`);
  }
  return failures;
}

async function npmDistributionTags() {
  return Object.fromEntries(
    await Promise.all(
      PUBLIC_PACKAGE_NAMES.map(async (name) => {
        const response = await fetch(npmRegistryMetadataUrl(name));
        if (!response.ok) throw new Error(`${name}: npm registry returned ${response.status}`);
        const metadata = await response.json();
        return [name, metadata["dist-tags"] ?? {}];
      })
    )
  );
}

async function marketplaceVersions() {
  const response = await fetch(
    "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery?api-version=7.2-preview.1",
    {
      method: "POST",
      headers: {
        Accept: "application/json;api-version=7.2-preview.1",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filters: [
          {
            criteria: [{ filterType: 7, value: extensionId }],
            pageNumber: 1,
            pageSize: 1,
            sortBy: 0,
            sortOrder: 0,
          },
        ],
        assetTypes: [],
        flags: 17,
      }),
    }
  );
  if (!response.ok) throw new Error(`Marketplace query returned ${response.status}`);
  const body = await response.json();
  const versions = body.results?.[0]?.extensions?.[0]?.versions ?? [];
  return versions.map((entry) => ({
    version: entry.version,
    channel: entry.properties?.some(
      (property) =>
        property.key === "Microsoft.VisualStudio.Code.PreRelease" && property.value === "true"
    )
      ? "prerelease"
      : "stable",
  }));
}

async function githubReleases() {
  const response = await fetch(`https://api.github.com/repos/${repository}/releases?per_page=100`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "cascade-release-validator" },
  });
  if (!response.ok) throw new Error(`GitHub Releases API returned ${response.status}`);
  return (await response.json())
    .filter((release) => !release.draft)
    .map((release) => release.tag_name);
}

function assertRepository(root, candidate) {
  const eventRepository = process.env.GITHUB_REPOSITORY;
  if (eventRepository && eventRepository !== repository) {
    throw new Error(`publishing is restricted to ${repository}, received ${eventRepository}`);
  }
  const branch =
    process.env.GITHUB_REF_NAME ||
    execFileSync("git", ["branch", "--show-current"], { cwd: root, encoding: "utf8" }).trim();
  const expectedCandidateBranch = `release/cascade-${validateVersionState(root).state.vscodeVersion}`;
  if (branch !== "main" && !(candidate && branch === expectedCandidateBranch))
    throw new Error(
      `${candidate ? "candidate validation" : "publishing"} requires ${candidate ? `main or ${expectedCandidateBranch}` : "main"}, received ${branch || "detached HEAD"}`
    );
  const remote = execFileSync("git", ["remote", "get-url", "origin"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  if (!/github\.com[/:]AbdulGani07\/cascade(?:\.git)?$/i.test(remote)) {
    throw new Error(`unexpected origin ${remote}`);
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const channelIndex = process.argv.indexOf("--channel");
  const channel = channelIndex === -1 ? null : process.argv[channelIndex + 1];
  const candidate = process.argv.includes("--candidate");
  if (!channel) throw new Error("Pass --channel prerelease or --channel stable.");
  const root = path.resolve(import.meta.dirname, "..");
  assertRepository(root, candidate);
  const sourceResult = validateVersionState(root, { channel });
  if (sourceResult.failures.length) throw new Error(sourceResult.failures.join("\n"));
  const [npmTags, versions, releases] = await Promise.all([
    npmDistributionTags(),
    marketplaceVersions(),
    githubReleases(),
  ]);
  const failures = evaluatePublishPreconditions({
    channel,
    source: sourceResult.state,
    npmTags,
    marketplaceVersions: versions,
    releases,
    candidate,
  });
  if (failures.length) throw new Error(failures.join("\n"));
  const githubOutput = process.env.GITHUB_OUTPUT;
  if (githubOutput) {
    appendFileSync(
      githubOutput,
      `version=${sourceResult.state.vscodeVersion}\nchannel=${channel}\n`
    );
  }
  console.log(
    `VS Code ${candidate ? "candidate" : "publish"} preconditions passed for ${sourceResult.state.vscodeVersion} (${channel}).`
  );
}
