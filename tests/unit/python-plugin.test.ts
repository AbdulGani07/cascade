import { describe, expect, it } from "vitest";
import { createPythonPlugin, extractPythonDependencies } from "@cascade-code/language-python";

describe("Python language plugin", () => {
  it("extracts runtime, type-only, conditional, relative, and literal dynamic imports", () => {
    const result = extractPythonDependencies(
      "src/pkg/app.py",
      `
import os
import requests as http
from .models import User
if TYPE_CHECKING:
    from .types import UserShape
try:
    import optional_lib
except ImportError:
    pass
def load():
    return importlib.import_module("pkg.worker")
`
    );
    expect(result.dependencies.map((dependency) => dependency.specifier)).toEqual([
      "os",
      "requests",
      ".models",
      ".types",
      "optional_lib",
      "pkg.worker",
    ]);
    expect(
      result.dependencies.find((dependency) => dependency.specifier === ".types")?.isTypeOnly
    ).toBe(true);
    expect(
      result.dependencies.find((dependency) => dependency.specifier === "pkg.worker")?.isDynamic
    ).toBe(true);
  });

  it("preserves malformed and non-literal dynamic import diagnostics", () => {
    const plugin = createPythonPlugin();
    const parsed = plugin.parser.parse({
      filePath: "bad.py",
      relativePath: "bad.py",
      content: "x = (1",
    });
    expect(parsed).toMatchObject({ status: "partial" });
    const extracted = extractPythonDependencies("bad.py", "__import__(module_name)");
    expect(extracted.diagnostics[0]?.code).toBe("PY_DYNAMIC_IMPORT_UNRESOLVED");
  });
});
