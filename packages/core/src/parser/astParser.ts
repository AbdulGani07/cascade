import fs from "node:fs";
import Parser from "tree-sitter";
import TypeScript from "tree-sitter-typescript";
import JavaScript from "tree-sitter-javascript";
import { DependencyNode, Warning } from "@cascade-code/plugin-api";

interface RawImport {
  specifier: string;
  kind: "static" | "dynamic" | "re-export";
}

function parseImportsRegex(source: string): RawImport[] {
  const specifiers: RawImport[] = [];
  const importRegex = /(?:import\s+(?:[\s\S]*?\s+from\s+)?|import\()\s*['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(source)) !== null) {
    const isDynamic = match[0].includes("import(");
    specifiers.push({ specifier: match[1], kind: isDynamic ? "dynamic" : "static" });
  }
  const exportRegex = /export\s+[\s\S]*?\s+from\s+['"]([^'"]+)['"]/g;
  while ((match = exportRegex.exec(source)) !== null) {
    specifiers.push({ specifier: match[1], kind: "re-export" });
  }
  return specifiers;
}

/**
 * Parses a file into an AST and extracts import/export specifiers.
 */
export function parseImports(node: DependencyNode): { specifiers: RawImport[]; warning?: Warning } {
  const specifiers: RawImport[] = [];

  try {
    const source = fs.readFileSync(node.id, "utf-8");

    try {
      const parser = new Parser();
      const language =
        node.language === "typescript"
          ? (TypeScript.tsx as unknown as Parser.Language)
          : (JavaScript as unknown as Parser.Language);
      parser.setLanguage(language);
      const tree = parser.parse(source);

      const querySource = `
        (import_statement source: (string) @import)
        (call_expression function: (import) arguments: (arguments (string) @dynamic))
        (export_statement source: (string) @re-export)
      `;

      const query = new Parser.Query(language, querySource);
      const matches = query.matches(tree.rootNode);

      for (const match of matches) {
        for (const capture of match.captures) {
          const specifier = capture.node.text.replace(/['"]/g, "");
          const kind =
            capture.name === "import"
              ? "static"
              : capture.name === "dynamic"
                ? "dynamic"
                : "re-export";

          specifiers.push({ specifier, kind });
        }
      }

      if (specifiers.length > 0) {
        return { specifiers };
      }
    } catch {
      // Tree-sitter query failed or unsupported; fallback to regex import parser
    }

    const regexSpecifiers = parseImportsRegex(source);
    return { specifiers: regexSpecifiers };
  } catch (err) {
    return {
      specifiers: [],
      warning: {
        file: node.relativePath,
        message: "Failed to parse file: " + (err as Error).message,
      },
    };
  }
}
