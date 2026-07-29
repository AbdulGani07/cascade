import { cp, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "packages", "dashboard", "dist");
const target = path.join(root, "packages", "cli", "dist", "dashboard");

await stat(path.join(source, "index.html"));
await rm(target, { recursive: true, force: true });
await mkdir(path.dirname(target), { recursive: true });
await cp(source, target, { recursive: true });
console.log(`Bundled dashboard assets in ${path.relative(root, target)}`);
