# SPEC — Lock acquisition window and coordination-budget separation (Issue #67)

## 1. Purpose

`CollectionCoordinator.acquireOperationLock()` currently stops retrying after a fixed
attempt count (`retryAttempts`, default 3). `collectionLockLeaseMs` is used only as an
upper cap on accumulated backoff, never as the acquisition wait window. With the
default `retryDelayMs: 1000` and `lockRetryBackoffBase: 2`, a writer gives up after
~3 seconds even when the lock metadata shows a 30-second lease that has not expired. The failed-acquisition warning also omits the lock holder and expiry, so a
stale lock cannot be distinguished from active contention in the logs.

This change:

1. Makes acquisition deadline-based, waiting up to the configured lease with a capped
   backoff.
2. Moves the coordination clock origin to after successful acquisition, so waiting
   for a lock no longer consumes `coordinationTimeoutMs` and a successful write is
   never reported as a timeout after its effects have been applied.
3. Adds holder and expiry detail to the failed-acquisition warning.

Source: [Issue #67](https://github.com/h-arnold/JsonDbApp/issues/67).

## 2. Relationship to completed work

Issue #61 delivered the coordination-violation contract: one clock measuring
`coordinationTimeoutMs` from the top of `coordinate()`, a pre-flight check (site 1),
a post-callback over-budget verdict (site 2), a lease-recovery step (site 3), the
pre-existing lock-acquisition timeout mapping (site 0), reason-coded
`CoordinationTimeoutError`s, the ownership step, the finalise-or-skip rules, the
deliberate swallows and the logging records.

That contract stays in force. The only change to it is the clock origin defined in
§5.2. The four throw sites, their reason codes and all logging records are unchanged;
the trigger condition for site 1 is narrowed, because acquisition wait no longer
counts toward the budget (§5.4). Violation semantics after the callback are unchanged.

## 3. Decisions

| #   | Decision                       | Choice                                                                                                                                                                                                                                                                    |
| --- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Acquisition bound              | Deadline based on `collectionLockLeaseMs`, not a fixed attempt count.                                                                                                                                                                                                     |
| D2  | Coordination clock             | Captured after successful lock acquisition. Acquisition wait does not consume `coordinationTimeoutMs`.                                                                                                                                                                    |
| D3  | Backoff                        | `max(LOCK_ACQUISITION_MIN_BACKOFF_MS, min(retryDelayMs * lockRetryBackoffBase^(n-1), LOCK_ACQUISITION_MAX_BACKOFF_MS))`. Both are top-of-file constants in `CollectionCoordinator.js`: `LOCK_ACQUISITION_MIN_BACKOFF_MS = 500`, `LOCK_ACQUISITION_MAX_BACKOFF_MS = 5000`. |
| D4  | Wait-window source             | Reuse `collectionLockLeaseMs`. No new config field, default or validation rule.                                                                                                                                                                                           |
| D5  | Failed-acquisition diagnostics | Keep the existing warning message substring; add holder and expiry fields to its context.                                                                                                                                                                                 |
| D6  | Exhausted-acquisition error    | `LockAcquisitionFailureError`, raised at or after the deadline. The site-0 `LOCK_TIMEOUT` → `CoordinationTimeoutError` mapping is unchanged.                                                                                                                              |
| D7  | `retryAttempts` compatibility  | Kept in `DatabaseConfig` and its validation; no longer read by `acquireOperationLock()`. Documented as legacy for lock acquisition.                                                                                                                                       |
| D8  | Backoff floor                  | A 500 ms floor on every backoff prevents a tight loop when `retryDelayMs` is configured as 0. Implemented as the module constant `LOCK_ACQUISITION_MIN_BACKOFF_MS = 500`, not a config field.                                                                             |     |

## 4. Constraints

- The `collectionLockLeaseMs >= coordinationTimeoutMs` validation stays unchanged.
- No new config fields, error types, error codes or logger levels.
- No change to persisted documents, collection metadata, the master-index schema or
  `DatabaseConfig` serialisation shape.
- GAS V8: `Utilities.sleep(ms)` is the only wait mechanism. No timers or promises.
- `coordinate()` keeps a single clock source for the site-1 and site-2 verdicts; that
  clock now starts after acquisition (§5.2).
- Site 0–3 reason strings and the pinned logging invariants from #61 stay unchanged.
- ESLint `max-lines` is a warning at 500 counted (non-blank, non-comment) lines.
  `CollectionCoordinator.js` has 549 raw lines but only 313 counted lines and is
  currently warning-free under ESLint; the change projects to roughly 340–360 counted
  lines. The only other modified code file is `02_MasterIndexLockManager.js` (249 raw
  lines); `DatabaseConfig.js` is unchanged except for its documentation. The
  `ACTION_PLAN` re-measures counted LOC at baseline before committing to this decision.
  **Decision: no numbered multi-file split.** This is a firm implementation decision,
  not a deferral. If the
  rewritten `acquireOperationLock` pushes the `complexity` warning (threshold 7),
  extract the backoff computation into a private helper rather than splitting the file.

## 5. Behavioural contracts

### 5.1 `acquireOperationLock(operationId)` — deadline-based acquisition

Capture `deadline = Date.now() + collectionLockLeaseMs` once at method entry. Then:

1. While `Date.now() < deadline`, attempt
   `acquireCollectionLock(name, operationId, collectionLockLeaseMs)`.
2. A `true` result sets `lockAcquiredAt = Date.now()` and returns that timestamp
   immediately. No further sleep occurs.
3. For the k-th failed attempt (k = 1, 2, …) compute
   `backoffMs = max(LOCK_ACQUISITION_MIN_BACKOFF_MS, min(retryDelayMs * lockRetryBackoffBase^(k - 1), LOCK_ACQUISITION_MAX_BACKOFF_MS))`.
   The exponent uses the **pre-increment** index: k is 1 for the first failure, so the
   first backoff equals `retryDelayMs` (floored at 500 ms and capped at 5000 ms), and
   each subsequent failure grows it by `lockRetryBackoffBase`. Increment the index
   only for the next iteration. Let `remainingMs = deadline - Date.now()`. If
   `remainingMs <= 0`, stop looping. Otherwise sleep
   `min(backoffMs, remainingMs)` and try again. A required test pins the first backoff
   value (§6).
4. Truncating the final sleep to `remainingMs` keeps the retries inside the window.
   When the loop exits, make **one final `acquireCollectionLock` attempt** before
   throwing. This closes the trailing gap where a lock released during the final
   truncated sleep would otherwise be missed, and ensures failure is raised only
   once the whole window has elapsed.
5. An unexpected error from `acquireCollectionLock` is logged as an ERROR and
   rethrown unchanged, as today.
6. If the final attempt also fails, log the coordinator's `Could not acquire lock
after retries` WARN (context `{ collection, operationId }`, unchanged) and throw
   `LockAcquisitionFailureError` for the collection. The holder-and-expiry detail
   lives on the separate per-attempt warning in §5.3.

An expired lock is simply overwritten by the new acquisition in
`acquireCollectionLock` (it falls through the `now < expiry` guard), so a stale lock
succeeds on the first attempt without waiting.

Every test of the deadline loop must use `createMockClock()` together with
`clock.mockUtilitiesSleep()` from `tests/helpers/mock-time-helpers.js`. The real
`Utilities.sleep()` busy-waits against real `Date.now()`, so an unmocked deadline
test is non-deterministic and can spin for the full lease. The held-lock fixture must
be acquired (or its `lockStatus` set) **inside the mock-clock scope**, with a lock
timeout longer than `collectionLockLeaseMs`, so `lockedAt`, `lockTimeout` and `expiry`
are controlled and the lock stays held for the whole window.

Implementation detail: the rewrite removes `retryAttempts` from the
`acquireOperationLock` config destructure, the `elapsedBackoffMs` accumulator and the
`for` loop's attempt bound. Leaving `retryAttempts` in the destructure unused would
fail `no-unused-vars`. The constructor must still store it in `_config` for the
constructor test. Both backoff constants are declared at module top level, outside the
class, alongside `LEASE_RENEWAL_WINDOW_MS`.

### 5.2 `coordinate()` — coordination clock starts after acquisition

`coordinate()` currently captures `startTime` before calling
`_acquireLockWithTimeoutMapping`. Move that single capture to immediately after the
wrapper returns successfully:

1. Emit the DEBUG `Starting operation` record (unchanged position, before
   acquisition).
2. Acquire the lock (with the §5.1 deadline). A `LOCK_TIMEOUT` still maps to site 0.
3. Capture `startTime = Date.now()` immediately after the wrapper returns.
4. Resolve conflicts.
5. Run `_enforcePreflightBudget` (site 1) against this `startTime`.
6. Run the callback, compute `overBudget = Date.now() - startTime > coordinationTimeoutMs`,
   and continue through the existing ownership, finalisation and throw-or-return steps.

The pre-flight check and the over-budget verdict remain two reads of the same
measurement; only its origin moves. **The sole exclusion is the acquisition wait.**
Conflict resolution and the callback count against `coordinationTimeoutMs`. The
`overBudget` verdict is still taken after the callback and before
`_finaliseAfterOperation`; finalisation time is not part of the verdict, and the
ownership step continues to measure lease renewal from `lockAcquiredAt`, not
`startTime`. The DEBUG operation-start record stays before acquisition and is not
coupled to the moved `startTime` capture.

`lockAcquiredAt` is set inside `acquireOperationLock` at the moment of acquisition
and the new `startTime` is captured immediately after the wrapper returns, with no
intervening work, so the two originate together. Combined with
`collectionLockLeaseMs >= coordinationTimeoutMs`, the #61 residual-risk statements
remain valid.

`coordinationTimeoutMs` no longer bounds total operation wall-clock: acquisition wait
can consume most of the lease before the callback starts. The remaining lease window
for renewal and finalisation is bounded by the lease itself and handled by the
existing ownership step (§2), not by the coordination budget.

### 5.3 Failed-acquisition warning

In `MasterIndex/02_MasterIndexLockManager.js`, keep the warning message substring
`Failed to acquire lock; collection is already locked.` and extend its context with
the holder and expiry data already present in `lockStatus`:

- `lockedBy` — `lockStatus.lockedBy` (the holder's operation id)
- `lockedAt` — `lockStatus.lockedAt`
- `lockTimeout` — `lockStatus.lockTimeout`
- `expiry` — `lockedAt + lockTimeout`
- `remainingMs` — `expiry - now`

The existing `collectionName` and `operationId` keys stay. A second, separate WARN
(`Could not acquire lock after retries`) is emitted by the coordinator when the
acquisition deadline is exhausted; its context stays `{ collection, operationId }`.

A new unit test must spy on the **MasterIndex logger** (`this._masterIndex._logger`),
locate the warning by its message substring, and assert that its context still carries
`collectionName`/`operationId` (not `collection`) and now also `lockedBy`, `lockedAt`,
`lockTimeout`, `expiry` and `remainingMs`, with values derived from the held-lock
fixture created under the mock clock (§5.1). This is distinct from the coordinator's
`Could not acquire lock after retries` WARN, which uses `{ collection, operationId }`.
No existing test pins this warning's context, so the enrichment is additive.

### 5.4 Error outcomes

| Situation                                                   | Outcome                                                                                                                                               |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lock released before `collectionLockLeaseMs` elapses        | Acquisition succeeds on the next attempt (including the final one at the deadline); operation proceeds with a fresh coordination budget.              |
| Lock held for the whole `collectionLockLeaseMs`             | One failed-acquisition WARN per attempt, then the coordinator WARN and `LockAcquisitionFailureError` at or just after the deadline.                   |
| Lock already expired (stale)                                | Overwritten by the new acquisition on the first attempt; no wait.                                                                                     |
| `acquireCollectionLock` throws `LOCK_TIMEOUT`               | Site 0 `CoordinationTimeoutError` with reason `lock-acquisition-timeout` (unchanged).                                                                 |
| Callback (not acquisition) overruns `coordinationTimeoutMs` | Site 2 `CoordinationTimeoutError` with reason `post-operation-overrun` (unchanged).                                                                   |
| Conflict resolution pushes elapsed past the budget          | Site 1 `CoordinationTimeoutError` with reason `preflight-budget-exhausted` (unchanged).                                                               |
| Slow acquisition (repeated `false` returns)                 | `LockAcquisitionFailureError` at the lease deadline. Slow acquisition no longer reaches site 1, because acquisition wait is excluded from the budget. |

The per-attempt `Failed to acquire lock; collection is already locked.` WARN now fires
once per retry — eight or nine times over a 30-second lease with the default backoff,
depending on the final-attempt boundary, and far more when `retryDelayMs` is small —
rather than at most three times. This is the intended consequence of waiting until the
deadline.

Site 0 has no production trigger today: `acquireCollectionLock` returns `false` on
contention and does not throw `LOCK_TIMEOUT`. The mapping is retained for a thrown
`LOCK_TIMEOUT` (reachable via a spy, as in the existing preflight test) and for future
call paths; no production behaviour changes on that site.

## 6. Scope

### In scope

- Rewrite `acquireOperationLock()` as a deadline loop with the named, floored and
  capped backoff, declaring `LOCK_ACQUISITION_MAX_BACKOFF_MS = 5000` and
  `LOCK_ACQUISITION_MIN_BACKOFF_MS = 500` at module top level in
  `CollectionCoordinator.js`, alongside `LEASE_RENEWAL_WINDOW_MS`. Remove
  `retryAttempts` from the method's destructure, plus the `elapsedBackoffMs`
  accumulator and the `for` loop's attempt bound.
- Move the coordination clock origin in `coordinate()`.
- Enrich the failed-acquisition warning context and add a positive test for its keys.
- Convert both retry-path tests in
  `tests/unit/collection-coordinator/collection-coordinator-lock.test.js` to
  `createMockClock()`/`clock.mockUtilitiesSleep()`: the `lock already held` case
  (lines 43–56) and the `stop retrying` case (lines 58–81). Replace the latter's title
  and its "one sleep of 250 ms" assertion, which pin the old attempt-count behaviour
  and contradict retrying until the deadline.
- Add one positive test for each new behaviour: (a) lock released just inside the
  window succeeds; (b) lock held for the whole window fails once, at or after the
  deadline; (c) stale lock succeeds on the first attempt with no sleep;
  (d) with `retryDelayMs >= 500` (e.g. the default 1000, so the floor does not mask
  the multiplier), the first backoff equals `retryDelayMs` (pins the pre-increment
  exponent);
  (e) the 500 ms floor applies when `retryDelayMs` is 0 (no tight loop);
  (f) the 5000 ms cap applies to long backoffs; (g) the final sleep is truncated to
  `remainingMs`; (h) a lock released during the final truncated sleep succeeds via
  the final attempt; (i) with `retryAttempts` set low (e.g. 1) and the lock held, the loop performs **more** attempts/sleeps than that count and waits the full lease before throwing `LockAcquisitionFailureError`;
  (j) an unexpected acquisition error is rethrown without retry.
- The warning-context test asserts against the **first matching warning call** (the
  warning fires once per attempt) and uses the MasterIndex logger target and keys
  listed in §5.3.
- Update `DatabaseConfig.md` and `CollectionCoordinator.md` to describe `retryAttempts`
  as legacy for lock acquisition; keep the constructor storing it in `_config`, since
  `collection-coordinator-constructor.test.js` asserts this.
- Update the specific JSDoc and docs affected by the clock move:
  - `acquireOperationLock` JSDoc — deadline behaviour, not "retry/backoff".
  - `coordinate()` JSDoc site-0 wording — currently says the lock "cannot be acquired
    within the coordination window"; that window is now the lease. Keep the
    distinction explicit: a thrown `LOCK_TIMEOUT` maps to site 0, whereas deadline
    exhaustion raises `LockAcquisitionFailureError`.
  - `_enforcePreflightBudget` `@remarks` — currently says `startTime` is "captured at
    the top of `coordinate()`"; reword to "captured after lock acquisition (see
    `coordinate()`)".
  - `docs/developers/CollectionCoordinator.md` — the `Single clock source` paragraph
    and `coordinate()` flow **step 1 ("Validate and prepare")**, which are where
    `startTime` is currently described as captured. Step 2 is "Acquire lock" and does
    not mention `startTime`.
- Confirm and record the timing-suite assessment: `collection-coordinator-preflight.test.js`,
  `collection-coordinator-violation-policy.test.js` and
  `collection-coordinator-lock-release.test.js` mock acquisition to succeed instantly
  or drive time in the callback/conflict-resolution step, so the post-acquisition
  clock origin does not change their verdicts. No edits expected there beyond those
  already listed.
- Update the remaining affected developer docs and add a release note.

### Out of scope

- Any change to sites 0–3, the ownership step, finalisation rules, deliberate
  swallows or logging records from #61 beyond the clock origin.
- New configuration fields, defaults or validation rules.
- Changes to `DatabaseConfig` values or serialisation shape.
- Changes to `MasterIndexLockManager` locking decisions (only the warning context).
- Multi-actor or end-to-end integration simulation; coverage is spy/clock based.

## 7. Non-goals

- No new error types, error codes or logger levels.
- No persisted data, master-index, collection-metadata or config-shape change.
- No change to how lease renewal or single re-acquisition works.
- No token-generation or staleness-guard changes.
- No speculative retry hardening beyond the acquisition loop.

## 8. Assumptions (stated, veto-able)

1. `retryAttempts` stays as a validated config value that the constructor keeps in
   `_config`, but it no longer bounds lock acquisition. Keeping it avoids a breaking
   config/serialisation change. Both `DatabaseConfig.md` and
   `CollectionCoordinator.md` will be updated in this work to describe it as legacy
   for lock acquisition; neither currently does.
2. The backoff bounds are named module constants, not config fields: a 500 ms floor
   (`LOCK_ACQUISITION_MIN_BACKOFF_MS`) and a 5000 ms cap
   (`LOCK_ACQUISITION_MAX_BACKOFF_MS`). The floor prevents a tight loop when
   `retryDelayMs` is 0 and does not affect the default 1000 ms base delay.
3. The enhanced warning keeps its existing message substring, so log matching and
   existing record-count assertions are unaffected.
4. The site-0 mapping is retained for a thrown `LOCK_TIMEOUT`; deadline exhaustion
   remains a `LockAcquisitionFailureError`, matching today's error type. Narrowing
   site 1 so that it can no longer be triggered by acquisition wait is an accepted
   consequence of moving the clock origin.
5. Truncating the last sleep to the remaining window, followed by one final
   acquisition attempt, guarantees a lock released anywhere inside the window is
   observed and that failure is raised only once the window has elapsed. No separate
   timer or wake-up call is needed.

## 9. Data-shape assessment

The scope changes no persisted document shape, collection metadata, master-index
schema or config serialisation shape. The changes are behavioural and logging-only
at API boundaries. No planned-only entries are required in
`docs/developers/data-shapes/`.

## 10. Open questions

None. All decisions were settled with the user: separate acquisition budget using
`collectionLockLeaseMs` as its deadline, a 500 ms minimum and 5-second maximum backoff,
and no new config fields.
