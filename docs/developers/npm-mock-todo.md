# Node/npm Mocking TODOs

Goal: Run this codebase locally in Node by providing minimal shims for GAS APIs and, incrementally, in-memory mocks for Drive/Properties/Lock services. Keep source unchanged; rely on load order and globals.

## Scope (this phase)
- Add Utilities shim for `getUuid()` and `sleep(ms)` when not running in GAS. [Done]
- Document the plan and follow-ups here. [Done]

## Next steps (follow-ups)
1) Minimal Node loader (no bundler):
   - Set `global` shims for GAS APIs before evaluating source files in order (utils → components → services → core). 
   - Prefer `vm`/`require-from-string` or a simple concatenation loader.

2) In-memory PropertiesService mock:
   - `PropertiesService.getScriptProperties()` returns object with `getProperty(key)`, `setProperty(key, val)`, `deleteProperty(key)`.
   - Backed by a single process-wide Map.

3) In-memory LockService mock:
   - `getScriptLock()` → `{ waitLock(timeout), releaseLock() }`.
   - Single-process: a simple boolean mutex with timestamp; emulate timeout behavior.

4) In-memory DriveApp mock (MVP):
   - `createFile(name, content, mimeType)` → returns File; `getFileById(id)`; `getFolderById(id).createFile(...)`.
   - File: `getId()`, `getName()`, `getSize()`, `getLastUpdated()`, `getDateCreated()`, `isTrashed()`, `setTrashed(bool)`, `getBlob().getDataAsString()`, `getBlob().getContentType()`, `setContent(str)`.
   - Store JSON strings; update size/lastUpdated on writes.

5) Node test runner:
   - Script to set shims, load code, then invoke selected tests (or a smoke test) locally.
   - Wire `npm run test:node` alongside existing GAS test scripts.

## Edge cases to emulate
- Retry backoff in `FileOperations._retryOperation` uses `Utilities.sleep`; blocking sleep preserves semantics.
- JSON parse errors: surface as `InvalidFileFormatError` consistently.
- MasterIndex serialisation: `ObjectUtils` class registry relies on global constructors (`CollectionMetadata`, `DatabaseConfig`); ensure load order.

## Out of scope (later)
- Full concurrency accuracy across threads/processes.
- Drive query/search; only ID-based access needed for current usage.
- Advanced MIME handling; basic content type is enough.

## Success criteria
- Lint/type checks pass after shims added.
- Can run a small Node-based smoke test instantiating `DatabaseConfig`, `MasterIndex` with mocked `PropertiesService` (once added).
- No changes to production source other than additive shims and docs.
