# ScriptCacheStore Specification

## Overview
- Introduce a `ScriptCacheStore` service sitting between `FileService` and GAS `ScriptCache` to provide chunked, trigger-flushed write-behind caching for collection files only (collections larger than ~90 KB chunked, 100 KB max per chunk). The in-memory `FileService` cache remains the L1 and Drive files stay as the durable source of truth (L3).
- Feature gate via `DatabaseConfig` (`scriptCacheEnabled` default `false`). When disabled, existing behaviour must remain unchanged.
- An async flush mechanism uses a single deduplicated time-driven trigger plus manual API (`Database.flushPendingWrites()` + new `flushPendingWritesHandler()` exposed via `src/04_core/99_PublicAPI.js`).
- Cache failure modes fail fast (block reads/writes) to avoid silent data loss; overdue flushes must run before further operations.

## Configuration
- `scriptCacheEnabled` (bool): default `false`; enables ScriptCache layering.
- `scriptCacheChunkSizeBytes`: number; default `92160` bytes (90 KB). Must be `> 0`, `<= 100KB`, and allow 1 chunk for up to that size.
- `scriptCacheFlushDelaySeconds`: number; default `300`; target delay before trigger fires. Must be positive and <= `scriptCacheTtlSeconds`.
- `scriptCacheTtlSeconds`: number; default `1800` (30 min) but must be `>= scriptCacheFlushDelaySeconds + buffer` and `<= 21600` (App Script limit).
- `scriptCacheMaxChunksPerCollection`: number; default `100`; protects queue size / ScriptProperties limit.
- `scriptCacheOverdueFlushBlocking`: bool; default `true`; when flush overdue, block reads/writes until pending writes flush.
- Extend `clone()`, `toJSON()`, `fromJSON()` plus static defaults for each field.

## ScriptCacheStore Responsibilities (L2)
1. Namespace keys per master index (e.g. `${masterIndexKey}__CACHE_CHUNK__${collectionId}__${generation}`) to avoid collisions in library copies.
2. Maintain metadata per pending write: `fileId`, `collectionGeneration`, `chunkHeadKey`, `chunkCount`, `queuedAtEpochMs`, `payloadSizeBytes`, `flushDueEpochMs`, `status`.
3. Use `CacheService.getScriptCache().putAll()` and `getAll()` for concurrent chunk operations.
4. Chunk collections larger than `scriptCacheChunkSizeBytes`; each chunk <= 100 KB. Keep chunk count <= `scriptCacheMaxChunksPerCollection`. If payload too large, skip cache and persist directly to Drive.
5. Write manifest last (chunk head key holding list of chunk keys + generation) to avoid torn reads. Manifest includes checksum (e.g. `ObjectUtils.serialise` length/hash) to fail fast if missing chunk detected.

## FileService Integration
- Expose collection-aware `readCollectionFile(driveFileId)` / `writeCollectionFile(driveFileId, data)` that orchestrate L1/L2/L3.
- Read order: in-memory map -> ScriptCache manifest + chunks (if `scriptCacheEnabled`) -> Drive fallback. On cache hit, rehydrate data and refresh L1. On cache miss or corruption, fallback to Drive, then repopulate ScriptCache (if enabled).
- Write order: serialise payload once, attempt to store in ScriptCache chunked. Update pending queue and mark in-memory cache entry. Drive write deferred unless disable or chunk constraints fail.
- For each write, update `MasterIndex.cacheFlush` metadata (pending flag, due timestamp, trigger status) so overdue detection is possible.

## Flush Mechanism
- Pending queue persisted in ScriptProperties under a key derived from `masterIndexKey` (kept compact). Only metadata stored; chunk data lives in ScriptCache.
- Flush runner (trigger or manual) acquires MasterIndex ScriptLock, reads queue, fetches chunked payload via `ScriptCacheStore`, writes to Drive with `FileOperations.writeFile`, removes entry from queue, updates `cacheFlush` stats (`lastAttemptAt`, `lastSuccessAt`, `failureCount`, `pending`).
- If cache data missing/corrupt, fail fast: throw `OperationError`, do not proceed. Trigger handler reschedules with backoff; manual `flushPendingWrites()` surfaces errors to caller.
- After each successful flush, delete chunk keys via `CacheService.remove`. Maintain metadata so future reads see consistent state.
- Deduplicate triggers: only one pending time-based trigger per manager; reschedule when queue re-populated or failure occurs.
- On overdue (`Date.now() > cacheFlush.dueAtEpochMs`), any collection read/write must block and synchronously flush before proceeding (per `scriptCacheOverdueFlushBlocking`).

## MasterIndex / Coordination Enhancements
- Extend `MasterIndex` internal data (`_data`) with `cacheFlush` object: `pending`, `dueAtEpochMs`, `lastScheduledAtEpochMs`, `lastAttemptAtEpochMs`, `lastSuccessAtEpochMs`, `failureCount`, `overdueBlockedAtEpochMs` (optional). Persist via existing ScriptProperties flow.
- Provide helpers to update/clear flush metadata while holding ScriptLock.
- Pending queue stored separately to keep main index lean; `MasterIndex` exposes methods to read/append queue entries.

## Trigger & GAS Requirements
- Add new function in `src/04_core/99_PublicAPI.js`: `flushPendingWritesHandler()` (public entry for trigger). This function will call `Database.flushPendingWrites()` or equivalent service.
- Ensure `appsscript.json` includes `script.scriptapp` scope (already present) and add `ScriptApp` mock/triggers in `tools/gas-mocks/gas-mocks.cjs` + test setup.

## Testing & Mocks
- Extend GAS mocks with `CacheService.getScriptCache()` and `ScriptApp` stub supporting `newTrigger`, `timeBased().after()`, `getProjectTriggers()`, and simple `deleteTrigger()` semantics.
- Add unit tests covering `ScriptCacheStore` chunked read/write logic, queue persistence, trigger scheduling/rescheduling, overdue flush blocking, and failure handling.
- Validate fallback when `scriptCacheEnabled` is `false` remains the existing FileService behaviour (tests should assert no ScriptCache calls).
- Add integration tests exercising `Database.flushPendingWrites()` and `flushPendingWritesHandler()`, ensuring pending writes clear queue and stats update.

## Acceptance Criteria
- `scriptCacheEnabled=false` leaves current behaviour untouched.
- With `true`, reads/writes first exercise ScriptCache and use chunking/reassembly via `getAll`/`putAll` with manifest metadata.
- Collections exceeding chunk limits bypass cache and write directly to Drive.
- Trigger-driven flush persists pending chunks to Drive; failure reschedules trigger with bounded retries.
- Overdue flush is enforced before new reads/writes when `scriptCacheOverdueFlushBlocking=true`.
- Manual `Database.flushPendingWrites()` flushes queue synchronously and exposes errors.
- Tests cover key flows; lint passes with 0 errors/warnings before final review.

## Constraints & Risks
- Cache data is non-durable; losing chunks before flush leads to failure and blocked operations (acceptable per fail-hard policy).
- GAS trigger quotas (20 per script) enforce deduped scheduling; flush handler must clean up scheduled triggers when queue empties.
- ScriptCache TTL must be long enough to survive until flush (`scriptCacheFlushDelaySeconds`).
- Queue metadata stored in ScriptProperties must remain small and deterministic to avoid hitting size limits.

