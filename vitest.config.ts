import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@cascade/plugin-api": path.resolve(__dirname, "packages/plugin-api/src/index.ts"),
      "@cascade/config": path.resolve(__dirname, "packages/config/src/index.ts"),
      "@cascade/reporters": path.resolve(__dirname, "packages/reporters/src/index.ts"),
      "@cascade/language-javascript": path.resolve(
        __dirname,
        "packages/language-javascript/src/index.ts"
      ),
      "@cascade/language-typescript": path.resolve(
        __dirname,
        "packages/language-typescript/src/index.ts"
      ),
      "@cascade/language-python": path.resolve(__dirname, "packages/language-python/src/index.ts"),
      "@cascade/test-utils": path.resolve(__dirname, "packages/test-utils/src/index.ts"),
      "@cascade/core": path.resolve(__dirname, "packages/core/src/index.ts"),
    },
  },
});
