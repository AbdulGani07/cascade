# Analysis fixture coverage

The integration tests generate isolated fixture repositories under the system
temporary directory so symlink, casing, and path behavior reflects the host
operating system.

Coverage includes ESM, CommonJS, mixed JS/TS, React, Vite, Next.js app routes,
Express, NestJS, tsconfig aliases, workspace packages and exports, extensionless
and directory imports, JSON/CSS imports, dynamic imports, circular dependencies,
dead files, unresolved imports, malformed source, Windows path normalization,
case mismatches, and multiple entry points.

The generated benchmark fixtures cover 100, 1,000, and 5,000-file graphs.
