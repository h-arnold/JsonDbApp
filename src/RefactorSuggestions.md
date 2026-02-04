# RefactorSuggestions

Date: 2026-02-03

## Scope

Review of the src tree with lint findings and manual inspection. No code changes were made.

## Lint-driven refactor targets

The linter highlights complexity, equality, magic numbers and missing JSDoc. The following are the highest-impact areas to refactor into smaller helpers:

- Comparison utilities: [src/01_utils/ComparisonUtils.js](src/01_utils/ComparisonUtils.js)
  - `equals`, `compareOrdering`, `applyOperators`, `subsetMatch` exceed complexity thresholds and mix validation, comparison and operator evaluation. Extract helpers such as `compareDates`, `compareNumbers`, `compareStrings`, `matchArrayMembership`, and `ensureOperatorSupported`.
  - Replace loose equality checks with strict comparisons and centralise nullish handling to a single helper.

- Object utilities: [src/01_utils/ObjectUtils.js](src/01_utils/ObjectUtils.js)
  - `deepClone`, `convertDateStringsToObjects`, `deepEqual` exceed complexity. Extract common traversal utilities (e.g., `walkObject`, `cloneArray`, `cloneObject`).

- Update engine: [src/02_components/UpdateEngine.js](src/02_components/UpdateEngine.js)
  - Operator handlers `_applyInc`, `_applyMul`, `_applyMin`, `_applyMax`, `_applyPush`, `_applyAddToSet`, `_setFieldValue`, `_unsetFieldValue` exceed complexity. Split into operation-specific handlers and shared field-path utilities.

- Query engine: [src/02_components/QueryEngine.js](src/02_components/QueryEngine.js)
  - `_matchDocument` and `_validateQueryInputs` exceed complexity. Extract helpers for logical operators and field matching. Consolidate query validation passes to reduce repeated traversal.

- Collection coordination and metadata: [src/02_components/CollectionCoordinator.js](src/02_components/CollectionCoordinator.js), [src/02_components/CollectionMetadata.js](src/02_components/CollectionMetadata.js)
  - `coordinate` and constructor complexity can be reduced via small, named helpers for lock acquisition, conflict checks, and timing.

- File operations: [src/02_components/FileOperations.js](src/02_components/FileOperations.js)
  - `_handleDriveApiError` and `_retryOperation` exceed complexity; extract error classification and retry policy helpers.

- Database: [src/04_core/Database.js](src/04_core/Database.js)
  - `initialise`, `recoverDatabase`, `loadIndex`, `backupIndexToDrive` exceed complexity. Extract index validation, master index sync, and collection hydration into helpers.

- Master index: [src/04_core/MasterIndex.js](src/04_core/MasterIndex.js)
  - `_addCollectionInternal` and `_addToModificationHistory` exceed complexity. Extract metadata normalisation and history record creation helpers.

## DRY and SOLID refactoring opportunities

### 1) Split UpdateEngine into multi-file handlers

Target: [src/02_components/UpdateEngine.js](src/02_components/UpdateEngine.js)

Suggested structure (Collection-style):

- Field operators: `$set`, `$inc`, `$mul`, `$min`, `$max`, `$unset`
- Array operators: `$push`, `$pull`, `$addToSet`
- Field-path utilities: `_getFieldValue`, `_setFieldValue`, `_unsetFieldValue`
- Shared validation helpers: `_validate*` methods

Benefits:

- Reduces method complexity and isolates operator responsibilities.
- Enables re-use of field-path utilities by both QueryEngine and UpdateEngine.

### 2) Consolidate field-path access utilities

Targets:

- [src/02_components/UpdateEngine.js](src/02_components/UpdateEngine.js)
- [src/02_components/QueryEngine.js](src/02_components/QueryEngine.js)

Both implement dot-notation traversal. Extract a shared helper (e.g., `FieldPathUtils`) to avoid duplicated logic and ensure consistent behaviour.

### 3) De-duplicate collection access logic in Database

Target: [src/04_core/Database.js](src/04_core/Database.js)

`collection()` and `getCollection()` are effectively duplicates. Consolidate into a single private resolver (e.g., `_resolveCollection`) to eliminate divergence risk.

### 4) Centralise operator validation in QueryEngine

Target: [src/02_components/QueryEngine.js](src/02_components/QueryEngine.js)

`_validateQueryDepth`, `_validateOperators`, and `_validateOperatorValues` each traverse the query tree. Combine into a single traversal that validates depth, operators and values in one pass to remove repeated recursion.

### 5) Standardise error construction

Target: [src/01_utils/ErrorHandler.js](src/01_utils/ErrorHandler.js)

Many error factory methods lack JSDoc and follow repeated patterns. Extract common builder helpers and ensure consistent JSDoc to align with linting rules.

## Performance improvements

### 1) Reduce repeated traversal of large structures

- Query validation currently traverses the query tree multiple times in [src/02_components/QueryEngine.js](src/02_components/QueryEngine.js). Consolidating into a single traversal will reduce $O(n)$ scans and recursion overhead.
- UpdateEngine repeats `fieldPath.split('.')` per operation and per document update in [src/02_components/UpdateEngine.js](src/02_components/UpdateEngine.js). Cache split paths per operation or use a field-path helper that accepts both string and pre-split arrays.

### 2) Minimise deep cloning

- UpdateEngine currently deep-clones every document before applying operators. Consider an opt-in shallow clone for known-safe operations or a copy-on-write strategy to reduce overhead on large documents. Document the behaviour to preserve current API expectations.

### 3) Optimise $addToSet equality checks

- `_applyAddToSet` performs repeated deep comparisons and verbose debug logging. Consider:
  - A lightweight equality predicate for primitive-only values.
  - Early exit when candidate is identical to recent additions.
  - Optional debug logging toggle to avoid per-element logging in production paths.

### 4) Avoid repeated Drive API calls

- In [src/02_components/FileOperations.js](src/02_components/FileOperations.js), methods retry without distinguishing transient vs permanent errors beyond current checks. Introducing a shared classifier could avoid unnecessary retries (e.g., for invalid IDs or permission errors already known).

## Security and robustness improvements

### 1) Guard against prototype pollution via field paths

Targets:

- [src/02_components/UpdateEngine.js](src/02_components/UpdateEngine.js)
- [src/02_components/QueryEngine.js](src/02_components/QueryEngine.js)

When setting or reading dot-notation paths, reject segments like `__proto__`, `constructor`, and `prototype` to prevent prototype pollution. Centralising this in a field-path utility ensures consistency.

### 2) Normalise and validate operator objects

Targets:

- [src/01_utils/ComparisonUtils.js](src/01_utils/ComparisonUtils.js)
- [src/02_components/QueryEngine.js](src/02_components/QueryEngine.js)

`ComparisonUtils.isOperatorObject` and query validation could share a stricter, canonical check (non-empty, plain object, no inherited keys) to avoid ambiguous operator handling.

### 3) Ensure consistent immutability rules

Target: [src/02_components/UpdateEngine.js](src/02_components/UpdateEngine.js)

`_isImmutableField` currently only checks `_id`. Consider a shared immutable field list in configuration to avoid hard-coded logic and allow future extension without code changes.

## Maintainability and testability

- Extract magic numbers (timeouts, retry counts, array sizes) into named constants in:
  - [src/02_components/CollectionCoordinator.js](src/02_components/CollectionCoordinator.js)
  - [src/02_components/FileOperations.js](src/02_components/FileOperations.js)
  - [src/04_core/DatabaseConfig.js](src/04_core/DatabaseConfig.js)
  - [src/04_core/MasterIndex.js](src/04_core/MasterIndex.js)

- Large test file in [tests/unit/utils/ObjectUtils.test.js](tests/unit/utils/ObjectUtils.test.js) exceeds max lines. Split into smaller suites by method to improve readability and reduce cognitive load.

## Recommended refactor roadmap

1. Refactor UpdateEngine into multi-file handlers and shared field-path utilities.
2. Consolidate QueryEngine validation passes and shared field-path utilities.
3. Deduplicate Database collection access logic and index validation helpers.
4. Simplify MasterIndex metadata normalisation.
5. Standardise ErrorHandler JSDoc and extract common builder helpers.
6. Address remaining lint-driven complexity and magic number warnings incrementally.

## References

- Lint output highlights complexity hotspots and missing JSDoc across the codebase.
- Key files reviewed:
  - [src/02_components/UpdateEngine.js](src/02_components/UpdateEngine.js)
  - [src/02_components/QueryEngine.js](src/02_components/QueryEngine.js)
  - [src/04_core/Database.js](src/04_core/Database.js)
  - [src/04_core/MasterIndex.js](src/04_core/MasterIndex.js)
  - [src/02_components/CollectionCoordinator.js](src/02_components/CollectionCoordinator.js)
  - [src/01_utils/ObjectUtils.js](src/01_utils/ObjectUtils.js)
  - [src/01_utils/ComparisonUtils.js](src/01_utils/ComparisonUtils.js)
  - [src/02_components/FileOperations.js](src/02_components/FileOperations.js)
  - [src/04_core/DatabaseConfig.js](src/04_core/DatabaseConfig.js)
