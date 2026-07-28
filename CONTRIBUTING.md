# Contributing to Cascade

Thank you for your interest in contributing to Cascade! Cascade is an open-source code intelligence and change-impact analysis platform for modern software projects.

## Code of Conduct

We expect all contributors to follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting Started

### Prerequisites

- **Node.js**: >= 18.0.0
- **pnpm**: >= 9.0.0 (`npm i -g pnpm`)

### Local Setup

1. Fork and clone the repository.
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Build all workspace packages:
   ```bash
   pnpm run build
   ```
4. Run tests:
   ```bash
   pnpm run test
   ```

## Development Workflow

- Always write tests for new features and bug fixes.
- Run `pnpm run check` before submitting a Pull Request to verify linting, typechecking, tests, and builds.
- Follow conventional commits guidelines (e.g. `feat: add tsconfig path alias resolver`, `fix: normalize windows backslashes in report output`).

## Pull Request Guidelines

1. Ensure CI passes on all matrix configurations.
2. Link any related issues in your PR description.
3. Keep pull requests focused on a single logical change.
