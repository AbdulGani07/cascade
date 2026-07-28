# Frequently asked questions

## Does Cascade predict every broken change?

No. It estimates impact from static dependency evidence. Runtime behavior, reflection, generated code, unresolved imports, and external systems can be outside that evidence.

## Does it execute my repository?

Core analysis does not execute analyzed source code. Structured build and project configuration is parsed as data where supported. Third-party plugins are executable code and must be trusted separately.

## Does it upload source code?

The CLI and dashboard analyze locally. CI artifacts are uploaded only when the workflow is configured to upload them.

## Why are language capabilities different?

Ecosystems expose different syntax, metadata, and resolution rules, and Cascade’s plugins are at different maturity levels. Consult the [capability matrix](CAPABILITY_MATRIX.md).

## Can a low risk score guarantee a safe merge?

No. The score is a review-prioritization heuristic, not a probability or guarantee. See [Risk calculation](RISK_MODEL.md).

## Can Cascade replace a compiler, tests, or a security scanner?

No. It complements those tools with dependency, impact, cycle, and architecture evidence.

## Is the dashboard exposed to the network?

By default it binds to `127.0.0.1`, uses a random access token, and applies restrictive response headers.

## How do I clear the cache?

```bash
node packages/cli/dist/index.js cache clear --yes
```

## Is there a published npm installation?

The documented, verified path for this repository version is a source checkout with pnpm. Do not assume a registry package exists unless a release explicitly documents one.
