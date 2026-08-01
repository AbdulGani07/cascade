import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import zlib from "node:zlib";

const root = path.resolve(import.meta.dirname, "..");
const manifestFile = path.join(root, "benchmarks", "real-repositories.json");
const snapshotFile = path.join(root, "benchmarks", "real-repositories.snapshot.json");
const cacheIndex = process.argv.indexOf("--cache");
const outputIndex = process.argv.indexOf("--output");
const cacheRoot = path.resolve(
  cacheIndex === -1
    ? path.join(root, ".cache", "cascade-real-repositories")
    : process.argv[cacheIndex + 1]
);
const outputFile = path.resolve(
  outputIndex === -1 ? path.join(cacheRoot, "results.json") : process.argv[outputIndex + 1]
);
const update = process.argv.includes("--update-snapshots");
const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
const MAX_ARCHIVE_BYTES = 128 * 1024 * 1024;
const MAX_EXTRACTED_BYTES = 512 * 1024 * 1024;
const MAX_ARCHIVE_FILE_BYTES = 50 * 1024 * 1024;
const MAX_ARCHIVE_FILES = 100_000;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function repositoryParts(url) {
  const match = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/);
  assert(match, `only github.com HTTPS repositories are allowed: ${url}`);
  return { owner: match[1], repository: match[2] };
}

function tarString(buffer, start, length) {
  return buffer
    .subarray(start, start + length)
    .toString("utf8")
    .replace(/\0.*$/, "")
    .trim();
}

function extractArchive(archive, destination, expectedPrefix) {
  const compressed = fs.readFileSync(archive);
  assert(compressed.length <= MAX_ARCHIVE_BYTES, `${archive}: compressed archive exceeds limit`);
  const data = zlib.gunzipSync(compressed, { maxOutputLength: MAX_EXTRACTED_BYTES });
  fs.rmSync(destination, { recursive: true, force: true });
  fs.mkdirSync(destination, { recursive: true });
  let offset = 0;
  let files = 0;
  let skippedLinks = 0;
  let pendingPaxPath = null;
  while (offset + 512 <= data.length) {
    const header = data.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const name = tarString(header, 0, 100);
    const prefix = tarString(header, 345, 155);
    const headerPath = prefix ? `${prefix}/${name}` : name;
    const size = Number.parseInt(tarString(header, 124, 12) || "0", 8);
    const type = String.fromCharCode(header[156] || 48);
    assert(Number.isSafeInteger(size) && size >= 0, `${archive}: invalid tar size`);
    assert(size <= MAX_ARCHIVE_FILE_BYTES, `${archive}: archive entry exceeds size limit`);
    if (type === "x") {
      const pax = data.subarray(offset + 512, offset + 512 + size).toString("utf8");
      const pathRecord = pax.split("\n").find((record) => record.includes(" path="));
      pendingPaxPath = pathRecord?.slice(pathRecord.indexOf(" path=") + 6) ?? null;
      assert(pendingPaxPath, `${archive}: PAX path record is missing`);
      offset += 512 + Math.ceil(size / 512) * 512;
      continue;
    }
    if (type === "g") {
      offset += 512 + Math.ceil(size / 512) * 512;
      continue;
    }
    const archivePath = pendingPaxPath ?? headerPath;
    pendingPaxPath = null;
    assert(
      archivePath.startsWith(`${expectedPrefix}/`) || archivePath === expectedPrefix,
      `${archive}: unexpected archive root ${archivePath}`
    );
    const relative =
      archivePath === expectedPrefix ? "" : archivePath.slice(expectedPrefix.length + 1);
    const normalized = path.posix.normalize(relative);
    assert(
      normalized !== ".." && !normalized.startsWith("../") && !path.posix.isAbsolute(normalized),
      `${archive}: unsafe path ${archivePath}`
    );
    const target = path.resolve(destination, ...normalized.split("/").filter(Boolean));
    const relation = path.relative(destination, target);
    assert(
      !relation.startsWith("..") && !path.isAbsolute(relation),
      `${archive}: path escaped destination`
    );
    if (type === "5") fs.mkdirSync(target, { recursive: true });
    else if (type === "0" || type === "\0") {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, data.subarray(offset + 512, offset + 512 + size), { mode: 0o600 });
      files++;
      assert(files <= MAX_ARCHIVE_FILES, `${archive}: archive file count exceeds limit`);
    } else if (["1", "2"].includes(type)) {
      skippedLinks++;
    } else {
      throw new Error(
        `${archive}: links and special tar entries are forbidden (${type} ${archivePath})`
      );
    }
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  assert(files > 0, `${archive}: contained no regular files`);
  return skippedLinks;
}

async function download(entry) {
  const { owner, repository } = repositoryParts(entry.repository);
  assert(/^[0-9a-f]{40}$/.test(entry.commit), `${entry.id}: commit must be a full SHA`);
  const archive = path.join(cacheRoot, "archives", `${entry.id}-${entry.commit}.tar.gz`);
  if (!fs.existsSync(archive)) {
    const url = `https://codeload.github.com/${owner}/${repository}/tar.gz/${entry.commit}`;
    let bytes;
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await fetch(url, { redirect: "error" });
        assert(response.ok, `${entry.id}: download failed with ${response.status}`);
        const declaredLength = Number(response.headers.get("content-length") ?? 0);
        assert(
          !declaredLength || declaredLength <= MAX_ARCHIVE_BYTES,
          `${entry.id}: compressed archive exceeds limit`
        );
        const chunks = [];
        let received = 0;
        const reader = response.body?.getReader();
        assert(reader, `${entry.id}: response body is unavailable`);
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          received += value.byteLength;
          assert(received <= MAX_ARCHIVE_BYTES, `${entry.id}: compressed archive exceeds limit`);
          chunks.push(Buffer.from(value));
        }
        bytes = Buffer.concat(chunks, received);
        break;
      } catch (error) {
        lastError = error;
        if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
      }
    }
    assert(bytes, `${entry.id}: download failed after 3 attempts: ${lastError?.message}`);
    assert(bytes[0] === 0x1f && bytes[1] === 0x8b, `${entry.id}: response was not gzip data`);
    fs.mkdirSync(path.dirname(archive), { recursive: true });
    fs.writeFileSync(archive, bytes, { mode: 0o600 });
    fs.writeFileSync(
      `${archive}.sha256`,
      `${crypto.createHash("sha256").update(bytes).digest("hex")}\n`
    );
  }
  const expectedDigest = fs.readFileSync(`${archive}.sha256`, "utf8").trim();
  const actualDigest = crypto.createHash("sha256").update(fs.readFileSync(archive)).digest("hex");
  assert(actualDigest === expectedDigest, `${entry.id}: cached archive checksum mismatch`);
  const destination = path.join(cacheRoot, "sources", `${entry.id}-${entry.commit}`);
  const skippedLinks = extractArchive(archive, destination, `${repository}-${entry.commit}`);
  return { destination, skippedLinks };
}

function analyzeRepository(entry, source) {
  try {
    return JSON.parse(
      execFileSync(
        process.execPath,
        [path.join(root, "scripts", "analyze-real-repository-worker.mjs"), source],
        {
          cwd: root,
          encoding: "utf8",
          timeout: 240_000,
          maxBuffer: 1024 * 1024,
        }
      ).trim()
    );
  } catch (error) {
    return { crashed: true, error: String(error.message).replaceAll(source, "<repository>") };
  }
}

const results = [];
for (const entry of manifest.repositories) {
  console.log(`Validating ${entry.id} at ${entry.commit}...`);
  const { destination, skippedLinks } = await download(entry);
  const source = path.resolve(destination, entry.subdirectory ?? ".");
  const sourceRelation = path.relative(destination, source);
  assert(
    !sourceRelation.startsWith("..") && !path.isAbsolute(sourceRelation),
    `${entry.id}: subdirectory escapes the repository`
  );
  assert(fs.statSync(source).isDirectory(), `${entry.id}: subdirectory does not exist`);
  const metrics = analyzeRepository(entry, source);
  metrics.extractionWarnings = skippedLinks;
  metrics.warningCount = (metrics.warningCount ?? 0) + skippedLinks;
  results.push({ id: entry.id, commit: entry.commit, metrics });
}

const structural = Object.fromEntries(
  results.map(({ id, commit, metrics }) => [
    id,
    {
      commit,
      fileCount: metrics.fileCount,
      nodeCount: metrics.nodeCount,
      edgeCount: metrics.edgeCount,
      dependencies: metrics.dependencies,
      cycleCount: metrics.cycleCount,
      warningCount: metrics.warningCount,
      thresholds: {
        maxDurationMs: Math.max(30_000, Math.ceil((metrics.durationMs ?? 180_000) * 4)),
        maxPeakMemoryMiB: Math.max(512, Math.ceil((metrics.peakMemoryMiB ?? 2048) * 2)),
        minNodes: Math.floor((metrics.nodeCount ?? 0) * 0.7),
        maxNodes: Math.ceil((metrics.nodeCount ?? 0) * 1.5 + 10),
        minEdges: Math.floor((metrics.edgeCount ?? 0) * 0.6),
        maxEdges: Math.ceil((metrics.edgeCount ?? 0) * 1.75 + 20),
        maxWarnings: Math.max(100, Math.ceil((metrics.warningCount ?? 0) * 2 + 20)),
      },
    },
  ])
);
fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, `${JSON.stringify({ schemaVersion: 1, results }, null, 2)}\n`);
if (update) {
  const crashes = results.filter(({ metrics }) => metrics.crashed);
  assert(
    !crashes.length,
    `refusing to snapshot crashes: ${crashes.map(({ id }) => id).join(", ")}`
  );
  fs.writeFileSync(
    snapshotFile,
    `${JSON.stringify({ schemaVersion: 1, repositories: structural }, null, 2)}\n`
  );
  console.log(`Updated ${path.relative(root, snapshotFile)}.`);
} else {
  assert(
    fs.existsSync(snapshotFile),
    "real-repository snapshot is missing; review and create it with --update-snapshots"
  );
  const expected = JSON.parse(fs.readFileSync(snapshotFile, "utf8")).repositories;
  const failures = [];
  for (const { id, commit, metrics } of results) {
    const baseline = expected[id];
    if (!baseline) failures.push(`${id}: snapshot missing`);
    else if (baseline.commit !== commit) failures.push(`${id}: snapshot commit mismatch`);
    else if (metrics.crashed) failures.push(`${id}: crashed: ${metrics.error}`);
    else {
      const threshold = baseline.thresholds;
      if (metrics.durationMs > threshold.maxDurationMs)
        failures.push(`${id}: ${metrics.durationMs}ms exceeded ${threshold.maxDurationMs}ms`);
      if (metrics.peakMemoryMiB > threshold.maxPeakMemoryMiB)
        failures.push(
          `${id}: ${metrics.peakMemoryMiB}MiB exceeded ${threshold.maxPeakMemoryMiB}MiB`
        );
      if (metrics.nodeCount < threshold.minNodes || metrics.nodeCount > threshold.maxNodes)
        failures.push(
          `${id}: node count ${metrics.nodeCount} outside ${threshold.minNodes}-${threshold.maxNodes}`
        );
      if (metrics.edgeCount < threshold.minEdges || metrics.edgeCount > threshold.maxEdges)
        failures.push(
          `${id}: edge count ${metrics.edgeCount} outside ${threshold.minEdges}-${threshold.maxEdges}`
        );
      if (metrics.warningCount > threshold.maxWarnings)
        failures.push(
          `${id}: warning count ${metrics.warningCount} exceeded ${threshold.maxWarnings}`
        );
    }
  }
  if (failures.length) throw new Error(failures.join("\n"));
}
console.table(
  results.map(({ id, metrics }) => ({
    repository: id,
    ...metrics,
    dependencies: undefined,
    error: undefined,
  }))
);
console.log(`Real-repository validation passed; results written to ${outputFile}.`);
