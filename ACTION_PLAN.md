# ACTION PLAN — Coordination/MasterIndex partial-write hazard elimination (Issue #61)

> **Current status:** Section 3 COMPLETE (red+green+reviews clean; 888 tests pass; `CollectionCoordinator.js`=310 counted LOC, under 500 gate). Section 4 (Regression hardening) next.

Derived from `SPEC.md` (final, reviewer-approved). Workflow: Red-Green-Refactor per
section; sections are sequenced so enabling contracts land before dependent
orchestration work. Every section must leave the tree green: `npm run lint`
(0 errors, 0 warnings) and the full suite passing before moving on.

## 0. Baseline and shared constraints

**Baseline verification (before Section 1):**

- Run `npm run lint` and `npm run test` — both must be clean on the untouched tree;
  record results.
- Record counted (non-blank, non-comment) line counts for the two files in scope:
  `src/04_core/MasterIndex/99_MasterIndex.js` ≈324,
  `src/02_components/CollectionCoordinator.js` 225.

**Module sizing (applies to Sections 1–3):**

| File                                         | Current counted LOC |                                                                  Projected after this work | Verdict                                                 |
| -------------------------------------------- | ------------------: | -----------------------------------------------------------------------------------------: | ------------------------------------------------------- |
| `src/04_core/MasterIndex/99_MasterIndex.js`  |                ≈324 |                            ≈365 (raw reader ~15, resync block ~25, loader refactor net ~0) | Under the 500 `max-lines` gate — **no file separation** |
| `src/02_components/CollectionCoordinator.js` |                 225 | ≈300–310 (pre-flight ~10, unified algorithm net ~50–60, reason constants ~5, JSDoc growth) | Under the 500 `max-lines` gate — **no file separation** |

Re-measure counted lines at the end of each section; if any file approaches the
gate, stop and re-plan separation using the numbered multi-file pattern
(`01_*`–`98_*`, `99_*` composing) before adding more.

**Shared constraints (all sections):**

- Zero lint warnings gate: `complexity` warn at 7, `max-len` 160, sonarjs
  recommended, `no-magic-numbers` as an error in source. Decompose new coordinator
  branches into private helpers (below complexity 7) and use named module
  constants (follow the `LEASE_RENEWAL_WINDOW_MS` precedent) — including
  UPPER_SNAKE_CASE constants for the four `CoordinationTimeoutError` reason
  values.
- No new files → no GAS script load-order changes.
- Error standards: existing types only (`CoordinationTimeoutError`,
  `MasterIndexError`); distinct machine-readable `reason` per throw site (four
  sites — see `SPEC.md` §4.2).
- Fail loud: swallows only where the spec defines them, each with a loud ERROR log.
- **Data-shape blocks: deliberately omitted from every section** — no persisted
  schema, metadata, index, or ScriptProperties-key changes (spec §3);
  `docs/developers/data-shapes/` does not exist and must not be created for this
  work.
- **Utility-reuse posture (all sections): reuse-only.** No new utils in
  `src/01_utils`. Reused: `ObjectUtils.serialise()/deserialise()`,
  `ErrorHandler.ErrorTypes`, `Validate`, `IdGenerator`, `JDbLogger`
  (`timeSync`, `debug/info/warn/error`), `DatabaseConfig` defaults. No
  `Not implemented` utility entries are required: the convention is documented
  only for data-shape docs, no data-shape changes exist, and all documentation
  (including new method entries) lands in Section 5 — no doc-prep steps in
  Sections 1–3.
- Reason constants: introduce module-level UPPER_SNAKE_CASE constants for the
  four `CoordinationTimeoutError` reason values in
  `src/02_components/CollectionCoordinator.js` in Section 2 (sites 0–1), extended
  by Section 3 (sites 2–3). Tests assert the **exact** constant values in
  `error.context`.
- Testing infrastructure (reuse, do not reinvent):
  `tests/helpers/collection-coordinator-test-helpers.js`,
  `tests/helpers/master-index-test-helpers.js`,
  `tests/helpers/mock-time-helpers.js` (`createMockClock`),
  `tests/setup/gas-mocks.setup.js` + `tools/gas-mocks/` (spy on
  `PropertiesService…setProperty`, `Utilities.sleep` is mocked). New suites in
  kebab-case folders: `tests/unit/master-index/`,
  `tests/unit/collection-coordinator/`.

---

## 1. Section 1 — MasterIndex: single raw reader and save-failure resynchronisation (Case 3 / D3) — **[COMPLETE]**

**Objective.** Make `MasterIndex.save()` failures resynchronise in-memory state
with the stored snapshot before throwing the original `MasterIndexError('save')`,
via a single composed raw reader, with no save↔reload recursion possible.

**Constraints.**

- `save()` ordering unchanged (memory advances first, then persists).
- `_readStoredSnapshot()`: reads + deserialises only — never assigns `this._data`,
  never runs `_ensureStateShape()`, never calls `save()`.
- `_loadFromScriptProperties()` refactored to compose the raw reader (assign,
  shape-check, single `MASTER_INDEX_ERROR('load')` wrap point and failure log —
  behaviour unchanged).
- Resync outcomes (spec §4.3): snapshot found → assign to `this._data`; no
  snapshot → keep staged state + loud ERROR; reader failure → keep staged state +
  loud ERROR stating memory may be diverged. Original
  `MasterIndexError('save', …)` thrown in all outcomes; log context names the
  outcome.
- Shape normalisation intentionally skipped on the resync path.
- All documentation for the new methods lands in Section 5 (no doc-prep here).

**Red-first test cases** (new suite `tests/unit/master-index/MasterIndex.save-resync.test.js`):

1. save failure with an existing snapshot → `MasterIndexError('save')` thrown AND
   `this._data` equals the stored snapshot (staged collection-entry and
   `lastUpdated` advances discarded).
2. save failure with no stored snapshot (key absent) → staged state kept, ERROR
   logged stating no snapshot was available, `MasterIndexError('save')` thrown.
3. save failure + reader failure (`getProperty` throws) → staged state kept, ERROR
   logged stating memory may be diverged, and the **original save error** thrown
   (not a load error).
4. No-recursion guarantee with a legacy stored payload (still carrying
   `modificationHistory`) + broken `setProperty`: spy on `save` and
   `_ensureStateShape` and positively assert **neither is invoked on the resync
   path** (in addition to the operation terminating with a single thrown
   `MasterIndexError('save')`).
5. `save(dataOverride, …)` with a broken `setProperty` and an existing snapshot →
   resync still targets `this._data` (spec §4.3): assert `this._data` equals the
   stored snapshot **and** `this._data !== dataOverride` (the override is not
   adopted as master state). Do **not** assert the override object is
   byte-identical — `save()` mutates the override's `lastUpdated` before the
   persist attempt, so a byte-identity assertion would false-fail against a
   correct implementation. Original error thrown.
6. Composition: `_loadFromScriptProperties` still wraps failures as
   `MASTER_INDEX_ERROR('load')` exactly once and still assigns/shape-checks
   (protects the pinned single-wrap-point contract).
   Existing pinned suites (`master-index-script-properties-loading.test.js`,
   `MasterIndex.test.js`) must pass unmodified.

**Green.** Implement the raw reader, loader composition, and resync catch block.
**Refactor.** Extract the resync outcome handling into one private helper if
`save()` exceeds complexity 7; keep JSDoc complete (`@param/@returns/@throws/
@remarks`).

**Acceptance criteria.** All red tests green; pinned suites untouched-green;
lint clean; counted LOC recorded and under gate.

**Section checks.**

1. `npx vitest run --config tests/vitest.config.js tests/unit/master-index/`
2. `npm run lint`
3. `npm run test`
4. `grep -c` counted lines of `99_MasterIndex.js` (record).

---

## 2. Section 2 — CollectionCoordinator: pre-flight budget check and site-0 reason (Case 1, pre-callback half) — **[COMPLETE]**

**Objective.** Enforce the coordination budget **before** the callback runs (throw
site 1) and give the pre-existing lock-acquisition timeout mapping a `reason`
(throw site 0). No post-callback behaviour changes in this section.

**Constraints.**

- Pre-flight check sits after conflict resolution and immediately before the
  callback; uses the same `startTime` captured at the top of `coordinate()`
  (single clock source — spec §4.2).
- On violation: ERROR log (collection, opId, timeoutMs) then
  `CoordinationTimeoutError` with the pre-flight `reason`; callback never invoked.
- `_acquireLockWithTimeoutMapping` gains the lock-acquisition `reason`; existing
  `LOCK_TIMEOUT` → `COORDINATION_TIMEOUT` mapping otherwise unchanged.
- Reason values defined as named module constants (UPPER_SNAKE_CASE).
- Post-callback code paths untouched in this section (Section 3 owns them).

**Red-first test cases** (extend
`tests/unit/collection-coordinator/collection-coordinator-lock-release.test.js`
or a new `collection-coordinator-preflight.test.js`):

1. Pre-flight violation: spied conflict-resolution step advances the mocked clock
   past `coordinationTimeoutMs` → `COORDINATION_TIMEOUT` thrown with the pre-flight
   reason AND the callback is never invoked (spy records zero calls) AND the lock
   is released.
2. Pre-flight pass: identical setup with elapsed within budget → callback invoked,
   result returned (guards against over-blocking).
3. Site-0 reason: `acquireCollectionLock` throwing `LOCK_TIMEOUT` →
   `COORDINATION_TIMEOUT` carries the **exact** lock-acquisition reason constant
   in `error.context` (not merely a truthy reason).
   Reachability note (spec §4.1): the retry loop aborts before sleeping once backoff
   reaches the lease — drive elapsed time via a spied clock-advancing step rather
   than retries.

**Green.** Add the pre-flight check, site-0 reason, and reason constants.
**Refactor.** Extract the check into a small private helper if `coordinate()`
approaches complexity 7.

**Acceptance criteria.** Red tests green; all existing coordinator suites still
green (in particular "should throw timeout error for operations exceeding
coordinationTimeoutMs" — the post-callback throw still exists at this point);
lint clean.

**Section checks.**

1. `npx vitest run --config tests/vitest.config.js tests/unit/collection-coordinator/`
2. `npm run lint`
3. `npm run test`

---

## 3. Section 3 — CollectionCoordinator: unified post-callback algorithm (Cases 1–2, post-callback half) — **[COMPLETE]**

**Objective.** Replace the post-callback throw in
`_executeOperationWithTimeout` and the throwing renewal helper with the unified
algorithm: budget verdict computed once → ownership step (non-throwing renewal +
single re-acquisition) → finalise-or-skip → throw sites 2/3 with the logging
contract (spec §4.1–4.2).

**Constraints.**

- Internal contract changes (spec §4.2): `_executeOperationWithTimeout` loses its
  elapsed check/throw entirely; `_renewLeaseForFinalisationIfRequired` stops
  throwing and reports the renewal outcome.
- Ownership step: renewal due → `renewCollectionLock` (boolean); on failure,
  exactly one `acquireCollectionLock` for the same `opId`; `false` **or** thrown →
  `lost-unrecoverable` (uniform treatment). No retry loop.
- Finalise-or-skip: lost-unrecoverable → skip finalisation + divergence ERROR +
  throw site 3 (regardless of budget verdict); otherwise
  `updateMasterIndexMetadata()` — failures propagate if within budget, swallowed
  with loud ERROR if over-budget; then throw site 2.
- Logging contract per spec §4.2 table; boundary catch remains the single
  operation-level failure record; completion INFO never fires on violation paths.
- `_executeOperationWithTimeout` is **removed entirely** once its throw is
  stripped: the callback is invoked directly in `coordinate()`, and the pre-flight
  check remains in its own Section-2 helper. This avoids a dead `startTime`
  parameter and dead scaffolding. (If implementation finds a cleaner decomposition,
  removal-or-repurposing is acceptable provided no dead parameters remain and the
  contract changes hold.)
- Stale JSDoc remarks (boundary-catch-only failure logging,
  `updateMasterIndexMetadata` no-logging claim, and the `coordinate()` `@throws`
  clause — currently "lock acquisition or the operation exceeds timeouts" —
  expanded to enumerate the four `CoordinationTimeoutError` sites and their
  reasons) are updated **in this section** together with the code change; the
   Section-5 sweep then reconciles the developer docs.

**Pinned logging + reason contract (authoritative for Section 3 implementation AND tests — do not reword).**
The exact strings below are the contract; the implementation must emit them verbatim and the
tests assert them. The four `CoordinationTimeoutError` reason constants:

- site 0 (lock-acquisition timeout): `'lock-acquisition-timeout'`
- site 1 (pre-flight budget exhausted): `'preflight-budget-exhausted'`
- site 2 (post-operation overrun): `'post-operation-overrun'`
- site 3 (lease not recoverable): `'lease-not-recoverable'`

Point-of-occurrence / divergence records (message substring + context keys):

- Pre-flight budget exhausted (ERROR): `'Coordination budget exhausted before the operation callback'` · `{ collection, opId, timeoutMs }`
- Renewal failure, before re-acquisition (ERROR): `'Collection lock lease expired before finalisation could complete'` · `{ collection, opId, leaseMs }`
- Re-acquisition recovered (WARN): `'Collection lock re-acquired for finalisation after renewal failure'` · `{ collection, opId, outcome: 'recovered' }`
- Finalisation failure on a violation path, swallowed (ERROR): `'Metadata finalisation failed on a violation path; the coordination timeout propagates'` · `{ collection, opId, error }`
- Finalisation skipped (divergence) (ERROR): `'Metadata finalisation skipped; collection and master index may be divergent'` · `{ collection, opId, operation }`
- Post-operation overrun, immediately before site-2 throw (ERROR): `'Operation exceeded the coordination budget after effects were applied'` · `{ collection, opId, timeoutMs, elapsedMs, finalisationOutcome }` where `finalisationOutcome ∈ {'finalised','finalisation-failed'}`
- Boundary catch, single per failed operation (ERROR): `'Operation ' + operationName + ' failed'` · `{ collection, opId, error }`

`finalisationOutcome` is `'finalised'` when `updateMasterIndexMetadata()` succeeded on the path, or
`'finalisation-failed'` when it threw and was swallowed on an over-budget path.

**Red-first test cases** (extend `collection-coordinator-lock-release.test.js`;
new `collection-coordinator-violation-policy.test.js`):

1. Over-budget success path: mocked clock inside the callback exceeds the budget →
   master index metadata **was updated** (spy/assert `updateCollectionMetadata` or
   the metadata effect) AND `COORDINATION_TIMEOUT` thrown with the **exact** site-2
   reason constant in `error.context` (upgrades the pinned throw test with
   finalisation assertions). _Clock guidance_: with
   `collectionLockLeaseMs = coordinationTimeoutMs = 700`, advance >700 ms in the
   callback — unambiguously over budget.
2. Over-budget + finalisation failure (spy `updateCollectionMetadata` to throw) →
   loud ERROR logged (swallowed) AND `COORDINATION_TIMEOUT` thrown with the exact
   site-2 reason constant — the MasterIndexError must not mask it.
3. Renewal failure + re-acquisition succeeds (`renewCollectionLock → false`,
   `acquireCollectionLock → true`): metadata finalised exactly once, WARN recovery
   log, `COORDINATION_TIMEOUT` thrown with the exact site-2 reason constant.
   _Clock guidance_: with `collectionLockLeaseMs = coordinationTimeoutMs = 700`,
   advance ~750 ms in the callback — over budget AND renewal-due, so the intended
   throw side is reached for the right reason.
4. Renewal failure + re-acquisition returns `false`: metadata **not** written,
   divergence ERROR logged with collection/opId, `COORDINATION_TIMEOUT` thrown with
   the exact site-3 reason constant.
5. Renewal failure + re-acquisition **throws** (e.g. `CollectionNotFoundError`):
   treated as case 4 (uniform treatment).
6. Within-budget restored path: renewal fails, re-acquisition succeeds, budget not
   exceeded → operation **returns successfully** (with the §4.2 ERROR-may-co-occur-
   with-success caveat asserted via the renewal-failure ERROR record).
   _Clock guidance_: with `collectionLockLeaseMs = coordinationTimeoutMs = 700`,
   advance ~600 ms — renewal-due (≥ lease − 250 window) but within budget, so the
   intended success side is reached for the right reason.
7. Logging shape: violation-path operations produce the enumerated
   point-of-occurrence records plus exactly one boundary failure record, and never
   the completion INFO.
8. Lock always released in `finally` on every violation path (extends the existing
   release test).
   Existing pinned invariants that must stay green: exactly one boundary ERROR per
   within-budget metadata failure; exactly one INFO per success; "should renew the
   lease before finalising a near-expiry write"; "should keep the collection locked
   for a long-running write that stays within the lease".

**Green.** Implement the algorithm (decompose: ownership resolution, finalise-or-
skip, and throw-site construction as private helpers to stay under complexity 7).
**Refactor.** Re-read `coordinate()` end-to-end; JSDoc for every changed/added
method with the new contract semantics (including the deliberate swallow and the
ERROR-may-co-occur-with-success note).

**Acceptance criteria.** All red tests green; pinned invariants green; lint clean
(including complexity); counted LOC recorded and under gate.

**Section checks.**

1. `npx vitest run --config tests/vitest.config.js tests/unit/collection-coordinator/`
2. `npm run lint`
3. `npm run test`

---

## 4. Section 4 — Regression hardening

**Objective.** Prove the changes hold across the whole system and the three issue
cases are closed end-to-end.

**Tasks.**

- Full suite: `npm run test` (and `npm run test:coverage` — coverage must not
  regress materially on the two touched files; the v8 provider with `all: true` is
  already configured in `tests/vitest.config.js`, so the gate is enforceable).
- Cross-suite sweep for incidental coupling: `tests/unit/database/`,
  `tests/unit/Collection/`/`collection/`, `tests/unit/CollectionCoordinator*`
  legacy folders — any suite exercising `coordinate()` or `MasterIndex.save()`
  indirectly must pass unmodified; investigate and fix root causes (not test
  waivers) for any fallout.
- Verify the three issue scenarios as integrated cases (data-shape-free,
  spy-level):
  1. Over-budget write → metadata finalised + typed throw (Case 1).
  2. Lease-loss after success → recovered-finalised or skipped-with-divergence-
     ERROR, typed throw either way (Case 2).
  3. Save failure → memory matches storage or staged state with loud log; original
     error thrown (Case 3).
- Re-run `npm run lint` — 0 errors, 0 warnings.
- Re-measure counted LOC for both files; record against the §0 projections.

**Acceptance criteria.** Full suite green; coverage non-regressed; lint clean;
LOC under gate; the three integrated scenarios demonstrably pass.

**Section checks.**

1. `npm run test:coverage`
2. `npm run lint`
3. `npm run test`

---

## 5. Section 5 — Documentation follow-through

**Objective.** Make the docs match the delivered behaviour; add all method-level
documentation for the new/changed contracts.

**Tasks.**

- **New** `docs/developers/CollectionCoordinator.md` (canonical home for the
  coordination contract): revised `coordinate()` flow, unified violation
  algorithm, four throw sites + reason values, deliberate swallows (release,
  best-effort finalisation), logging contract, ERROR-may-co-occur-with-success
  caveat, residual risks (§7.5–7.6 of the spec, restated without referencing
  planning artefacts).
- `docs/developers/Infrastructure_Components.md`: update the
  `CoordinationTimeoutError` catalogue entry (four sites, reason semantics);
  extend the deliberate non-instrumentation/swallow notes; reconcile the
  "failure logging owned by coordinate's boundary catch" statements with the
  additional point-of-occurrence records.
- `docs/developers/MasterIndex.md`: `save()` failure/resynchronisation semantics
  (three outcomes, original error always thrown, no-recursion design); virtual-
  locking section aligned with the non-throwing renewal helper; document the
  `_readStoredSnapshot()` raw reader and its composition into
  `_loadFromScriptProperties()`.
- `docs/developers/DatabaseConfig.md`: sizing note — an over-budget operation now
  finalises metadata before throwing; renewal-failure dual-cause note.
- JSDoc reconciliation sweep across the developer docs: verify the in-code remarks
  already updated in Section 3 remain consistent with the new doc pages; `save()`
  remarks in `MasterIndex.md`.
- User-facing: update the relevant guide under `docs/` (error semantics:
  `CoordinationTimeoutError` may arrive after effects were applied — reason
  context distinguishes sites) and add a `docs/release-notes/` entry.
- Verify all code examples current; cross-references intact.
- Route: `Docs` agent review per the AGENTS.md mandatory review process, after
  `Code Reviewer` approval of the source/test changes.

**Acceptance criteria.** No doc contradicts the delivered behaviour; no
planning-artefact references anywhere in `docs/` (prime directive); the
`Not implemented` marker convention remains exclusive to data-shape docs (unused
here).

**Section checks.**

1. `npm run lint` (docs-referenced code samples unchanged, tree still clean)
2. `npm run test`
3. Manual grep: no `SPEC.md`/`ACTION_PLAN.md` references in `docs/` or source.

---

## Sequencing summary

| Order | Section                          | Depends on                            |
| ----- | -------------------------------- | ------------------------------------- |
| 0     | Baseline verification            | —                                     |
| 1     | MasterIndex raw reader + resync  | Baseline                              |
| 2     | Pre-flight check + site-0 reason | Baseline (independent of 1)           |
| 3     | Unified post-callback algorithm  | 2 (shares `startTime`/constants/flow) |
| 4     | Regression hardening             | 1, 2, 3                               |
| 5     | Documentation follow-through     | 4 (post code review)                  |

Sections 1 and 2 are independent and could run in parallel; the numbered order
keeps the tree single-threaded for the TDD gates.
