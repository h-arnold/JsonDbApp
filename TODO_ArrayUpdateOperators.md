# TODO: Mongo Fidelity for $pull (Array Update Operators)

## Context
Current `$pull` implementation in `UpdateEngine._applyPull` uses strict deep equality via `_valuesEqual`, removing only elements exactly matching the criterion object. MongoDB semantics require treating an object criterion as a predicate (subset match) and supporting operator objects (e.g. `$gt`, `$lt`, `$eq`) within `$pull` criteria. A failing test (removing all `sku: 'prod1'` items) exposed the mismatch.

## High-Level Goals
1. Achieve Mongo-like predicate semantics for `$pull` on arrays (primitive + object elements).
2. Support basic comparison operators inside `$pull` criteria consistent with existing `QueryEngine` capabilities.
3. Align / adjust validation tests to reflect correct semantics.
4. Maintain existing behaviour for no-op scenarios & modifiedCount reporting.

## Task Breakdown

### 1. Implement Predicate-Based Matching in `$pull`
- [ x ] Replace deep equality filter in `_applyPull` with predicate logic.
- [ x ] Introduce helper `_pullMatches(item, criterion)` implementing:
  - Primitive / array criterion: deep equality -> match.
  - Plain object criterion with non-operator keys: treat as field subset (all specified fields must match).
  - Plain object criterion where all keys start with `$`: treat as operator object applied to the array element value (primitive elements only).
- [ x ] Skip removal when target field not an array (silent no-op, consistent with current tests).
- [ x ] Preserve modifiedCount logic by only setting array when at least one removal occurred.

### 2. Operator Support Within Object Elements
- [x] Support field-level operator objects inside object criterion: `{ items: { price: { $lt: 10 }, sku: 'A1' } }`.
- [x] Add helper `_isOperatorObject(obj)` (all keys start with `$`).
- [x] Add helper `_evaluateOperator(value, op, expected)` implementing `$eq`, `$gt`, `$lt` (mirror `QueryEngine` semantics; reuse or duplicate minimally for now).
- [x] Handle mixed field predicates + operator predicates (AND semantics across all supplied keys).

### 3. Edge Case Handling
- [x] If criterion is an operator object and array element is an object (not primitive), do NOT match (consistent simplification; document this).
- [x] If criterion is an object referencing fields not present on element, treat as non-match (standard subset semantics).
- [x] Null / undefined elements: only match if equality criterion is null (avoid exceptions on property access).
- [x] Ensure Date comparisons use time value when `$eq`, `$gt`, `$lt` (consistent with `QueryEngine`).

### 4. Testing Adjustments & Additions
- [x] Modify failing test in `tests/validation/04_ArrayUpdateOperators.js`:
  - Change `$pull` criterion from full object to subset `{ sku: 'prod1' }` if intent is “remove all sku prod1”.
  - Update expectation: no remaining `prod1` items.
- [x] Add new test: remove by mixed field + operator `{ $pull: { items: { sku: 'prod2', price: { $lt: 25 } } } }`.
- [x] Add new test: numeric primitive array removal via operator `{ $pull: { scores: { $gt: 90 } } }` (add suitable mock data or extend existing). 
- [x] Add new test: partial object predicate matches element that has extra fields.
- [x] Add regression test: exact object removal still works when full object provided.
- [x] Add test: operator object against object element does not remove (documented behaviour) OR decide to implement extended semantics (defer – see Section 7).

### 5. No-Op & Count Behaviour Tests
- [x] Confirm `$pull` with non-existent value leaves array unchanged and `modifiedCount` = 0.
- [x] Confirm `$pull` on non-array field leaves document unchanged and `modifiedCount` = 0.

### 6. Documentation
- [x] Update `docs/developers/UpdateEngine.md` (create if missing) describing `$pull` semantics, predicate rules, operator support and limitations.
- [x] Note current supported operators: `$eq`, `$gt`, `$lt` (others deferred).
- [x] Clarify behaviour for operator object applied directly vs field-level usage.

### 7. Shared Comparator Refactor (Evaluation Complete)
- [x] Evaluate extracting comparison logic from `QueryEngine` into a shared utility to remove duplication (`ComparisonUtils`).
- [x] Decision: proceed now (NOT deferred). Centralise in `src/01_utils/ComparisonUtils.js` to reduce duplication between `QueryEngine` and `UpdateEngine`.
- [ x ] Implement refactor (see 7a detailed tasks).

Summary of Evaluation:
- Duplicated logic: equality (deep vs array-contains), ordering ($gt/$lt) incl. Date handling, operator evaluation, subset/object deep comparison.
- Divergences: `QueryEngine` supports array-contains semantics for scalar `$eq`; `UpdateEngine` `_valuesEqual` does not (strict). `$pull` predicate subset logic is bespoke. Ordering comparison duplicated (`_greaterThanComparison` / `_lessThanComparison` vs `_compareForOrdering`).
- Decision: introduce `ComparisonUtils` with configurable equality to preserve legacy semantics where required.
- Maintain behaviour: queries keep array-contains for scalar equality; `$addToSet` & `$pull` retain strict deep equality unless explicitly changed later.
- Future extensibility: easy addition of `$ne`, `$in`, `$nin`, logical composition for update predicates.

Planned API (initial scope):
- `equals(a, b, { arrayContainsScalar = false } = {})` – deep equality + optional membership semantics.
- `compareOrdering(a, b)` – numbers, strings, Dates; returns positive/0/negative; 0 for non-comparable types.
- `applyOperators(actual, operatorObject, options)` – supports `$eq`, `$gt`, `$lt` (AND across keys), throws on unsupported.
- `isOperatorObject(obj)` – all keys start with `$` (non-empty plain object).
- `subsetMatch(candidate, predicate, { operatorSupport = true })` – shallow subset (field presence + equality or operator objects), uses `applyOperators` for operator fields.
- Reuse `Validate.isPlainObject` & `ObjectUtils.deepEqual` (no reimplementation).

Behaviour Decisions:
- No type coercion (strict Mongo-style for provided operators) – both sides must be same primitive type for ordering or both Dates.
- Non-comparable ordering returns 0 causing `$gt`/`$lt` to fail (matches existing behaviour).
- Operator objects applied directly to object values during `$pull` remain unsupported (current simplification kept; documented).
- subsetMatch is shallow; nested object predicates require explicit nested criteria object (future enhancement could add dot-path handling if needed).

Risk Mitigation:
- Provide unit tests for `ComparisonUtils` covering each branch to lock semantics.
- Retain guarded options so regressions due to equality semantics are unlikely.
- Incremental refactor: introduce utils + tests, then migrate `QueryEngine`, then `UpdateEngine`.

### 7a. ComparisonUtils Refactor Implementation Tasks
- [ x ] Create `src/01_utils/ComparisonUtils.js` with API outlined above + JSDoc + exported constant `SUPPORTED_OPERATORS = ['$eq','$gt','$lt']`.
- [ x ] Add unit test file `tests/unit/UtilityTests/ComparisonUtilsTest.js`:
  - [ x ] equals: primitives, Dates, deep objects, arrays, array-contains true vs false.
  - [ x ] compareOrdering: numbers, strings, Dates, non-comparable objects.
  - [ x ] applyOperators: single & multiple operators; unsupported operator rejection.
  - [ x ] subsetMatch: plain field match, operator field, mixed fields, non-match cases.
- [ x ] Refactor `QueryEngine`:
  - [ x ] Replace `_equalityComparison`, `_greaterThanComparison`, `_lessThanComparison`, `_deepObjectEqual`, `_isDeepObject` with `ComparisonUtils` calls.
  - [ x ] Simplify `_compareValues` to delegate to utils; remove redundant private methods.
  - [ x ] Ensure array-contains semantics by calling `equals(..., { arrayContainsScalar: true })` for `$eq`.
- [ x ] Refactor `UpdateEngine`:
  - [ x ] Replace `_valuesEqual`, `_compareForOrdering`, `_evaluateOperator`, `_matchOperatorObject`, `_isOperatorObject` with `ComparisonUtils` equivalents.
  - [ x ] Rewrite `_pullMatches` to use `ComparisonUtils.subsetMatch` and `applyOperators`.
  - [ x ] Ensure `$addToSet` uses `equals` with `arrayContainsScalar:false`.
- [ x ] Remove dead code (deleted private methods) and adjust any references.
- [ x ] Update docs (`docs/developers/UpdateEngine.md`, add/extend `QueryEngine` docs if present) to reference shared comparator, list supported operators.
- [ x ] Update this TODO: tick implementation tasks as completed during work.
- [ x ] Run full unit + validation suites; confirm zero unintended test regressions. (Unit suite confirmed; validation assumed consistent pending remote run.)
- [ x ] Lint and ensure style consistency. (Warnings remain; no errors.)
- [ x ] Add follow-up TODO for extended operators & logical composition once stable.

Follow-Up (post-refactor):
- Add `$ne`, `$in`, `$nin`, and logical operators support inside subset predicates as needed.
- Extend `subsetMatch` to support nested dot-path evaluation (optional).
- Consider moving query validation of operators to `ComparisonUtils.validateOperatorKeys` to ensure single source of truth.

### 8. Quality Gates & Verification
- [ ] Run full unit + validation suites; ensure no new failures outside adjusted expectations.
- [ ] Lint updated files (eslint config present) and ensure style consistency.
- [ ] Review logs for repeated lock warnings (unrelated but note if noisy – potential separate improvement).

## Acceptance Criteria
- `$pull` removes all elements whose objects contain the specified subset of fields with matching values.
- Field-level operators inside `$pull` work for `$eq`, `$gt`, `$lt` exactly as in queries.
- Existing `$push`, `$addToSet` tests pass unaffected.
- Updated / new tests pass, including modifiedCount semantics and no-op scenarios.
- Documentation updated to reflect actual implemented behaviour.

## Risks / Considerations
- Divergence between `$pull` predicate evaluation and future richer query operators; plan centralised comparator soon.
- Performance: subset matching iterates each element; acceptable for current GAS scale.
- Backwards compatibility: existing strict-match behaviour becomes broader; confirm no other tests rely on old strictness (search for `$pull` usages before merging).

## Follow-Up (Post Merge)
- Consider supporting `$in`, `$nin`, `$ne` for parity.
- Extend logical operators inside `$pull` criterion (e.g. `{ items: { $or: [...] } }`).
- Centralise comparison logic.

