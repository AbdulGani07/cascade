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
      "@cascade-code/plugin-api": path.resolve(__dirname, "packages/plugin-api/src/index.ts"),
      "@cascade-code/config": path.resolve(__dirname, "packages/config/src/index.ts"),
      "@cascade-code/reporters": path.resolve(__dirname, "packages/reporters/src/index.ts"),
      "@cascade-code/language-javascript": path.resolve(
        __dirname,
        "packages/language-javascript/src/index.ts"
      ),
      "@cascade-code/language-typescript": path.resolve(
        __dirname,
        "packages/language-typescript/src/index.ts"
      ),
      "@cascade-code/language-python": path.resolve(
        __dirname,
        "packages/language-python/src/index.ts"
      ),
      "@cascade-code/language-java": path.resolve(__dirname, "packages/language-java/src/index.ts"),
      "@cascade-code/language-kotlin": path.resolve(
        __dirname,
        "packages/language-kotlin/src/index.ts"
      ),
      "@cascade-code/language-csharp": path.resolve(
        __dirname,
        "packages/language-csharp/src/index.ts"
      ),
      "@cascade-code/language-go": path.resolve(__dirname, "packages/language-go/src/index.ts"),
      "@cascade-code/language-rust": path.resolve(__dirname, "packages/language-rust/src/index.ts"),
      "@cascade-code/language-c": path.resolve(__dirname, "packages/language-c/src/index.ts"),
      "@cascade-code/language-cpp": path.resolve(__dirname, "packages/language-cpp/src/index.ts"),
      "@cascade-code/language-expanded": path.resolve(
        __dirname,
        "packages/language-expanded/src/index.ts"
      ),
      "@cascade-code/test-utils": path.resolve(__dirname, "packages/test-utils/src/index.ts"),
      "@cascade-code/core": path.resolve(__dirname, "packages/core/src/index.ts"),
      "@cascade-code/editor-service": path.resolve(
        __dirname,
        "packages/editor-service/src/index.ts"
      ),
    },
  },
});
