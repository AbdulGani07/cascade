import { describe, expect, it } from "vitest";
import {
  createGraphqlPlugin,
  createHtmlPlugin,
  createSqlPlugin,
  createStylesPlugin,
  createSveltePlugin,
  createVuePlugin,
} from "@cascade-code/language-expanded";

function dependencies(factory: () => ReturnType<typeof createVuePlugin>, source: string) {
  const plugin = factory();
  const extension = plugin.supportedExtensions[0];
  const context = {
    filePath: `sample${extension}`,
    relativePath: `sample${extension}`,
    content: source,
  };
  const parsed = plugin.parser.parse(context);
  if (parsed instanceof Promise) throw new Error("unexpected async parser");
  const result = plugin.dependencyExtractor.extractDependencies({ ...context, ast: parsed.ast });
  if (result instanceof Promise) throw new Error("unexpected async extractor");
  return result.dependencies.map((item) => item.specifier);
}

describe("Batch D language plugins", () => {
  it("extracts literal component, markup, style, GraphQL, and SQL evidence", () => {
    expect(
      dependencies(createVuePlugin, `<script>import Card from "./Card.vue"</script>`)
    ).toContain("./Card.vue");
    expect(dependencies(createSveltePlugin, `<script>import "./theme.css"</script>`)).toContain(
      "./theme.css"
    );
    expect(dependencies(createHtmlPlugin, `<script src="./app.js"></script>`)).toContain(
      "./app.js"
    );
    expect(dependencies(createStylesPlugin, `@import "./base.css";`)).toContain("./base.css");
    expect(dependencies(createGraphqlPlugin, `#import "./fragments.graphql"`)).toContain(
      "./fragments.graphql"
    );
    expect(
      dependencies(
        createSqlPlugin,
        `ALTER TABLE child ADD FOREIGN KEY (parent_id) REFERENCES parent(id);`
      )
    ).toContain("parent");
  });

  it("keeps SQL semantic claims limited", () => {
    const plugin = createSqlPlugin();
    expect(plugin.analysisLevels).not.toContain("module-dependency");
    expect(plugin.limitations.knownIssues).toContain("SQL dialect semantics are partial.");
  });
});
