# SPEC — Coordination/MasterIndex partial-write hazard elimination (Issue #61)

## 1. Purpose

Eliminate three related partial-write hazards in which error/timeout signalling fires
**after** side effects have already happened, leaving coordination state (master index
metadata, or the in-memory master index snapshot) divergent:

1. **Post-hoc coordination timeout** — `CollectionCoordinator._executeOperationWithTimeout`
   runs the operation callback first and only then enforces `coordinationTimeoutMs`,
   throwing `CoordinationTimeoutError` after the operation's effects have been applied;
   `coordinate()`'s catch path then skips metadata finalisation, so the collection and
   the master index diverge. The divergence differs by operation class:
   - **Save-style callbacks** (e.g. `Collection.save()`): the data file has already been
     written to Drive when the timeout throws — persisted data exists while the master
     index was never finalised.
   - **CRUD callbacks** (insert/update/delete): the callback mutates in-memory state and
     marks the collection dirty (`_markDirty()`); the Drive write is deferred. The throw
     tells the caller the operation failed while the instance holds unflushed state.
2. **Lease-renewal failure after a successful callback** — when
   `_renewLeaseForFinalisationIfRequired` cannot renew the lease, finalisation throws
   `CoordinationTimeoutError` although the operation itself succeeded, again skipping
   metadata finalisation.
3. **`MasterIndex.save` mutates memory before persist** — `save()` advances
   `lastUpdated` (and its internal callers advance collection entries and
   `_touchIndex`) *before* the ScriptProperties write; on persistence failure the
   in-memory state diverges from the stored snapshot.

Source: [Issue #61](https://github.com/h-arnold/JsonDbApp/issues/61) (consolidated
ticket from the `feat/execution-time-logging` pre-PR review).

## 2. Decisions

The following were decided with the user and are binding for implementation:

| # | Decision | Choice |
|---|----------|--------|
| D1 | Post-completion coordination-budget overrun (Case 1) | **1A** — keep throwing `CoordinationTimeoutError` (documented contract preserved), but complete metadata finalisation best-effort *before* throwing. A pre-flight budget check is added before the callback runs. |
| D2 | Lease-renewal failure after a successful callback (Case 2) | **2A** — attempt exactly **one** re-acquisition of the lease for the same `opId`. If re-acquired, finalise metadata safely and then apply the D1 policy (throw `CoordinationTimeoutError`). If not re-acquired, skip finalisation, log a loud ERROR flagging the possible divergence, and throw `CoordinationTimeoutError`. |
| D3 | `MasterIndex.save` memory/persist ordering (Case 3) | **3B** — keep the current ordering; on save failure, resynchronise in-memory state with the stored snapshot before throwing; if resynchronisation cannot be completed, keep the staged state, log loudly, and throw the **original** `MasterIndexError`. |

## 3. Constraints

- **GAS runtime**: synchronous, single-threaded V8. A running callback cannot be
  interrupted; timeout enforcement before irreversible work is only possible before
  the callback starts. All post-callback checks are inherently post-hoc.
- **Fail loud (prime directive)**: no silent fallbacks or defaults. Every deviation
  from the happy path must surface as a thrown error or a loud (ERROR-level) log with
  full diagnostic context. Swallowing is only permitted where this spec explicitly
  defines it (best-effort finalisation on violation paths, §4.2; lock-release swallow
  already precedents this), and every swallow must log loudly.
- **Contract preservation**: `CollectionCoordinator.coordinate()`'s documented throws
  (`CoordinationTimeoutError` on coordination-window violations, `MasterIndexError`
  on metadata finalisation failure on the normal path, propagated callback errors)
  are preserved. The existing pinned test "should throw timeout error for operations
  exceeding coordinationTimeoutMs" must keep passing unchanged in its assertion of
  the throw.
- **Lease-ownership gating**: metadata finalisation requires lease ownership to be
  intact or re-established for the same `opId`. Residual risk: re-acquiring an
  *expired* lease does not prove no intervening writer finalised newer metadata in
  the meantime; overwriting it would be last-write-wins on collection metadata. This
  residual risk is accepted and documented (§7.5) rather than guarded by a staleness
  check, which the current token semantics cannot support (see §7.6).
- **No masking**: a secondary failure (finalisation failure on a violation path;
  resynchronisation failure after a save failure) must never replace the primary
  thrown error. The primary error propagates; the secondary failure is logged loudly.
- **Error standards**: no new error types or codes. Existing
  `CoordinationTimeoutError`, `MasterIndexError`, and logger levels only. All
  `CoordinationTimeoutError` throw sites in `coordinate()` — four in total, defined
  in §4.2, including the pre-existing lock-acquisition timeout mapping — each pass
  a distinct machine-readable `reason` value in the error context so callers and
  tests can distinguish them.
- **No persisted data-shape changes**: master index schema, collection metadata
  shape, and ScriptProperties keys are unchanged. This is ordering and error-path
  work only. `docs/developers/data-shapes/` does not exist and requires no entries
  for this work; the action plan deliberately omits data-shape blocks.
- **Lint gate**: the project requires zero lint errors *and* zero warnings. Relevant
  active rules: `max-lines` warn at 500 counted lines (blanks/comments skipped),
  `complexity` warn at 7, `max-len` 160, sonarjs recommended set, and
  `no-magic-numbers` as an **error** in source. The new branches must therefore use
  named constants (following the `LEASE_RENEWAL_WINDOW_MS` precedent) and keep
  methods decomposed below the complexity threshold.
- **Module sizing**: current counted (non-blank, non-comment) lines:
  `99_MasterIndex.js` ≈324, `CollectionCoordinator.js` 225 (re-measure at
  implementation time). Projected additions keep both under 500; no file separation
  is planned (evidence recorded in the action plan).

## 4. Behavioural contracts

### 4.1 `CollectionCoordinator.coordinate()` — revised flow

1. Acquire lock (unchanged; `LOCK_TIMEOUT` → `CoordinationTimeoutError` mapping
   unchanged — this throw is pre-side-effects and safe).
2. Resolve conflicts (unchanged).
3. **Pre-flight budget check** (new): immediately after conflict resolution and
   before the callback runs, if `Date.now() - startTime > coordinationTimeoutMs`
   (budget already consumed by lock acquisition and conflict resolution), log an
   ERROR and throw `CoordinationTimeoutError` (throw site 1, §4.2). The callback is
   never invoked on this path, so no operation side effects exist.
   *Reachability note for tests*: the branch requires the pre-callback work to
   consume more than `coordinationTimeoutMs` (minimum 500 ms per config validation);
   the reachable route in vitest is a spied conflict-resolution/lock step that
   advances the mocked clock past the budget, since the retry loop aborts before
   sleeping once accumulated backoff reaches the lease.
4. Run the callback; capture the result.
5. **Budget verdict, computed exactly once**: immediately after the callback returns,
   set `overBudget = Date.now() - startTime > coordinationTimeoutMs`. The verdict is
   computed before any finalisation work, it selects finalisation's error semantics
   (§4.2), and there is **no post-finalisation re-check**.
6. **Ownership step** (replaces the current throwing
   `_renewLeaseForFinalisationIfRequired`; see §4.2 for the internal contract
   change): if renewal is due (`_shouldRenewLease`), attempt
   `renewCollectionLock` (non-throwing, boolean). On failure, attempt exactly one
   re-acquisition for the same `opId`. Outcomes: **intact** (no renewal due or
   renewal succeeded), **restored** (re-acquisition succeeded), or
   **lost-unrecoverable** (re-acquisition returned `false` or threw).
7. **Finalise or skip**:
   - `lost-unrecoverable` → skip finalisation entirely; log a loud ERROR stating
     that metadata finalisation was skipped and the collection and master index may
     be divergent (context: collection name, operation name, `opId`).
   - otherwise → update master index metadata. On the within-budget path its
     failures propagate as `MasterIndexError` (unchanged behaviour); on the
     over-budget path its failures are swallowed with a loud ERROR (§4.2).
8. **Throw or return**:
   - `lost-unrecoverable` → throw `CoordinationTimeoutError` (throw site 3) — this
     applies regardless of the budget verdict, preserving today's "renewal failure
     throws" behaviour.
   - `overBudget` → log a point-of-occurrence ERROR (effects applied; finalisation
     outcome; context) and throw `CoordinationTimeoutError` (throw site 2).
   - otherwise → return the result (normal path).
9. `finally`: lock release unchanged (including the deliberate swallow with loud
   logging). The completion INFO log fires only on the success path; violation
   paths throw and therefore never emit it.

### 4.2 Coordination violation policy (unified)

The former "Path A / Path B" presentation is replaced by one ordered post-callback
algorithm; the paths co-occur by construction because `collectionLockLeaseMs ≥
coordinationTimeoutMs` is enforced by config validation, so an expired lease implies
an over-budget operation in all but the exact-equality boundary case.

**Internal contract changes**: two helpers must stop throwing and report to the
`coordinate()` flow instead:

- `_renewLeaseForFinalisationIfRequired` reports the renewal outcome (renewed /
  not renewed); the ownership decision and all throw decisions are centralised in
  the flow above.
- `_executeOperationWithTimeout` **stops enforcing the post-callback timeout** —
  its current elapsed check and `CoordinationTimeoutError` throw are removed and
  replaced by the step-5 verdict computed in `coordinate()`. If this method kept
  throwing, the post-hoc timeout would again skip finalisation and reintroduce the
  Case-1 hazard.
- **Single clock source**: the step-3 pre-flight check and the step-5
  `overBudget` verdict are two reads of the *same* elapsed measurement
  (`Date.now() - startTime`, with `startTime` captured once at the top of
  `coordinate()`); implementations must not introduce a fresh start time for
  either check.

**Throw sites and reason values** (each passes a distinct `reason` in the error
context; exact strings chosen at implementation). Four sites exist in
`coordinate()`: the three below plus the pre-existing lock-acquisition timeout
mapping in `_acquireLockWithTimeoutMapping`, which gains a `reason` value (e.g.
lock-acquisition-timeout) for consistency — it is pre-callback, so no side effects
exist there either:

| Site | Trigger | Finalisation state at throw |
|------|---------|------------------------------|
| 0 — lock-acquisition timeout (pre-existing) | `LOCK_TIMEOUT` during lock acquisition | None possible; no side effects |
| 1 — pre-flight | Budget exhausted before the callback | None possible; no side effects |
| 2 — post-operation overrun | Callback completed, `overBudget` true, ownership intact or restored | Applied; finalised (or finalisation failed loudly) |
| 3 — lease not recoverable | Renewal failed and single re-acquisition failed | Applied; **skipped** — divergence logged |

**Renewal-failure causes**: renewal can fail for two reasons — lease expiry
(which, given `collectionLockLeaseMs ≥ coordinationTimeoutMs`, implies `overBudget`
outside the exact-equality boundary) and concurrent collection removal or
lock-record loss (which may occur within budget). The ownership step treats both
uniformly: one re-acquisition attempt, then recover or route to throw site 3.

**Rules**:

1. **Single re-acquisition**: exactly one `acquireCollectionLock` call for the same
   `opId` with the configured `collectionLockLeaseMs`. A `false` return **or** a
   thrown error (e.g. `CollectionNotFoundError`) is treated uniformly as
   `lost-unrecoverable`. No retry loop, no backoff.
2. **Best-effort finalisation on violation paths**: when `overBudget` is true and
   ownership is intact/restored, a finalisation failure is logged loudly (ERROR,
   with the underlying error and operation context) and **swallowed** so it cannot
   mask the primary `CoordinationTimeoutError`. This mirrors the existing
   `releaseOperationLock` swallow-with-loud-logging precedent and is the explicit,
   documented sense in which finalisation is "best-effort". Within-budget
   finalisation failures continue to propagate as today.
3. **Logging contract** (point-of-occurrence records; the boundary catch in
   `coordinate()` remains the single operation-level failure record and continues to
   log once per failed operation):

   | Situation | Level | Content |
   |-----------|-------|---------|
   | Pre-flight budget exhausted | ERROR | collection, opId, timeoutMs |
   | Renewal failure (before re-acquisition) | ERROR | collection, opId, leaseMs |
   | Re-acquisition attempt outcome (recovered) | WARN | collection, opId, outcome |
   | Finalisation failure on a violation path (swallowed) | ERROR | collection, opId, underlying error |
   | Finalisation skipped (divergence warning) | ERROR | collection, opId, explicit divergence statement |
   | Post-operation overrun (immediately before site-2 throw) | ERROR | collection, opId, timeoutMs, elapsedMs, finalisation outcome |

   Existing pinned invariants that must keep holding: exactly one ERROR from the
   coordinate boundary per failed metadata update (within-budget path), and exactly
   one INFO completion record per successful operation.

   Two clarifications: (a) on violation paths the point-of-occurrence ERROR is
   **deliberately additional** to the boundary catch's operation-failure record —
   they answer different questions (why the violation happened / what the operation
   outcome was), so two records per failed violation-path operation are intended;
   (b) on the within-budget restored path an ERROR-level renewal-failure record may
   co-occur with a **successful** result — log-based alerting and tests must not
   assume ERROR implies operation failure.
4. **Test reachability**: the lease-loss branches are exercised by spying on the
   master index (`renewCollectionLock → false`, then `acquireCollectionLock →
   true/false/throws`), consistent with the existing coordinator and lock-manager
   suites; no multi-actor simulation is required.

### 4.3 `MasterIndex.save()` — resynchronisation on failure

- Ordering is unchanged: state is advanced in memory, then persisted.
- On a persistence failure (`setProperty` or serialisation throws), inside the
  existing catch, **before throwing the original `MasterIndexError('save', …)`**,
  attempt resynchronisation via a new private raw reader (suggested name
  `_readStoredSnapshot()`), which becomes the **single** read-and-deserialise
  implementation for ScriptProperties snapshots:
  - **Composition, not duplication**: `_loadFromScriptProperties()` is refactored
    to compose the raw reader — it calls it, assigns `this._data`, runs
    `_ensureStateShape()`, and retains its single `MASTER_INDEX_ERROR('load', …)`
    wrap point and failure log. The documented single-wrap-point consolidation
    contract is preserved, not eroded; the resync path calls the raw reader
    directly and logs its own outcome.
  - The raw reader never assigns `this._data`, never runs `_ensureStateShape()`,
    and never calls `save()`. This is the mechanism that makes save↔reload
    recursion impossible even when the stored snapshot is a legacy payload and
    `setProperty` is broken.
  - Outcomes:
    1. **Snapshot found** → assign it to `this._data`. In-memory state (including
       caller-side pre-advances of collection entries and `lastUpdated`) is
       resynchronised with storage; the staged, un-persisted advances are discarded.
    2. **No snapshot** (stored key absent, e.g. failure during initial creation) →
       keep the staged in-memory state; log loudly (ERROR) that no stored snapshot
       was available to resynchronise from.
    3. **Reader failure** (read or deserialise throws) → keep the staged in-memory
       state; log loudly (ERROR) that memory may be diverged from the stored
       snapshot.
  - In all three outcomes the **original** `MasterIndexError('save', …)` is thrown;
    a reader failure must not mask it. The log context records which of the three
    outcomes occurred.
  - **Shape normalisation is intentionally skipped on the resync path**: the
    shape-normalisation save inside `_ensureStateShape()` is precisely the
    recursion source this design removes. A stored snapshot that still needs
    normalisation is re-normalised on the next lock-protected reload
    (`_withScriptLock` → `_reloadLatestStateUnderLock`). Reviewers and implementers
    must not "fix" this by adding `_ensureStateShape()` to the resync path.
- Resynchronisation targets `this._data` on every save failure regardless of
  `dataOverride` (internal callers never pass an override). Note the override
  object itself may be mutated by the pre-persist `lastUpdated` assignment — the
  guarantee is only that the override is **not adopted as master state**
  (`this._data !== dataOverride` after resync).
- **Consistency consequence (corrected)**: after a failed save with a successful
  resynchronisation, the master index holds the stored snapshot. This divergence
  class self-heals on the **next successful coordinated finalisation**, which
  rewrites document count and modification token from the acting instance's live
  state. `CollectionCoordinator.hasConflict()` does **not** detect this divergence
  class: local modification tokens are not regenerated in the write path, so the
  token comparison cannot be relied on here.
- **De-aliasing consequence**: after resynchronisation the index's metadata objects
  are freshly deserialised (de-aliased from any live `Collection._metadata`
  instances). This is acceptable; the documented healing path above covers it.
- Existing pinned behaviour that must keep holding: `load()` returning the
  deserialised snapshot shared with internal state, and the single
  `MASTER_INDEX_ERROR` wrap point in the shared loader, remain unchanged — the raw
  reader becomes the underlying read-and-deserialise implementation that
  `_loadFromScriptProperties()` composes, not a parallel second reader.

## 5. Scope

### In scope

- `src/02_components/CollectionCoordinator.js`: pre-flight budget check; unified
  post-callback violation algorithm; non-throwing renewal helper;
  `_executeOperationWithTimeout` stripped of its post-callback throw (enforcement
  moves to the `coordinate()` verdict); site-0 `reason` added to
  `_acquireLockWithTimeoutMapping`; JSDoc updates for the changed contract
  semantics (including the deliberate best-effort swallow).
- `src/04_core/MasterIndex/99_MasterIndex.js`: raw-read resynchronisation inside
  `save()`'s catch; JSDoc updates.
- Tests: new red-first coverage for every behaviour in §4 (see action plan);
  amendments to existing coordinator/master-index suites where pinned expectations
  gain new observable side effects (finalisation before throw).
- Documentation follow-through:
  - **New canonical home**: `docs/developers/CollectionCoordinator.md` — the
    coordination contract (flow, violation policy, throw sites/reasons, deliberate
    swallows) currently has no owning document; this work creates it.
  - `docs/developers/Infrastructure_Components.md`: `CoordinationTimeoutError`
    catalogue entry updated with the four throw sites/reason semantics; note the
    deliberate best-effort swallow alongside the existing release-swallow note;
    reconcile the "failure logging owned by coordinate's boundary catch" claims
    (and the equivalent JSDoc remarks) with the deliberate additional
    point-of-occurrence records on violation paths.
  - `docs/developers/MasterIndex.md`: `save()` failure/resynchronisation semantics;
    virtual-locking section aligned with the non-throwing renewal helper.
  - `docs/developers/DatabaseConfig.md`: sizing note updated — an over-budget
    operation now finalises metadata before throwing.
  - User-facing: relevant guide under `docs/` and a release-notes entry
    (`docs/release-notes/`) — user-visible change: `CoordinationTimeoutError` can
    now be thrown *after* an operation's effects were applied (and, at sites 1–2,
    after metadata finalisation); the `reason` context distinguishes the sites.

### Out of scope

- Lock acquisition, retry/backoff, lease defaults, and `DatabaseConfig` validation
  rules (unchanged).
- Data-file partial-write concerns in `DocumentOperations`/`FileOperations` (the
  issue is specifically coordination/metadata divergence).
- Interruptible or asynchronous callbacks (impossible under GAS).
- Any general retry framework for metadata persistence (the single bounded
  re-acquisition in D2 is the only retry-like behaviour, by explicit decision).
- Persisted data-shape changes (none required).
- **Callback-failure path**: a throwing callback continues to skip finalisation
  entirely, unchanged. Rationale: the operation failed, so publishing its metadata
  could misrepresent an incomplete operation; the callback error propagates
  unchanged. Best-effort finalisation is deliberately *not* generalised to this
  path.

## 6. Non-goals

- No new error types, error codes, or logger levels.
- No change to the master index persisted schema or ScriptProperties keys.
- No change to `MasterIndex.save()`'s signature. It has no production call sites
  outside `MasterIndex` itself (tests exercise it directly, and it is reachable via
  `Database.getMasterIndex()`); internal call sites are unchanged.
- No staleness/token-based guard before post-re-acquisition finalisation (residual
  risk accepted, §7.5).
- No speculative hardening beyond the three cases in Issue #61.

## 7. Assumptions (stated, veto-able)

1. **Error precedence on violation paths**: a finalisation failure on an over-budget
   path is swallowed with a loud log so the primary `CoordinationTimeoutError`
   propagates. Within-budget finalisation failures still propagate as
   `MasterIndexError`.
2. **Re-acquisition failure uniformity**: a thrown error during the single
   re-acquisition attempt (e.g. `CollectionNotFoundError`) is treated the same as a
   `false` return — skip finalisation, loud divergence log, throw site 3.
3. **Logging shape**: the point-of-occurrence records in §4.2.3 are in addition to
   the single boundary failure record; the existing exact-once invariants referenced
   there stay pinned.
4. **Within-budget lease recovery**: if the lease is lost and re-acquired while the
   operation is still within budget, the operation completes successfully (no
   throw). Practically rare for the expiry cause: config enforces
   `collectionLockLeaseMs ≥ coordinationTimeoutMs`, so an expired lease almost
   always implies an over-budget operation outside the exact-equality boundary.
   The other renewal-failure cause — concurrent collection removal or lock-record
   loss — can occur within budget; the algorithm handles both uniformly (§4.2).
5. **Residual clobber risk accepted**: after re-acquiring an expired lease, a
   concurrent writer that finalised newer metadata in the expiry window could be
   overwritten (last-write-wins on collection metadata). The window is small, the
   divergence is loudly logged, and the current token semantics (tokens are not
   regenerated in the write path) cannot support a cheap staleness check. Documented
   in the new coordinator doc rather than guarded.
6. **Local state after skipped finalisation**: the acting instance keeps its
   in-memory (dirty or saved) state; it is not invalidated. The divergence
   self-heals on the next successful coordinated finalisation on any instance. This
   is documented rather than made fatal, because failing the already-completed
   operation again would not improve consistency.
7. **Token semantics unchanged**: the observation that write-path tokens are not
   regenerated (so `hasConflict()` rarely fires for this divergence class) is
   recorded as-is; changing token generation is out of scope.

## 8. Open questions

None blocking. Reviewer findings from both passes are resolved: the first-pass
items (C1–C4, I1–I11, N1–N4) by the previous revision; the second-pass items by
this one — A1 via the composed single raw reader (§4.3), A2 by adding the
pre-existing lock-acquisition site to the reason scheme (§4.2), A3 by stating both
renewal-failure causes (§4.2, §7.4), A4 by explicitly requiring the resync path to
skip shape normalisation (§4.3), and A5–A6 via the two-records and ERROR⟹failure
clarifications (§4.2). B1 is resolved by the §4.2 internal-contract-changes block
(both helpers stop throwing; single clock source) and the §5 in-scope naming.
Any residual judgement calls are captured as veto-able assumptions in §7.
