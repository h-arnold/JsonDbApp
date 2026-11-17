# ACTION PLAN — Lock acquisition window and coordination-budget separation (Issue #67)

> **Current status:** PENDING. Derived from `SPEC.md` (final, reviewer-confirmed).
> Workflow: Red–Green–Refactor per section; enabling contracts (acquisition loop) land
> before the clock-origin change that depends on them. Every section leaves the tree
> green: `npm run lint` (0 errors, 0 warnings) and the full suite passing.

## 0. Baseline and shared constraints

**Baseline verification (before Section 1):**

- Run `npm run lint` and `npm run test`; both must be clean on the untouched tree;
  record results.
- Re-measure counted (non-blank, non-comment) LOC; do not inherit the figure from the
  #61 plan. Current measurements: `CollectionCoordinator.js` 549 raw / 313 counted
  (the #61 plan recorded 324, so re-measure and record the true value),
  `02_MasterIndexLockManager.js` 249 raw / 160 counted, `DatabaseConfig.js` 453 raw /
  269 counted (no code change; only `docs/developers/DatabaseConfig.md` is updated).

**Module sizing and file separation:**

| File                                                   | Current counted LOC | Projected after this work | Verdict                                                    |
| ------------------------------------------------------ | ------------------: | ------------------------: | ---------------------------------------------------------- |
| `src/02_components/CollectionCoordinator.js`           |    313 (re-measure) |                  ≈340–360 | Under the 500 `max-lines` warning — **no file separation** |
| `src/04_core/MasterIndex/02_MasterIndexLockManager.js` |                 160 |                      ≈170 | Under 500 — **no file separation**                         |
| `src/04_core/DatabaseConfig.js`                        |                 269 |      269 (no code change) | Under 500 — **not modified in code**                       |

`eslint.config.js` sets `max-lines: ['warn', { max: 500, skipBlankLines: true,
skipComments: true }]` and `complexity: ['warn', 7]`. `CollectionCoordinator.js` is
currently ESLint-warning-free despite 549 raw lines. **Decision: keep the single-file
structure.** If the rewritten `acquireOperationLock` triggers the complexity warning,
extract the backoff computation into a private helper (e.g. `_computeAcquisitionBackoff(attempt)`)
rather than splitting the file. Re-measure counted LOC at the end of each section.

**Shared test pattern:**

- Every deadline-loop test uses `createMockClock()` and `clock.mockUtilitiesSleep()`
  from `tests/helpers/mock-time-helpers.js`; the real `Utilities.sleep()` busy-waits
  against real `Date.now()`.
- Acquire the held-lock fixture **inside the mock-clock scope** so `lockedAt` and
  `expiry` are controlled. For "held for the whole window" cases, set `lockTimeout`
  longer than the coordinator's `collectionLockLeaseMs`; for "released inside the
  window" and stale-lock cases, set it shorter so the lock expires before the
  acquisition deadline.
- Any fixture setting `collectionLockLeaseMs` below the 30000 default **must also set
  `coordinationTimeoutMs` to a value no greater than the lease**. `DatabaseConfig`
  validates `collectionLockLeaseMs >= coordinationTimeoutMs`, and an omitted
  `coordinationTimeoutMs` resolves to 30000, so an unpinned smaller lease fails at
  coordinator construction.
- Assert against the **first matching warning call** when checking warning context.

**Utility reuse (applies to Sections 1–3):** reuse `ErrorHandler.ErrorTypes.LOCK_ACQUISITION_FAILURE`,
`ErrorHandler.safeErrorMessage`, `Validate`, and `JDbLogger` via the existing
`this._logger`. No new utility is introduced and no existing utility is extended, so
no canonical utility doc needs a `Not implemented` entry.

**Data-shape planning (applies to Sections 1–5):** no persisted document, collection
metadata, master-index schema, config serialisation shape or library API shape changes
(`SPEC.md` §9). The `docs/developers/data-shapes/` directory does not exist in this
repository and no planned-only entries are required for this change, so no directory
or file is created. Each section is data-shape-free; this block is stated once rather
than repeated.

**Documentation rule:** no `SPEC.md`/`ACTION_PLAN.md` references in `docs/` or source
comments (prime directive).

---

## 1. Section 1 — CollectionCoordinator: deadline-based acquisition loop

**Objective.** Replace the `retryAttempts`-bounded loop in `acquireOperationLock()`
with a loop bounded by a single deadline of `now + collectionLockLeaseMs`, using a
backoff floored at 500 ms and capped at 5000 ms, a truncated final sleep, and one final
acquisition attempt before failure.

**Constraints.**

- Declare `LOCK_ACQUISITION_MIN_BACKOFF_MS = 500` and
  `LOCK_ACQUISITION_MAX_BACKOFF_MS = 5000` at module top level, alongside
  `LEASE_RENEWAL_WINDOW_MS`.
- Compute the backoff from the **pre-increment** index k (k = 1 for the first failure):
  `max(MIN, min(retryDelayMs * lockRetryBackoffBase^(k-1), MAX))`.
- Remove `retryAttempts` from the method's config destructure (otherwise
  `no-unused-vars`), and remove `elapsedBackoffMs` and the `for` loop's attempt bound.
  Keep `this._config.retryAttempts` for the constructor test.
- Unexpected acquisition errors are still logged and rethrown unchanged.
- The final attempt is a single extra `acquireCollectionLock` call after the loop
  exits; failure is raised only if it also returns `false`.
- Update the `acquireOperationLock` JSDoc in this section (deadline behaviour, not
  "retry/backoff").

**Red-first test cases** — extend
`tests/unit/collection-coordinator/collection-coordinator-lock.test.js` and add
`tests/unit/collection-coordinator/collection-coordinator-acquisition-window.test.js`:

1. Convert the existing `lock already held` case (lines 43–56) to `createMockClock()`
   with the held-lock fixture created inside the mock-clock scope. Its `500/500`
   lease/coordination pairing is already valid.
2. Update the `stop retrying` case (lines 58–81), which already uses
   `createMockClock()`: move the held-lock acquisition inside the mock-clock scope,
   and replace the title and the "one sleep of 250 ms" assertion with deadline
   assertions. With lease/coordination `600/600` and `retryDelayMs: 250` (below the
   new 500 ms floor), the sleeps become 500 then 100 (truncated); assert that
   sequence. The change from 250 to 500 is expected, not a regression.
3. Lock released just inside the window succeeds: lease/coordination `5000/5000`,
   `retryDelayMs` 1000, base 2; acquire the held lock at mock clock 1000 with timeout
   3000 (`lockedAt = 1000`, expiry 4000); expect acquisition at 4000 and no throw.
4. Lock held for the whole window fails once: lease/coordination `5000/5000`,
   `retryDelayMs` 1000, base 2, held lock timeout 10000; expect
   `LOCK_ACQUISITION_FAILURE`, `Date.now()` at throw >= deadline, exactly one WARN
   from the **coordinator's** logger with substring `Could not acquire lock after
retries` with context `{ collection, operationId }` (not the MasterIndex per-attempt
   warning, which uses `collectionName`), and sleep sequence 1000,
   2000, 2000 (the last truncated from 4000 to the remaining window).
5. Stale lock succeeds on the first attempt with no sleep: lease/coordination
   `2000/2000`, held lock timeout 100, advance clock past its expiry before calling
   `acquireOperationLock`.
6. First backoff equals `retryDelayMs`: lease/coordination `5000/5000`, held lock
   with timeout 10000, `retryDelayMs >= 500` (e.g. 1000) so the floor does not mask
   the multiplier; assert the first `Utilities.sleep` call is 1000.
7. Floor when `retryDelayMs` is 0: lease/coordination `2000/2000`, held lock timeout
   5000; every sleep is 500 and there are only a few calls (about four), proving no
   tight ScriptLock loop.
8. Cap: lease/coordination `30000/30000`, `retryDelayMs` 4000 and base 2, held lock
   timeout beyond the deadline; no sleep exceeds 5000 and at least one equals 5000.
9. Final attempt closes the trailing gap: lease/coordination `1000/1000`,
   `retryDelayMs` 700, held lock expiry inside the final truncated sleep; expect
   success at the deadline where the loop-only version would throw.
10. `retryAttempts` ignored: lease/coordination `1000/1000`, `retryAttempts: 1`,
    `retryDelayMs: 250` (floored to 500), held lock timeout 5000; expect two sleeps of
    500 (more than the configured attempt count) and `LOCK_ACQUISITION_FAILURE` at the
    deadline. Without the explicit small delay the default 1000 ms would yield only
    one sleep and the assertion would fail.
11. Unexpected error: lease/coordination `2000/2000`; spy
    `env.masterIndex.acquireCollectionLock` (the method `acquireOperationLock` calls)
    to throw a plain `Error`; assert it is rethrown unchanged, no sleep occurs, and
    `this._logger.error` fired exactly once (per SPEC §5.1 step 5).

**Green.** Implement the deadline loop, constants and final attempt; remove the dead
destructure entry and accumulator.

**Refactor.** If complexity exceeds 7, extract the backoff calculation into
`_computeAcquisitionBackoff(attempt)`. Re-read the method end to end and reconcile
JSDoc.

**Acceptance criteria.** All red tests green; both converted tests green; no lint
warnings; counted LOC recorded and under 500.

**Section checks.**

1. `npx vitest run --config tests/vitest.config.js tests/unit/collection-coordinator/`
2. `npm run lint`
3. `npm run test`

---

## 2. Section 2 — CollectionCoordinator: move the coordination clock origin

**Objective.** Capture `startTime` immediately after successful lock acquisition
rather than at the top of `coordinate()`, so acquisition wait no longer consumes
`coordinationTimeoutMs`.

**Constraints.**

- Keep the single clock source: the pre-flight check and the over-budget verdict read
  the same `startTime`.
- Move only the capture. The DEBUG `Starting operation` record stays before
  acquisition. Conflict resolution stays after acquisition and before the pre-flight
  check.
- The `overBudget` verdict remains post-callback and pre-finalisation; the ownership
  step continues to use `lockAcquiredAt` for lease renewal.
- Site 0–3 reason strings, logging records and swallows are unchanged.
- Update the JSDoc for `coordinate()` (site-0 wording: a thrown `LOCK_TIMEOUT` maps to
  site 0, while deadline exhaustion raises `LockAcquisitionFailureError`) and
  `_enforcePreflightBudget` (`@remarks` must no longer say "captured at the top of
  `coordinate()`"; use "captured after lock acquisition (see `coordinate()`)").

**Red-first test cases** (new
`tests/unit/collection-coordinator/collection-coordinator-acquisition-budget.test.js`):

1. Slow acquisition does not consume the coordination budget: under the mock clock,
   hold a lock with `collectionLockLeaseMs: 1200`, `coordinationTimeoutMs: 300`,
   `retryDelayMs: 100` (floored to 500) and held-lock timeout 600 (expiry 1600 at
   clock 1000). The lease is at least the coordination timeout and at least the hold
   time, and the held lock expires inside the window. Acquisition succeeds at ~2000
   after ~1000 ms of waiting; then advance
   100 ms in the callback. Expect the result returned and no `CoordinationTimeoutError`.
   Under the old clock origin total elapsed would be ~1100 ms and site 2 would throw.
2. Pre-flight still fires: with acquisition mocked to succeed instantly, spy conflict
   resolution to advance past the budget; expect `preflight-budget-exhausted` and the
   callback not invoked (existing preflight suite must stay green).
3. Post-operation overrun still fires: callback alone advances past the budget; expect
   `post-operation-overrun` with metadata finalised (existing lock-release suite must
   stay green).
4. Site 0 still maps: `acquireCollectionLock` throwing `LOCK_TIMEOUT` yields
   `lock-acquisition-timeout` (existing preflight suite case must stay green).
5. Overrun log `elapsedMs` excludes acquisition wait: with a slow acquisition followed
   by an over-budget callback, assert the logged `elapsedMs` approximates the
   post-acquisition elapsed time, not total wall-clock since operation start.
6. Fully-held acquisition routes as an acquisition failure, not site 1: through
   `coordinate()`, use `collectionLockLeaseMs: 2000` with `coordinationTimeoutMs: 500`
   and a held-lock timeout of at least 10000 so the lock outlives the lease; assert the
   thrown error is
   `ErrorHandler.ErrorTypes.LOCK_ACQUISITION_FAILURE` and is **not** a
   `CoordinationTimeoutError` (no `preflight-budget-exhausted` reason), proving the
   narrowed site-1 trigger.

**Green.** Move the `startTime` capture and update the two JSDoc blocks.

**Refactor.** Confirm no second clock source or dead timestamp parameter remains.

**Acceptance criteria.** All red tests green; the preflight, violation-policy and
lock-release suites green unmodified; lint clean; LOC recorded and under 500.

**Section checks.**

1. `npx vitest run --config tests/vitest.config.js tests/unit/collection-coordinator/`
2. `npm run lint`
3. `npm run test`

---

## 3. Section 3 — MasterIndexLockManager: enrich the failed-acquisition warning

**Objective.** Add lock-holder and expiry detail to the per-attempt contention warning
so stale locks can be distinguished from active contention.

**Constraints.**

- Keep the message substring `Failed to acquire lock; collection is already locked.`
  and the existing `collectionName` / `operationId` context keys.
- Add `lockedBy`, `lockedAt`, `lockTimeout`, `expiry = lockedAt + lockTimeout` and
  `remainingMs = expiry - now`, using the `lockStatus` already read at line 43.
- Change only the warning context; no locking decision or persisted `lockStatus` shape
  changes.

**Red-first test cases** (new
`tests/unit/master-index/MasterIndex.lock-acquisition-warning.test.js`):

1. Spy `env.masterIndex._logger.warn`. Under the mock clock at 1000, hold the lock with
   `acquireCollectionLock('coordinatorTest', 'holder-op', 5000)` and call
   `acquireOperationLock('new-op')` with lease/coordination pinned to `500/500`. Assert the **first matching**
   warning has the message substring and context `{ collectionName: 'coordinatorTest',
operationId: 'new-op', lockedBy: 'holder-op', lockedAt: 1000, lockTimeout: 5000,
expiry: 6000, remainingMs: 5000 }`.

**Green.** Extend the warning context in
`src/04_core/MasterIndex/02_MasterIndexLockManager.js`.

**Refactor.** None expected; keep the warning call a single statement.

**Acceptance criteria.** Red test green; no existing warning-count assertion broken
(no existing test pins this context); lint clean; counted LOC under 500.

**Section checks.**

1. `npx vitest run --config tests/vitest.config.js tests/unit/master-index/ tests/unit/collection-coordinator/`
2. `npm run lint`
3. `npm run test`

---

## 4. Section 4 — Regression hardening

**Objective.** Prove the three coordinated changes hold across the system and that the
#61 violation contract is intact.

**Tasks.**

- Full suite: `npm run test` and `npm run test:coverage`. Coverage on
  `CollectionCoordinator.js` and `02_MasterIndexLockManager.js` must not regress
  materially; the v8 provider with `all: true` is configured.
- Cross-suite sweep: `tests/unit/database/`, `tests/unit/collection/`,
  `tests/unit/master-index/`, all `tests/unit/collection-coordinator/` suites, and any
  suite exercising `coordinate()` indirectly. Investigate and fix root causes rather
  than waiving tests.
- Record the timing-suite assessment: `collection-coordinator-preflight.test.js`,
  `collection-coordinator-violation-policy.test.js` and
  `collection-coordinator-lock-release.test.js` acquire the lock on the first attempt
  and drive time in conflict resolution or the callback, so the clock move does not
  change their verdicts. No edits expected there.
- Verify the integrated scenarios: (1) lock released inside the lease window succeeds;
  (2) lock held for the whole window fails once at/after the deadline; (3) a stale lock
  succeeds on the first attempt; (4) slow acquisition followed by a short callback
  returns successfully; (5) sites 0–3 still throw with their exact reason strings.
- Re-run `npm run lint` (0 errors, 0 warnings) and re-measure counted LOC against the
  §0 projections.

**Acceptance criteria.** Full suite green; coverage non-regressed; lint clean; LOC
under gate; all five integrated scenarios demonstrably pass via named tests.

**Section checks.**

1. `npm run test:coverage`
2. `npm run lint`
3. `npm run test`

---

## 5. Section 5 — Documentation follow-through

**Objective.** Make documentation and JSDoc match the delivered behaviour, with no
planning-artefact references in permanent docs.

**Tasks.**

- `docs/developers/CollectionCoordinator.md`: rewrite the `Single clock source`
  paragraph and `coordinate()` flow **step 1 ("Validate and prepare")** for the
  post-acquisition clock; add the acquisition-window contract (deadline, backoff floor
  and cap, final attempt), the enriched contention warning, and the note that
  `coordinationTimeoutMs` no longer bounds total wall-clock.
- `docs/developers/DatabaseConfig.md`: describe `retryAttempts` as legacy for lock
  acquisition; keep its validation and default documented; note that
  `collectionLockLeaseMs` is now the acquisition wait window.
- `docs/developers/Class_Diagrams.md`: reflect the acquisition-window behaviour of
  `acquireOperationLock` if the method summary describes retry/backoff.
- `docs/developers/Infrastructure_Components.md`: keep the site-0 distinction explicit
  (thrown `LOCK_TIMEOUT` maps to site 0; deadline exhaustion yields
  `LockAcquisitionFailureError`) if the coordination-timeout section mentions lock
  acquisition.
- Add a **new** file `docs/release-notes/release-notes-v0.3.1.md`, following the
  structure (not the filename) of the existing `release-notes-v0.3.0.md`, which must
  not be overwritten. Describe the deadline-based acquisition, the clock-origin
  change and the richer warning, and state that no data-shape or migration change is
  required. The filename is fixed as `release-notes-v0.3.1.md`; no other version label
  is introduced. The release-note sequence (latest `v0.3.0`) is authoritative for the
  label; `package.json` currently reads `0.1.0`, a pre-existing inconsistency that
  this work does not change.
- Verify all code examples are current and cross-references intact; manual grep for
  planning-artefact references in `docs/` and `src/`.
- Route: `Docs` agent review after `Code Reviewer` approval of the source/test changes,
  per the repository review process.

**Acceptance criteria.** No doc contradicts the delivered behaviour; no planning-artefact
references anywhere in `docs/` or source; `npm run lint` and `npm run test` still clean.

**Section checks.**

1. `npm run lint`
2. `npm run test`
3. Manual grep: no `SPEC.md`/`ACTION_PLAN.md` references in `docs/` or source.

---

## Sequencing summary

| Order | Section                              | Depends on               |
| ----- | ------------------------------------ | ------------------------ |
| 0     | Baseline verification and LOC sizing | —                        |
| 1     | Deadline-based acquisition loop      | Baseline                 |
| 2     | Coordination clock origin            | 1 (acquisition contract) |
| 3     | Enriched contention warning          | 1 (independent of 2)     |
| 4     | Regression hardening                 | 1, 2, 3                  |
| 5     | Documentation follow-through         | 4 (post code review)     |

Sections 1 and 3 are logically independent; the numbered order keeps the tree
single-threaded for the TDD gates.
