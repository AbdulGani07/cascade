# Risk calculation

Cascade assigns a deterministic, explainable score to a Git change. The score helps prioritize review; it is not a probability of failure.

## Inputs

The current model adds the following weights:

| Signal                     | Weight |
| -------------------------- | -----: |
| Changed file               |      1 |
| Direct dependent           |      2 |
| Transitive dependent       |      1 |
| Affected entry point       |      8 |
| Affected public symbol     |      6 |
| Suggested test             |      1 |
| Affected service           |      6 |
| Introduced cycle           |     15 |
| Architecture violation     |     12 |
| Unresolved dependency      |      8 |
| Ownership boundary crossed |      4 |
| Critical-path impact       |     10 |

The total is capped at 100.

## Levels

|  Score | Level    |
| -----: | -------- |
|   0–14 | Low      |
|  15–39 | Moderate |
|  40–69 | High     |
| 70–100 | Critical |

Run:

```bash
node packages/cli/dist/index.js risk --base origin/main --head HEAD
node packages/cli/dist/index.js explain --base origin/main --head HEAD
```

`explain` is the better review artifact when the reason matters more than the number.

## Determinism

For the same repository contents, configuration, plugin versions, cache format, and Git range, the calculation is deterministic. Cache entries are validated before reuse.

## Calibration

The weights are heuristics. A high score identifies broader or structurally riskier change evidence; a low score does not guarantee safety. Teams should compare scores with their own review and incident history before setting blocking thresholds.
