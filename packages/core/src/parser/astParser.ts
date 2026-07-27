import fs from "node:fs";
import Parser from "tree-sitter";
import TypeScript from "tree-sitter-typescript";
import JavaScript from "tree-sitter-javascript";
import { DependencyNode, Warning } from "../types/index.js";

interface RawImport {
  specifier: string;
  kind: "static" | "dynamic" | "re-export";
}

/**
 * Parses a file into an AST and extracts import/export specifiers.
 */
export function parseImports(node: DependencyNode): { specifiers: RawImport[]; warning?: Warning } {
  const parser = new Parser();
  const specifiers: RawImport[] = [];

  try {
    const source = fs.readFileSync(node.id, "utf-8");
    parser.setLanguage(node.language === "typescript" ? (TypeScript.tsx as any) : (JavaScript as any));
    const tree = parser.parse(source);

    const querySource = `
      (import_statement source: (string) @import)
      (call_expression function: (import) arguments: (arguments (string) @dynamic))
      (export_statement source: (string) @re-export)
    `;

    const language = node.language === "typescript" ? (TypeScript.tsx as any) : (JavaScript as any);
    const query = new Parser.Query(language, querySource);
    const matches = query.matches(tree.rootNode);

    for (const match of matches) {
      for (const capture of match.captures) {
        const specifier = capture.node.text.replace(/['"]/g, "");
        const kind = 
          capture.name === "import" ? "static" :
          capture.name === "dynamic" ? "dynamic" : "re-export";
        
        specifiers.push({ specifier, kind });
      }
    }
    
    return { specifiers };
  } catch (err) {
    return {
      specifiers: [],
      warning: { file: node.relativePath, message: "Failed to parse file: " + (err as Error).message },
    };
  }
}
