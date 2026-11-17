# ACTION PLAN — Lock acquisition window and coordination-budget separation (Issue #67)

> **Current status:** IN PROGRESS — Section 4, regression hardening (Sections 1–3 complete
> and pushed). Derived from `SPEC.md` (final, reviewer-confirmed).
> Workflow: Red–Green–Refactor per section; enabling contracts (acquisition loop) land
> before the clock-origin change that depends on them. Every section leaves the tree
> green: `npm run lint` (0 errors, 0 warnings) and the full suite passing.
>
> **Baseline (recorded):** `npm run lint` exit 0 (0 errors, 0 warnings);
> `npm run test` 83 files / 908 tests passed. Counted LOC re-measured:
> `CollectionCoordinator.js` 549 raw / 313 counted,
> `02_MasterIndexLockManager.js` 249 raw / 160 counted,
> `DatabaseConfig.js` 453 raw / 269 counted.

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

**Outcome (compacted).** `acquireOperationLock()` in
`src/02_components/CollectionCoordinator.js` now waits against a single
`collectionLockLeaseMs` deadline instead of a fixed attempt count: backoff is floored and
capped, the last sleep is truncated to the remaining window, and one final acquisition
attempt runs before failure. Two retry-path tests were converted to the mock clock and a
new acquisition-window suite was added.

**Retained for later sections.**

- **Constants (exact).** `LOCK_ACQUISITION_MIN_BACKOFF_MS = 500` and
  `LOCK_ACQUISITION_MAX_BACKOFF_MS = 5000`, declared at module top level alongside
  `LEASE_RENEWAL_WINDOW_MS` in `src/02_components/CollectionCoordinator.js`.
- **Deadline/backoff/final-attempt contract.** `deadline = Date.now() + collectionLockLeaseMs`
  is captured once at entry. While `Date.now() < deadline`, attempt acquisition with lease
  `collectionLockLeaseMs`; a success returns `Date.now()` immediately. For the k-th failure
  (one-based, pre-increment index), backoff is
  `max(500, min(retryDelayMs * lockRetryBackoffBase^(k-1), 5000))`. Sleep
  `min(backoffMs, remainingMs)` where `remainingMs = deadline - Date.now()`; break when
  `remainingMs <= 0`. After the loop make one final acquisition attempt; on `false`, log the
  coordinator WARN `Could not acquire lock after retries` with context
  `{ collection, operationId }` and throw `LockAcquisitionFailureError`. That WARN is
  distinct from the MasterIndex per-attempt warning (`collectionName` key) that Section 3
  enriches. An expired lock is overwritten on the first attempt with no wait. Unexpected
  acquisition errors are logged via `ErrorHandler.safeErrorMessage` and rethrown unchanged.
  A thrown `LOCK_TIMEOUT` still maps to site 0; deadline exhaustion raises
  `LockAcquisitionFailureError` — Sections 2 and 4 rely on that distinction.
- **`retryAttempts` compatibility.** Kept in `this._config` (constructor stores it;
  `collection-coordinator-constructor.test.js` asserts this) but no longer read by
  `acquireOperationLock()` — removed from the method destructure to satisfy `no-unused-vars`.
  It remains a validated config value; Section 5 documents it as legacy for lock acquisition.
- **Private helpers added.** `_computeAcquisitionBackoff(attempt)` computes the floored and
  capped backoff; `_attemptLockAcquisition(name, operationId, leaseMs)` performs one
  acquisition, logging and rethrowing unexpected errors. Later sections can reuse these
  instead of duplicating the logic.
- **JSDoc.** The `acquireOperationLock` JSDoc now describes the deadline window (not
  "retry/backoff"); Section 5 should not rewrite it.
- **Test files and reusable pattern.**
  - `tests/unit/collection-coordinator/collection-coordinator-lock.test.js` — the
    "lock already held" and "final backoff truncated at deadline" cases now use
    `createMockClock()` / `clock.mockUtilitiesSleep()`.
  - `tests/unit/collection-coordinator/collection-coordinator-acquisition-window.test.js` —
    new suite covering release-inside-window, held-whole-window, stale lock, first backoff,
    500 ms floor, 5000 ms cap, final attempt, `retryAttempts` ignored, and unexpected error.
  - Pattern for later sections (general rule in §0): import `createMockClock` from
    `tests/helpers/mock-time-helpers.js`, acquire the held-lock fixture inside the mock-clock
    scope, and pin `collectionLockLeaseMs` equal to `coordinationTimeoutMs` (including when
    the lease is below the 30000 default). Set the held-lock timeout above the lease for
    "held whole window" cases and below it for "released inside window"/stale cases; use
    `clock.advanceTime()` to expire a stale lock. Read sleeps from
    `sleepSpy.mock.calls.map(([ms]) => ms)` and assert warning context against the first
    matching warning call.

**Section checks.** Focused coordinator suite 43/43 passing; `npm run lint` 0 errors /
0 warnings; counted LOC re-measured at 318 (under the 500 gate). Full section regression
gate (`npm run test`) and commit pending.

**Implementation notes.**

- Docs sync (run before this section's gate): updated `docs/developers/CollectionCoordinator.md`
  (+2 / −2 lines, net 0) — the responsibilities bullet and `coordinate()` step 2 now describe
  the deadline-based acquisition window instead of attempt-count retry/backoff. No new page
  created; JSDoc for `acquireOperationLock` was already updated in the green phase. No
  planning-artefact references found in the touched doc.
- Out-of-scope documentation observations reported by the docs pass and carried into
  Sections 2 and 5: the `Single clock source` paragraph and step 1 (`startTime` capture), the
  config table (`retryAttempts` legacy wording and lease-as-window note), the site-1 step 4 /
  pre-flight paragraph, the `LockAcquisitionFailureError` row near line 109 ("retries exhausted"),
  and `coordinate()`'s stale site-0 JSDoc. The line-109 wording note is also logged as a nitpick
  in the deferred-findings log. None were actioned in Section 1.
- Full-section regression report: `npm run lint && npm run test` exit 0. Lint clean
  (0 errors / 0 warnings); Vitest 84 files / 917 tests passed (baseline 83 / 908; the
  +1 file / +9 tests are the new acquisition-window suite). Zero regressions, zero
  unaccounted failures. Run once at section completion.
- Commit record: SHA `9f18f64`, message `feat(coordinator): deadline-based lock
acquisition window`, branch `plan/issue-67-lock-acquisition-window`.
  `git push` succeeded (`e6667f0..9f18f64` to `origin/plan/issue-67-lock-acquisition-window`).
  Staged files were limited to this section's source, tests, plan and doc; the four
  pre-existing `.opencode/agents/*.md` worktree edits remain unstaged and untouched.

---

## 2. Section 2 — CollectionCoordinator: move the coordination clock origin

**Outcome (compacted).** `coordinate()` in
`src/02_components/CollectionCoordinator.js` now captures `startTime = Date.now()`
immediately after successful lock acquisition instead of at the top of the method, so
acquisition wait no longer consumes `coordinationTimeoutMs`. The pre-flight and
post-callback verdicts still share one clock. Added
`tests/unit/collection-coordinator/collection-coordinator-acquisition-budget.test.js`
and updated the `coordinate()` and `_enforcePreflightBudget` JSDoc.

**Retained for later sections.**

- **Clock contract (exact).** The single `startTime` is captured immediately after
  `_acquireLockWithTimeoutMapping(...)` returns successfully, inside the `try` block
  (previously at the top of `coordinate()`). The DEBUG `Starting operation` record stays
  before acquisition; conflict resolution stays after acquisition and before the
  pre-flight check. `_enforcePreflightBudget` (site 1) and the post-callback
  `overBudget = Date.now() - startTime > coordinationTimeoutMs` are two reads of the
  same measurement; the sole exclusion is acquisition wait. Conflict resolution and the
  callback still count toward `coordinationTimeoutMs`. The `overBudget` verdict is taken
  after the callback and before `_finaliseAfterOperation`; finalisation time is not part
  of it. The ownership step still measures lease renewal from `lockAcquiredAt`, not
  `startTime`. Site 0–3 reason strings, logging records and swallows are unchanged.
  `coordinationTimeoutMs` no longer bounds total wall-clock; the remaining lease window
  for renewal and finalisation is bounded by the lease itself.
- **JSDoc distinction.** `coordinate()` now states that a thrown `LOCK_TIMEOUT` maps to
  site 0 (`lock-acquisition-timeout`) while deadline exhaustion raises
  `LockAcquisitionFailureError`. `_enforcePreflightBudget` `@remarks` now says
  `startTime` is "captured after lock acquisition (see `coordinate()`)" (no longer
  "captured at the top of `coordinate()`").
- **Test file and budget constraint.** New
  `tests/unit/collection-coordinator/collection-coordinator-acquisition-budget.test.js`
  (six cases: slow acquisition outside the budget, pre-flight still fires, post-callback
  overrun still fires, site-0 mapping, overrun `elapsedMs` excludes acquisition wait,
  fully held acquisition routes to `LockAcquisitionFailureError` rather than site 1).
  `DatabaseConfig` enforces `MIN_LOCK_TIMEOUT_MS = 500` for both the lease and
  `coordinationTimeoutMs`, so the illustrative 300 ms budget in the original cases was
  rescaled to 500 ms; each fixture pins `coordinationTimeoutMs` to 500 (≤ lease).
- **Timing-suite assessment.** `collection-coordinator-preflight.test.js`,
  `collection-coordinator-violation-policy.test.js` and
  `collection-coordinator-lock-release.test.js` acquire on the first attempt and drive
  time in conflict resolution or the callback, so the clock move does not change their
  verdicts. No edits expected there.

**Section checks.** Focused coordinator suite 49/49 passing; `npm run lint` 0 errors /
0 warnings; counted LOC 318 (under the 500 gate). Full section regression gate
(`npm run test`) and commit pending.

**Implementation notes.**

- Docs sync (run before this section's gate): updated `docs/developers/CollectionCoordinator.md`
  (+4 / −4 lines, net 0) — the `Single clock source` paragraph, flow step 1, step 4 and the
  pre-flight reachability bullet now describe the post-acquisition clock origin and state that
  `coordinationTimeoutMs` no longer bounds total wall-clock. No new page; no planning-artefact
  references. Section 5 must not duplicate the wall-clock note already at line 42.
- Out-of-scope documentation observations reported and carried into Section 5: the config table
  (legacy `retryAttempts` wording and lease-as-window note) and the line-109 error-table wording
  (already logged as a nitpick). None actioned in Section 2.
- Full-section regression report: `npm run lint && npm run test` exit 0. Lint clean
  (0 errors / 0 warnings); Vitest 85 files / 923 tests passed (previous section 84 / 917;
  the +1 file / +6 tests are the new acquisition-budget suite). Zero regressions, zero
  unaccounted failures. Run once at section completion.
- Commit record: SHA `92c8fb2`, message `fix(coordinator): start coordination clock after
lock acquisition`, branch `plan/issue-67-lock-acquisition-window`. `git push` succeeded
  (`9f18f64..92c8fb2` to `origin/plan/issue-67-lock-acquisition-window`). Only this section's
  source, test, plan and doc were staged; the four pre-existing `.opencode/agents/*.md`
  edits remain unstaged and untouched.

---

## 3. Section 3 — MasterIndexLockManager: enrich the failed-acquisition warning

**Outcome (compacted).** The per-attempt contention WARN in
`src/04_core/MasterIndex/02_MasterIndexLockManager.js` now carries lock-holder and
expiry detail, so stale locks can be distinguished from active contention in the logs.
Added `tests/unit/master-index/MasterIndex.lock-acquisition-warning.test.js`.

**Retained for later sections.**

- **Warning contract (exact).** Keep the message substring
  `Failed to acquire lock; collection is already locked.` and the `collectionName` /
  `operationId` keys. Add `lockedBy`, `lockedAt`, `lockTimeout`,
  `expiry = lockedAt + lockTimeout` and `remainingMs = expiry - now`, all derived from
  the `lockStatus`/`now`/`expiry` already in scope in `acquireCollectionLock`. One WARN
  statement; no locking decision or persisted `lockStatus` shape change.
- **Distinction from the coordinator WARN.** This per-attempt MasterIndex WARN uses the
  `collectionName` key; the coordinator's end-of-window
  `Could not acquire lock after retries` WARN uses `{ collection, operationId }` and is
  unchanged. Section 5 adds the enriched warning to the logging contract.
- **Test and assertion rule.**
  `tests/unit/master-index/MasterIndex.lock-acquisition-warning.test.js` spies on the
  MasterIndex logger and selects the warning by message substring (`.find(...)`) —
  assert the **first matching warning**, since it fires once per attempt. The held lock
  (`lockedAt` 1000, `lockTimeout` 5000 under the mock clock) gives `expiry` 6000 and,
  at first attempt clock 1000, `remainingMs` 5000.

**Section checks.** Focused master-index + coordinator suites 109/109 passing;
`npm run lint` 0 errors / 0 warnings; counted LOC 165 (baseline 160, under the 500
gate). Full section regression gate (`npm run test`) and commit pending.

**Implementation notes.**

- Docs sync skipped (recorded reason): the only changed surface is a diagnostic log
  context that no existing document describes (confirmed by grep across `docs/`), so
  there was no documented statement to reconcile. The plan's documentation section adds
  the enriched warning to the logging contract.
- Full-section regression report: `npm run lint && npm run test` exit 0. Lint clean
  (0 errors / 0 warnings); Vitest 86 files / 924 tests passed (previous section 85 / 923;
  the +1 file / +1 test is the contention-warning suite). Zero regressions, zero
  unaccounted failures. Run once at section completion.
- Commit record: SHA `5fc5564`, message `feat(master-index): enrich lock contention
warning context`, branch `plan/issue-67-lock-acquisition-window`. `git push` succeeded
  (`92c8fb2..5fc5564` to `origin/plan/issue-67-lock-acquisition-window`). Only this
  section's source, test and plan were staged; the four pre-existing `.opencode/agents/*.md`
  edits remain unstaged and untouched.

---

## 4. Section 4 — Regression hardening

**Outcome (compacted).** Regression hardening passed with no source, test or
documentation changes; the three coordinated changes hold, the #61 violation contract is
intact, and coverage, lint and LOC stay within gate. Full-section gate and commit pending.

**Retained for later sections.** Full figures and commands are in the Implementation notes
below; only results later sections depend on are listed here.

- **Coverage.** Both target files highly covered: `CollectionCoordinator.js` 97.82% lines,
  `02_MasterIndexLockManager.js` 90.47% lines; no material regression.
- **Cross-suite sweep.** database, collection, master-index and all coordinator suites
  green (34 files / 237 tests).
- **Timing suites.** `collection-coordinator-preflight.test.js`,
  `collection-coordinator-violation-policy.test.js`,
  `collection-coordinator-lock-release.test.js` byte-identical to HEAD and green; the
  clock move does not change their verdicts. No edits needed.
- **Integrated scenarios.** All five pass via 10 named tests: release-inside-window,
  held-whole-window, stale lock, slow-acquisition + short-callback, sites 0–3 with exact
  reason strings.
- **Counted LOC vs §0.** `CollectionCoordinator.js` 318 (baseline 313; proj. ≈340–360),
  `02_MasterIndexLockManager.js` 165 (baseline 160; proj. ≈170), `DatabaseConfig.js` 269
  unchanged — all under 500.
- **Docs sync.** Not applicable — no code, API or documentation change.
- **Evidence.** `.opencode/scratchpad/sec4-coverage.txt`, `sec4-cross-suite.txt`,
  `sec4-scenarios.txt`.

**Section checks.** `npm run test:coverage` passed (86 files / 924 tests); `npm run lint`
0 errors / 0 warnings; `npm run test` pending at the gate.

**Implementation notes (verification evidence).**

- Coverage: `npm run test:coverage` exit 0, 86 files / 924 tests, v8 provider. Target files:
  `CollectionCoordinator.js` 97.82% statements / 93.47% branches / 100% functions /
  97.82% lines (uncovered 377, 488, 567); `02_MasterIndexLockManager.js` 90.47% statements /
  78.57% branches / 100% functions / 90.47% lines. Summary: 88.94% statements, 82% branches,
  94.33% functions, 88.97% lines. No material regression — all new branches have dedicated
  tests and both target files remain highly covered; no coverage thresholds are configured.
  Full output: `.opencode/scratchpad/sec4-coverage.txt`.
- Cross-suite sweep: `npx vitest run --config tests/vitest.config.js tests/unit/database/
tests/unit/collection/ tests/unit/master-index/ tests/unit/collection-coordinator/` exit 0,
  34 files / 237 tests. Evidence: `.opencode/scratchpad/sec4-cross-suite.txt`.
- Timing-suite assessment confirmed: `collection-coordinator-preflight.test.js`,
  `collection-coordinator-violation-policy.test.js` and `collection-coordinator-lock-release.test.js`
  are byte-identical to HEAD (`git diff HEAD` empty) and green — they acquire on the first
  attempt or drive time in conflict resolution / the callback, so the clock-origin move does
  not change their verdicts. No edits were needed.
- Integrated scenarios verified via 10 named tests (4 files, all passing; evidence
  `.opencode/scratchpad/sec4-scenarios.txt`): (1) lock released inside window succeeds;
  (2) lock held whole window fails at the deadline; (3) stale lock succeeds on first attempt;
  (4) slow acquisition + short callback returns successfully; (5) sites 0–3 still throw with
  exact reason strings (`lock-acquisition-timeout`, `preflight-budget-exhausted`,
  `post-operation-overrun`, `lease-not-recoverable`).
- Re-measured counted LOC (non-blank, non-comment): `CollectionCoordinator.js` 577 raw / 318
  counted (baseline 313; projection ≈340–360 — under projection and under the 500 gate);
  `02_MasterIndexLockManager.js` 254 raw / 165 counted (baseline 160; projection ≈170);
  `DatabaseConfig.js` 453 raw / 269 counted (unchanged; no code change).
- `npm run lint` re-run: exit 0, 0 errors / 0 warnings.
- Docs sync: not applicable — Section 4 made no code, API or documentation change.
- Full-section regression gate: `npm run lint && npm run test` exit 0. Lint clean
  (0 errors / 0 warnings); Vitest 86 files / 924 tests passed — identical to the
  post-Section-3 tree (no source or test changes in this section). Zero regressions,
  zero unaccounted failures. Run once at section completion after compaction.
- Commit record: pending.

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

---

## Deferred and Out-of-Scope Findings

No Critical or Material out-of-scope findings are open. Minor out-of-scope
observations and nitpicks are recorded in
`.opencode/scratchpad/plan-issue-67-lock-acquisition-window-deferred-findings.md`
(git-ignored). That log is the authoritative record for deferred rows; mirror any
open rows from this section into it before deleting or superseding this plan.

| Finding           | Severity | Scope rationale | Evidence | Disposition | User decision |
| ----------------- | -------- | --------------- | -------- | ----------- | ------------- |
| _(none recorded)_ |          |                 |          |             |               |
