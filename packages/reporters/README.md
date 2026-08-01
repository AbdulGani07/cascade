# `@cascade-code/reporters`

Renders Cascade analysis results as JSON, Markdown summaries, or SARIF 2.1.0 diagnostics.

## Should I install it directly?

Usually no. The CLI uses the reporters it needs; install this package when embedding Cascade or authoring a custom output pipeline.

```bash
npm install @cascade-code/reporters@next
```

## Usage

```ts
import { JsonReporter } from "@cascade-code/reporters";

const reporter = new JsonReporter();
const json = reporter.render(analysisResult);
```

The package exports `JsonReporter`, `MarkdownReporter`, and `SarifReporter`. SARIF reports cycles as `CASCADE001` and unreachable files as `CASCADE002`; reporter output sanitizes project-root and path data according to the package's safety helpers.

## Environment, privacy, and limitations

Requires Node.js 22.13 or newer. Reports can contain repository structure and findings, so review artifacts before sharing them. Reporters serialize the supplied static-analysis result and do not improve its completeness or perform security scanning.

[Documentation](../../docs/README.md) · [Reporter development](../../docs/REPORTER_DEVELOPMENT.md) · [Repository](https://github.com/AbdulGani07/cascade) · [Issues](https://github.com/AbdulGani07/cascade/issues) · [License](../../LICENSE)
