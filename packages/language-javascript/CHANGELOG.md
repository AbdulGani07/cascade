# @cascade-code/language-javascript

## 3.3.1-next.0

### Patch Changes

- Align Tree-sitter runtimes with each grammar's declared peer range inside the language-plugin
  boundary. Clean installations of the packed public package set now pass `npm ls --all` without
  invalid Tree-sitter packages or `ELSPROBLEMS`.

  This is a `next` prerelease after the existing 3.3.0 publication; it does not replace or modify
  3.3.0.

- Updated dependencies
  - @cascade-code/plugin-api@3.3.1-next.0
