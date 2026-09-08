# PLAN.md — Issue #58: MasterIndex timestamp-normalisation consolidation

**Transient working document — do not reference from permanent docs/code.**

Branch: `fix/issue-58-timestamp-normalisation`

---

## Objective

Consolidate the four duplicated timestamp-normalisation sites in
`src/04_core/MasterIndex/99_MasterIndex.js` into one private helper
`_normaliseTimestamp(candidate)`.

**Chosen approach: Option A — full unification** (user decision). The helper
coerces `string`/`number` input via `new Date(candidate)`, rather than only
accepting `Date` instances. This is a deliberate behavioural widening: sites 1–3
currently fall back to "now" for non-Dates; after the fix they coerce.

## Target contract for `_normaliseTimestamp(candidate)`

| Input                                                                           | Result                                             |
| ------------------------------------------------------------------------------- | -------------------------------------------------- |
| valid `Date`                                                                    | Defensive copy (fresh `Date`, same instant)        |
| `string` / `number`                                                             | `new Date(candidate)`; used when valid, else `now` |
| `null`, `undefined`, unsupported values/types, invalid `Date` (`new Date(NaN)`) | current timestamp                                  |

Must guard `null`/`undefined` explicitly — plain `new Date(null)` is epoch 0
(1970-01-01), a valid date that would otherwise stamp the index incorrectly.

## Four sites to change

| #   | Site                                      | Current lines                                                      | Change                                                                                    |
| --- | ----------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| 1   | `save()`                                  | ~:103–106                                                          | → `this._normaliseTimestamp(timestamp)`; JSDoc `@param` widened to `Date\|string\|number` |
| 2   | `_persistCollectionMetadata()`            | ~:527–530                                                          | → helper call                                                                             |
| 3   | `_touchIndex()`                           | ~:569–572                                                          | → helper call                                                                             |
| 4   | `_resolveExistingTimestamp()` (~:606–612) | delete; caller `_ensureStateShape()` (~:596) calls helper directly |

Helper placement: private method in `99_MasterIndex.js` near
`_getCurrentTimestamp()`. Use `Number.isNaN`. Full JSDoc (`@param`, `@returns`,
`@remarks` noting the coercion contract + `null` carve-out).

Out of scope: `01_MasterIndexMetadataNormaliser._coerceDate` (metadata-level
coercion, separately tested — `MasterIndex.test.js:149-169`).

## Workflow (per AGENTS.md: TDD, then mandatory review agents)

1. Baseline (DONE — see below).
2. **Testing Specialist**: Red-phase suite
   `tests/unit/master-index/master-index-timestamp-normalisation.test.js`
   using `tests/helpers/master-index-test-helpers.js` + mock-time helper.
   - Group 1 (Red, must fail before refactor): `save()` with ISO string →
     coerced; with epoch-millis number → coerced.
   - Group 2 (characterisation, green before AND after): defensive copy of
     supplied Date; invalid Date → now; `null`/explicit `undefined` → now
     (not epoch 0); unparseable string and unsupported values/types (boolean, array,
     object) → now; `updateCollectionMetadata()` advances index `lastUpdated`
     (site 3); `addCollection()` persists timestamp (site 2, only if not
     already covered at `MasterIndex.test.js:522-530`); legacy
     `modificationHistory` repair path resolves stored `lastUpdated` (site 4).
   - Do NOT modify `src/`. Confirm exactly Group 1 fails; rest of suite green;
     lint 0/0.
3. **Implementation**: add helper, rewire four sites, delete
   `_resolveExistingTimestamp`, update JSDoc. Lint 0 errors / 0 warnings.
4. **Verification**: full suite green; grep confirms the old duplicated
   timestamp-normalisation idiom is absent; `_normaliseTimestamp` is the sole
   normalisation implementation and `_resolveExistingTimestamp` has zero
   references.
5. **Code Reviewer**: review source + test diffs; must pass clean.
6. **Docs**: sweep `docs/developers/` (esp. `MasterIndex.md`) for
   timestamp-normalisation references; update if needed.
7. Commit + push branch, then PR.

## Verification commands

```
npm run lint        # must be 0 errors / 0 warnings
npm run test        # vitest run (silent), baseline 870 tests / 79 files
npm run format      # prettier check
```

## Done so far

1. **Branch created** (`fix/issue-58-timestamp-normalisation`) from clean `main`.
2. **Regression baseline established**:
   - `npm run lint` → 0 errors, 0 warnings
   - `npm run test` → 870 tests passing, 79 files
3. **Agent environment repair** — committed as `2409087
"chore: repoint agent model references to opencode-go/hy3"`:
   - Blocks the sub-agent workflow: several `.opencode/agents/*.md` referenced
     the retired model `opencode/hy3-free`; `task` tool delegation failed with
     "Model not found: opencode/hy3-free".
   - Fixed frontmatter `model:` in `code-reviewer.md`, `data-shapes-agent.md`,
     `implementation.md`, `planner-reviewer.md`, `testing-specialist.md` →
     `opencode-go/hy3`.
   - Aligned stale body `**Model**: opencode/x-preview-f-free` notes in
     `implementation.md`, `data-shapes-agent.md`, `testing-specialist.md`,
     `docs.md`; `docs.md` frontmatter moved to `opencode-go/hy3` for
     consistency.
   - `kif.md` intentionally untouched (`opencode/big-pickle`, validity
     unverified).
   - `docs.md` frontmatter was previously `opencode-go/glm-5.3-flash`, not
     `hy3-free` — changed to `hy3` deliberately to match the user direction
     and keep body/frontmatter consistent.

## Current completion state

- Testing Specialist completed the Red phase: 10 initial tests produced exactly
  the two intended failures; three additional unsupported-value regression tests
  were added during review correction.
- Implementation completed and corrected: `_normaliseTimestamp` now accepts
  only Date/string/number inputs and falls back for all unsupported values/types.
- PR review findings addressed: the Sonar-approved Date copy form is used, the
  legacy repair path now normalises only once through `save()`, and source/docs
  terminology is technically accurate.
- Code Reviewer returned clean after the correction and follow-up fixes; no
  Critical, Improvement, or Nitpick findings remain.
- Docs review completed; `docs/developers/MasterIndex.md` now documents the
  durable timestamp-normalisation contract.
- Final validation: lint 0 errors/0 warnings, format clean, coverage clean,
  and 883 tests passing across 80 files (baseline: 870/79).
- Agent body model notes now match their configured
  `opencode-go/deepseek-v4-flash` frontmatter.
- Remaining action: stage and commit the corrective changes, then push the
  branch.
