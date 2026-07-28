import ts from "typescript";
import {
  DependencyExtractionResult,
  ExtractedDependency,
  ImportKind,
  SourceLocation,
} from "@cascade/plugin-api";

function locationOf(source: ts.SourceFile, node: ts.Node): SourceLocation {
  const start = source.getLineAndCharacterOfPosition(node.getStart(source));
  const end = source.getLineAndCharacterOfPosition(node.getEnd());
  return {
    startLine: start.line + 1,
    startColumn: start.character + 1,
    endLine: end.line + 1,
    endColumn: end.character + 1,
  };
}

function literalText(node: ts.Node | undefined): string | undefined {
  return node && (ts.isStringLiteralLike(node) || ts.isNoSubstitutionTemplateLiteral(node))
    ? node.text
    : undefined;
}

function scriptKind(filePath: string): ts.ScriptKind {
  if (filePath.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (filePath.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (/\.(ts|mts|cts)$/.test(filePath)) return ts.ScriptKind.TS;
  if (filePath.endsWith(".json")) return ts.ScriptKind.JSON;
  return ts.ScriptKind.JS;
}

/**
 * Extract dependencies with the TypeScript compiler parser. It recovers from
 * malformed source and retains diagnostics instead of discarding partial data.
 */
export function extractScriptDependencies(
  filePath: string,
  relativePath: string,
  content: string
): DependencyExtractionResult {
  const source = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(filePath)
  );
  const dependencies: ExtractedDependency[] = [];
  const seen = new Set<string>();

  const add = (
    node: ts.Node,
    specifier: string | undefined,
    flags: {
      kind?: ImportKind;
      dynamic?: boolean;
      typeOnly?: boolean;
      reExport?: boolean;
      conditional?: boolean;
    } = {}
  ) => {
    if (!specifier) return;
    const key = `${node.pos}:${specifier}:${flags.kind ?? "static"}`;
    if (seen.has(key)) return;
    seen.add(key);
    const dynamic = flags.dynamic ?? false;
    const typeOnly = flags.typeOnly ?? false;
    const reExport = flags.reExport ?? false;
    dependencies.push({
      specifier,
      importKind: flags.kind ?? (typeOnly ? "type-only" : dynamic ? "dynamic" : "static"),
      isStatic: !dynamic,
      isDynamic: dynamic,
      isTypeOnly: typeOnly,
      isReExport: reExport,
      isConditional: flags.conditional ?? false,
      sourceLocation: locationOf(source, node),
      rawText: node.getText(source),
    });
  };

  const isConditional = (node: ts.Node): boolean => {
    for (let parent = node.parent; parent; parent = parent.parent) {
      if (
        ts.isIfStatement(parent) ||
        ts.isConditionalExpression(parent) ||
        ts.isTryStatement(parent) ||
        ts.isSwitchStatement(parent)
      ) {
        return true;
      }
      if (ts.isSourceFile(parent)) break;
    }
    return false;
  };

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) {
      add(node, literalText(node.moduleSpecifier), {
        typeOnly: node.importClause?.isTypeOnly ?? false,
        kind: node.importClause?.isTypeOnly
          ? "type-only"
          : node.importClause
            ? "static"
            : "side-effect",
      });
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      add(node, literalText(node.moduleSpecifier), {
        typeOnly: node.isTypeOnly,
        reExport: true,
        kind: node.isTypeOnly ? "type-only" : "re-export",
      });
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      add(node, literalText(node.moduleReference.expression), {
        typeOnly: node.isTypeOnly,
        kind: node.isTypeOnly ? "type-only" : "static",
      });
    } else if (ts.isCallExpression(node)) {
      const first = literalText(node.arguments[0]);
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        add(node, first, {
          dynamic: true,
          kind: "dynamic",
          conditional: isConditional(node),
        });
      } else if (ts.isIdentifier(node.expression) && node.expression.text === "require") {
        add(node, first, {
          kind: "static",
          conditional: isConditional(node),
        });
      } else if (
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        node.expression.expression.text === "require" &&
        node.expression.name.text === "resolve"
      ) {
        add(node, first, {
          kind: "reference",
          conditional: isConditional(node),
        });
      }
    } else if (
      ts.isNewExpression(node) &&
      ts.isIdentifier(node.expression) &&
      /^(Worker|SharedWorker)$/.test(node.expression.text)
    ) {
      const argument = node.arguments?.[0];
      let specifier = literalText(argument);
      if (
        argument &&
        ts.isNewExpression(argument) &&
        ts.isIdentifier(argument.expression) &&
        argument.expression.text === "URL"
      ) {
        specifier = literalText(argument.arguments?.[0]);
      }
      add(node, specifier, { dynamic: true, kind: "dynamic" });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);

  const preprocessed = ts.preProcessFile(content, true, true);
  for (const reference of [
    ...preprocessed.referencedFiles,
    ...preprocessed.typeReferenceDirectives,
    ...preprocessed.libReferenceDirectives,
  ]) {
    add(source, reference.fileName, { kind: "reference", typeOnly: true });
  }

  const parseDiagnostics =
    (source as ts.SourceFile & { parseDiagnostics?: readonly ts.DiagnosticWithLocation[] })
      .parseDiagnostics ?? [];
  const diagnostics = parseDiagnostics.map((diagnostic: ts.DiagnosticWithLocation) => {
    const start = diagnostic.start ?? 0;
    const position = source.getLineAndCharacterOfPosition(start);
    return {
      file: relativePath,
      message: ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
      severity: "warning" as const,
      code: `TS${diagnostic.code}`,
      location: {
        startLine: position.line + 1,
        startColumn: position.character + 1,
        endLine: position.line + 1,
        endColumn: position.character + 1,
      },
    };
  });

  return { dependencies, diagnostics };
}
