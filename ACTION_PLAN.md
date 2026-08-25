# ACTION PLAN — Execution-Time Logging Facility

Delivery plan for the facility specified in `@SPEC.md` (execution-time logging in `JDbLogger`,
two-layer hot-path instrumentation, deterministic test assertions, benchmark harness). Work is
sequenced so enabling contracts land before dependent orchestration. Every section follows
Red-Green-Refactor and must leave the tree at `npm run lint` (0 errors, 0 warnings) and a green
full suite before hand-off to the next.

## Progress log

- Baseline: `npm run lint` 0 errors / 0 warnings; `npm run test` green (69 files, 741 tests).
- Section 1 — COMPLETE. Red review CLEAN; green review CLEAN; regression gate passed
  (`npm run lint` 0/0; `npm run test` 70 files / 745 tests). Manifest shipped as
  `tools/gas-mocks/script-order.cjs`; setup file consumes it via ESM named import (named form
  worked; default fallback not needed).
- Section 2 — COMPLETE. Red review CLEAN after fix round (removed one speculative test; added
  `/* global JDbLogger */` to helper). Green review CLEAN after fix round (suppressed path now
  performs both `_now()` reads per SPEC §3; JSDoc return-shape aligned). Regression gate passed
  (`npm run lint` 0/0; `npm run test` 70 files / 760 tests). Delivered: `timeSync`, `_timeSync`
  seam, `addTimingListener` (+idempotent unsubscribe), `_now()`, DEBUG gating with measurement
  tax preserved when suppressed, success/error exception asymmetry.
- Section 3 — COMPLETE. Red review CLEAN first pass; green review CLEAN first pass (seam
  delegation verified direct; console prefix contract confirmed by code read). Regression gate
  passed (`npm run lint` 0/0; `npm run test` 70 files / 763 tests). Delivered: component-logger
  `timeSync` closing over the component name, calling `_timeSync` directly.
- Section 4 — COMPLETE. Red review CLEAN first pass. Green review CLEAN after fix rounds: one
  unsatisfiable red-phase test corrected under orchestrator authorisation (component-wrapper
  ERROR-suppression case now uses the suite's sentinel `LOG_LEVELS.ERROR - 1`, mirroring the
  static-side pattern) and two JSDoc accuracy nitpicks applied (`_resolveLevelContext` return
  type; `formatMessage` context type). Regression gate passed (`npm run lint` 0/0;
  `npm run test` 70 files / 782 tests). Delivered: lazy supplier contexts on all four static
  levels (post-level-check, pre-formatMessage, at-most-once, never when gated); QueryEngine
  'Executing query' and DocumentOperations `_executeQuery` debug sites converted to suppliers
  with byte-identical emitted shapes.
- Section 5 — COMPLETE. Red review CLEAN after fix round (aggregate negative-space assertion
  narrowed to the exact `collection.aggregate` label; orphaned prefix-selector removed). One
  reviewer Critical claiming a repo-wide `JDbLogger is not defined` harness defect was DISCARDED
  as factually wrong — it stemmed from running vitest without the canonical
  `--config tests/vitest.config.js`; orchestrator re-ran both the targeted suite (10 failed /
  3 passed, correct red attribution) and full suite to refute it. Green review CLEAN first pass.
  Regression gate passed (`npm run lint` 0/0; `npm run test` 71 files / 795 tests). Delivered:
  nine `collection.*` boundary wraps in `99_Collection.js`, aggregate untouched.
- Section 6 — COMPLETE. Red review CLEAN first pass. Green review CLEAN first pass (coordinator
  clock-read safety verified against git diff: pure re-indentation, statement order unchanged,
  other three reads in unwrapped methods; FileService dedicated `_timingLogger` confined to the
  two timeSync calls; matcher via engine `getLogger()`; `masterIndex.save` single persist point).
  Regression gate passed (`npm run lint` 0/0; `npm run test` 72 files / 800 tests). Delivered:
  all ten SPEC §6 inner labels observable end-to-end.
- Section 7 — COMPLETE. Red gate verified (script absent → exit 1). Green review CLEAN first
  pass (reviewer proved the dedicated `.cjs` lint block is genuinely active via a deliberate-
  violation probe). Regression gate passed (`npm run lint` 0/0; `npm run test` 72 files / 800
  tests; mandatory `npx eslint tools/benchmarks/bench.cjs` probe 0/0; default + env-override
  smoke runs exit 0 printing all eight scenario tables). Delivered: `tools/benchmarks/bench.cjs`,
  `"bench"` npm script, dedicated eslint `.cjs` block (shared rule const, Node globals,
  `tools/gas-mocks/**` ignored), shared lint scope untouched.
- De-sloppification pass — COMPLETE. Sweep verdict: no blocking slop. Seven mechanical fixes
  applied and review CLEAN: shared timing assertion helpers hoisted into
  `tests/helpers/timing-capture-test-helpers.js`; duplicated capture plumbing in JDbLogger.test.js
  unified at module scope; red-phase guard scaffolding removed; change-narrative JSDoc made
  timeless; duplicate SPEC §4.3 heading removed; doubled assert comment removed; 'standardized'
  → 'standardised'. Regression gate passed (lint 0/0; 72 files / 800 tests). Recorded follow-ups
  OUTSIDE this plan's scope (pre-existing): FileService header cache note stale;
  DocumentOperations header 'Section 6' note stale; CollectionCoordinator dead `_logger`
  injection parameter; QueryEngine.test.js empty afterAll teardown; eslint.config self-referential
  files block vs global ignore.
- Section 8 — COMPLETE. Full regression gate green from a clean tree before and after the docs
  pass (lint 0/0; 72 files / 800 tests). Docs agent flipped both planned entries to implemented
  (Infrastructure_Components.md §1.2.0.5 execution-time tracking; Testing_Framework.md timing
  assertions and benchmarks incl. `captureTimingEvents()` pattern, clearMocks caveat, mock-clock
  recipe, and the bench harness subsection with BENCH_DOCS/BENCH_ITERATIONS overrides) plus
  one-line pointers on QueryEngine.md, Collection_Components.md, MasterIndex.md; release notes
  correctly deferred per SPEC §8; zero stale `bench.js` references found. Final Code Reviewer
  pass over the cumulative branch diff: PASS, no findings — console format contracts verified by
  code reading ([TIMING] shape, [<Component>] [TIMING] prefix, merged {...resolvedContext,
  durationMs}, success and error paths), no suite asserts console content, all 19 SPEC §6 sites
  present, coordinator control-flow Date.now reads untouched, docs claims match implementation.
  Report at .opencode/scratchpad/code-review-section8-final.md.
- Post-plan cleanup — COMPLETE (user-directed). The six follow-up items recorded during the plan
  are resolved: FileService stale 'caching not implemented' header note removed (caching IS
  implemented); DocumentOperations planning-narrative header lines ('Section 5'/'Section 6')
  removed; CollectionCoordinator dead `_logger` constructor parameter deleted together with its
  `this._logger` pass-through argument in 99_Collection.js; QueryEngine.test.js empty afterAll
  teardown and no-op placeholder function removed; eslint.config.js unreachable self-referential
  ESM block deleted (global ignore already excludes the file); getLogger() `@returns` corrected
  from {JDbLogger} to {Object} in both engine facades. Code review CLEAN with no findings;
  regression gate passed (lint 0/0; 72 files / 800 tests).

## Global constraints

- **TDD**: no production change without a failing test written first.
- **British English** throughout code, comments, docs, and output strings.
- **GAS V8**: synchronous only; `JDbLogger` stays dependency-free (plain `Error`s).
- **Fail fast and loud** per `SPEC.md` §3, including the success/error-path exception asymmetry.
- **Console-assertion policy** (`SPEC.md` §7/§8): unit assertions use TIMING LISTENER EVENTS ONLY —
  never console spies and never console-line content (formatted lines carry wall-clock timestamps;
  `formatMessage` also prepends `[timestamp] [DEBUG]`, so positional/prefix claims are unfalsifiable
  as written). Where the emission pathway itself must be proven, a console spy may assert INVOCATION
  PRESENCE/COUNT only. Message/context formatting compliance is verified by the final Code
  Reviewer pass (Section 8), not by unit tests.
- **Listener-cleanup discipline** (`SPEC.md` §5): Vitest `clearMocks` does NOT clear `JDbLogger`'s
  static listener list. Section 2 therefore introduces `tests/helpers/timing-capture-test-helpers.js`
  exposing `captureTimingEvents()` → `{ events, restore }` (registers one listener; `restore`
  unsubscribes idempotently). EVERY timing test across Sections 2–6 obtains listeners exclusively
  through this helper and calls `restore()` in `afterEach`; raw `addTimingListener` calls in tests
  are forbidden.
- **Data shapes: NONE changed anywhere in this plan** — no document shapes, metadata schemas,
  master-index schema, or persisted formats are touched; no `docs/developers/data-shapes/`
  entries arise from any section.
- **File separation by LOC** — current counted lines (blanks/comments skipped) and projected
  totals after this plan:

| File                                                     | Counted now | Projected | Separation |
| -------------------------------------------------------- | ----------- | --------- | ---------- |
| `src/01_utils/JDbLogger.js`                              | ~65         | ~135      | none       |
| `src/04_core/Collection/99_Collection.js`                | 171         | ~185      | none       |
| `src/02_components/QueryEngine/99_QueryEngine.js`        | 178         | ~182      | none       |
| `src/02_components/QueryEngine/02_QueryEngineMatcher.js` | 91          | ~94       | none       |
| `src/02_components/DocumentOperations.js`                | 245         | ~253      | none       |
| `src/02_components/UpdateEngine/99_UpdateEngine.js`      | 67          | ~70       | none       |
| `src/03_services/FileService.js`                         | 179         | ~186      | none       |
| `src/02_components/CollectionCoordinator.js`             | 217         | ~224      | none       |
| `src/04_core/MasterIndex/99_MasterIndex.js`              | ~325        | ~332      | none       |

All stay far below the 500 counted-line `max-lines` warning; no numbered multi-file split is
required anywhere in this plan.

---

## Section 1 — Shared script-order manifest extraction

**Objective.** Extract the ordered src-script list from `tests/setup/gas-mocks.setup.js` into
`tools/gas-mocks/script-order.cjs` as the single source of truth consumed by both the vitest setup
and the later bench (`SPEC.md` §4.6). Retires the ESM→CJS interop risk early.

**Constraints.**

- Behaviour-neutral refactor: the setup file must load exactly the same scripts in exactly the
  same order.
- `src/04_core/99_PublicAPI.js` stays OUT of the manifest (bench-only addition, Section 7).
- Manifest shape: `module.exports = { legacyScripts: [...] }`; setup file imports via ESM named
  import. If named-import interop fails under Vitest, fall back to default import — record which
  form was used.

**Red-first tests.**

- New `tests/unit/infrastructure/script-order.test.js` (new kebab-case folder; picked up by the
  vitest include patterns; kept out of `tests/helpers/` so helper modules and suites stay
  distinguishable):
  - exports a non-empty ordered array of src-relative paths;
  - contains `src/01_utils/JDbLogger.js`;
  - does NOT contain `src/04_core/99_PublicAPI.js`;
  - equals the exact previous inline ordering captured from the setup file before refactoring.

**Acceptance criteria.**

- Full suite green after refactor with zero behavioural drift.
- Setup file contains no inline script list.

**Section checks.**

1. Red: new helper test fails (module absent).
2. Green: extract manifest, refactor setup import; suite passes.
3. Refactor pass; `npm run lint` 0/0; `npm run test` green.

**Utility reuse.** New shared module only; no duplication of the list anywhere else.
**Data shapes:** none.

---

## Section 2 — JDbLogger timing core

**Objective.** Implement `timeSync`, the `_timeSync(component, label, fn, context)` seam,
`addTimingListener`, `_now()`, validation, DEBUG gating, and success/error-path exception rules
(`SPEC.md` §4.1, §4.3) in `src/01_utils/JDbLogger.js`.

**Constraints.**

- Plain `Error` throws; no `ErrorHandler` reference (dependency-free rule).
- Console emission through the standard debug pathway (`console.log`), message `[TIMING] <label>`,
  context `{ ...resolvedContext, durationMs }`.
- Error path: original error ALWAYS wins; guarded listener dispatch reported via `console.error`.
- Success path: listener exceptions propagate unchanged.

**Red-first tests** (extend `tests/unit/utils/JDbLogger.test.js`, using `createMockClock()`;
deliver `tests/helpers/timing-capture-test-helpers.js` in this section and route ALL listener
registration through it):

1. `timeSync('x', fn)` returns `fn`'s result unchanged.
2. Listener receives `{ component: null, label: 'x', durationMs: 42, timestamp, error: null }`
   after `advanceTime(42)` between clock start and stop.
3. Gated emission invokes `console.log` exactly ONCE per record (presence/count spy only — content
   is never asserted); suppressed runs invoke it zero times.
4. With `currentLevel < DEBUG`: no listener dispatch AND no supplier invocation; `fn` still
   executes and its result is returned.
5. Error path: `fn` throws → original error rethrown (same identity); event carries
   `error.message` and real `durationMs`; a THROWING listener does not mask it (secondary failure
   surfaces as an increased `console.error` call count).
6. Success path: throwing listener propagates to caller.
7. Validation: empty label throws; non-function `fn` throws; numeric/string context throws;
   `undefined` context behaves as `null` (no throw).
8. Unsubscribe closure idempotent (double call safe); listeners fire in registration order.

**Acceptance criteria.**

- All SPEC §4.1/§4.3 behaviours observable and asserted; existing logger tests untouched-green.

**Section checks.**

1. Red: tests 1–8 fail against current file.
2. Green: implement seam + API minimally.
3. Refactor (single-file; JSDoc complete); targeted suite then full suite; lint 0/0.

**Utility reuse.** `tests/helpers/mock-time-helpers.js#createMockClock`. Canonical doc entry:
`docs/developers/Infrastructure_Components.md` §1.2.0.5 (Planned — Not implemented) becomes the
implementation target; status flip happens in Section 8.
**Data shapes:** none.

---

## Section 3 — Component-logger `timeSync` delegation

**Objective.** Extend `createComponentLogger` objects with `timeSync(label, fn, context?)` closing
over the component name and calling the `_timeSync` seam directly (`SPEC.md` §4.2).

**Constraints.**

- Event `component` = PascalCase name; label itself unprefixed in events.
- Console message prefixed `[<Component>] [TIMING] <label>` when a component is supplied.
- Existing four methods untouched except pass-through of function contexts (Section 4).

**Red-first tests** (`tests/unit/utils/JDbLogger.test.js`, via the capture helper):

1. `logger.timeSync('op', fn)` emits event with `component === 'TestComponent'`; label itself
   unprefixed in the event.
2. Static form still emits `component === null`.
3. Wrapper honours the DEBUG gate: suppressed runs dispatch nothing (parity with the static form).
   Console `[<Component>]` prefixing is a formatting contract verified by Code Reviewer (Section 8),
   not by unit assertion.

**Acceptance criteria.** Delegation indistinguishable from static use apart from attribution.

**Section checks.** Red → Green → Refactor; targeted + full suites; lint 0/0.

**Utility reuse.** None new. **Data shapes:** none.

---

## Section 4 — Lazy log context across levels + finding #6 call-site fixes

**Objective.** Accept `Object|Function|null` context on all four levels (static and component) and
`timeSync`; convert `QueryEngine.executeQuery` and `DocumentOperations._executeQuery` debug
contexts to suppliers preserving exact emitted shapes (`SPEC.md` §4.4, §4.5).

**Constraints.**

- Suppliers resolved post-level-check, pre-`formatMessage`; never invoked when gated off.
- Call-site suppliers preserve byte-identical output shapes:
  `{ documentCount, query }` (QueryEngine) and `{ queryString, resultCount }` (DocumentOperations).
- Only the eager-stringify debug sites are converted: QueryEngine's SECOND debug call
  (`'Query execution complete'`, `{ resultCount }` — no eager cost) is left untouched.

**Red-first tests:**

1. Each level accepts a function returning an object; invoked exactly once when gate open; zero
   invocations when suppressed (spy counter).
2. `vi.spyOn(JDbLogger, 'formatMessage')` receives the RESOLVED context object (never a function)
   when the gate is open — proves resolution order (post-level-check, pre-`formatMessage`) via a
   method seam, not a console spy.
3. Component wrappers forward functions uninvoked when suppressed.
4. Success path: throwing supplier propagates AFTER `fn` ran (return lost — documented behaviour);
   error path: throwing supplier cannot mask the operation error (guarded, `console.error`
   secondary report, original rethrown).
5. QueryEngine: with DEBUG off, instance logger's `debug` receives a FUNCTION (no eager
   `JSON.stringify(query)`); with DEBUG on, capture the resolved context via the
   `formatMessage` seam spy and assert its keys/shapes match §4.5 exactly
   (`{ documentCount, query }`).
6. DocumentOperations `_executeQuery`: same two assertions via the same seam vehicle with
   `{ queryString, resultCount }`.

**Acceptance criteria.** No eager stringification remains on either hot path; shapes preserved.

**Section checks.**

1. Red: tests 1–6 fail (levels reject functions / call sites stringify eagerly).
2. Green: implement lazy resolution + rewrite both call sites.
3. Refactor; targeted suites (utils, QueryEngine, document-operations), full suite, lint 0/0.

**Utility reuse.** Extends canonical JDbLogger contract (doc entry already planned). Reuses
existing QueryEngine/document-operations test helpers for instance construction.
**Data shapes:** none.

---

## Section 5 — Boundary instrumentation: Collection CRUD

**Objective.** Wrap the nine public Collection CRUD methods with `this._logger.timeSync(...)`
using labels `collection.find|findOne|countDocuments|insertOne|updateOne|updateMany|replaceOne|deleteOne|deleteMany`
(`SPEC.md` §6). Results and signatures unchanged.

**Constraints.**

- `aggregate` deliberately NOT wrapped (non-goal).
- No public `insertMany` exists — nothing to add.
- One-line wraps; keep `99_Collection.js` thin-delegate style intact.

**Red-first tests** (new `tests/unit/collection/collection-timing.test.js`, kebab-case):

1. Each of the nine operations emits its exact label; `component === 'Collection'`.
2. `durationMs >= 0` and event `error === null` on happy paths.
3. Return values identical with timing wrapped (spot-check `find`, `insertOne` round-trip).
4. `aggregate` emits NO timing event.

**Acceptance criteria.** Inventory labels present at boundary layer; no behavioural drift.

**Section checks.** Red → Green → Refactor; targeted collection suites + full suite; lint 0/0.

**Utility reuse.** Existing collection test helpers for construction/seeding.
**Data shapes:** none.

---

## Section 6 — Inner hot-path instrumentation

**Objective.** Instrument the inner sites listed in `SPEC.md` §6: `queryEngine.executeQuery`,
`queryEngine.filterDocuments`, `docOps.executeQuery`, `docOps.updateWithOperators`,
`updateEngine.applyOperators`, `fileService.readFile`, `fileService.createFile`,
`coordinator.coordinate`, `coordinator.updateMasterIndexMetadata`, `masterIndex.save`.

**Constraints.**

- Timers wrap whole scans/batches — NEVER individual documents inside loops
  (`deleteDocument`, `findAllDocuments` stay unwrapped).
- **CollectionCoordinator control-flow clock reads (currently lines 58, 183, 212, 251 — verify
  current positions at implementation time) MUST NOT be migrated** — they feed timeout/lease/retry
  decisions; only ADD timers around `coordinate` and `updateMasterIndexMetadata`.
- `FileService` creates a dedicated `createComponentLogger('FileService')` used ONLY for
  `timeSync` (injected logger keeps existing duties) — prevents `Database` mislabelling.
- `QueryEngineMatcher` uses the engine logger it already holds via `getLogger()`.
- `MasterIndex.save` is the single persist point timed (covers indirect callers).

**Red-first tests** (new cross-layer suite `tests/unit/utils/timing-instrumentation.test.js`,
built on database/collection helpers over the GAS mocks):

1. `find` yields BOTH boundary and inner labels: `collection.find`, `docOps.executeQuery`,
   `queryEngine.executeQuery`, `queryEngine.filterDocuments`.
2. `updateMany` yields `collection.updateMany`, `docOps.updateWithOperators`,
   `updateEngine.applyOperators`.
3. A coordinated save yields `coordinator.coordinate`, `coordinator.updateMasterIndexMetadata`,
   AND `masterIndex.save` (flat events; both-presence assertion per `SPEC.md` §7).
4. FileService cache path yields `fileService.readFile`/`fileService.createFile` with
   `component === 'FileService'` even though `Database` injects its own logger.
5. Per-document helpers emit NO events beyond their batch wrappers during `deleteMany`.

**Acceptance criteria.** Full `SPEC.md` §6 inventory observable end-to-end; coordinator semantics
untouched (existing coordinator suites stay green unchanged).

**Section checks.**

1. Red: inventory assertions fail (labels missing).
2. Green: add wraps site-by-site (smallest blast radius first: UpdateEngine → Matcher/QueryEngine →
   DocumentOperations → MasterIndex → Coordinator → FileService).
3. Refactor; full suite + coordinator-specific suites must show zero diffs; lint 0/0.

**Utility reuse.** `engine.getLogger()` pattern; existing coordinator/master-index test helpers.
Canonical doc entry: Infrastructure_Components.md §1.2.0.5 covers the facility; component-level
instrumentation notes belong to each component's own doc page (Section 8).
**Data shapes:** none.

---

## Section 7 — Benchmark harness

**Objective.** Deliver `tools/benchmarks/bench.cjs` plus `"bench"` npm script implementing
`SPEC.md` §4.6 verbatim.

**Constraints.**

- CommonJS Node script named `tools/benchmarks/bench.cjs` — the `.cjs` extension is REQUIRED
  because `package.json` sets `"type": "module"`, so a plain `.js` would execute as ESM and break
  every `require()`. It replicates `tests/setup/gas-mocks.setup.js`'s FULL wiring (≈ lines 55–77:
  mock creation via `createGasMocks({...})`, legacy-script loading via `vm.runInThisContext`, and
  `globalThis` assignment of `DriveApp`/`PropertiesService`/`ScriptProperties`/`LockService`/
  `Utilities`/`Logger`/`MimeType`), with script order from `script-order.cjs` (Section 1) and
  `src/04_core/99_PublicAPI.js` appended LAST; builds DB via `createAndInitialiseDatabase(config)`.
- Syntax/global hygiene: ES2021-compatible syntax only (the dedicated cjs block parses at
  `ecmaVersion: 2021` — no class fields or newer syntax). Every bare Node identifier the script
  uses — `console`, `process`, `__dirname`, `__filename`, `globalThis`, plus the CommonJS triple
  `require`/`module`/`exports` — must resolve through the dedicated block (`sourceType:
'commonjs'` covers only that triple; everything else comes from its declared globals).
  Prefer explicit `require('node:process')`-style access where natural, but lint cleanliness must
  not depend on it.
- Lint-gate approach (this section): the shared `npm run lint` script stays UNTOUCHED
  (`src/**` + `tests/**` only). Bench quality is enforced by a MANDATORY explicit probe in the
  section checks: `npx eslint tools/benchmarks/bench.cjs` must report 0 errors AND 0 warnings.
  To make that probe REACHABLE and meaningful, `eslint.config.js` receives TWO coordinated changes:
  - a DEDICATED new config block `{ files: ['**/*.cjs'], ... }` carrying the SAME project rule set
    as the main `'**/*.js'` block (factor the shared rules into one `const` inside the config file
    so both blocks reference a single definition), with CommonJS-appropriate languageOptions:
    `sourceType: 'commonjs'` (supplies the CommonJS globals `require`/`module`/`exports` plus
    `global`), `ecmaVersion: 2021`, and EXPLICIT Node host globals covering everything else
    `bench.cjs` touches: `console`, `process`, `__dirname`, `__filename`, `globalThis`.
    Rationale: a `.cjs` file does not match the existing `'**/*.js'` block AT ALL, so without this
    dedicated block the bench script would never be linted by the probe; declaring the host globals
    and using `'commonjs'` keeps the probe robust and clean even if `no-undef` is enabled later
    (it is currently NOT enabled anywhere in this flat config — absent rule objects stay off in
    flat config). The main `'**/*.js'` block is NOT widened — `src/`/`tests/` stay GAS-pure with
    no Node globals leaked in. The `globals` npm package is NOT a direct dependency (verified), so declare
    these globals inline rather than importing `globals.node`.
  - the global `ignores` array GAINS `tools/gas-mocks/**`: under any `**/*.cjs` matching,
    `tools/gas-mocks/gas-mocks.cjs` FAILS TO PARSE (public class fields at ~line 271 vs
    `ecmaVersion: 2021`; verified empirically against the proposed configuration), so it MUST be
    excluded to keep future broad invocations (`eslint .`) from failing hard — consistent with its
    never-linted status today. This ignore also covers `script-order.cjs` (same directory), whose
    correctness is owned by its Section 1 vitest suite.
  - `package.json` gains ONLY `"bench": "node tools/benchmarks/bench.cjs"`.
    Ordering/atomicity: both config edits, the probe, `bench.cjs`, and the npm script land within
    this section as ONE unit — no intermediate state references files or scripts that do not exist
    yet (Section checks assert `bench.cjs` exists AND `npm run bench` exits 0 together).
    Prettier (`format`: `prettier --check .`) already covers all of `tools/` regardless.
- Bench code must then satisfy: jsdoc on all functions, constants for defaults (`no-magic-numbers`
  is an ERROR outside tests), complexity ≤ 7, max-len 160.
- OS-temp `driveRoot` passed explicitly to `createGasMocks({ driveRoot })`; `rootFolderId`
  derived from THAT mock instance via `DriveApp.getRootFolder().getId()`; fail fast if unresolvable.
- Scenarios: find-all, filtered findOne, countDocuments, updateMany batch, deleteMany batch,
  single-doc operator update, cached readFile repeats, one coordinated write.
- Mutating scenarios re-establish preconditions before EVERY measured iteration; read-only ones may
  share state. Warm-up pass first; `BENCH_ITERATIONS` (default 5), `BENCH_DOCS` (default 200).
- Report aligned text table (count/min/max/mean ms per label), British English wording.
- Not wired into vitest or CI.

**Red-first verification.** Harness is manual tooling — no unit suite. Its red/green gate is:

1. `node tools/benchmarks/bench.cjs` fails fast BEFORE implementation lands (script absent) — the
   npm script target documents intent.
2. After implementation: smoke run exits 0, prints every scenario row, honours both env vars
   (run once with `BENCH_ITERATIONS=1 BENCH_DOCS=20`).

**Acceptance criteria.** Repeatable before/after numbers per label; clean startup failure modes.

**Section checks.** Shared `npm run lint` 0/0 (unchanged scope); MANDATORY explicit probe
`npx eslint tools/benchmarks/bench.cjs` at 0 errors / 0 warnings; smoke runs (defaults + env
overrides); `npm run test` still green (harness outside discovery patterns).

**Utility reuse.** Consumes `tools/gas-mocks/script-order.cjs` (Section 1) and the timing
listeners themselves — the bench aggregates REAL facility events rather than re-measuring.
Canonical doc: Testing_Framework.md "Timing Assertions and Benchmarks" planned entry becomes the
target; status flip in Section 8.
**Data shapes:** none.

---

## Section 8 — Regression hardening and documentation follow-through

**Objective.** Prove whole-repo stability and bring documentation to match reality.

**Constraints.**

- Default level DEBUG means `[TIMING]` lines appear in normal test output — confirm no suite
  asserts on exact console content (none known today; console was previously unmocked/unasserted).
- Docs updates remove the "(Planned — Not implemented)" markers ONLY after their features exist.

**Steps.**

1. Full gates: `npm run lint` (0 errors, 0 warnings) and `npm run test` (green) from a clean
   checkout of the branch.
2. Delegate to **Docs**:
   - `docs/developers/Infrastructure_Components.md` §1.2.0.5: mark implemented; document
     `timeSync`/seam/listeners/lazy-context (supplier order, `Object|Function|null` types,
     exception precedence) per `SPEC.md` §9.
   - `docs/developers/Testing_Framework.md`: mark implemented; document listener+mock-clock
     assertion pattern (unsubscribed in teardown — `clearMocks` does NOT clear listener state)
     and `npm run bench` usage incl. env overrides. The planned entry already names
     `tools/benchmarks/bench.cjs`; correct any residual `bench.js` references anywhere in docs to
     `bench.cjs`.
   - Component doc pages touched by Section 6 instrumentation get one-line timing notes where
     they describe method behaviour (QueryEngine, Collection components, MasterIndex,
     Infrastructure Components for FileService/Coordinator coverage).
3. Delegate final **Code Reviewer** pass over the cumulative diff (source + tests) — including
   verification of the console formatting contracts (`[TIMING]` message shape, `[<Component>]`
   prefix, merged `{ ...resolvedContext, durationMs }` context) that unit tests deliberately do
   not assert per the global console-assertion policy.
4. Release notes: deferred — developer-facing tooling, no public API change (`SPEC.md` §8).

**Acceptance criteria.** Docs match implemented behaviour; all gates green; reviews approved.

**Data shapes:** none.

---

## Sequencing summary

1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. Sections 2–4 share `JDbLogger.js` and must be strictly sequential;
Sections 5–6 depend only on Sections 2–4; Section 7 depends on Sections 1, 2, 6; Section 8 closes.
