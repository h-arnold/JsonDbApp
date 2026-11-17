## JsonDbApp v0.3.1 — Lock acquisition window and coordination-budget separation

Release date: 2026-11-17

### Summary

This patch release makes lock acquisition deadline-based and separates the
acquisition wait from the coordination budget ([Issue #67](https://github.com/h-arnold/JsonDbApp/issues/67)).
A writer now waits against the configured lease instead of giving up after a
fixed attempt count, a successful write is no longer reported as a timeout
after its effects were applied, and failed-acquisition logs carry the lock
holder and expiry. No data-shape or migration change is required.

### Highlights

- **Deadline-based acquisition:** `acquireOperationLock()` waits until method
  entry + `collectionLockLeaseMs`, with a 500 ms backoff floor
  (`LOCK_ACQUISITION_MIN_BACKOFF_MS`) and a 5000 ms cap
  (`LOCK_ACQUISITION_MAX_BACKOFF_MS`), a final sleep truncated to the remaining
  window, and one final acquisition attempt before `LockAcquisitionFailureError`.
  `retryAttempts` remains validated but is legacy for acquisition.
- **Coordination clock starts after acquisition:** `coordinate()` captures its
  single `startTime` immediately after the lock is acquired, so acquisition
  wait no longer consumes `coordinationTimeoutMs`. Conflict resolution and the
  callback still count toward the budget.
- **Richer contention warning:** the MasterIndex per-attempt WARN now includes
  the lock holder and expiry.

### Behaviour changes

#### Lock acquisition window

- The acquisition bound is a deadline (`collectionLockLeaseMs` from method
  entry), not `retryAttempts`. Each failed attempt backs off by `retryDelayMs`
  grown by `lockRetryBackoffBase`, floored at 500 ms and capped at 5000 ms.
- The last sleep is truncated to the time left in the window, followed by
  exactly one final acquisition attempt. A lock released anywhere in the
  window is therefore observed before `LockAcquisitionFailureError` is raised.
- An expired (stale) lock is overwritten on the first attempt with no wait.
- `retryAttempts` is still a validated config value with its default of `3`,
  and is retained for compatibility, but it no longer bounds acquisition.
  `collectionLockLeaseMs` is now the acquisition wait window.

#### Coordination clock origin

- `startTime` is captured immediately after successful lock acquisition rather
  than at the top of `coordinate()`. The pre-flight check (site 1) and the
  post-callback over-budget verdict (site 2) still share this one measurement.
- Acquisition wait is the sole exclusion; conflict resolution and the callback
  still consume `coordinationTimeoutMs`.
- A thrown `LOCK_TIMEOUT` still maps to site 0 (`lock-acquisition-timeout`).
  Exhaustion of the acquisition window raises `LockAcquisitionFailureError`
  instead. Sites 0–3 reason strings and the existing coordination-violation
  contract are unchanged.

### Logging changes

- The MasterIndex per-attempt WARN `Failed to acquire lock; collection is already locked.`
  now carries `lockedBy`, `lockedAt`, `lockTimeout`, `expiry`
  (`lockedAt + lockTimeout`) and `remainingMs` (`expiry - now`) alongside
  `collectionName` and `operationId`. It fires once per failed attempt, so a
  held lock can produce several of these records in one acquisition window.
- The coordinator's separate end-of-window WARN `Could not acquire lock after retries`
  (context `{ collection, operationId }`) is unchanged.

### Upgrade notes

- No breaking changes and no persisted data-shape changes: documents,
  collection metadata, the master-index schema and config serialisation are
  unchanged — no migration is required.
- If you set `retryAttempts` low expecting acquisition to stop early, that no
  longer applies. Size `collectionLockLeaseMs` to bound how long a writer waits
  for a lock, and keep it at least as long as `coordinationTimeoutMs`.
- Code that catches `CoordinationTimeoutError` keeps working. The distinction
  is that a slow acquisition now yields `LockAcquisitionFailureError` rather
  than consuming the coordination budget and surfacing as site 1.

### Full contract links

- [CollectionCoordinator](../developers/CollectionCoordinator.md) — acquisition window, coordination clock and throw sites
- [DatabaseConfig](../developers/DatabaseConfig.md) — `retryAttempts` compatibility and timing defaults
- [Infrastructure Components](../developers/Infrastructure_Components.md) — error catalogue and coordination timeout errors

### Getting the new script

No new Apps Script deployment link is published for this release.
