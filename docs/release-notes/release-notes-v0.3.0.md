# JsonDbApp v0.3.0 — Coordination consistency release

Release date: 2026-08-31

### Summary

This release eliminates three related partial-write hazards in which error or timeout signalling fired **after** side effects had already happened, leaving coordination state (master-index metadata, or the in-memory master-index snapshot) divergent. The hazards and their resolutions ([Issue #61](https://github.com/h-arnold/JsonDbApp/issues/61)):

1. **Post-hoc coordination timeout** — a coordinated operation that overran `coordinationTimeoutMs` used to throw `CoordinationTimeoutError` after its effects were applied, and the throw skipped metadata finalisation, diverging the collection and the master index. The coordinator now runs a pre-flight budget check before the callback and, when an operation still overruns, finalises the collection metadata best-effort **before** throwing.
2. **Lease-renewal failure after a successful operation** — a failed lease renewal used to throw `CoordinationTimeoutError` after the operation succeeded, again skipping metadata finalisation. The coordinator now attempts exactly one re-acquisition of the lease for the same operation ID; if it recovers ownership the metadata is finalised and the timeout then throws, and if the lease is truly lost the finalisation is skipped with a loud divergence log before the timeout throws.
3. **`MasterIndex.save()` mutated memory before persist** — on a persistence failure the in-memory state used to stay advanced beyond the stored snapshot. `save()` now resynchronises in-memory state with the stored snapshot before re-throwing the original `MasterIndexError('save')`.

### Behaviour changes

- **Pre-flight budget check** (`CollectionCoordinator`): if lock acquisition and conflict resolution have already consumed more than `coordinationTimeoutMs`, `CoordinationTimeoutError` is thrown before the operation callback runs — no side effects exist on that path.
- **Unified post-callback violation policy** (`CollectionCoordinator`): the budget verdict is computed once immediately after the callback; lease ownership is resolved with a non-throwing renewal plus at most one re-acquisition; metadata finalisation then runs (or is skipped loudly when the lease is unrecoverable) before any violation throw.
- **Best-effort finalisation before the over-budget throw**: a `MasterIndexError` during finalisation on an over-budget path is logged loudly and swallowed so it cannot mask the primary `CoordinationTimeoutError`. Within-budget finalisation failures continue to propagate as `MasterIndexError`.
- **`MasterIndex.save()` failure resynchronisation**: three outcomes — the stored snapshot is adopted as master state (staged advances discarded), no snapshot exists so the staged state is kept with a loud ERROR, or the raw read fails so the staged state is kept with a divergence warning. The original `MasterIndexError('save')` is always thrown. Shape normalisation is intentionally skipped on the resync path; a payload needing normalisation is re-normalised on the next lock-protected reload.
- **Lock release and finalisation swallows**: both deliberate swallows (lock release; best-effort finalisation on violation paths) log loudly. On violation paths a point-of-occurrence record fires **in addition to** the single boundary operation-failure record.

### New `CoordinationTimeoutError` reason values

Every `CoordinationTimeoutError` from `CollectionCoordinator.coordinate()` now carries a machine-readable `reason` in `error.context.reason`, so callers can distinguish the throw sites:

| Reason (`error.context.reason`) | Site | Trigger                                                      | Effects at throw                                                             |
| ------------------------------- | ---- | ------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `'lock-acquisition-timeout'`    | 0    | `LOCK_TIMEOUT` during lock acquisition                       | None; pre-callback                                                           |
| `'preflight-budget-exhausted'`  | 1    | Budget exhausted before the callback runs                    | None; callback never invoked                                                 |
| `'post-operation-overrun'`      | 2    | Callback completed over budget; ownership intact or restored | Applied; metadata finalised before the throw (or finalisation failed loudly) |
| `'lease-not-recoverable'`       | 3    | Renewal failed and the single re-acquisition failed or threw | Applied; metadata finalisation skipped — divergence logged                   |

**User-visible consequence:** `CoordinationTimeoutError` MAY now arrive **after** an operation's effects were applied (sites 2–3), and at site 2 after the master-index metadata was finalised. Handle the error based on `error.context.reason` rather than assuming the operation had no effect.

### Logging changes

- New point-of-occurrence records on violation paths: pre-flight budget exhausted, lease expired before finalisation, lease re-acquired (WARN), finalisation failed on a violation path (swallowed), finalisation skipped with possible divergence, and post-operation overrun with the finalisation outcome.
- Completion INFO still fires only on success; the boundary operation-failure ERROR still fires exactly once per failed operation — but co-occurs with the point-of-occurrence records on violation paths.
- Caveat for alerting: a within-budget lease recovery emits a renewal-failure ERROR yet the operation returns successfully, so an ERROR record does not imply operation failure.

### Commits

- abd66e8 — MasterIndex raw reader + save-failure resynchronisation
- 5cbf62d — CollectionCoordinator pre-flight budget check + lock-acquisition reason
- 3677bfb — CollectionCoordinator unified post-callback violation algorithm
- 9021c07 — Regression hardening verification

### Upgrade notes

- No breaking changes and no persisted data-shape changes: master-index schema, collection metadata shape, and ScriptProperties keys are unchanged — no migration is required.
- If you catch `CoordinationTimeoutError` and assume the operation had no effect, inspect `error.context.reason` and the documentation above; at sites 2–3 the effects were applied.
- If you alert on ERROR log records, note that a renewal-failure ERROR can co-occur with a successful result, and that violation-path operations now produce two or more ERROR records.
- Full contracts: [CollectionCoordinator](../developers/CollectionCoordinator.md), [MasterIndex](../developers/MasterIndex.md), and the [error catalogue](../developers/Infrastructure_Components.md).
