# Dashboard security and scale policy

The dashboard is designed for a local `cascade dashboard` session. It renders
analysis JSON only and never executes repository source code. Repository-provided
names, evidence, and paths are rendered as React text; the dashboard does not use
`dangerouslySetInnerHTML`. Self-contained HTML exports embed data as escaped JSON.

Do not expose a locally served dashboard to an untrusted network. A hosted mode
must add authentication, access control, transport security, and a content-security
policy before use with private repository data.

For scale, file graphs initially cap layout at 400 nodes and project graphs at
800; the dependency matrix caps at 200 nodes. Users must explicitly expand graphs
after filtering or drilling into a project. These caps protect the main thread from
large Dagre layouts.

## Views and interaction

The workspace exposes repository, project, file, package, service, cycle, dead
code, change-impact, pull-request, affected-test, architecture, unresolved,
language, hotspot, matrix, and snapshot views. Press `Ctrl+K` or `Cmd+K` to open
the command palette. The selected view and node are preserved in the URL.

Filters and tables use bounded result windows; graph expansion is explicit.
Selecting an edge opens its type, confidence, resolution status, and evidence.
Node impact distinguishes direct and transitive dependents.

## Export

JSON and self-contained HTML contain the complete analysis payload. SVG and PNG
provide portable overview images. PDF uses the browser print pipeline because it
preserves accessibility and avoids shipping a large PDF renderer to every user.

Run `node benchmarks/dashboard-scale.mjs 50000` for the synthetic 50,000-node,
100,000-edge selection benchmark. This measures preprocessing, not browser paint
or full-force layout; the dashboard deliberately avoids full-force layout at this
scale.

Measured on the local Windows development environment on 2026-07-28:

|   Nodes |   Edges | Visible selection | Selection time | Heap used |
| ------: | ------: | ----------------: | -------------: | --------: |
|  50,000 | 100,000 |               400 |      114.27 ms | 16.27 MiB |
| 100,000 | 200,000 |               400 |      230.76 ms | 27.87 MiB |

These numbers measure deterministic degree aggregation and bounded selection.
They do not claim that rendering 100,000 DOM or React Flow nodes is safe; the UI
prevents that path by default.

## Testing

The dashboard suite includes component-contract, accessibility-contract,
interaction, schema/view compatibility, SCC/path algorithm, malicious-text,
large-graph performance, production-build, and browser smoke coverage. The
checked preview is stored as `cascade-dashboard-overview.png` in the generated
task artifacts. Pixel-baseline visual regression remains environment-sensitive;
the browser smoke capture provides the review artifact without accepting noisy
cross-platform pixel diffs as a quality signal.
