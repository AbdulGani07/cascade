# Python support

Cascade ships `@cascade/language-python` as a first-party plugin. Python edges include
resolution status, dependency category, confidence, evidence, source location, and diagnostics.

## Capability matrix

| Area           | Behavior                                                                      | Status                 |
| -------------- | ----------------------------------------------------------------------------- | ---------------------- |
| Files          | `.py`, `.pyi`, packages, namespace packages, flat and `src` layouts           | Supported              |
| Discovery      | Monorepos and symlinks; `.gitignore` respected                                | Supported              |
| Exclusions     | virtualenvs, caches, build output, generated headers, protobuf and migrations | Supported              |
| Imports        | `import`, aliases, dotted imports, `from`, relative imports                   | Supported              |
| Context        | function-local, conditional, optional (`try`), and `TYPE_CHECKING` imports    | Supported              |
| Dynamic        | literal `importlib.import_module()` and `__import__()`                        | Supported              |
| Star imports   | module edge with reduced confidence and diagnostic                            | Partial                |
| Resolution     | package `__init__`, namespace and `src` modules                               | Supported              |
| Classification | internal, standard library, declared external, unresolved                     | Supported              |
| Metadata       | `pyproject.toml`, `setup.py`, `setup.cfg`, requirements                       | Detected               |
| Managers       | pip, Poetry, uv, PDM, Hatch                                                   | Detected from metadata |
| Frameworks     | Django, Flask, FastAPI, ASGI and WSGI conventions                             | Supported              |
| Entrypoints    | `__main__.py`, main guard, app/server/main, manage.py, ASGI/WSGI              | Supported              |
| Tests          | pytest/test paths are separate roots                                          | Supported              |
| Notebooks      | analyze exported `.py`; direct `.ipynb` analysis                              | Optional/not enabled   |

## Accuracy safeguards

- Unknown imports are never silently marked resolved. Undeclared bare modules are unresolved.
- `TYPE_CHECKING` edges are type-only; function and guarded imports retain conditional semantics.
- Standard-library, declared third-party, and repository-internal modules are separate categories.
- Malformed-source and unresolved-import diagnostics are preserved in schema 2.0 results.
- Non-literal dynamic imports emit `PY_DYNAMIC_IMPORT_UNRESOLVED` and suppress dead-code claims.
- Star imports retain a module edge but carry reduced confidence and `PY_STAR_IMPORT`.
- Generated files and test roots are excluded from production dead-code findings.

## Known limitations

- Arbitrary import hooks, computed module names, `sys.path` mutation, and runtime plugin registries
  cannot be resolved statically.
- Distribution names do not always equal import names; configure or declare dependencies consistently.
- Console-script values in highly dynamic `setup.py` code are not evaluated.
- Notebook cell execution order is not modeled. Export notebooks to `.py` for analysis.
- Syntax recovery is conservative and does not replace Pyright, Ruff, or CPython validation.

## Configuration and CLI

```json
{
  "pythonSourceRoots": ["src", "services/api"],
  "analyzeNotebooks": false,
  "ignore": ["**/.venv/**", "**/generated/**"]
}
```

```bash
pnpm exec cascade analyze .
pnpm exec cascade analyze . --json
pnpm exec cascade graph .
```

Example edge:

```json
{
  "from": "src/acme/api.py",
  "to": "src/acme/models.py",
  "importKind": "type-only",
  "resolutionStatus": "resolved",
  "dependencyCategory": "internal",
  "confidence": 1,
  "evidence": ["guarded by TYPE_CHECKING", "matched Python module 'acme.models'"]
}
```
