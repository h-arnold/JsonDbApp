# Viitest suite

This directory is the home of the new Viitest-based test harness.

## What lives here

- `vitest.config.js`: points the runner at `tests/unit`/`tests/helpers`, wires setup, and bootstraps the GAS mocks.
- `setup/gas-mocks.setup.js`: injects `DriveApp`, `ScriptProperties`, `LockService`, etc. by reusing `tools/gas-mocks/gas-mocks.cjs`.
- `unit/master-index/MasterIndex.test.js`: MasterIndex-focused tests for persistence, conflicts, and locking.
- `helpers/gas-mocks/gas-mocks.test.js`: lightweight smoke tests that verify the mock GAS surface before other suites rely on it.
- `sample/MasterIndex.test.js`: exercises `MasterIndex` initialisation, persistence and locking using the GAS mocks.

## Running the suite

Use `npm run test:vitest` from the repository root; it uses the configuration under this directory via `vitest run --config tests/vitest.config.js`.

## Notes

- The legacy framework now lives under `old_tests/` and is left untouched until we refactor each suite.
- The mock storage and properties files are kept inside `tests/.gas-drive` and `tests/.gas-script-properties.json` so the sandbox is isolated from the rest of the repo.
- `MasterIndex` state is persisted inside `tests/.gas-script-properties.json` (via `PropertiesService`); every test deletes the keys it creates so the helper data is cleaned up between runs.
