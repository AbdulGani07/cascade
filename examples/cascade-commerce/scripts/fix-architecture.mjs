import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const file = path.join(root, ".cascade-demo/services/api/src/domain/orderService.ts");
if (!fs.existsSync(file)) throw new Error("Run setup-demo.mjs first.");
const source = fs.readFileSync(file, "utf8");
const fixed = source
  .replace(
    'import { storefrontFlag } from "../../../../apps/storefront/src/featureFlags.js";',
    'import { rolloutEnabled } from "@cascade-demo/observability";'
  )
  .replace('storefrontFlag("recommendations")', 'rolloutEnabled("recommendations")');
fs.writeFileSync(file, fixed);
console.log("Moved the feature-flag dependency onto the shared observability package.");
