# SPEC — Execution-Time Logging Facility

## 1. Purpose and problem

`PERFORMANCE_FINDINGS.md` identifies six optimisation opportunities across the query, bulk-write,
update-operator, file-cache, coordination, and logging paths. There is currently no way to measure
whether fixing them helps: `JDbLogger` has no timing facility, there is no benchmark harness, and
the logger's own test suite is three smoke tests.

This change adds an execution-time logging facility to `JDbLogger`, applies it at the public CRUD
boundary and at each inner hot path named in the findings, makes timings deterministically
assertable in Vitest, and provides a manually-run benchmark script so before/after numbers can be
compared when the findings are implemented.

## 2. Confirmed decisions

1. **API shape**: a scoped wrapper `timeSync(label, fn, context?)` plus structured timing
   listeners. No `console.time`-style start/end pairs.
2. **Instrumentation layers**: both layers — public `Collection` CRUD operations _and_ the inner
   hot paths named in `PERFORMANCE_FINDINGS.md`.
3. **Confirmation strategy**: deterministic unit tests using the existing
   `createMockClock()` helper (`tests/helpers/mock-time-helpers.js`) plus a minimal benchmark
   script exposed as `npm run bench`. The bench script is manual tooling, not a CI gate.
4. **Finding #6 folded in**: the logger accepts lazy context suppliers (functions), and the two
   eager `JSON.stringify(query)` call sites are converted to suppliers.
5. **CollectionCoordinator adopts the facility**: timing records are emitted around coordinated
   work. Its four raw `Date.now()` reads are control flow (timeout enforcement, lease renewal,
   retry/backoff bounds) and MUST NOT be migrated to the logging facility.

## 3. Constraints

- GAS V8 runtime: synchronous execution only; no `performance.now` reliance — measurement reads
  `Date.now()` inline, with each read individually contained and a documented degraded mode
  (§4.1).
- `JDbLogger` remains dependency-free: validation failures raise the local typed
  `JDbLoggerError extends Error` declared inside `JDbLogger.js` (no `ErrorHandler` import or
  reference anywhere in the logger).
- Fail fast and loud: invalid arguments throw immediately as `JDbLoggerError`; secondary
  instrumentation failures (clock reads, supplier resolution, record emission, listener dispatch)
  are contained on BOTH paths, reported via `console.error`, and can never displace `fn`'s result
  nor mask its original error, which alone reaches the caller (§4.1/§4.3/§4.4); no silent
  fallbacks or default swallowing.
- ESLint `max-lines` is a warning at 500 counted lines (`skipBlankLines`, `skipComments`). Every
  file touched by this spec is far enough below that warning for its small additive change (largest
  is `MasterIndex/99_MasterIndex.js` at ≈325 counted lines, gaining ~5): **no multi-file separation
  is planned for any touched file**.
- Timing emission is gated at DEBUG level. When gated off, no formatting, no stringification, and
  no listener dispatch occurs. The two `Date.now()` reads still occur (accepted measurement tax).
- Timer placement rule: timers wrap whole batches/scans, never individual documents inside loops.
  Event volume stays O(operations), not O(documents).

## 4. Contracts

### 4.1 Timing core

- Public entry point: static `JDbLogger.timeSync(label, fn, context = null)`. It delegates to a
  private static seam `_timeSync(component, label, fn, context)` with `component = null`;
  component loggers call the same seam with their name (§4.2). All behavioural rules live in the
  seam so both entry points behave identically.
- Validation before any timing starts: `label` must be a non-empty string; `fn` must be a function;
  `context` must be an object, a function, or `null` — with `undefined` FIRST normalised to `null`
  by the entry-point default parameters, so context-less calls never throw. Violations raise the
  local typed `JDbLoggerError`, exposed as `JDbLogger.JDbLoggerError` so consumers can catch it
  while the logger stays dependency-free (§3).
- Stacked-timer short-circuit: while a measurement is active, a nested `timeSync` call validates
  its arguments then executes `fn` directly — no clock reads, no record, no event. Inner labels
  therefore emit nothing beneath an outer measurement, and each user-visible operation emits
  exactly its single outermost boundary label (one boundary event per operation).
- Records `start`, invokes `fn()`, records `end`, computes `durationMs = end - start`. There is NO
  clock substitution seam: `Date.now()` is read inline, and each read is contained individually.
  When a read fails it inherits its successful counterpart (or zero when both fail), keeping
  `durationMs` numeric instead of NaN or aborted; the failure is reported via `console.error`
  without disturbing `fn`'s outcome. Tests control time by spying on `Date.now` via the existing
  mock-clock helper.
- On success: emits a DEBUG record and dispatches timing events ONLY when the DEBUG gate passes
  (§3), then returns `fn`'s return value unchanged.
- On throw: computes `durationMs`, emits the DEBUG record/event carrying the thrown message, then
  rethrows the ORIGINAL error unchanged. The same DEBUG gate applies.
- Secondary-failure containment on BOTH paths: supplier resolution, record emission, event
  construction and listener dispatch are guarded identically whether `fn` succeeded or threw. Each
  secondary failure is reported through `console.error('Operation failed: ...')` and can never
  displace `fn`'s result nor mask its original error, which alone reaches the caller with its
  identity intact (§4.3 for listener specifics).
- Console output goes through the standard debug pathway (`console.log`) via `formatMessage` at
  level `DEBUG`, message `[TIMING] <label>` prefixed `[<Component>] ` when a component is supplied,
  and context `{ ...resolvedContext, durationMs }` — `durationMs` wins key collisions.
  `formatMessage` keeps generating its own wall-clock timestamp; only `event.timestamp` (§4.3)
  derives from the measured end value.
- Context may be an object or a lazy supplier function (§4.4). Suppliers are invoked at most once,
  only after the DEBUG gate passes, with resolution following the containment rule above on both
  paths: a failing supplier is reported and resolves to null rather than displacing the outcome.
- Clock reads are part of the contained instrumentation: a broken clock cannot abort a measured
  operation before, during or after `fn` runs.

### 4.2 Component logger extension

`createComponentLogger(component)` objects gain `timeSync(label, fn, context?)`, implemented as a
closure over the component name calling the `_timeSync` seam directly. Existing four methods are
unchanged except for pass-through lazy-context support (§4.4): they forward suppliers uninvoked.

Component attribution: instrumented classes time through their own per-instance component logger,
with two explicitly decided cases:

- `FileService` receives its logger by injection today (`Database` passes its own), so timing via
  the injected instance would mislabel events as `Database`. `FileService` therefore creates a
  dedicated `createComponentLogger('FileService')` used ONLY for `timeSync`; the injected logger
  keeps responsibility for existing debug/warn/error output.
- `QueryEngineMatcher` already holds the engine logger via `getLogger()` — no new wiring needed.

### 4.3 Timing listeners

- No shared listener abstraction exists before or after this change; timing listeners are
  standalone callbacks registered via `JDbLogger.addTimingListener(listenerFn)`. The method returns
  an unsubscribe closure; calling it twice is safe (idempotent).
- Event shape (plain object): `{ component: string|null, label: string, durationMs: number,
timestamp: string, error: string|null }` where `component` is the PascalCase component name,
  `timestamp` derives from the measured end reading, and `error` is the thrown error's
  message or `null`. The resolved context is INTENTIONALLY excluded from listener events — it
  appears only on the console record (§4.1).
- Listener registration order is preserved; listeners receive events synchronously.
- Listener exception handling follows §4.1's containment contract on BOTH paths: dispatch iterates
  a snapshot of the listener store in registration order, so a listener unsubscribing mid-dispatch
  cannot skip those registered after it. A throwing listener is reported via `console.error` and
  every remaining listener still fires — on either path a secondary failure can never displace
  fn's result nor mask its original error.
- Dispatch is gated identically to console emission (DEBUG gate).

### 4.4 Lazy log context (finding #6)

- All four levels (`error`, `warn`, `info`, `debug`) and `timeSync` accept `context`
  as either an object or a **function returning the context value**.
- The supplier is invoked ONLY after the level check passes. If the check fails, the supplier is
  never called (verifiable by spy).
- Suppliers should be side-effect-free and cheap. Resolution semantics differ by surface: plain
  level methods resolve unguarded, so a throwing supplier propagates unchanged (fail loud — these
  logs protect no measured outcome); `timeSync` resolves through the guarded seam path, where a
  failing supplier is reported via `console.error` and resolution continues with `null` on BOTH the
  success and error paths of the measured operation (§4.1) — a secondary failure can never displace
  fn's result nor mask its original error.
- `formatMessage` itself accepts `Object | null` contexts ONLY: a function reaching it fails
  validation loudly with `JDbLoggerError` instead of garbling output. Lazy suppliers therefore
  remain supported at the level methods and at `timeSync`, whose callers resolve them beforehand,
  so an unresolved function never reaches stringification.
- Static level methods (`error`, `warn`, `info`, `debug`) resolve suppliers AFTER the level check
  and BEFORE `formatMessage`.
- Suppliers pass through `createComponentLogger` wrappers uninvoked.

### 4.5 Call-site fixes for finding #6

- `QueryEngine.executeQuery` debug context becomes a supplier (no eager `JSON.stringify(query)`).
- `DocumentOperations._executeQuery` debug context becomes a supplier (same rule).
- The suppliers PRESERVE the existing emitted context shapes exactly (`{ documentCount, query }`
  with `query` stringified, and `{ queryString, resultCount }` respectively), so debug output is
  byte-identical whenever the gate is open — only evaluation timing changes.

### 4.6 Benchmark harness

- New file `tools/benchmarks/bench.cjs` (extension `.cjs` REQUIRED: the repo's `package.json` sets
  `"type": "module"`, so a plain `.js` would run as ESM); new `package.json` script `"bench"`
  running it with Node.
- Self-contained CommonJS script: loads `tools/gas-mocks` and initialises src scripts via
  `vm.runInThisContext`. The ordered src manifest is extracted from
  `tests/setup/gas-mocks.setup.js` into a shared module (e.g. `tools/gas-mocks/script-order.cjs`)
  consumed by BOTH the vitest setup and the bench, so the two load orders cannot drift. This
  refactor of the setup file is behaviour-neutral.
- Construction path: additionally loads `src/04_core/99_PublicAPI.js` (not part of the test-setup
  list today) and builds the database via the public factory
  `createAndInitialiseDatabase(config)` from `99_PublicAPI.js`. `rootFolderId` is a folder ID
  consumed through `DriveApp.getFolderById(...)`, never a filesystem path. The bench therefore
  derives it from the mock itself (e.g. `DriveApp.getRootFolder().getId()`), which guarantees the
  folder resolves under the mock's `driveRoot`; the bench fails fast at startup if it does not.
- Creates a temporary drive root under the OS temp directory and instantiates the mocks against it
  explicitly — `createGasMocks({ driveRoot: <osTempDir> })` — rather than relying on the default
  `tests/.gas-drive`; `rootFolderId` is then derived from that same mock instance. It builds a
  `Database`, creates one
  collection, seeds it with a deterministic built-in generator (default 200 documents; overridable
  via `BENCH_DOCS`).
- Scenarios (each timed through the facility itself, aggregated by label):
  full `find`, filtered `findOne`, `countDocuments`, `updateMany` over a small matched batch,
  `deleteMany` over a small matched batch, single-document operator update, repeated cached
  `readFile`, and one coordinated write through `coordinate`.
- Iteration validity: mutating scenarios (`updateMany`, `deleteMany`, the operator update, the
  coordinated write) MUST re-establish their preconditions before EVERY measured iteration
  (re-seed the matched set, or rebuild a fresh collection); otherwise iterations 2+ would measure
  empty/no-op work. Read-only scenarios (`find`, `findOne`, `countDocuments`, cached `readFile`)
  may share seeded state across iterations.
- One warm-up pass per scenario, then `BENCH_ITERATIONS` measured iterations (default 5). Reports
  per-label count/min/max/mean in milliseconds as an aligned text table. Setup failures fail fast;
  measurement variance never affects exit code (0 on completed runs).

## 5. State rules

- Static mutable state on `JDbLogger` remains: `LOG_LEVELS`, `currentLevel`, a private listener
  `Set`, and the private `_measurementDepth` counter driving the stacked-timer short-circuit.
  No other module writes these directly except through the public static methods.
- Listeners registered during a test persist until unsubscribed; test helpers own their cleanup via
  the returned closure. Vitest `clearMocks` does not clear listener state — suites must unsubscribe
  explicitly.
- Level changes mid-operation take effect for subsequent emissions only; no snapshotting.

## 6. Instrumentation inventory

Labels are lowercase dotted tags of the form `<tag>.<operation>`, deliberately independent of the
PascalCase `component` field carried by events (`collection.find` events carry
`component: 'Collection'`). Emission happens through each class's own component logger (see §4.2
for the `FileService` and matcher cases).

| Label                                   | Site                                              | Finding  |
| --------------------------------------- | ------------------------------------------------- | -------- |
| `collection.find`                       | `Collection.find` (`99_Collection.js`)            | #1       |
| `collection.findOne`                    | `Collection.findOne`                              | #1       |
| `collection.countDocuments`             | `Collection.countDocuments`                       | #1       |
| `collection.insertOne`                  | `Collection.insertOne`                            | baseline |
| `collection.updateOne`                  | `Collection.updateOne`                            | #1/#3    |
| `collection.updateMany`                 | `Collection.updateMany`                           | #2       |
| `collection.replaceOne`                 | `Collection.replaceOne`                           | #1       |
| `collection.deleteOne`                  | `Collection.deleteOne`                            | #1       |
| `collection.deleteMany`                 | `Collection.deleteMany`                           | #2       |
| `queryEngine.executeQuery`              | `QueryEngine.executeQuery`                        | #1       |
| `queryEngine.filterDocuments`           | `QueryEngineMatcher.filterDocuments`              | #1       |
| `docOps.executeQuery`                   | `DocumentOperations._executeQuery`                | #1, #6   |
| `docOps.updateWithOperators`            | `DocumentOperations.updateDocumentWithOperators`  | #2, #3   |
| `docOps.applyToMatching`                | `DocumentOperations._applyToMatchingDocuments`    | #2       |
| `updateEngine.applyOperators`           | `UpdateEngine.applyOperators`                     | #3       |
| `fileService.readFile`                  | `FileService.readFile`                            | #4       |
| `fileService.createFile`                | `FileService.createFile`                          | #4       |
| `coordinator.coordinate`                | `CollectionCoordinator.coordinate`                | #5       |
| `coordinator.updateMasterIndexMetadata` | `CollectionCoordinator.updateMasterIndexMetadata` | #5       |
| `masterIndex.save`                      | `MasterIndex.save`                                | #5       |

Note: no public `insertMany` exists on the Collection surface today, so there is nothing to
instrument for batch inserts; if one is added later it should be instrumented identically.

Note on stacking: because of the stacked-timer short-circuit (§4.1), a direct bulk call through
`_applyToMatchingDocuments` emits exactly ONE `docOps.applyToMatching` boundary event regardless of
matched-document count — the inner `docOps.executeQuery`, `docOps.updateWithOperators` and
`updateEngine.applyOperators` timers stay silent beneath it — and under Collection-level wrappers
such as `updateMany` the outermost `collection.updateMany` measurement suppresses that inner
boundary too, preserving the O(operations) event-volume contract.

Deliberately NOT instrumented (non-goals, §8): `Collection.aggregate`, per-document helpers
(`deleteDocument`, `findAllDocuments`), any `Date.now()` read inside `CollectionCoordinator`
control flow, `DbLockService`, and `Database` lifecycle methods.

## 7. Testing strategy

- **Unit (facility)** — expand `tests/unit/utils/JDbLogger.test.js`:
  - `timeSync` returns the wrapped function's result unchanged.
  - Emits DEBUG record and listener event on success; exact `durationMs` asserted under the mock
    clock (e.g. advance 42 → `durationMs === 42`).
  - Suppressed when `currentLevel < DEBUG`: no console output AND no listener dispatch; supplier
    contexts never invoked.
  - Error path: original error rethrown; event carries `error` message and real duration.
  - Invalid `label`/`fn` throw before timing; nothing recorded.
  - Listener lifecycle: registration order, idempotent unsubscribe.
  - Component logger form tags `component` correctly.
  - Lazy context: supplier called exactly once when emitted, never when suppressed; applies to all
    four levels and both static/component forms.
- **Unit (call sites)**: with DEBUG disabled, `QueryEngine`/`DocumentOperations` no longer evaluate
  eager stringification (asserted via a logger-instance spy receiving a function).
- **Unit (instrumentation)**: driving representative operations against the GAS mocks yields the
  expected labels from §6 at both layers (boundary and inner). For one coordinated write, BOTH
  `coordinator.coordinate` and `masterIndex.save` events must be captured — events are flat, there
  is no parent-child nesting; the test asserts presence of both labels. Assertions target
  captured event fields — `label`, `durationMs`, `error`, and the PascalCase `component` where
  relevant. Formatted console lines are not asserted because their timestamps remain wall-clock
  based; only `event.timestamp` is deterministic under the mock clock.
- **Bench**: smoke-tested manually; not part of `npm test`.

## 8. Scope boundaries and non-goals

- No optimisation itself is implemented here — this change only adds measurement. Findings #1–#5
  remain future work.
- No migration of `CollectionCoordinator`'s control-flow clock reads.
- No console mocking infrastructure; assertions use listeners, not console spies.
- No persistence/format changes: no document shapes, metadata schemas, or master-index schema
  change; no data-shape documentation entries arise from this work. The EXTERNAL public GAS library
  surface (as consumed by caller scripts) keeps its signatures; all logger additions (`timeSync`,
  `_timeSync`, `addTimingListener`, lazy-context acceptance, component-logger `timeSync`) are
  additive internal API.
- No CI wiring for the bench script; no release-notes obligation (developer-facing tooling).
- `JDbLogger` stays a single file (~65 counted lines today; projected well under 500).

## 9. Documentation obligations

- `docs/developers/Infrastructure_Components.md`: document `timeSync`, listeners, lazy context —
  including supplier resolution order (post-level-check, pre-`formatMessage`) and the
  `Object|Function|null` context types on all four levels and on `timeSync`.
- `docs/developers/Testing_Framework.md`: document timing assertions with `createMockClock` and
  `npm run bench` usage.

## 10. Assumptions

1. Default log level (DEBUG) means timing records appear in normal test runs without configuration.
2. Bench defaults (5 iterations, 200 docs, env overrides) are adequate; values are tunable without
   further sign-off.

## 11. Open questions

None blocking. All material ambiguities were resolved with the requester.
