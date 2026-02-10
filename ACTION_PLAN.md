# ScriptCacheStore Action Plan (TDD First)

## 1. Objective

Deliver `ScriptCacheStore` and related integration work so collection file writes can be queued in `ScriptCache` and flushed to Drive by trigger/manual flow, while preserving current behaviour when `scriptCacheEnabled=false`.

### Acceptance Criteria

- All acceptance criteria from `ScriptCacheStore_SPEC.md` are met and traceable to tests.
- Work is delivered in small, test-first chunks with explicit Red -> Green -> Refactor loops.
- Each non-trivial chunk passes lint (`0` errors, `0` warnings), tests, code/test review, then docs review.

### Constraints

- Must preserve existing public behaviour when feature gate is disabled.
- Must use fail-fast semantics on cache corruption/missing data to avoid silent data loss.
- Must respect GAS limits (100KB cache item, TTL <= 21600 seconds, trigger quotas).

### Agent Notes

- Decisions made:
- Open questions:
- Follow-ups:

## 2. Delivery Workflow Standard (applies to every chunk)

1. Red: add/adjust tests for the chunk and confirm they fail for the right reason.
2. Green: implement the minimum change to pass those tests.
3. Refactor: improve clarity/reuse without changing behaviour.
4. Review loop:
   - Run targeted tests, then `npm run test`.
   - Run `npm run lint`.
   - Run `Test Creation Agent` for new tests (where applicable), then `Test Review Agent`.
   - Run `Code Review Agent` for source changes.
5. Documentation run:
   - Update developer docs/readme/public API docs for the chunk.
   - Run `docs-review-agent`.

### Acceptance Criteria

- No chunk is marked complete before review + docs run complete.
- Every chunk leaves repo green (tests/lint).

### Constraints

- Keep each chunk small enough for one implementation-review cycle.
- Do not batch multiple behavioural changes into one chunk.

### Agent Notes

- Decisions made:
- Open questions:
- Follow-ups:

## 3. Exhaustive Test Catalogue

IDs below are the authoritative list for this delivery. Every item must exist as a test before sign-off.

### 3.1 DatabaseConfig and serialisation (`CFG-*`)

- `CFG-01`: defaults `scriptCacheEnabled=false`.
- `CFG-02`: default `scriptCacheChunkSizeBytes=92160`.
- `CFG-03`: default `scriptCacheFlushDelaySeconds=300`.
- `CFG-04`: default `scriptCacheTtlSeconds=1800`.
- `CFG-05`: default `scriptCacheMaxChunksPerCollection=100`.
- `CFG-06`: default `scriptCacheOverdueFlushBlocking=true`.
- `CFG-07`: rejects non-number `scriptCacheChunkSizeBytes`.
- `CFG-08`: rejects `scriptCacheChunkSizeBytes<=0`.
- `CFG-09`: rejects `scriptCacheChunkSizeBytes>102400`.
- `CFG-10`: rejects non-number `scriptCacheFlushDelaySeconds`.
- `CFG-11`: rejects `scriptCacheFlushDelaySeconds<=0`.
- `CFG-12`: rejects non-number `scriptCacheTtlSeconds`.
- `CFG-13`: rejects `scriptCacheTtlSeconds>21600`.
- `CFG-14`: rejects `scriptCacheTtlSeconds<scriptCacheFlushDelaySeconds+buffer`.
- `CFG-15`: rejects `scriptCacheFlushDelaySeconds>scriptCacheTtlSeconds`.
- `CFG-16`: rejects non-integer/non-positive `scriptCacheMaxChunksPerCollection`.
- `CFG-17`: rejects non-boolean `scriptCacheEnabled`.
- `CFG-18`: rejects non-boolean `scriptCacheOverdueFlushBlocking`.
- `CFG-19`: `clone()` preserves all script-cache fields.
- `CFG-20`: cloned config is detached from source mutations.
- `CFG-21`: `toJSON()` includes all script-cache fields.
- `CFG-22`: `fromJSON()` restores all script-cache fields.
- `CFG-23`: invalid `fromJSON()` payload throws `InvalidArgumentError`.
- `CFG-24`: static default getters exist and return expected values.

### 3.2 GAS mocks (`MCK-*`)

- `MCK-01`: `CacheService.getScriptCache()` returns stable cache instance.
- `MCK-02`: `ScriptCache.put/get` basic behaviour.
- `MCK-03`: `ScriptCache.putAll/getAll` round-trip behaviour.
- `MCK-04`: `ScriptCache.remove/removeAll` removes expected keys.
- `MCK-05`: cache value > 100KB throws.
- `MCK-06`: cache key length > 250 throws.
- `MCK-07`: cache TTL > 21600 throws.
- `MCK-08`: `ScriptApp.newTrigger().timeBased().after().create()` creates trigger.
- `MCK-09`: `ScriptApp.getProjectTriggers()` returns created trigger.
- `MCK-10`: `ScriptApp.deleteTrigger()` deletes project trigger instance.
- `MCK-11`: deleting detached/non-project trigger throws GAS-like error.

### 3.3 MasterIndex cacheFlush and queue (`MIQ-*`)

- `MIQ-01`: `_data.cacheFlush` initialised with required fields.
- `MIQ-02`: legacy master index data is normalised to include `cacheFlush`.
- `MIQ-03`: helper sets `pending=true` with `dueAtEpochMs`.
- `MIQ-04`: helper clears pending state after queue empty.
- `MIQ-05`: helper updates `lastScheduledAtEpochMs`.
- `MIQ-06`: helper updates `lastAttemptAtEpochMs`.
- `MIQ-07`: helper updates `lastSuccessAtEpochMs`.
- `MIQ-08`: helper increments/resets `failureCount` correctly.
- `MIQ-09`: helper sets `overdueBlockedAtEpochMs` when blocking occurs.
- `MIQ-10`: pending queue key derived from `masterIndexKey`.
- `MIQ-11`: append queue entry persists only metadata fields required by spec.
- `MIQ-12`: read queue returns deterministic order.
- `MIQ-13`: remove queue entry updates persisted queue state.
- `MIQ-14`: queue survives process restart/new `MasterIndex` instance.
- `MIQ-15`: queue operations are lock-protected (no lost updates under contention).

### 3.4 ScriptCacheStore write path (`SCS-W-*`)

- `SCS-W-01`: key namespace includes `masterIndexKey`.
- `SCS-W-02`: namespace differs across two master index keys for same collection/generation.
- `SCS-W-03`: payload <= chunk size uses single chunk.
- `SCS-W-04`: payload > chunk size is chunked.
- `SCS-W-05`: each chunk size <= 100KB.
- `SCS-W-06`: chunk count calculation is deterministic and complete.
- `SCS-W-07`: chunk count > `scriptCacheMaxChunksPerCollection` returns bypass decision.
- `SCS-W-08`: chunk payload written with `putAll()`.
- `SCS-W-09`: manifest written last.
- `SCS-W-10`: manifest includes generation, chunk list, checksum, payload size.
- `SCS-W-11`: returned queue metadata includes required fields and initial status.
- `SCS-W-12`: metadata `flushDueEpochMs` derived from configured delay.
- `SCS-W-13`: cache write failure throws `OperationError`.
- `SCS-W-14`: serialisation/checksum basis deterministic for identical payloads.

### 3.5 ScriptCacheStore read path and integrity (`SCS-R-*`)

- `SCS-R-01`: read by manifest and chunk set via `getAll()`.
- `SCS-R-02`: chunks reassemble in correct order.
- `SCS-R-03`: checksum verified before returning payload.
- `SCS-R-04`: missing manifest treated as cache miss.
- `SCS-R-05`: missing chunk triggers fail-fast corruption error.
- `SCS-R-06`: checksum mismatch triggers fail-fast corruption error.
- `SCS-R-07`: malformed manifest triggers fail-fast corruption error.
- `SCS-R-08`: manifest-generation mismatch is rejected.
- `SCS-R-09`: delete cached payload removes manifest and all chunk keys.
- `SCS-R-10`: cache API failure during read/delete surfaces as operation error.

### 3.6 FileService integration (`FS-*`)

- `FS-01`: with `scriptCacheEnabled=false`, read path stays current behaviour and does not call ScriptCache.
- `FS-02`: with `scriptCacheEnabled=false`, write path stays current behaviour and does not call ScriptCache.
- `FS-03`: enabled read order is L1 -> L2 -> L3.
- `FS-04`: L2 hit hydrates payload and refreshes L1.
- `FS-05`: L2 miss falls back to Drive and repopulates L2.
- `FS-06`: L2 corruption falls back to Drive and repopulates L2.
- `FS-07`: enabled write attempts ScriptCache first and defers Drive on queueable payload.
- `FS-08`: write bypasses cache and writes directly to Drive when chunk limits exceeded.
- `FS-09`: each write updates `MasterIndex.cacheFlush` metadata.
- `FS-10`: write path serialises payload once.
- `FS-11`: overdue flush with blocking enabled forces synchronous flush before read.
- `FS-12`: overdue flush with blocking enabled forces synchronous flush before write.
- `FS-13`: overdue flush with blocking disabled does not force flush.

### 3.7 Flush runner, trigger scheduling, backoff (`FL-*`)

- `FL-01`: manual flush acquires MasterIndex ScriptLock.
- `FL-02`: manual flush with empty queue exits cleanly.
- `FL-03`: successful flush writes Drive payload, removes queue entry, updates stats.
- `FL-04`: multiple queue entries flush in deterministic order.
- `FL-05`: missing/corrupt cache data throws `OperationError` and stops batch.
- `FL-06`: manual `Database.flushPendingWrites()` surfaces flush errors.
- `FL-07`: trigger handler failure path reschedules trigger with backoff.
- `FL-08`: backoff stays within configured/defined bounds.
- `FL-09`: success path resets `failureCount`.
- `FL-10`: pending flag remains true while queue not empty.
- `FL-11`: successful flush deletes cache chunks/manifest.
- `FL-12`: one pending time-based trigger is enforced (deduplication).
- `FL-13`: queue repopulation reschedules trigger when needed.
- `FL-14`: queue empty path removes owned flush trigger.
- `FL-15`: non-flush triggers are not deleted by dedupe/cleanup.
- `FL-16`: `lastScheduledAtEpochMs`, `lastAttemptAtEpochMs`, `lastSuccessAtEpochMs` update correctly.

### 3.8 Public API and end-to-end (`API-*`, `INT-*`)

- `API-01`: `flushPendingWritesHandler()` is exported by `src/04_core/99_PublicAPI.js`.
- `API-02`: handler invokes database flush method.
- `API-03`: handler uses the same error contract as trigger flow design.
- `INT-01`: end-to-end write (cache enabled) is readable before flush through cache.
- `INT-02`: trigger/manual flush persists queued payload to Drive.
- `INT-03`: post-flush reads remain consistent after cache expiry/miss.
- `INT-04`: cache loss before flush causes fail-fast and blocked progression.
- `INT-05`: master index key isolation prevents cache collisions between database copies.
- `INT-06`: oversize collection bypasses cache and remains consistent.
- `INT-07`: full test suite passes.
- `INT-08`: lint passes with 0 errors and 0 warnings.

### Acceptance Criteria

- Each test ID above is implemented and passing.
- Every spec bullet maps to one or more IDs in this catalogue.

### Constraints

- Avoid redundant tests; each case must assert one explicit behavioural contract.
- Prefer deterministic tests (controlled time/mocks, no real waiting).

### Agent Notes

- Decisions made:
- Open questions:
- Follow-ups:

## 4. Chunked Implementation Plan

## Chunk 0 - Baseline and scaffolding

Create test directories/files and requirement trace comments; add no behavioural code yet.

- Red tests: `MCK-01..MCK-11` smoke gaps, skeletons for `CFG-*`, `MIQ-*`, `SCS-*`, `FS-*`, `FL-*`, `API-*`, `INT-*`.
- Green implementation: only test scaffolding utilities and fixtures, no production logic.
- Review loop: run smoke tests + lint.
- Documentation run: add short developer note describing the upcoming ScriptCache layer.

### Acceptance Criteria

- Baseline test files exist and run.
- Existing suite still passes before feature logic begins.

### Constraints

- No production behaviour change in this chunk.
- Keep scaffolding minimal and reusable.

### Agent Notes

- Decisions made:
- Open questions:
- Follow-ups:

## Chunk 1 - DatabaseConfig feature gate and validation

Add config fields/defaults/validation/serialisation/static getters.

- Red tests: `CFG-01..CFG-24`.
- Green implementation:
  - Extend `src/04_core/DatabaseConfig.js`.
  - Update clone/JSON/fromJSON/static getters.
  - Add validation rules for ranges and cross-field constraints.
- Review loop: focused config tests, then full suite + lint.
- Documentation run: update `docs/developers/DatabaseConfig.md`.

### Acceptance Criteria

- All `CFG-*` pass.
- Existing config tests unrelated to script cache remain green.

### Constraints

- Validation errors must use existing project error patterns.
- No magic numbers in source; use named constants.

### Agent Notes

- Decisions made:
- Open questions:
- Follow-ups:

## Chunk 2 - MasterIndex cacheFlush and pending queue APIs

Add `cacheFlush` state and queue persistence helpers with lock safety.

- Red tests: `MIQ-01..MIQ-15`.
- Green implementation:
  - Extend `src/04_core/MasterIndex/99_MasterIndex.js` state shape and normalisation.
  - Add queue read/append/remove and cacheFlush helper methods.
  - Use ScriptProperties key derived from `masterIndexKey`.
- Review loop: master-index tests + full suite + lint.
- Documentation run: update `docs/developers/MasterIndex.md`.

### Acceptance Criteria

- `cacheFlush` metadata is persisted and normalised for legacy data.
- Queue operations are deterministic and lock-safe.

### Constraints

- Queue payload contains metadata only (no chunk data).
- Keep ScriptProperties footprint compact.

### Agent Notes

- Decisions made:
- Open questions:
- Follow-ups:

## Chunk 3 - ScriptCacheStore write path

Implement namespaced key generation, chunking, manifest-last write, and queue metadata return.

- Red tests: `SCS-W-01..SCS-W-14`.
- Green implementation:
  - Add `src/03_services/ScriptCacheStore.js` (or agreed component path).
  - Use `CacheService.getScriptCache().putAll()` for chunks.
  - Write manifest last with checksum and chunk list.
  - Return pending metadata object for queue insertion.
- Review loop: script-cache-store write tests + lint.
- Documentation run: add/update developer component docs.

### Acceptance Criteria

- Chunking obeys size/count constraints.
- Oversize payloads are explicitly marked as cache bypass.

### Constraints

- Must fail fast on cache write errors.
- Must isolate keys per `masterIndexKey`.

### Agent Notes

- Decisions made:
- Open questions:
- Follow-ups:

## Chunk 4 - ScriptCacheStore read/integrity/delete path

Implement manifest/chunk reassembly, checksum validation, corruption handling, and key cleanup.

- Red tests: `SCS-R-01..SCS-R-10`.
- Green implementation:
  - Add read/rehydrate APIs and corruption detection.
  - Add cleanup API to remove manifest/chunks after successful flush.
- Review loop: script-cache-store read tests + lint.
- Documentation run: expand ScriptCacheStore docs with corruption semantics.

### Acceptance Criteria

- Missing/corrupt cache data is never silently ignored in flush paths.
- Reads provide deterministic cache-miss vs corruption outcomes.

### Constraints

- Do not swallow cache integrity errors.
- Keep manifest schema backward-compatible within this feature branch.

### Agent Notes

- Decisions made:
- Open questions:
- Follow-ups:

## Chunk 5 - FileService read path integration (L1/L2/L3)

Introduce collection-aware reads with feature-gated ScriptCache lookup/fallback.

- Red tests: `FS-01`, `FS-03`, `FS-04`, `FS-05`, `FS-06`, `FS-11`, `FS-13`.
- Green implementation:
  - Add `readCollectionFile(driveFileId)` in `src/03_services/FileService.js`.
  - Preserve existing `readFile()` behaviour.
  - Add overdue flush pre-check hook.
- Review loop: FileService tests + regression suite + lint.
- Documentation run: update service docs and any collection integration docs.

### Acceptance Criteria

- Read path strictly follows L1 -> L2 -> L3 when enabled.
- Disabled mode has zero ScriptCache interaction.

### Constraints

- Must not break existing callers using `readFile()`.
- L1 cache semantics remain deep-copy safe.

### Agent Notes

- Decisions made:
- Open questions:
- Follow-ups:

## Chunk 6 - FileService write path integration and queue updates

Introduce collection-aware writes with deferred Drive persistence when cache queueing succeeds.

- Red tests: `FS-02`, `FS-07`, `FS-08`, `FS-09`, `FS-10`, `FS-12`.
- Green implementation:
  - Add `writeCollectionFile(driveFileId, data)` in `src/03_services/FileService.js`.
  - Queue pending metadata via MasterIndex helpers.
  - Update `cacheFlush` metadata and L1 cache entry.
- Review loop: FileService write tests + lint.
- Documentation run: update developer docs for write-behind behaviour.

### Acceptance Criteria

- Queueable payloads defer Drive writes and update pending metadata.
- Non-queueable payloads fall back to direct Drive write safely.

### Constraints

- Serialise once per write path.
- Preserve current direct-write path when feature disabled.

### Agent Notes

- Decisions made:
- Open questions:
- Follow-ups:

## Chunk 7 - Flush runner core (manual path)

Implement synchronous queue flush flow with lock, Drive persistence, queue cleanup, and stats updates.

- Red tests: `FL-01`, `FL-02`, `FL-03`, `FL-04`, `FL-05`, `FL-06`, `FL-09`, `FL-10`, `FL-11`.
- Green implementation:
  - Add `Database.flushPendingWrites()` in database core files.
  - Flush runner loads queue metadata, rehydrates payloads via ScriptCacheStore, writes via `FileOperations.writeFile`.
  - Update queue and `cacheFlush` stats on each outcome.
- Review loop: flush/database tests + full suite + lint.
- Documentation run: update `docs/developers/Database.md`.

### Acceptance Criteria

- Manual flush is synchronous and surfaces errors.
- Successful entries are removed from queue and cache.

### Constraints

- Must hold ScriptLock for queue mutation consistency.
- Must stop on corruption/error (fail-hard policy).

### Agent Notes

- Decisions made:
- Open questions:
- Follow-ups:

## Chunk 8 - Trigger orchestration, dedupe, backoff, overdue blocking

Implement trigger scheduling lifecycle and overdue forced flush semantics.

- Red tests: `FL-07`, `FL-08`, `FL-12`, `FL-13`, `FL-14`, `FL-15`, `FL-16`, `FS-11`, `FS-12`, `FS-13`.
- Green implementation:
  - Add trigger scheduler utilities using `ScriptApp`.
  - Enforce single pending flush trigger.
  - Add reschedule-on-failure backoff policy.
  - Enforce overdue blocking before reads/writes when enabled.
- Review loop: trigger/overdue tests + lint.
- Documentation run: update infra docs for trigger lifecycle.

### Acceptance Criteria

- At most one flush trigger exists per database manager.
- Overdue blocking behaviour matches configuration flag.

### Constraints

- Must not delete unrelated triggers.
- Backoff must be bounded and deterministic.

### Agent Notes

- Decisions made:
- Open questions:
- Follow-ups:

## Chunk 9 - Public API trigger handler and GAS wiring

Expose trigger entry point and complete runtime wiring.

- Red tests: `API-01`, `API-02`, `API-03`.
- Green implementation:
  - Add `flushPendingWritesHandler()` in `src/04_core/99_PublicAPI.js`.
  - Ensure handler path delegates to database flush flow.
  - Confirm `appsscript.json` scope includes `script.scriptapp`.
- Review loop: public API tests + lint.
- Documentation run: update API docs and usage examples.

### Acceptance Criteria

- Trigger handler is callable as a top-level GAS function.
- Handler behaviour aligns with flush error/retry contract.

### Constraints

- Maintain backward compatibility of existing public API exports.
- Keep handler thin; core logic remains in database/services.

### Agent Notes

- Decisions made:
- Open questions:
- Follow-ups:

## Chunk 10 - End-to-end hardening and regression closure

Close cross-component cases and confirm acceptance criteria.

- Red tests: `INT-01..INT-08` plus any uncovered edge case discovered in review.
- Green implementation: only fixes needed to satisfy integration contracts.
- Review loop:
  - Full `npm run test`.
  - `npm run lint`.
  - `Code Review Agent`, `Test Review Agent`, and final `docs-review-agent` sign-off.
- Documentation run:
  - Update `docs/Updates.md`, developer docs, and any new class docs.
  - Add migration/operational notes for fail-hard behaviour.

### Acceptance Criteria

- All `INT-*` pass.
- Full acceptance criteria from spec are verified in test output and docs.

### Constraints

- No unresolved open questions remain at sign-off.
- No skipped tests/lint exceptions for this feature.

### Agent Notes

- Decisions made:
- Open questions:
- Follow-ups:

## 5. Requirement-to-Test Traceability Checklist

Use this as completion gating; every row must map to passing IDs.

- Feature gate disabled compatibility -> `CFG-01`, `FS-01`, `FS-02`, `INT-08`.
- Config limits/defaults/serialisation -> `CFG-02..CFG-24`.
- Key namespacing and chunk constraints -> `SCS-W-01..SCS-W-07`, `INT-05`, `INT-06`.
- Manifest-last and checksum integrity -> `SCS-W-09`, `SCS-W-10`, `SCS-R-03`, `SCS-R-05..SCS-R-08`.
- L1/L2/L3 read/write orchestration -> `FS-03..FS-10`.
- Queue persistence and `cacheFlush` metadata -> `MIQ-01..MIQ-15`, `FS-09`.
- Manual + trigger flush flow -> `FL-01..FL-16`, `API-01..API-03`.
- Overdue blocking behaviour -> `FS-11..FS-13`, `FL-16`.
- Trigger deduplication/cleanup/backoff -> `FL-07`, `FL-08`, `FL-12..FL-15`.
- Flush failure hard-stop semantics -> `FL-05`, `FL-06`, `INT-04`.

### Acceptance Criteria

- Every traceability item links to at least one passing test ID.
- No spec requirement remains untraced.

### Constraints

- If scope changes, update this checklist and test IDs in the same commit.

### Agent Notes

- Decisions made:
- Open questions:
- Follow-ups:
