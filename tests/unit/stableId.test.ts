import { describe, it, expect } from "vitest";
import { toPosixRelativePath } from "@cascade-code/core";

describe("Stable Path IDs", () => {
  it("normalizes Windows backslash paths to stable POSIX relative paths", () => {
    const winPath = "C:\\Users\\dev\\project\\src\\components\\Button.tsx";
    const winRoot = "C:\\Users\\dev\\project";

    const stableId = toPosixRelativePath(winPath, winRoot);
    expect(stableId).toBe("src/components/Button.tsx");
  });

  it("strips leading dot-slash and slashes for consistency", () => {
    expect(toPosixRelativePath("./src/index.ts")).toBe("src/index.ts");
    expect(toPosixRelativePath("/src/index.ts")).toBe("src/index.ts");
  });
});
