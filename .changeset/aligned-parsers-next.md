---
"@cascade-code/cli": patch
"@cascade-code/config": patch
"@cascade-code/core": patch
"@cascade-code/editor-service": patch
"@cascade-code/language-c": patch
"@cascade-code/language-cpp": patch
"@cascade-code/language-csharp": patch
"@cascade-code/language-expanded": patch
"@cascade-code/language-go": patch
"@cascade-code/language-java": patch
"@cascade-code/language-javascript": patch
"@cascade-code/language-kotlin": patch
"@cascade-code/language-python": patch
"@cascade-code/language-rust": patch
"@cascade-code/language-typescript": patch
"@cascade-code/plugin-api": patch
"@cascade-code/reporters": patch
---

Align Tree-sitter runtimes with each grammar's declared peer range inside the language-plugin
boundary. Clean installations of the packed public package set now pass `npm ls --all` without
invalid Tree-sitter packages or `ELSPROBLEMS`.

This is a `next` prerelease after the existing 3.3.0 publication; it does not replace or modify
3.3.0.
