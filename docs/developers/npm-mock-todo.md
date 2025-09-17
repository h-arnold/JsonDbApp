# Node/npm Mocking TODOs

Goal: Run this codebase locally in Node by providing minimal shims for GAS APIs and, incrementally, in-memory mocks for Drive/Properties/Lock services. Keep source unchanged; rely on load order and globals.

## Scope (this phase)
- Add Utilities shim for `getUuid()` and `sleep(ms)` when not running in GAS. [Done]
- Document the plan and follow-ups here. [Done]

## Next steps (follow-ups)
1) Minimal Node loader (no bundler):
   - Set `global` shims for GAS APIs before evaluating source files in order (utils → components → services → core). 
   - Prefer `vm`/`require-from-string` or a simple concatenation loader.
   - Ensure constructors used by `ObjectUtils` class registry (e.g. `DatabaseConfig`, `CollectionMetadata`) are attached to the same global context before any serialisation/deserialisation paths run.

2) In-memory PropertiesService mock:
   - `PropertiesService.getScriptProperties()` returns object with `getProperty(key)`, `setProperty(key, val)`, `deleteProperty(key)`.
   - Backed by a single process-wide Map.
   - Provide `ScriptProperties` global alias that proxies to the same backing store and exposes `getProperty`, `setProperty`, and `deleteProperty` (tests call `ScriptProperties.deleteProperty(...)`).

3) In-memory LockService mock:
   - `getScriptLock()` → returns an object with `waitLock(timeoutMs)` and `releaseLock()`.
   - Behaviour: if unlocked, acquire immediately; if locked, block synchronously until released or `timeoutMs` elapses; on timeout, throw (so `DbLockService` maps it to `LOCK_TIMEOUT`).
   - Single-process: a simple boolean mutex with timestamp; emulate timeout behaviour accurately; no re-entrancy needed.

4) In-memory DriveApp mock (MVP):
   - DriveApp top-level: `getRootFolder()`, `createFolder(name)`, `getFolderById(id)`, `createFile(name, content, mimeType)`, `getFileById(id)`.
   - Folder: `getId()`, `getName()`, `createFile(name, content, mimeType)`, `setTrashed(bool)`, `getFilesByType(mimeType)`.
   - File iterator: object with `hasNext()`/`next()` to iterate results of `getFilesByType`.
   - File: `getId()`, `getName()`, `getSize()`, `getLastUpdated()`, `getDateCreated()`, `isTrashed()`, `setTrashed(bool)`, `setContent(str)`, and `getBlob()` returning `{ getDataAsString(), getContentType() }`.
   - Constants: provide global `MimeType.PLAIN_TEXT = 'text/plain'`.
   - MIME matching nuance: although index files are written with `'application/json'`, `Database._findExistingIndexFile()` looks up `getFilesByType(MimeType.PLAIN_TEXT)`. In the mock, treat `PLAIN_TEXT` as a superset that also returns `'application/json'` files to keep behaviour working without changing source.
   - Trash semantics: `setTrashed(true)` hides items from subsequent `getFileById`/`getFolderById` calls (throw "File not found"); `fileExists` should return `false` for trashed files.
   - Size/updated times: compute size from UTF-8 byte length; update `lastUpdated` on writes.

5) Node test runner:
   - Script to install shims on `globalThis`, then evaluate source files in load order and run a minimal smoke test locally.
   - Smoke test: create a root folder; instantiate `DatabaseConfig`/`MasterIndex`; create a collection via `Database` to exercise `FileOperations` and `PropertiesService` paths; read/write index to ensure serialisation works.
   - Add `"test:node"` npm script alongside existing GAS test scripts to run the harness.

## Edge cases to emulate
- Retry backoff in `FileOperations._retryOperation` uses `Utilities.sleep`; blocking sleep preserves semantics.
- JSON parse errors: surface as `InvalidFileFormatError` consistently.
- MasterIndex serialisation: `ObjectUtils` class registry relies on global constructors (`CollectionMetadata`, `DatabaseConfig`); ensure load order.
 - Drive search: ensure `getFilesByType(MimeType.PLAIN_TEXT)` returns JSON files too to support `Database._findExistingIndexFile()` logic without altering source.
 - Error message mapping: when throwing from mocks to simulate Drive errors, consider messages like "File not found", "Insufficient permission", or quota/rate terms to exercise `FileOperations._handleDriveApiError` branches.
 - Lock timeouts: ensure `waitLock` throws after `timeoutMs` to trigger `LOCK_TIMEOUT` handling in `DbLockService`.

## Out of scope (later)
- Full concurrency accuracy across threads/processes.
- Drive query/search; only ID-based access needed for current usage.
- Advanced MIME handling; basic content type is enough.

## Success criteria
- Lint/type checks pass after shims added.
- Can run a small Node-based smoke test instantiating `DatabaseConfig`, `MasterIndex` with mocked `PropertiesService` (once added).
- No changes to production source other than additive shims and docs.
