# Pre-PR Review — plan/issue-67-lock-acquisition-window

- **Base branch:** main
- **Generated:** 2026-11-17T19:58:31Z
- **Health gate:** PASS (`npm run lint` 0 errors/0 warnings; `npm run test` 86 files / 924 tests passed)
- **Changed files:** 15 (see stat below)

```
 ACTION_PLAN.md                                     | 897 ++++++++++++---------
 SPEC.md                                            | 676 +++++++++---------
 docs/developers/CollectionCoordinator.md           |  49 +-
 docs/developers/DatabaseConfig.md                  |  16 +-
 docs/developers/Infrastructure_Components.md       |  44 +-
 docs/release-notes/release-notes-v0.3.1.md         |  86 ++
 mkdocs.yml                                         |   1 +
 src/02_components/CollectionCoordinator.js         | 134 +--
 src/04_core/DatabaseConfig.js                      |   2 +-
 .../MasterIndex/02_MasterIndexLockManager.js       |   7 +-
 tests/helpers/mock-time-helpers.js                 |   8 +
 ...llection-coordinator-acquisition-budget.test.js | 225 ++++++
 ...llection-coordinator-acquisition-window.test.js | 272 +++++++
 .../collection-coordinator-lock.test.js            |  39 +-
 .../MasterIndex.lock-acquisition-warning.test.js   |  82 ++
 15 files changed, 1639 insertions(+), 899 deletions(-)
```

## Verdict

**Fail** — multiple focuses reported Critical findings (the de-sloppification dead-config finding and the logging double-logging finding); the two most-repeated Improvement issues across focuses are the double-logging/error-framing in `_attemptLockAcquisition` and the duplicated backoff formula in `_computeAcquisitionBackoff`. No security focus was run (not in scope). All findings are subject to the decision pass below.

## Implementation Progress

The agreed fixes are being delivered in six batches. Each batch runs a full implement/review loop, records its outcome here, and is committed and pushed before the next batch starts. The verdict above records the original pre-implementation review state. Wontfix/keep decisions (D5, D9, D19, D22) require no code change.

- **Batch 1 — Critical (dead config + double logging), D1/D2:** Complete, committed. Review PASS, no in-scope findings. Checks: lint 0/0, tests 86/924. Docs sync skipped — no documented behaviour changed (the removed ERROR record was never in the logging contract table; `_config` keys were never public).
- **Batch 2 — Shared backoff utility, D3/D6:** Complete, committed. Review PASS, no in-scope findings. Checks: lint 0/0, tests 87/930. Docs sync ran — added §1.2.5 BackoffUtils to `Infrastructure_Components.md` and a cross-reference in `CollectionCoordinator.md`; no pages created.
- **Batch 3 — Coordinator robustness, D4/D7/D8/D13/D14/D17:** Complete, committed. Review PASS, no in-scope findings. Checks: lint 0/0, tests 87/936. Docs sync ran — added the re-acquisition-failure WARN row and updated the ownership prose in `CollectionCoordinator.md`; no pages created.
- **Batch 4 — DatabaseConfig, D10/D12:** Complete, committed. Review PASS after one in-scope nitpick (missing `@throws` on `_getDefaultRootFolder`) was fixed and re-reviewed. Checks: lint 0/0, tests 87/937. Docs sync ran — reconciled four `DatabaseConfig.md` locations (backoff lower bound, typed root-folder error, validation rule, error-scenarios table); no pages created.
- **Batch 5 — MasterIndex lock manager, D11/D20/D21:** Complete, committed. Review PASS after two in-scope items were fixed and re-reviewed: a redundant in-memory map reassignment (D11's clear still works via shared `CollectionMetadata` references) and the release-note WARN context key. Checks: lint 0/0, tests 87/938. Docs sync ran — `collection` key in the `CollectionCoordinator.md` logging table, `_setAndPersistLockStatus` usage and cleanup persistence in `MasterIndex.md`, plus the release-note correction; no pages created.
- **Batch 6 — Test consolidation, D15/D16/D18:** Complete, committed. Review PASS, no in-scope findings. Checks: lint 0/0, tests 87/938. Docs sync skipped — test-only restructuring with no documented behaviour, API or data-shape change.

**Final status:** All 18 _Fix now_ decisions are implemented, reviewed clean and committed across the six batches. The 3 _Wontfix_ decisions (D5, D19, D22) and the investigation-resolved _keep_ (D9) required no code change. Final checks: `npm run lint` 0 errors/0 warnings; `npm run test` 87 files / 938 tests passed (baseline: 86 files / 924 tests). The Verdict above is the original pre-implementation review outcome, retained for the record.

## Focus areas

### Repo rule compliance

**Verdict: FAIL** — one Improvement-level logging defect and several nit-level issues. No Critical issues. Full review: `.opencode/scratchpad/code-review-collection-coordinator-lock-acquisition.md`.

- **Improvement I-1** — `CollectionCoordinator.js:431-444` (`_attemptLockAcquisition`) logs _"Unexpected error during lock acquisition attempt"_ for **every** thrown error, including the expected `LOCK_TIMEOUT` (thrown at `DbLockService.js:109`, surfaced via `99_MasterIndex.js:555-562`) and `COLLECTION_NOT_FOUND`. On the ScriptLock-timeout path this produces a misleading leading error record immediately before the legitimate `"Lock acquisition timed out"` mapping log at `CollectionCoordinator.js:164`. Rethrow known error types without the "Unexpected" framing.
- **Improvement I-2** — `_computeAcquisitionBackoff` (`CollectionCoordinator.js:452-459`) duplicates the exponential-backoff formula `retryDelayMs * Math.pow(lockRetryBackoffBase, attempt-1)` already present in `FileOperations._calculateRetryDelay` (`FileOperations.js:415-417`). Extract a shared bounded helper.
- **Nitpick N-1** — `CollectionCoordinator.js:487-489` `if (remainingMs <= 0) break;` is unreachable (the `while (Date.now() < deadline)` guard at line 481 guarantees `remainingMs > 0`). Delete it.
- **Nitpick N-2** — `acquireOperationLock` (`CollectionCoordinator.js:475`) and `releaseOperationLock` (`:507`) don't validate `operationId` via `Validate`, contrary to AGENTS.md; add `Validate.nonEmptyString(operationId, 'operationId')`.
- **Nitpick N-3** — New test files `collection-coordinator-acquisition-window.test.js` and `collection-coordinator-lock.test.js` use `ErrorHandler` without the `/* global ErrorHandler */` that siblings (`acquisition-budget.test.js:9`, `preflight.test.js:12`, `violation-policy.test.js:11`) include. Lint passes (configured global), so it's a consistency nit.
- **Incidental INC-1** — `CollectionCoordinator._config` stores unused `lockTimeout` (line 39) and `retryAttempts` (line 42); neither is read after the refactor.
- **Incidental INC-2** — Acquisition window length (`deadline = now + collectionLockLeaseMs`, line 478) equals the granted lease (`collectionLockLeaseMs` passed at lines 482/494); a near-deadline acquisition relies on mid-operation renewal — worth an explicit `@remarks` note, not a defect.

The core deadline-based acquisition logic, the coordination-budget separation, the contention WARN fields, and the `sleepDurations` helper all trace correctly against the new tests.

### KISS & DRY

**Verdict: FAIL (for this focus).** Two Improvement-level findings: a DRY duplication of an existing backoff formula and a double-logging regression introduced by the new wrapper. No Critical findings. Full write-up: `.opencode/scratchpad/code-review-kiss-dry-lock-acquisition.md`.

- **Improvement (diff) — I1 `_computeAcquisitionBackoff` duplicates an existing formula (DRY).** `CollectionCoordinator.js:452-461` (core at line 457: `retryDelayMs * Math.pow(lockRetryBackoffBase, attempt - 1)`) is byte-for-byte the same as `FileOperations.js:415-417` (`_calculateRetryDelay`), differing only in `[500,5000]` clamping. The helper is a reasonable extraction, but it's a _second_ copy — the DRY-correct move is one shared, parameterised backoff utility.
- **Improvement (diff) — I2 `_attemptLockAcquisition` double-logs on the `coordinate()` path.** `CollectionCoordinator.js:431-442` logs "Unexpected error during lock acquisition attempt"; the same error is re-logged by the `coordinate()` boundary catch at `:109-115`, and `LOCK_TIMEOUT` is logged as "unexpected" although `_acquireLockWithTimeoutMapping` (`:159-175`) explicitly handles it. This contradicts the project's "exactly one diagnostic record per failure" intent. The helper's existence is justified (two call sites, `:482`/`:494`); its logging side-effect is the problem.
- **Nitpick (diff, low) — N1.** New tests do **not** re-implement existing helpers (they correctly reuse `collection-coordinator-test-helpers.js` and `mock-time-helpers.js`; the new `sleepDurations` is a sound helper). Only repetition _among the new tests_ (clock+held-lock+restore and the local `createCoordinator` arrow) remains — a candidate for a small shared fixture, not a re-do of an existing helper.
- **Incidental — INC1.** `retryAttempts` is validated/stored (`DatabaseConfig.js:195-197`; `CollectionCoordinator.js:42`) but never read by the deadline-based `acquireOperationLock` — vestigial config, documented as intentional.
- **Incidental — INC2.** The "maps a LOCK_TIMEOUT…" test mocks `acquireCollectionLock` to throw `LOCK_TIMEOUT`, but `MasterIndexLockManager.acquireCollectionLock` never throws that type (returns false on contention / throws `COLLECTION_NOT_FOUND`) — pins a defensive/dead branch.

**Direct answers:** `_attemptLockAcquisition` is justified (removes duplicated boilerplate); `_computeAcquisitionBackoff` is a reasonable extraction but duplicates existing logic (prefer a shared util). The new tests do not duplicate _existing_ helper setup, though they repeat a pattern _among themselves_.

### De-Sloppification

**Verdict: Pass** — the diff itself is disciplined; the only confirmed slop is dead state the change orphaned (`_config.retryAttempts`), plus incidental items in surrounding code. No blocking findings beyond C1 below. Full review in the subagent output.

**Critical — C1. Dead config state: `_config.retryAttempts` no longer has any production reader (diff-caused).**

- **Location**: `src/02_components/CollectionCoordinator.js:42`
- **Evidence**: The constructor still copies `retryAttempts: resolvedConfig.retryAttempts` into `this._config`, but the rewritten deadline-based `acquireOperationLock` (`CollectionCoordinator.js:475-499`) destructures only `collectionLockLeaseMs`, and `_computeAcquisitionBackoff` (`:453`) reads only `retryDelayMs`/`lockRetryBackoffBase`. Repo-wide grep confirms the only reader left is the constructor test (`tests/unit/collection-coordinator/collection-coordinator-constructor.test.js:59,76`). Before this branch, `acquireOperationLock` consumed it (`git show main` line 433: `for (let attempt = 1; attempt <= retryAttempts; ...)`); the diff orphaned the copy without removing it.
- **Why it matters**: It is state that actively misleads — a reader of the constructor would reasonably conclude `retryAttempts` still bounds coordinator behaviour, which this branch's own JSDoc (`DatabaseConfig.js:48`) and docs table (`CollectionCoordinator.md:38`) now explicitly deny. It is also the only reason three tests still pass `retryAttempts` into coordinator configs (`collection-coordinator-lock.test.js:52,74`, `collection-coordinator-constructor.test.js:67`) where the value is inert.
- **Recommended simplification**: Remove `retryAttempts` from the `_config` snapshot at `CollectionCoordinator.js:42`, drop the two assertions at `collection-coordinator-constructor.test.js:59,76`, and drop the inert `retryAttempts` keys from the two lock-test configs. `DatabaseConfig.retryAttempts` itself stays — it is a documented legacy config/serialisation surface.

- **Improvement (incidental) — I1. Duplicated dead config key: `_config.lockTimeout` mirrors `collectionLockLeaseMs` and is never read.** Location `CollectionCoordinator.js:39-40`. Both keys hold the identical `resolvedConfig.collectionLockLeaseMs`; no production code reads `this._config.lockTimeout` (grep: only `collection-coordinator-constructor.test.js:56,73`). Pre-existing on `main`, untouched by this diff. Recommended: delete the `lockTimeout` key and its constructor-test assertions.
- **Improvement (incidental) — I2. Unreachable defensive branch in `_shouldRenewLease`.** Location `CollectionCoordinator.js:376-378`. The `typeof lockAcquiredAt !== 'number'` guard protects against the `null` initialisation at `:86`, but `lockAcquiredAt` is unconditionally assigned a timestamp at `:92` (or `_acquireLockWithTimeoutMapping` throws), and `_finaliseAfterOperation` is only reached after that assignment. Recommended: narrow JSDoc param to `number` and drop the guard, or leave consciously.
- **Improvement (incidental) — I3. Re-acquisition swallow discards the underlying error entirely.** Location `CollectionCoordinator.js:238-240` (`catch { return false; }`). The blanket swallow is a documented contract, but the thrown error's message is never recorded. Recommended: log the caught error (e.g. WARN with `ErrorHandler.safeErrorMessage(e)`) before returning false, and add a row to the logging-contract table. Behaviour unchanged.
- **Nitpick (diff) — N1. Near-tautological negative assertion in the fully-held test.** Location `tests/unit/collection-coordinator/collection-coordinator-acquisition-budget.test.js:223`. After `:222` asserts the error is _not_ a `CoordinationTimeoutError`, `:223` asserts `caught.context.reason).not.toBe(PREFLIGHT_BUDGET_EXHAUSTED_REASON)` — passes vacuously. Recommended: delete `:223` or assert something positive about the failure error.
- **Nitpick (incidental) — N2. Duplicated context keys in the site-0 log record.** Location `CollectionCoordinator.js:166-167`: the `'Lock acquisition timed out'` ERROR carries the same value under both `operationId: opId` and `opId`. Recommended: keep one key; docs table at `CollectionCoordinator.md:129` may need a matching tweak.
- **Nitpick (diff) — N3. `createCoordinator` one-line factory repeated across three test files.** Locations `collection-coordinator-acquisition-budget.test.js:45-47`, `collection-coordinator-acquisition-window.test.js:31-33`, `collection-coordinator-lock.test.js:27-29`. Marginal; no action required now.

**Verified non-findings (cleared by this focus):** the site-0 `LOCK_TIMEOUT` mapping is **live, not dead code** (`CollectionCoordinator.js:163`) — `LOCK_TIMEOUT` is only thrown by `DbLockService._acquireScriptLockWithTimeout` (`DbLockService.js:109`), reachable through `MasterIndex._withScriptLock` (`99_MasterIndex.js:555`) during `acquireCollectionLock`. The `remainingMs <= 0` guard (`:487`) is justified. The two wrappers around `acquireCollectionLock` have deliberately different error semantics and are not collapsible. The `sleepDurations` helper is genuine reuse at five assertion sites.

### Performance (Big-O)

**Verdict: NOT CLEAN** (1 diff Improvement, 1 Nitpick, 2 incidental). Full review: `.opencode/scratchpad/review-perf-complexity.md`.

- **Improvement (diff) — `acquireOperationLock` amplifies a full-index reload per failed attempt.** `src/02_components/CollectionCoordinator.js:475-493` + `src/04_core/MasterIndex/99_MasterIndex.js:555-559`. The new `while (Date.now() < deadline)` loop is time-bounded (not unbounded), but every attempt routes through `_withScriptLock`, which unconditionally calls `_reloadLatestStateUnderLock()` → `_loadFromScriptProperties()` — deserialising the _entire_ master index on each contended attempt. Cost ≈ **O(iterations × S)** where `S` is index size. With exponential backoff iterations ≈ O(log W); but `lockRetryBackoffBase` is only checked as `positiveNumber` (`DatabaseConfig.js`), so `base ≤ 1` collapses backoff to the 500 ms floor → O(W/500) iterations. The old fixed-count loop was capped at `retryAttempts` (3); the new deadline loop can do ~60 full reloads for a 30 s lease under contention.
- **Nitpick (diff) — wasted backoff computation on closing iteration.** `CollectionCoordinator.js:485-490`. `backoffMs` is computed via `_computeAcquisitionBackoff` _before_ the `remainingMs <= 0` `break`, so it is discarded on the window's last iteration. Reorder: check `remainingMs` first.
- **Backoff helper — no finding.** `_computeAcquisitionBackoff` (`CollectionCoordinator.js:452-465`) is **O(1)**: one `Math.pow` + two clamps, no loops/recursion.
- **Incidental Improvement — `cleanupExpiredLocks`** (`02_MasterIndexLockManager.js:214-246` → `99_MasterIndex.js:251`): iterates O(N) collections and calls `_setAndPersistLockStatus` per expired lock, each triggering a full `save()` of the entire index → up to O(N·S) = O(N²) serialisation cost. Maintenance routine, not the per-op hot path.
- **Incidental non-issue (verified):** `updateMasterIndexMetadata`'s double `getCollection` is in-memory O(1) (`99_MasterIndex.js:203-215`), not a redundant ScriptProperties read — hypothesis dismissed with evidence.

### Logging rules compliance

**Verdict: FAIL** — a redundant internal ERROR log double-logs (and for a `LOCK_TIMEOUT`, triple-logs) the same failure detail the boundary already records. Full review: `.opencode/scratchpad/review-logging-policy.md`.

- **Critical — `CollectionCoordinator.js:435`** — `_attemptLockAcquisition` logs `'Unexpected error during lock acquisition attempt'` for every thrown error from `acquireCollectionLock` and rethrows. When acquisition runs via `coordinate()`, that error also reaches the boundary catch at `:110` (`'Operation ${operationName} failed'`), which logs the identical `safeErrorMessage(e)` with equivalent context → **double-logging**. For a `LOCK_TIMEOUT` the same root error is additionally logged at site-0 `:164`, producing **three** ERROR records, and `:435` mislabels the anticipated `LOCK_TIMEOUT` as "Unexpected". The fix must keep exactly one record on the direct-call path (where `:435` is currently the sole record, pinned by the acquisition-window test) while removing the duplicate on the coordinated path.
- **Incidental — `DatabaseConfig.js:170`** — raw `new Error(...)` instead of an `ErrorHandler.ErrorTypes` error (error-standards violation; pre-existing).
- **Incidental — log-context key divergence**: MasterIndex uses `collectionName` (`:49`) vs coordinator's `collection` (`:110`, `:497`); intentional per current tests, noted for aggregation consistency.
- **Incidental — per-attempt WARN at `MasterIndexLockManager.js:49`** can be noisy under sustained contention; distinct from (and not double-logging with) the coordinator's end-of-window WARN — observation only.

**Confirmed compliant:** no `console.*` in the three source files; all referenced error types/codes valid; `safeErrorMessage` correct; per-attempt MasterIndex WARN is at the right (MasterIndex) boundary and intentionally distinct from the coordinator's WARN; rethrow-at-boundary discipline intact.

### Security & secrets

_(not in scope for this diff)_ — no credentials, keys, `PropertiesService`/`ScriptApp` misuse, `HtmlService` output, or injection-prone string building was changed.

### Test-coverage gaps

**Verdict: FAIL** — the new `_computeAcquisitionBackoff` helper has no direct unit test, and two scenario variants are unpinned. Full review: `.opencode/scratchpad/code-reviewer-acquisition-test-coverage.md`.

**Covered:** acquisition-loop success (first-attempt, post-sleep, final attempt), full-window failure, truncated final sleep (success _and_ failure), `retryAttempts` ignored, rethrow of unexpected errors, `coordinate` post-acquisition `startTime` shift (budget exclusion / pre-flight / overrun elapsedMs), MasterIndex WARN enrichment fields, `LOCK_TIMEOUT`→site-0 routing, window-exhaustion→`LOCK_ACQUISITION_FAILURE` routing.

- **Improvement I1** — `_computeAcquisitionBackoff` (`CollectionCoordinator.js:452-461`) has no direct unit test; only indirect via sleep durations. The `attempt-1` exponent is only observed for attempts 1–2; a mid-range (between floor 500 and cap 5000) value at attempt ≥3 is never pinned.
- **Nitpick N1** — `LOCK_TIMEOUT` thrown _after_ backoff sleeps is not pinned (only the first-attempt variant is tested at `CollectionCoordinator.js:165-172`).
- **Nitpick N2** — MasterIndex enriched WARN `remainingMs` is only asserted at the initial attempt (`now=1000`); a later-attempt value isn't asserted (`MasterIndexLockManager.js:49-57`).
- **Incidental Nitpick** — `if (remainingMs <= 0) break;` at `CollectionCoordinator.js:487-489` is unreachable dead code — the `while` guard at line 481 guarantees `remainingMs > 0` when reached.
- **Incidental Improvement** — `lockRetryBackoffBase` is validated only as `positiveNumber` (`DatabaseConfig.js:212`), not `>= 1`; a (0,1) value yields degenerate decreasing backoffs (harmless due to the 500ms floor, but undocumented/untested).

### Error-handling robustness

**Verdict: FAIL** — no hard swallows and the acquisition loop is provably terminating, but two diff findings and two incidental findings keep it from clean. Full review: `.opencode/scratchpad/review-cc-error-handling.md`.

**Correctness confirmations:** catch/rethrow boundary is correct (`CollectionCoordinator.js:434-440`, `:109-116`, `:173`, `:163-171`, no swallow); the loop cannot exit without acquiring or throwing (success returns `:482-483`; `break` on `remainingMs<=0` still falls through to final attempt `:494-496`; only a final `false` throws `LOCK_ACQUISITION_FAILURE` `:497-498`); termination guaranteed because the 500 ms floor makes every `Utilities.sleep` strictly positive.

- **Improvement 1 (diff)** — `acquireOperationLock` (`CollectionCoordinator.js:475`) and `releaseOperationLock` (`:507`) are public but omit `Validate`. Failure still surfaces via `MasterIndexLockManager` (`:33`), but the coordinator boundary diverges from the project "methods validate parameters" rule and from `coordinate`. Add `Validate.nonEmptyString(operationId, 'operationId')`.
- **Nitpick 2 (diff)** — The LOCK_TIMEOUT→site-0 remap (`:163-171`) is **unreachable in production**: `MasterIndexLockManager.acquireCollectionLock` returns `false` on contention (`:58`) and throws only `COLLECTION_NOT_FOUND` (`:40`); `acquireOperationLock` throws only `LOCK_ACQUISITION_FAILURE`. Only the test forces it via a mock. Confirm reachability or mark as defensive.
- **Improvement 3 (incidental)** — `_attemptSingleReacquisition` `catch { return false; }` (`:238-240`) silently swallows exceptions with **no log**, losing root-cause detail. Recommend logging the exception before returning `false`.
- **Nitpick 4 (incidental)** — `_attemptLockAcquisition` labels every caught error "Unexpected" (`:435`) even though the layer above deliberately remaps LOCK_TIMEOUT as expected; misleading and double-logs the same event (remap logs "Lock acquisition timed out" at `:164`).

**Acceptable (reviewed, no action):** `releaseOperationLock` swallow (logged, intentional), over-budget finalisation swallow (logged loud), `_renewLeaseForFinalisationIfRequired` (logs on failure), `_computeAcquisitionBackoff` (bounds protect against zero/NaN), `DatabaseConfig` (constructor-only defaults, validated).

## Decisions

All 22 findings (merged across focuses where they share a root cause and location) were decided individually, in severity order, then audited against the code to pin each to a single concrete fix. **No finding was deferred**, so no GitHub Issues will be raised and Step 7 is skipped. Final tally: 18 _Fix now_, 3 _Wontfix_, 1 investigation resolved as _keep_. "Fix now" decisions are recorded here for the implementing engineer; this review skill does not itself modify code, commit, or push. Where a repo rule or convention decided the course, it is named in the entry.

Dependencies: Decision 9 was resolved by code inspection — the LOCK_TIMEOUT→site-0 mapping is live, so it stays and Decisions 17 and 19 stand as recorded. Decision 3's shared helper is the home for Decision 6's direct tests.

### Critical

- **[Critical] `src/02_components/CollectionCoordinator.js:42` and `:39` — orphaned `_config.retryAttempts` / `_config.lockTimeout`** — Raised by De-Sloppification (C1, I1), KISS & DRY (INC1), Repo rule compliance (INC1). **Decision: Fix now.** Approach: remove `retryAttempts` and `lockTimeout` from the `_config` snapshot, drop the corresponding constructor-test assertions (`collection-coordinator-constructor.test.js:56,59,73,76`) and the inert `retryAttempts` keys in `collection-coordinator-lock.test.js:52,74`. Keep `DatabaseConfig.retryAttempts` as a documented legacy config/serialisation surface. Rationale: user chose to remove misleading dead state in this PR; no additional rationale given.

- **[Critical] `src/02_components/CollectionCoordinator.js:435` — `_attemptLockAcquisition` double/triple-logging and "Unexpected" mislabelling of `LOCK_TIMEOUT`** — Raised by Logging rules (Critical), Repo rule compliance (I-1), KISS & DRY (I2), Error-handling (Nitpick 4). **Decision: Fix now — remove the ERROR log from `_attemptLockAcquisition` entirely** (delete the `this._logger.error('Unexpected error during lock acquisition attempt', ...)` call at `:435-439`), update its JSDoc to say errors are rethrown unchanged without logging, and change the acquisition-window test at `collection-coordinator-acquisition-window.test.js:267` from `expect(errorSpy).toHaveBeenCalledTimes(1)` to `0`. Single fix: `acquireOperationLock` has no production caller outside `coordinate()` (grep confirms only tests call it directly), and AGENTS.md forbids "test-driven production code", so keeping a low-level log purely to satisfy a test is not permitted. This follows the convention stated in `updateMasterIndexMetadata`'s JSDoc (`:546-553`): failure logging is owned by `coordinate`'s boundary catch, keeping exactly one diagnostic record per failure. Removing the log also eliminates the "Unexpected" mislabelling of `LOCK_TIMEOUT` and the double/triple logging; the deliberate site-0 `LOCK_TIMEOUT` record at `:164` remains as a documented point-of-occurrence record.

### Improvement

- **[Improvement] `src/02_components/CollectionCoordinator.js:452-461` vs `src/02_components/FileOperations.js:415-417` — duplicated exponential-backoff formula** — Raised by Repo rule compliance (I-2), KISS & DRY (I1). **Decision: Fix now — add a static-method utility class `src/01_utils/BackoffUtils.js`** (matching the `Validate` static-class convention in that directory) exposing one method with explicit parameters, e.g. `calculateBackoff(attempt, baseDelayMs, base, minMs, maxMs) = Math.max(minMs, Math.min(baseDelayMs * Math.pow(base, attempt - 1), maxMs))`. Point both `CollectionCoordinator._computeAcquisitionBackoff` and `FileOperations._calculateRetryDelay` at it (the latter passing no-op bounds or its own bounds to preserve current behaviour). Note this adds a new util file and touches `FileOperations.js`, so it needs re-review plus a docs-sync check. Rationale: user chose to remove the duplicated formula; the static utility class is the established `src/01_utils/` pattern.

- **[Improvement] `src/02_components/CollectionCoordinator.js:475,507` — missing `Validate` on public `acquireOperationLock` / `releaseOperationLock`** — Raised by Error-handling (Improvement 1), Repo rule compliance (N-2). **Decision: Fix now.** Approach: add `Validate.nonEmptyString(operationId, 'operationId')` to both methods and a test for invalid `operationId`. Rationale: user chose to align the coordinator's public boundary with the project's validation rule.

- **[Improvement] `src/02_components/CollectionCoordinator.js:475-493` + `src/04_core/MasterIndex/99_MasterIndex.js:555-559` — full master-index reload per failed acquisition attempt (O(iterations × S))** — Raised by Performance (Big-O). **Decision: Wontfix (changed from Fix now after code audit).** Single reason: the per-attempt `_withScriptLock` → `_reloadLatestStateUnderLock()` (`99_MasterIndex.js:558,571`) is what lets a waiter observe a lock released during the acquisition window — caching it would break the existing "should acquire a lock that is released just inside the acquisition window" test (`collection-coordinator-acquisition-window.test.js:42`), and a data-shape change to store lock status separately is out of scope. Decision 10 (base `>= 1`) already removes the degenerate O(W/500) case and bounds iterations to O(log W) (~6 for a 30 s lease). Rationale: user chose to keep the reload for freshness and rely on Decision 10.

- **[Improvement] `src/02_components/CollectionCoordinator.js:452-461` — no direct unit test for `_computeAcquisitionBackoff`** — Raised by Test-coverage gaps (I1). **Decision: Fix now — add a direct unit suite for `BackoffUtils.calculateBackoff`** (the helper from Decision 3) covering mid-range growth (`baseDelayMs * base^(attempt-1)` between floor and cap), the 500 ms floor, the 5000 ms cap, and an attempt ≥ 3 value; the existing coordinator sleep-duration tests stay as integration coverage. Rationale: user chose direct coverage; testing the shared helper is the single non-duplicative location.

- **[Improvement] `src/02_components/CollectionCoordinator.js:376-378` — unreachable `lockAcquiredAt` guard in `_shouldRenewLease` (pre-existing, incidental)** — Raised by De-Sloppification (I2). **Decision: Fix now.** Approach: narrow the JSDoc param to `number` and drop the guard. Rationale: user chose to remove the unreachable defensive branch.

- **[Improvement] `src/02_components/CollectionCoordinator.js:238-240` — silent `catch { return false; }` in `_attemptSingleReacquisition` (pre-existing, incidental)** — Raised by De-Sloppification (I3), Error-handling (Improvement 3). **Decision: Fix now.** Approach: log the caught error (WARN with `ErrorHandler.safeErrorMessage(e)`) before returning `false`, add a row to the logging-contract table in `docs/developers/CollectionCoordinator.md`; behaviour unchanged. Rationale: user chose to restore diagnosability for site 3.

- **[Improvement] `src/02_components/CollectionCoordinator.js:163-171` — LOCK_TIMEOUT→site-0 reachability dispute** — Raised by KISS & DRY (INC2) and Error-handling (Nitpick 2) as unreachable; De-Sloppification verified it live via `DbLockService._acquireScriptLockWithTimeout` → `MasterIndex._withScriptLock`. **Decision: Keep the mapping — investigation resolved, no code change.** Verification: `acquireOperationLock` → `_attemptLockAcquisition` → `MasterIndexLockManager.acquireCollectionLock` (`02_MasterIndexLockManager.js:37`) wraps `_withScriptLock` (`99_MasterIndex.js:555`) → `DbLockService.acquireScriptLock` → `_waitForScriptLock` (`DbLockService.js:101`), which throws `LOCK_TIMEOUT` at `:109` when `waitLock` fails. The "unreachable" reviewers only inspected `acquireCollectionLock`'s own `false`/`COLLECTION_NOT_FOUND` paths and missed this chain. De-Sloppification's live-code verification is correct. Rationale: user asked to verify rather than remove on trust; the mapping is live, so removal is not justified.

- **[Improvement] `src/04_core/DatabaseConfig.js:212` — `lockRetryBackoffBase` validated only as `positiveNumber`, not `>= 1` (incidental)** — Raised by Test-coverage gaps (incidental Improvement). **Decision: Fix now — at `DatabaseConfig.js:212` replace `Validate.positiveNumber(this.lockRetryBackoffBase, 'lockRetryBackoffBase')` with `Validate.range(this.lockRetryBackoffBase, 1, Number.MAX_SAFE_INTEGER, 'lockRetryBackoffBase')`** (the same range-check pattern already used for `collectionLockLeaseMs` at `:184-189`), and add a config test for a value in (0, 1). Rationale: user chose to restrict the value; the range pattern is the established convention in this file.

- **[Improvement] `src/04_core/MasterIndex/02_MasterIndexLockManager.js:214-246` → `99_MasterIndex.js:251` — pre-existing O(N²) serialisation in `cleanupExpiredLocks` (incidental)** — Raised by Performance (incidental). **Decision: Fix now — in `cleanupExpiredLocks` (`02_MasterIndexLockManager.js:214-235`), clear each expired lock in memory: call `collection.setLockStatus(null)` and update the in-memory `this._masterIndex._data.collections[name]`, then call `this._masterIndex.save()` exactly once after the loop** — instead of calling `_setAndPersistLockStatus` per lock, which invokes `save()` at `99_MasterIndex.js:251` for each. Note this is an out-of-diff performance refactor needing re-review. Rationale: user chose to address the cost.

- **[Improvement] `src/04_core/DatabaseConfig.js:170` — pre-existing raw `new Error(...)` (incidental)** — Raised by Logging rules (incidental). **Decision: Fix now — at `DatabaseConfig.js:170` replace `throw new Error('Failed to get default root folder: ' + error.message)` with `throw new ErrorHandler.ErrorTypes.CONFIGURATION_ERROR('rootFolderId', error.message, 'Failed to get default root folder')`**, matching the config-failure convention used at `99_MasterIndex.js:463` and `01_DatabaseLifecycle.js:36`. Rationale: user chose to bring it into line with the error standards.

- **[Improvement] `src/02_components/CollectionCoordinator.js:478` — acquisition window equals the lease; add `@remarks` note (incidental)** — Raised by Repo rule compliance (INC-2). **Decision: Fix now.** Approach: add an `@remarks` note to `acquireOperationLock` explaining that a lock acquired near the deadline relies on mid-operation lease renewal. Rationale: user chose to document the implicit behaviour.

### Nitpick

- **[Nitpick] `src/02_components/CollectionCoordinator.js:487-489` — `if (remainingMs <= 0) break;` guard (reviewer disagreement)** — Raised by Repo rule compliance (N-1), Test-coverage gaps (incidental), Performance (Nitpick) as unreachable; De-Sloppification verified it justified. **Decision: Remove the guard — delete lines 487-489 (`if (remainingMs <= 0) break;`) from `acquireOperationLock`.** The user was explicitly told of the residual risk: if a failed `_attemptLockAcquisition` consumes the remaining window, `Utilities.sleep(Math.min(backoffMs, remainingMs))` can receive a zero/negative value. Rationale: user followed the three reviewers who called it dead code.

- **[Nitpick] `tests/unit/collection-coordinator/collection-coordinator-acquisition-window.test.js` and `collection-coordinator-lock.test.js` — missing `/* global ErrorHandler */`** — Raised by Repo rule compliance (N-3). **Decision: Fix now.** Approach: add the comment to both files for consistency with sibling suites. Rationale: user chose consistency despite lint already passing.

- **[Nitpick] `tests/unit/collection-coordinator/collection-coordinator-acquisition-budget.test.js:223` — vacuous negative assertion** — Raised by De-Sloppification (N1). **Decision: Fix now — delete line 223** (`expect(outcome.caught.context.reason).not.toBe(PREFLIGHT_BUDGET_EXHAUSTED_REASON)`); line 222 already pins that the error is not a `CoordinationTimeoutError`. Rationale: user chose to remove the test noise; deletion is the smaller change.

- **[Nitpick] `src/02_components/CollectionCoordinator.js:166-167` — duplicated `operationId: opId` and `opId` keys in the site-0 log record** — Raised by De-Sloppification (N2). **Decision: Fix now — keep `operationId` only at `CollectionCoordinator.js:166`, deleting the duplicate `opId` key at `:167`**, matching `docs/developers/CollectionCoordinator.md:129`. The site-0 record stays because Decision 9 resolved the mapping as live. Rationale: user chose log-shape consistency.

- **[Nitpick] repeated `createCoordinator` factory across three test files and repeated clock/held-lock/restore idiom** — Raised by De-Sloppification (N3), KISS & DRY (N1). **Decision: Fix now — add `createBoundCoordinatorFactory(collection, masterIndex)` to `tests/helpers/collection-coordinator-test-helpers.js`**, returning `(config = {}) => new CollectionCoordinator(collection, masterIndex, config)`, and use it in place of the local `createCoordinator` closure in all three test files. Rationale: user chose to consolidate the pattern now; one named helper is the single fix.

- **[Nitpick] LOCK_TIMEOUT thrown after backoff sleeps not pinned** — Raised by Test-coverage gaps (N1). **Decision: Wontfix.** Rationale: user accepted current coverage; Decision 9 resolved the mapping as live, so this stands unconditionally.

- **[Nitpick] `MasterIndexLockManager.js:49-57` — enriched WARN `remainingMs` asserted only at the initial attempt** — Raised by Test-coverage gaps (N2). **Decision: Fix now.** Approach: add an assertion for a later-attempt `remainingMs` value. Rationale: user chose to pin the later-attempt value.

- **[Nitpick (incidental)] log-context key divergence `collectionName` (MasterIndex) vs `collection` (coordinator)** — Raised by Logging rules (incidental). **Decision: Fix now — standardise on `collection`** (the coordinator convention and the key used in `docs/developers/CollectionCoordinator.md`'s logging table): change the MasterIndex lock-manager log records to use `collection` instead of `collectionName`, update the corresponding assertions in `MasterIndex.lock-acquisition-warning.test.js`, and adjust any developer-doc table that names `collectionName`. Rationale: user chose aggregation consistency and selected `collection` as the single key.

- **[Nitpick (incidental)] per-attempt contention WARN may be noisy under sustained contention** — Raised by Logging rules (incidental, observation only). **Decision: Wontfix.** Rationale: user accepted the documented once-per-attempt behaviour.
