# CollectionCoordinator Developer Documentation

- [CollectionCoordinator Developer Documentation](#collectioncoordinator-developer-documentation)
  - [Overview](#overview)
  - [coordinate() Flow](#coordinate-flow)
  - [Pre-flight Budget Check](#pre-flight-budget-check)
  - [Unified Violation Algorithm](#unified-violation-algorithm)
    - [Ownership Resolution](#ownership-resolution)
    - [Finalise or Skip](#finalise-or-skip)
    - [Throw or Return](#throw-or-return)
  - [Throw Sites and Reason Values](#throw-sites-and-reason-values)
  - [Deliberate Swallows](#deliberate-swallows)
  - [Logging Contract](#logging-contract)
  - [Errors May Co-occur with Success](#errors-may-co-occur-with-success)
  - [Residual Risks (Accepted)](#residual-risks-accepted)
  - [Cross-references](#cross-references)

## Overview

The `CollectionCoordinator` orchestrates cross-instance operations for a single collection. It wraps every coordinated CRUD call with locking, conflict detection, coordination-budget enforcement, master-index metadata finalisation, and typed error handling.

**Location:** [src/02_components/CollectionCoordinator.js](../../src/02_components/CollectionCoordinator.js)

**Responsibilities:**

- Acquire and release the collection's virtual lock (with retry and exponential backoff)
- Resolve modification-token conflicts before the operation runs
- Enforce the coordination budget both before the callback (pre-flight) and after it (over-budget verdict)
- Finalise master-index metadata after a successful callback — or skip that finalisation safely when the lease cannot be recovered
- Convert coordination violations into typed `CoordinationTimeoutError` throws, each carrying a distinct machine-readable `reason`

**Configuration** (resolved through `DatabaseConfig` when a config object is supplied):

| Key                     | Use                                                                         |
| ----------------------- | --------------------------------------------------------------------------- |
| `collectionLockLeaseMs` | Lock lease duration; also the re-acquisition lease and renewal window basis |
| `coordinationTimeoutMs` | The coordination budget enforced before and after the callback              |
| `retryAttempts`         | Lock acquisition retry attempts                                             |
| `retryDelayMs`          | Base delay between lock retries                                             |
| `lockRetryBackoffBase`  | Exponential backoff base for lock retries                                   |

**Single clock source.** `coordinate()` captures `startTime = Date.now()` once at the top. The pre-flight check and the post-callback over-budget verdict are two reads of the same elapsed measurement (`Date.now() - startTime`); no fresh start time is introduced anywhere in the flow.

This page is the canonical contract for coordination behaviour: the `coordinate()` flow, the unified violation algorithm, the throw sites and their `reason` values, the deliberate swallows, and the logging contract.

## coordinate() Flow

`coordinate(operationName, callback)` runs the following ordered steps:

1. **Validate and prepare.** Validate `operationName` and `callback`, generate a fresh `opId`, read the collection name, and capture `startTime` (single clock source). A DEBUG record notes the operation start.
2. **Acquire lock.** `acquireOperationLock()` retries with exponential backoff. Exhausted retries raise `LockAcquisitionFailureError`. A `LOCK_TIMEOUT` during acquisition is mapped to `CoordinationTimeoutError` (**site 0**) — this throw is pre-side-effects. Any other acquisition error propagates unchanged.
3. **Resolve conflicts.** If the local modification token differs from the master index token, a WARN is logged and the conflict is resolved by reloading the collection.
4. **Pre-flight budget check** (**site 1**). If lock acquisition and conflict resolution have already consumed more than `coordinationTimeoutMs`, an ERROR is logged and `CoordinationTimeoutError` is thrown _before the callback runs_ — no operation side effects exist on this path. See [Pre-flight Budget Check](#pre-flight-budget-check).
5. **Run the callback.** The callback is invoked directly and its result captured. If the callback itself throws, its error propagates unchanged; finalisation is skipped entirely (publishing metadata for a failed operation could misrepresent an incomplete operation) and the completion INFO never fires.
6. **Compute the budget verdict once.** Immediately after the callback returns: `overBudget = Date.now() - startTime > coordinationTimeoutMs`. The verdict is computed before any finalisation work, selects finalisation's error semantics, and there is no post-finalisation re-check.
7. **Ownership step and finalise-or-skip** (`_finaliseAfterOperation`). Resolve lease ownership, then either finalise the master-index metadata or skip that finalisation loudly. See [Unified Violation Algorithm](#unified-violation-algorithm).
8. **Throw or return.** Either `CoordinationTimeoutError` (site 3 or site 2) is thrown, or the callback's result is returned. Only then is the operation marked as succeeded.
9. **Finally.** The lock is always released when acquired (release failures are deliberately swallowed with a loud log). The completion INFO record fires only on the success path; every violation path throws and therefore never emits it.

The whole body is timed by a DEBUG-gated `coordinator.coordinate` event; `updateMasterIndexMetadata()` is timed as one unit under `coordinator.updateMasterIndexMetadata`. The raw `Date.now()` reads that feed timeout, lease, and retry decisions are deliberately excluded from the timing facility (see [Infrastructure Components — Execution-Time Tracking](Infrastructure_Components.md#1205-execution-time-tracking)).

## Pre-flight Budget Check

`_enforcePreflightBudget()` runs after conflict resolution and immediately before the callback:

- It measures `Date.now() - startTime` — the same elapsed measurement later used for the over-budget verdict.
- If the elapsed time exceeds `coordinationTimeoutMs`, an ERROR record is emitted (`Coordination budget exhausted before the operation callback`, context `{ collection, opId, timeoutMs }`) and `CoordinationTimeoutError` (**site 1**, reason `'preflight-budget-exhausted'`) is thrown.
- The callback is never invoked on this path, so no operation side effects can exist; the lock is still released in `finally`.
- Reachability: the branch requires the pre-callback work (lock retries plus conflict resolution) to exceed the budget. Configuration validation enforces a minimum of 500 ms for both timing values.

## Unified Violation Algorithm

`_finaliseAfterOperation()` implements the post-callback half of the coordination policy. It replaces the earlier arrangement in which the post-callback timeout throw fired before finalisation could run.

### Ownership Resolution

`_resolveOwnership()` decides whether the coordinator still owns the lease before finalisation:

- **Renewal due?** `_shouldRenewLease()` returns true when the time elapsed since lock acquisition is at least `collectionLockLeaseMs - LEASE_RENEWAL_WINDOW_MS` (250 ms).
- **Renewal attempt.** `_renewLeaseForFinalisationIfRequired()` calls `renewCollectionLock()` — a non-throwing boolean call at the `MasterIndex` boundary. The helper itself no longer throws: it returns `true` when renewal was not required or succeeded, and `false` after a due-but-failed renewal (which also emits a loud ERROR, `Collection lock lease expired before finalisation could complete`, context `{ collection, opId, leaseMs }`). All throw decisions are centralised in the `coordinate()` flow.
- **Single re-acquisition.** On renewal failure, `_attemptSingleReacquisition()` calls `acquireCollectionLock()` for the **same `opId` exactly once**. There is no retry loop and no backoff. A `false` return **or** a thrown error (for example `CollectionNotFoundError` after concurrent collection removal) is treated uniformly as unrecoverable. A successful re-acquisition emits a WARN (`Collection lock re-acquired for finalisation after renewal failure`, context `{ collection, opId, outcome: 'recovered' }`).
- **Outcomes:** `intact` (no renewal due, or renewal succeeded), `restored` (re-acquisition succeeded), or `lost-unrecoverable` (re-acquisition returned `false` or threw).

**Renewal-failure causes.** Renewal can fail for two reasons: lease expiry (which, given `collectionLockLeaseMs ≥ coordinationTimeoutMs`, almost always implies an over-budget operation outside the exact-equality boundary) and concurrent collection removal or lock-record loss (which may occur within budget). The ownership step treats both identically: one re-acquisition attempt, then recover or route to throw site 3.

### Finalise or Skip

- **`lost-unrecoverable`** → finalisation is skipped entirely. A loud divergence ERROR is logged (`Metadata finalisation skipped; collection and master index may be divergent`, context `{ collection, opId, operation }`) and throw **site 3** fires **regardless of the budget verdict**. This preserves the established "renewal failure throws" behaviour.
- **Otherwise** (ownership intact or restored) → `updateMasterIndexMetadata()` runs. It publishes `documentCount` and the modification token via `updateCollectionMetadata()`, or registers a new collection via `addCollection()` on first write. Failures are wrapped as `MasterIndexError`:
  - **Within budget:** the failure propagates (unchanged behaviour).
  - **Over budget:** the failure is logged loudly (`Metadata finalisation failed on a violation path; the coordination timeout propagates`, context `{ collection, opId, error }`) and **swallowed**, so it cannot mask the primary `CoordinationTimeoutError`. This is the documented sense in which finalisation is "best-effort" on violation paths.

### Throw or Return

- **`overBudget` true** (ownership intact or restored): a point-of-occurrence ERROR is logged (`Operation exceeded the coordination budget after effects were applied`, context `{ collection, opId, timeoutMs, elapsedMs, finalisationOutcome }`, where `finalisationOutcome` is `'finalised'` or `'finalisation-failed'`) and `CoordinationTimeoutError` (**site 2**) is thrown. The `elapsedMs` read here is for the overrun log only — it is not a second budget verdict.
- **Otherwise** the callback's result is returned (normal path).

## Throw Sites and Reason Values

Every `CoordinationTimeoutError` raised by `coordinate()` carries a distinct machine-readable `reason` string in the error context (`error.context.reason`, alongside `operation` and `timeout`), so callers and tests can distinguish the sites:

| Site | Reason (`error.context.reason`) | Trigger                                                                | Finalisation state at throw                                   |
| ---- | ------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------- |
| 0    | `'lock-acquisition-timeout'`    | `LOCK_TIMEOUT` during lock acquisition (pre-existing mapping)          | None possible; pre-callback, no side effects                  |
| 1    | `'preflight-budget-exhausted'`  | Coordination budget exhausted before the callback runs                 | None possible; callback never invoked                         |
| 2    | `'post-operation-overrun'`      | Callback completed over budget; ownership intact or restored           | Effects applied; finalised (or finalisation failed loudly)    |
| 3    | `'lease-not-recoverable'`       | Renewal failed and the single re-acquisition returned `false` or threw | Effects applied; finalisation **skipped** — divergence logged |

Other errors thrown by `coordinate()`: `InvalidArgumentError` (invalid arguments), `LockAcquisitionFailureError` (retries exhausted without a timeout), `ModificationConflictError` (token mismatch surfaced during conflict resolution), `MasterIndexError` (finalisation failure on the within-budget path), and whatever the callback throws (propagated unchanged).

## Deliberate Swallows

Two deliberate swallows exist in the coordinator, and each logs loudly:

1. **Lock-release swallow** (`releaseOperationLock`, pre-existing). Release failures are logged (`Lock release failed`, context `{ collection, operationId, error }`) and swallowed so they cannot mask the coordinated operation's own outcome.
2. **Best-effort finalisation swallow** (violation paths, new). On an over-budget path, a `MasterIndexError` from `updateMasterIndexMetadata()` is logged loudly and swallowed so the primary `CoordinationTimeoutError` propagates. Within-budget finalisation failures continue to propagate.

Nothing else is swallowed: callback errors propagate unchanged, and a throwing callback still skips finalisation entirely.

## Logging Contract

**Boundary record.** The `coordinate()` catch emits exactly one operation-level failure record per failed operation (`Operation <operationName> failed`, context `{ collection, opId, error }`) and re-throws. This boundary record also fires on violation paths.

**Point-of-occurrence records.** On violation paths the unified algorithm emits additional records at the point each event occurs:

| Situation                                            | Level | Message substring                                                                       | Context keys                                                          |
| ---------------------------------------------------- | ----- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Lock acquisition timed out (site 0)                  | ERROR | `Lock acquisition timed out`                                                            | `collection`, `operationId`, `timeout`, `reason`                      |
| Pre-flight budget exhausted (site 1)                 | ERROR | `Coordination budget exhausted before the operation callback`                           | `collection`, `opId`, `timeoutMs`                                     |
| Renewal failure, before re-acquisition               | ERROR | `Collection lock lease expired before finalisation could complete`                      | `collection`, `opId`, `leaseMs`                                       |
| Re-acquisition recovered                             | WARN  | `Collection lock re-acquired for finalisation after renewal failure`                    | `collection`, `opId`, `outcome: 'recovered'`                          |
| Finalisation failure on a violation path (swallowed) | ERROR | `Metadata finalisation failed on a violation path; the coordination timeout propagates` | `collection`, `opId`, `error`                                         |
| Finalisation skipped (divergence)                    | ERROR | `Metadata finalisation skipped; collection and master index may be divergent`           | `collection`, `opId`, `operation`                                     |
| Post-operation overrun, immediately before site 2    | ERROR | `Operation exceeded the coordination budget after effects were applied`                 | `collection`, `opId`, `timeoutMs`, `elapsedMs`, `finalisationOutcome` |

**Intended co-occurrence.** On violation paths the boundary record and the point-of-occurrence records fire together — two (or more) records per failed violation-path operation are deliberate. They answer different questions: the point-of-occurrence records explain _why_ the violation happened, the boundary record records _what_ the operation outcome was.

**Completion record.** The INFO record (`Operation <operationName> complete`, context `{ collection, opId }`) fires only on the success path; violation paths throw and never emit it.

**Pinned invariants.** Exactly one boundary ERROR per within-budget metadata-update failure, and exactly one INFO completion record per successful operation.

## Errors May Co-occur with Success

On the within-budget restored path — renewal failed, the single re-acquisition succeeded, and the operation finished within budget — the operation **returns successfully** even though an ERROR-level renewal-failure record (and a WARN recovery record) were emitted. Log-based alerting and tests must not assume that an ERROR record implies operation failure.

## Residual Risks (Accepted)

The following risks are known, accepted, and documented rather than guarded:

1. **Metadata clobber after expired-lease re-acquisition.** Re-acquiring an _expired_ lease does not prove that no intervening writer finalised newer collection metadata during the expiry window; the subsequent finalisation overwrites it (last-write-wins on collection metadata). The window is small, the divergence is logged loudly, and the current token semantics cannot support a cheap staleness check.
2. **Local state after skipped finalisation.** When finalisation is skipped, the acting instance keeps its in-memory state (dirty or saved); it is not invalidated. The divergence self-heals on the next successful coordinated finalisation on any instance, which rewrites the document count and modification token from that instance's live state.
3. **`hasConflict()` blind spot.** Write-path modification tokens are not regenerated, so the token comparison behind `hasConflict()` rarely detects this divergence class.

## Cross-references

- [MasterIndex](MasterIndex.md) — virtual locking methods, `renewCollectionLock()` semantics, and `save()` failure resynchronisation
- [Infrastructure Components](Infrastructure_Components.md) — `CoordinationTimeoutError` in the error catalogue and the execution-time tracking facility
- [DatabaseConfig](DatabaseConfig.md) — sizing `collectionLockLeaseMs` and `coordinationTimeoutMs`
- [Collection Components](Collection_Components.md) — the `Collection.save()` entry point that routes through `coordinate()`
