# Testing Guide

This document explains how to run the available tests for both the frontend and backend of Notter.

## Frontend Tests

Frontend unit tests are written in TypeScript under the `tests/` directory. Use the provided npm script to execute them:

```bash
npm test
```

This command uses `ts-node` to run the TypeScript test files directly.

To add new frontend tests, create additional `*.test.ts` files in the `tests/` folder. Each test file should use Node's built‑in `assert` module or another test framework of your choice.

## Backend Tests

The Rust backend exposes its own tests. From the `src-tauri` directory, run:

```bash
cargo test
```

Add new Rust test modules using the standard `#[cfg(test)]` attribute within the appropriate source files.
