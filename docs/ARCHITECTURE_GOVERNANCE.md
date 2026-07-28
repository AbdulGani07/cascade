# Architecture governance

`cascade.config.json` supports an opt-in, versioned `architectureGovernance`
object. Cascade does not prescribe an architecture; rules describe the boundaries
chosen by the repository.

```json
{
  "architectureGovernance": {
    "version": "1",
    "rules": [
      {
        "id": "domain-no-ui",
        "from": ["src/domain/**"],
        "deny": ["src/ui/**"],
        "severity": "error",
        "message": "Domain must not import UI.",
        "remediationUrl": "https://example.test/architecture"
      }
    ],
    "suppressions": [
      {
        "rule": "domain-no-ui",
        "path": "src/domain/legacy.ts",
        "reason": "Migration tracked in ARCH-42",
        "expiresAt": "2027-01-01"
      }
    ]
  }
}
```

Rules support `from`, `to`, `allow`, `deny`, `only`, `except`, `path`, `project`,
`dependencyType`, `severity`, `message`, `remediationUrl`, `expiresAt`, and
`baseline`. A rule may baseline known debt while rejecting unbaselined findings.
Invalid versions, missing rule IDs, expired rules, unused rules, contradictory
allow/deny entries, and expired suppressions are reported deterministically.

## Patterns

- Clean / layered: `from: ["src/domain/**"], deny: ["src/ui/**"]`.
- Hexagonal: adapters may `allow: ["src/application/**"]`; domain denies adapters.
- DDD: `from: ["features/*/**"], deny: ["features/*/internal/**"]` with explicit exceptions.
- Feature-sliced frontend: UI may `only: ["src/features/**", "src/shared/**"]`.
- Microservices: service paths deny direct imports to other services and allow approved clients.
- Monorepos: public package paths deny `packages/*/private/**`.
- Infrastructure: infrastructure paths allow domain interfaces and deny implementations.

Run `cascade governance . --format json` for CI, `--format sarif` for code
scanning, or `--format markdown` for review comments. `analysis.governance`
includes exact dependency endpoints, matching rule IDs, severity, suppression/
baseline state, and allowed-boundary diagram data.
