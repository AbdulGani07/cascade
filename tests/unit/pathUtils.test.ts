import { describe, it, expect } from "vitest";
import { toPosixRelativePath } from "../../packages/core/src/utils/pathUtils.js";

describe("toPosixRelativePath", () => {
  it("converts relative path with dot-slash to clean POSIX path", () => {
    expect(toPosixRelativePath("./src/components/Button.tsx")).toBe("src/components/Button.tsx");
  });

  it("handles empty input gracefully", () => {
    expect(toPosixRelativePath("")).toBe("");
  });

  it("normalizes Windows backslashes to forward slashes", () => {
    expect(toPosixRelativePath("src\\utils\\helper.ts")).toBe("src/utils/helper.ts");
  });

  it("converts absolute Windows path to relative POSIX path given root directory", () => {
    const winAbsPath = "C:\\Users\\developer\\cascade\\src\\index.ts";
    const winRootDir = "C:\\Users\\developer\\cascade";
    expect(toPosixRelativePath(winAbsPath, winRootDir)).toBe("src/index.ts");
  });

  it("converts absolute POSIX path to relative path given root directory", () => {
    const posixAbsPath = "/home/user/project/src/parser/astParser.ts";
    const posixRootDir = "/home/user/project";
    expect(toPosixRelativePath(posixAbsPath, posixRootDir)).toBe("src/parser/astParser.ts");
  });
});
