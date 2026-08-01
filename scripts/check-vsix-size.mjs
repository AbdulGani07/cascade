import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const DEFAULT_BUDGET_MIB = 70;
const TOP_COUNT = 20;

function readUInt64(buffer, offset) {
  return Number(buffer.readBigUInt64LE(offset));
}

export function readVsixEntries(file) {
  const data = fs.readFileSync(file);
  let eocd = -1;
  for (let offset = data.length - 22; offset >= Math.max(0, data.length - 65_557); offset--) {
    if (data.readUInt32LE(offset) === 0x06054b50) {
      eocd = offset;
      break;
    }
  }
  if (eocd === -1) throw new Error(`${file}: ZIP end-of-central-directory record not found`);
  const centralOffset = data.readUInt32LE(eocd + 16);
  const entryCount = data.readUInt16LE(eocd + 10);
  const entries = [];
  let offset = centralOffset;
  for (let index = 0; index < entryCount; index++) {
    if (data.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error(`${file}: invalid ZIP central-directory entry ${index}`);
    }
    let compressedSize = data.readUInt32LE(offset + 20);
    let size = data.readUInt32LE(offset + 24);
    const nameLength = data.readUInt16LE(offset + 28);
    const extraLength = data.readUInt16LE(offset + 30);
    const commentLength = data.readUInt16LE(offset + 32);
    const name = data.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
    const extra = data.subarray(offset + 46 + nameLength, offset + 46 + nameLength + extraLength);
    if (compressedSize === 0xffffffff || size === 0xffffffff) {
      let cursor = 0;
      while (cursor + 4 <= extra.length) {
        const id = extra.readUInt16LE(cursor);
        const length = extra.readUInt16LE(cursor + 2);
        if (id === 0x0001) {
          let zip64 = cursor + 4;
          if (size === 0xffffffff) {
            size = readUInt64(extra, zip64);
            zip64 += 8;
          }
          if (compressedSize === 0xffffffff) compressedSize = readUInt64(extra, zip64);
          break;
        }
        cursor += 4 + length;
      }
    }
    if (!name.endsWith("/")) entries.push({ name, size, compressedSize });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function parseArgs(args) {
  const budgetIndex = args.indexOf("--max-installed-mb");
  const budgetMiB = budgetIndex === -1 ? DEFAULT_BUDGET_MIB : Number(args[budgetIndex + 1]);
  const files = args.filter(
    (arg, index) => !arg.startsWith("--") && (budgetIndex === -1 || index !== budgetIndex + 1)
  );
  return { budgetMiB, files };
}

const { budgetMiB, files: requested } = parseArgs(process.argv.slice(2));
const extensionRoot = path.resolve(import.meta.dirname, "..", "packages", "vscode-extension");
const files = requested.length
  ? requested.map((file) => path.resolve(file))
  : fs
      .readdirSync(extensionRoot)
      .filter((file) => file.endsWith(".vsix"))
      .map((file) => path.join(extensionRoot, file));

if (!files.length) throw new Error("No VSIX files found. Pass one or more paths to check.");
if (!Number.isFinite(budgetMiB) || budgetMiB <= 0)
  throw new Error("Invalid installed-size budget.");

let failed = false;
for (const file of files) {
  const entries = readVsixEntries(file);
  const compressedBytes = fs.statSync(file).size;
  const installedBytes = entries.reduce((sum, entry) => sum + entry.size, 0);
  const installedMiB = installedBytes / 1024 / 1024;
  console.log(`\n${path.basename(file)}`);
  console.log(
    `  compressed: ${(compressedBytes / 1024 / 1024).toFixed(2)} MiB (${compressedBytes} bytes)`
  );
  console.log(`  installed:  ${installedMiB.toFixed(2)} MiB (${installedBytes} bytes)`);
  console.log(`  files:      ${entries.length}`);
  console.log(`  budget:     ${budgetMiB.toFixed(2)} MiB installed`);
  console.log(`  largest ${Math.min(TOP_COUNT, entries.length)} entries:`);
  for (const entry of [...entries].sort((a, b) => b.size - a.size).slice(0, TOP_COUNT)) {
    console.log(`    ${String(entry.size).padStart(10)}  ${entry.name}`);
  }
  if (installedMiB > budgetMiB) {
    console.error(`  FAIL: installed size exceeds the ${budgetMiB.toFixed(2)} MiB budget.`);
    failed = true;
  } else {
    console.log("  PASS");
  }
}

if (failed) process.exitCode = 1;
