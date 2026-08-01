# Public-beta demo scripts

## 18. Two-minute demo

**0:00â€“0:20 â€” Set context.** Cascade supplies local dependency and change-impact evidence. State
that it includes no telemetry and does not execute the project being analyzed.

**0:20â€“0:45 â€” Verify.** In a disposable terminal, show `cascade --version` and
`cascade doctor examples/vscode-extension-demo`.

**0:45â€“1:15 â€” Analyze.** Run `cascade analyze examples/vscode-extension-demo`. Point out the real
TypeScript edges and the deliberate `orders.ts`/`pricing.ts` cycle.

**1:15â€“1:40 â€” Editor.** In the isolated VS Code profile, refresh the workspace and show CodeLens,
the cycle diagnostic, and affected-test candidate for `tests/orders.test.ts`.

**1:40â€“2:00 â€” Boundaries.** State that results are static evidence, language capabilities vary,
and beta feedback should include a minimal public fixture.

## 19. Five-minute technical demo

**0:00â€“0:40 â€” Reproducibility.** Show the public npm channel, exact CLI version, clean demo
workspace, and local configuration.

**0:40â€“1:40 â€” Graph evidence.** Run doctor, analyze, and graph. Walk through
`app.ts -> orders.ts -> pricing.ts -> orders.ts` and explain direct versus transitive evidence.

**1:40â€“2:30 â€” Change-impact workflow.** Demonstrate an impact or affected-test query available in
`cascade --help`. Explain why candidate confidence is not a guarantee.

**2:30â€“3:30 â€” VS Code.** Refresh, show CodeLens, analyze the current file, inspect Problems, then
show the affected-test Quick Pick. Use only the clean profile and real outputs.

**3:30â€“4:15 â€” Dashboard and reports.** Start the dashboard, show that it binds to `127.0.0.1`,
hide its tokenized URL, and demonstrate one supported report without exposing absolute paths.

**4:15â€“5:00 â€” Limits and feedback.** Cover dynamic imports, generated code, language capability,
workspace limits, privacy, security reporting, and the beta feedback template.
