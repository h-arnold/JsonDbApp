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
- [ ] If criterion is an operator object and array element is an object (not primitive), do NOT match (consistent simplification; document this).
- [ ] If criterion is an object referencing fields not present on element, treat as non-match (standard subset semantics).
- [ ] Null / undefined elements: only match if equality criterion is null (avoid exceptions on property access).
- [ ] Ensure Date comparisons use time value when `$eq`, `$gt`, `$lt` (consistent with `QueryEngine`).

### 4. Testing Adjustments & Additions
- [ ] Modify failing test in `tests/validation/04_ArrayUpdateOperators.js`:
  - Change `$pull` criterion from full object to subset `{ sku: 'prod1' }` if intent is “remove all sku prod1”.
  - Update expectation: no remaining `prod1` items.
- [ ] Add new test: remove by mixed field + operator `{ $pull: { items: { sku: 'prod2', price: { $lt: 25 } } } }`.
- [ ] Add new test: numeric primitive array removal via operator `{ $pull: { scores: { $gt: 90 } } }` (add suitable mock data or extend existing). 
- [ ] Add new test: partial object predicate matches element that has extra fields.
- [ ] Add regression test: exact object removal still works when full object provided.
- [ ] Add test: operator object against object element does not remove (documented behaviour) OR decide to implement extended semantics (defer – see Section 7).

### 5. No-Op & Count Behaviour Tests
- [ ] Confirm `$pull` with non-existent value leaves array unchanged and `modifiedCount` = 0.
- [ ] Confirm `$pull` on non-array field leaves document unchanged and `modifiedCount` = 0.

### 6. Documentation
- [ ] Update `docs/developers/UpdateEngine.md` (create if missing) describing `$pull` semantics, predicate rules, operator support and limitations.
- [ ] Note current supported operators: `$eq`, `$gt`, `$lt` (others deferred).
- [ ] Clarify behaviour for operator object applied directly vs field-level usage.

### 7. (Optional / Deferred) Shared Comparator Refactor
- [ ] Evaluate extracting comparison logic from `QueryEngine` into a shared utility to remove duplication (`ComparisonUtils`).
- [ ] If deferred, create follow-up TODO entry with scope & rationale.

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

