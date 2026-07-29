# Reporter development

Reporters transform an `AnalysisResult` into a serialized format. They must not mutate the analysis graph.

## Contract

Implement `Reporter` from `@cascade-code/plugin-api`:

```ts
import type { Reporter } from "@cascade-code/plugin-api";

export const textReporter: Reporter = {
  id: "example-text",
  name: "Example text",
  format: "text",
  render(result) {
    return `Files: ${result.graph.nodes.size}\n`;
  },
};
```

The supported reporter format identifiers are `json`, `text`, `markdown`, `sarif`, and `html`.

## Security requirements

Treat every field in `AnalysisResult` as untrusted:

- escape user-controlled text for HTML and Markdown contexts;
- serialize JSON and SARIF with a JSON serializer;
- never construct shell commands from report values;
- use project-relative paths unless the caller explicitly requests otherwise;
- apply secret redaction before writing;
- avoid embedding source content unless the format and user request require it;
- bound output size and stream large output where supported.

The built-in implementations live in `packages/reporters/src`.

## Tests

Cover malicious filenames, HTML markup, terminal control sequences, SARIF fields, secrets, large graphs, and deterministic ordering. A reporter should produce byte-identical output for identical normalized input.
