## JsonDbApp v0.3.0 — Coordination consistency and timing release

Release date: 2026-09-08

### Summary

This minor release hardens coordination consistency and adds an execution-time
logging facility, alongside a timestamp normalisation fix and internal cleanups.
It eliminates three related partial-write hazards in which error or timeout
signalling fired **after** side effects had already happened ([Issue #61](https://github.com/h-arnold/JsonDbApp/issues/61)),
adds DEBUG-gated `timeSync` timing events across all major components with a
benchmark harness, unifies `MasterIndex` timestamp coercion, and de-duplicates
the `FileService` batch paths. No persisted data-shape changes; no migration required.

### Highlights

- Coordination consistency: pre-flight budget check, unified post-callback
  violation policy, and `MasterIndex.save()` failure resynchronisation.
- Execution-time logging: `JDbLogger.timeSync` / `addTimingListener` facility
  instrumenting Collection, QueryEngine, DocumentOperations, MasterIndex,
  CollectionCoordinator and FileService, plus `npm run bench`.
- MasterIndex timestamp normalisation: `Date`, ISO string and epoch-millis
  inputs coerced consistently across all persistence paths.
- FileService refactor: `batchReadFiles` / `batchGetMetadata` de-duplicated
  behind `_batchWithFallback` with no behaviour change.
- Tooling: devDependencies bumped, opencode agent suite migrated, SonarCloud
  gate wired in (`eslint-plugin-sonarjs`, `sonar-project.properties`).

### Behaviour changes

#### Coordination consistency (Issue #61)

- **Pre-flight budget check** (`CollectionCoordinator`): if lock acquisition
  and conflict resolution have already consumed more than
  `coordinationTimeoutMs`, `CoordinationTimeoutError` is thrown before the
  operation callback runs — no side effects exist on that path.
- **Unified post-callback violation policy** (`CollectionCoordinator`): the
  budget verdict is computed once immediately after the callback; lease
  ownership is resolved with a non-throwing renewal plus at most one
  re-acquisition; metadata finalisation then runs (or is skipped loudly when
  the lease is unrecoverable) before any violation throw.
- **Best-effort finalisation before the over-budget throw**: a
  `MasterIndexError` during finalisation on an over-budget path is logged
  loudly and swallowed so it cannot mask the primary
  `CoordinationTimeoutError`. Within-budget finalisation failures continue to
  propagate as `MasterIndexError`.
- **`MasterIndex.save()` failure resynchronisation**: three outcomes — the
  stored snapshot is adopted as master state (staged advances discarded), no
  snapshot exists so the staged state is kept with a loud ERROR, or the raw
  read fails so the staged state is kept with a divergence warning. The
  original `MasterIndexError('save')` is always thrown. Shape normalisation is
  intentionally skipped on the resync path; a payload needing normalisation is
  re-normalised on the next lock-protected reload.
- **Lock release and finalisation swallows**: both deliberate swallows (lock
  release; best-effort finalisation on violation paths) log loudly. On
  violation paths a point-of-occurrence record fires **in addition to** the
  single boundary operation-failure record.

#### Execution-time logging facility

- New `JDbLogger.timeSync(label, fn, context?)` seam plus `addTimingListener`
  with idempotent unsubscribe; component loggers from
  `createComponentLogger()` gain their own `timeSync`.
- Timing events carry `{ label, component, durationMs, ... }` and are
  DEBUG-gated; success returns propagate unchanged, error paths contain
  secondary listener/supplier failures via `console.error` so the original
  error always wins.
- All four log levels accept lazy `Object|Function|null` contexts, resolved
  post-level-check at most once; hot-path `JSON.stringify(query)` debug sites
  converted to suppliers with byte-identical emitted shapes.
- Instrumented labels: `collection.find|findOne|countDocuments|insertOne|`
  `updateOne|updateMany|replaceOne|deleteOne|deleteMany`,
  `queryEngine.executeQuery|filterDocuments`, `docOps.executeQuery|`
  `applyToMatching`, `updateEngine.applyOperators`, `masterIndex.save`,
  `coordinator.coordinate|updateMasterIndexMetadata`,
  `fileService.readFile|createFile`. `Collection.aggregate` stays untimed.
- New benchmark harness: `npm run bench` (`tools/benchmarks/bench.cjs`,
  default 200 seeded docs, eight scenarios, count/min/max/mean table plus
  per-label error counts).

#### MasterIndex timestamp normalisation

- `save(dataOverride, timestamp)` now accepts a `Date`, ISO date string or
  epoch-millisecond number, each coerced to a defensive copy. Any other value
  (including null/undefined/invalid) falls back to the current time.
- `getCollections()` now throws `MasterIndexError` on unloaded state instead
  of returning an empty map; `removeCollection` uses optional chaining.

#### FileService refactor

- `batchReadFiles` and `batchGetMetadata` extracted behind private
  `_batchWithFallback(fileIds, logContext, operation)` owning the
  validate → loop → try/catch-collect → debug-summary flow. Public
  signatures, JSDoc and emitted log messages unchanged; per-file failures
  return `{ results, errors }` with `errors[].error` always a string.
- Stale `caching not implemented` header removed; dedicated FileService timing
  logger added so `fileService.*` events attribute correctly despite the
  injected Database logger.

### New `CoordinationTimeoutError` reason values

Every `CoordinationTimeoutError` from `CollectionCoordinator.coordinate()` now
carries a machine-readable `reason` in `error.context.reason`:

| Reason (`error.context.reason`) | Site | Trigger                                                      | Effects at throw                                                             |
| ------------------------------- | ---- | ------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `'lock-acquisition-timeout'`    | 0    | `LOCK_TIMEOUT` during lock acquisition                       | None; pre-callback                                                           |
| `'preflight-budget-exhausted'`  | 1    | Budget exhausted before the callback runs                    | None; callback never invoked                                                 |
| `'post-operation-overrun'`      | 2    | Callback completed over budget; ownership intact or restored | Applied; metadata finalised before the throw (or finalisation failed loudly) |
| `'lease-not-recoverable'`       | 3    | Renewal failed and the single re-acquisition failed or threw | Applied; metadata finalisation skipped — divergence logged                   |

**User-visible consequence:** `CoordinationTimeoutError` MAY now arrive
**after** an operation's effects were applied (sites 2–3), and at site 2 after
the master-index metadata was finalised. Handle the error based on
`error.context.reason` rather than assuming the operation had no effect.

### Logging changes

- New point-of-occurrence records on violation paths: pre-flight budget
  exhausted, lease expired before finalisation, lease re-acquired (WARN),
  finalisation failed on a violation path (swallowed), finalisation skipped
  with possible divergence, and post-operation overrun with the finalisation
  outcome.
- Completion INFO still fires only on success; the boundary operation-failure
  ERROR still fires exactly once per failed operation — but co-occurs with the
  point-of-occurrence records on violation paths.
- Caveat for alerting: a within-budget lease recovery emits a renewal-failure
  ERROR yet the operation returns successfully, so an ERROR record does not
  imply operation failure.
- New `ErrorHandler.safeErrorMessage(error)` helper guaranteeing a string for
  non-Error throwables at diagnostic sites.
- `JDbLogger.setLevelByName()` with an unknown name and
  `JDbLogger.formatMessage()` with a non-object context now throw typed
  `JDbLogger.JDbLoggerError` instead of silently ignoring / garbling output.

### PRs merged

- #65 — fix: consolidate MasterIndex timestamp normalisation (#58)
- #64 — refactor(FileService): extract `_batchWithFallback` (#57)
- #63 — fix: eliminate coordination/MasterIndex partial-write hazards (#61)
- #62 — Execution-time logging facility: implement/review hardening

### Full changelog

- 4457d64 — fix: consolidate MasterIndex timestamp normalisation (#58) (#65)
- 5624a76 — refactor(FileService): extract `_batchWithFallback` (#64)
- 1b89814 — fix: eliminate coordination/MasterIndex partial-write hazards (#63)
- dc7dfbf — Execution-time logging facility: implement/review hardening (#62)
- 24136c3 — chore: bump all devDependencies to latest versions
- 725731f — docs: add migrated opencode agent suite and align AGENTS.md
- e337b24 — chore: point flash-model agents to opencode/x-preview-f-free

### Upgrade notes

- No breaking changes and no persisted data-shape changes: master-index
  schema, collection metadata shape, and ScriptProperties keys are unchanged
  — no migration is required.
- If you catch `CoordinationTimeoutError` and assume the operation had no
  effect, inspect `error.context.reason` and the table above; at sites 2–3 the
  effects were applied.
- If you alert on ERROR log records, note that a renewal-failure ERROR can
  co-occur with a successful result, and that violation-path operations now
  produce two or more ERROR records.
- Timing instrumentation is DEBUG-gated and additive; enable DEBUG to receive
  events, register via `addTimingListener`, and restore listeners in
  `afterEach` in tests (see `captureTimingEvents()` helper).
- Full contracts: [CollectionCoordinator](../developers/CollectionCoordinator.md), [MasterIndex](../developers/MasterIndex.md), and the [error catalogue](../developers/Infrastructure_Components.md).
