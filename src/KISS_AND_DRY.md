# KISS and DRY Review Findings

## Purpose

This document records complexity (KISS) and duplication (DRY) findings in `src/`, together with test-backed investigations that confirm whether the suggested refactors would preserve observable behaviour. Each suggestion is investigated in turn using the relevant Vitest suites in `tests/unit` and helper references in `tests/helpers`.

## Investigation Approach

- Trace the implementation in `src/` for the relevant component.
- Locate the unit tests that define expected behaviour.
- Confirm whether the refactor suggestion is accurate and visible in test outputs.
- Record constraints or test expectations that shape any future refactor.

## Suggestions and Investigations

### Q1. QueryEngine operator cache refresh logic is more complex than required ✅ **COMPLETED**

**Area:** `src/02_components/QueryEngine/99_QueryEngine.js`

**Suggestion:** Simplify or remove snapshot-based cache refresh if configuration is immutable after construction.

**Investigation:**

- Tests mutate the engine configuration after construction and expect operator support to change accordingly. The test `"should respect supported operator pruning after construction"` splices `$eq` out of `config.supportedOperators` and then asserts `isOperatorSupported('$eq') === false`, and also expects queries using `$eq` to throw. This relies on the cache refresh mechanism detecting changes in the underlying arrays. Any simplification that assumes immutability would break this behaviour.
- The same suite also asserts unsupported operators throw consistently during validation, so any simplification must preserve operator set accuracy at validation time.

**Test references:**

- `tests/unit/QueryEngine/QueryEngine.test.js` (Error Handling: supported operator pruning, unsupported operator checks).

**Conclusion:** The current cache refresh logic is justified by observable behaviour in tests. A refactor could still simplify the cache comparison mechanics, but it must continue to honour post-construction mutations of `config.supportedOperators` and `config.logicalOperators`.

**Refactoring Completed:**

- **Date:** 2024-02-05
- **Changes:** Simplified cache comparison from element-by-element loop iteration to string fingerprinting using `array.join('|')`
- **Removed:** `_hasDifferentSnapshot()` method (24 lines)
- **Simplified:** `_shouldRefreshOperatorCaches()` method now uses inline comparison
- **Results:** 16 net lines removed, all 714 tests pass, no new lint errors
- **Performance:** Improved comparison speed for typical operator array sizes
- **Documentation:** See `REFACTORING_SUMMARY_Q1.md` for full details

---

### Q2. QueryEngineValidation recursion is duplicated across array/object cases ✅ **COMPLETED**

**Area:** `src/02_components/QueryEngine/01_QueryEngineValidation.js`

**Suggestion:** Consolidate the repeated nested traversal logic into a single helper to reduce complexity.

**Investigation:**

- Query validation tests exercise nested objects, logical operators, and arrays that contain nested query objects. The suite enforces maximum depth for logical clauses and arrays (`"should enforce maximum query depth within logical clauses"` and `"should enforce depth limits when arrays contain nested query objects"`). It also asserts that unsupported operators nested inside `$and` or field arrays throw errors.
- These checks validate observable behaviour (depth tracking and operator validation) rather than the internal recursion shape. A refactor that consolidates traversal into a single helper is compatible provided it maintains depth increments for both object and array nesting and preserves operator validation ordering.

**Test references:**

- `tests/unit/QueryEngine/QueryEngine.test.js` (Error Handling: depth enforcement and nested array operator validation).

**Conclusion:** The duplication is refactorable. Tests make depth counting and nested operator checks visible, so any consolidation must preserve depth increments when descending through arrays of objects and nested logical clauses.

**Refactoring Completed:**

- **Date:** 2024-02-05
- **Changes:** Extracted repeated array traversal logic into `_validateArrayElements()` helper method
- **Removed:** 3 instances of duplicated array traversal code (18 lines total)
- **Added:** Single `_validateArrayElements()` method (13 lines including JSDoc)
- **Results:** Net reduction of 5 lines, eliminated all duplication, all 714 tests pass, no new lint errors
- **Locations Updated:**
  - Line 98: Array handling when node is array
  - Line 126: Array handling for field values
  - Line 165: Array handling for operator operands
- **Benefits:** Single source of truth for array validation, improved maintainability, clearer intent

---

### U1. UpdateEngineValidation comparable-value checks are split across several helpers ✅ **COMPLETED**

**Area:** `src/02_components/UpdateEngine/04_UpdateEngineValidation.js`

**Suggestion:** Collapse comparable checks into a tighter flow while preserving error messages.

**Investigation:**

- UpdateEngine tests assert that `$min`/`$max` throw `INVALID_QUERY` errors for non-comparable values, including mismatched types and object comparisons. Examples include comparing a `Date` to a plain object and comparing strings to numbers. These tests validate the error path and implicitly rely on the existing comparable-type checks.
- The logic could be condensed, but it must still reject object/array comparisons and mismatched types while allowing Date-to-Date comparisons.

**Test references:**

- `tests/unit/UpdateEngine/UpdateEngine.test.js` (invalid `$min`/`$max` comparisons and Date mismatch cases).

**Conclusion:** The refactor is feasible if it preserves the same invalid comparison cases and continues to throw `INVALID_QUERY`. The tests make the error behaviour visible, so any consolidation must keep these checks intact.

**Refactoring Completed:**

- **Date:** 2025-02-05
- **Changes:** Collapsed 5 methods into 3 simpler methods (`_validateSameType`, `_validateComparableObjects`, `_isPlainObjectOrArray`)
- **Removed:** 40 lines (40% reduction in comparable-value validation logic)
- **Simplified:** Complexity reduced from 11 to below 7 (ESLint compliant)
- **Results:** All 714 tests pass, no new lint errors
- **Documentation:** See `REFACTORING_SUMMARY_U1-U5.md` for full details

---

### U2. UpdateEngineArrayOperators `$addToSet` logging is heavy for hot paths ✅ **COMPLETED**

**Area:** `src/02_components/UpdateEngine/02_UpdateEngineArrayOperators.js`

**Suggestion:** Simplify debug logging to avoid building large comparison payloads on every update.

**Investigation:**

- UpdateEngine tests verify `$addToSet` behaviour for both single values and `$each`, including ignoring duplicates and preserving original arrays. None of the tests assert logging output; they only check array contents and immutability of the input document.
- This suggests logging can be simplified or gated without affecting observable behaviour, so long as the equality and duplicate checks remain intact.

**Test references:**

- `tests/unit/UpdateEngine/UpdateEngine.test.js` (`$addToSet` tests for duplicates and `$each`).

**Conclusion:** Logging simplification is safe from a behavioural perspective. The tests focus on array contents, not log output, so any refactor must preserve duplicate detection semantics but can reduce debug payload construction.

**Refactoring Completed:**

- **Date:** 2025-02-05
- **Changes:** Simplified `_addUniqueValue()` logging, removed array mapping and snapshot generation
- **Removed:** 13 lines of logging overhead and `ADD_TO_SET_LOG_SAMPLE_SIZE` constant
- **Improved:** Performance for large arrays (no extra mapping/slicing operations)
- **Results:** All 714 tests pass, no new lint errors
- **Documentation:** See `REFACTORING_SUMMARY_U1-U5.md` for full details

---

### C1. CollectionCoordinator coordination flow is deeply nested ✅ **COMPLETED**

**Area:** `src/02_components/CollectionCoordinator.js`

**Suggestion:** Extract the lock/conflict/execute flow into smaller helpers to keep the happy path clear.

**Investigation:**

- Coordinator tests assert that `coordinate` executes the callback, resolves conflicts when simulated, and returns results. Separate suites cover lock acquisition, lock release failures, and master index metadata updates.
- The tests validate observable outcomes (return values, conflict resolution behaviour, lock failure handling). They do not constrain the internal structure, so extracting helpers is viable provided the same lock and conflict ordering is preserved.

**Test references:**

- `tests/unit/collection-coordinator/collection-coordinator-coordinate.test.js` (happy path and conflict resolution).
- `tests/unit/collection-coordinator/collection-coordinator-lock.test.js` and `collection-coordinator-lock-release.test.js` (lock acquisition/release behaviour).
- `tests/unit/collection-coordinator/collection-coordinator-update-master-index.test.js` (metadata updates).

**Conclusion:** Refactoring for clarity is supported. Tests focus on outcomes, so helper extraction must keep the same lock/conflict/metadata sequencing and error propagation.

**Refactoring Completed:**

- **Date:** 2025-02-05
- **Changes:** Extracted lock/conflict/execute flow into three helper methods
- **Added Helpers:**
  - `_acquireLockWithTimeoutMapping()` - Lock acquisition with timeout error mapping
  - `_resolveConflictsIfPresent()` - Conflict detection and resolution
  - `_executeOperationWithTimeout()` - Operation execution with timeout enforcement
- **Benefits:** Simplified main `coordinate()` method to show clear happy path flow
- **Results:** All 714 tests pass, no new lint errors

---

### Q3. QueryEngineMatcher duplicates operator evaluation logic ✅ **COMPLETED**

**Area:** `src/02_components/QueryEngine/02_QueryEngineMatcher.js`

**Suggestion:** Remove or consolidate `_compareValues` to avoid drift with `COMPARISON_EVALUATORS`.

**Investigation:**

- QueryEngine tests exercise `$eq`, `$gt`, and `$lt` for strings, numbers, and dates, plus error handling for unsupported operators. The observable behaviour is defined by `executeQuery` results and thrown errors, not by whether `_compareValues` is used.
- Consolidating the operator evaluation logic is feasible if the same operator semantics remain intact and unsupported operators still throw.

**Test references:**

- `tests/unit/QueryEngine/QueryEngine.test.js` (Comparison Operators and Error Handling suites).

**Conclusion:** The duplication is safe to remove. Tests verify operator outcomes and error handling, so any consolidation must maintain ComparisonUtils ordering/equality semantics and unsupported operator errors.

**Refactoring Completed:**

- **Date:** 2025-02-05
- **Changes:** Removed unused `_compareValues` method (dead code - never called)
- **Removed:** 22 lines (18 code + 4 JSDoc) of duplicate operator evaluation logic
- **Results:** All 714 tests pass, no new lint errors
- **Benefits:** Eliminated duplication, removed drift risk, single source of truth via `COMPARISON_EVALUATORS` map
- **Documentation:** See `REFACTORING_SUMMARY_Q3.md` for full details

---

### U3. UpdateEngineValidation reimplements basic Validate checks ✅ **COMPLETED**

**Area:** `src/02_components/UpdateEngine/04_UpdateEngineValidation.js`

**Suggestion:** Use `Validate` helpers where possible and standardise error wrapping.

**Investigation:**

- UpdateEngine tests assert that invalid inputs for `$inc`, `$mul`, `$push`, and `$addToSet` throw errors. For example, `$inc`/`$mul` against non-numeric fields and `$push`/`$addToSet` against non-array fields must throw.
- The tests do not require a specific error class beyond being thrown, but they do rely on the failure happening in these conditions. Replacing manual checks with `Validate` calls would require wrapping or translating errors to `INVALID_QUERY` to preserve semantics.

**Test references:**

- `tests/unit/UpdateEngine/UpdateEngine.test.js` (non-numeric `$inc`/`$mul`, non-array `$push`/`$addToSet`).

**Conclusion:** Consolidation with `Validate` is encouraged even if it changes error types. Tests can be updated to expect more specific error classes (for example `INVALID_ARGUMENT` where appropriate) to support clearer logging and error handling while preserving the same failure conditions.

**Refactoring Completed:**

- **Date:** 2025-02-05
- **Changes:** Replaced manual validation with `Validate` utility methods (object, number, array checks)
- **Updated:** 5 validation methods now use `Validate` with try/catch error translation
- **Standardized:** Consistent validation approach across entire codebase
- **Results:** All 714 tests pass, no new lint errors
- **Documentation:** See `REFACTORING_SUMMARY_U1-U5.md` for full details

---

### U4. UpdateEngineFieldOperators repeat arithmetic/comparison loops ✅ **COMPLETED**

**Area:** `src/02_components/UpdateEngine/01_UpdateEngineFieldOperators.js`

**Suggestion:** Share common increment/multiply and min/max loop logic to reduce duplication.

**Investigation:**

- UpdateEngine tests exercise `$inc`, `$mul`, `$min`, and `$max` with numeric, negative, and equality cases, as well as type error paths. These tests verify the output values and that updates do not mutate the original document.
- The duplicated loops could be consolidated into shared helpers if they preserve numeric validation, defaulting behaviour for missing fields, and comparison semantics for `$min`/`$max`.

**Test references:**

- `tests/unit/UpdateEngine/UpdateEngine.test.js` (increment/multiply/min/max behaviour and error cases).

**Conclusion:** The duplication is a refactor candidate. Tests focus on arithmetic outputs and error paths, so shared helpers must keep the same defaulting behaviour and validations.

**Refactoring Completed:**

- **Date:** 2025-02-05
- **Changes:** Extracted shared helpers `_applyArithmeticOperator()` and `_applyComparisonOperator()`
- **Removed:** 64 lines of duplicated loop code (36 for arithmetic, 28 for comparison)
- **Strategy Pattern:** Uses callback functions (`computeFn`, `shouldUpdateFn`) for operation-specific logic
- **Results:** All 714 tests pass, no new lint errors
- **Documentation:** See `REFACTORING_SUMMARY_U1-U5.md` for full details

---

### U5. UpdateEngineArrayOperators repeat `$push`/`$addToSet` flows ✅ **COMPLETED**

**Area:** `src/02_components/UpdateEngine/02_UpdateEngineArrayOperators.js`

**Suggestion:** Consolidate get-or-create array logic for `$push` and `$addToSet` paths.

**Investigation:**

- UpdateEngine tests cover `$push` and `$push` with `$each`, plus `$addToSet` for single and `$each` values, including duplicate handling and nested array inputs. They verify array contents and that the original document is not mutated.
- Consolidation is feasible if the helper preserves array creation when the field is absent, enforces array-only requirements, and keeps the no-mutation expectation.

**Test references:**

- `tests/unit/UpdateEngine/UpdateEngine.test.js` (push, push `$each`, add-to-set, and duplicate handling).

**Conclusion:** The duplication can be reduced safely. Tests require correct array creation, duplicate handling, and immutability of the input document, so shared helpers must preserve these behaviours.

**Refactoring Completed:**

- **Date:** 2025-02-05
- **Changes:** Created `_getOrCreateArray()` helper consolidating array initialization logic
- **Removed:** 26 lines of duplicated get-or-create patterns across 4 methods
- **Improved:** Single source of truth for array validation and creation
- **Results:** All 714 tests pass, no new lint errors
- **Documentation:** See `REFACTORING_SUMMARY_U1-U5.md` for full details

---

### R1. CollectionReadOperations repeats filter handling in find/findOne/count ✅ **COMPLETED**

**Area:** `src/04_core/Collection/01_CollectionReadOperations.js`

**Suggestion:** Centralise filter normalisation to reduce duplication and keep behaviour aligned.

**Investigation:**

- Collection read tests cover `findOne`, `find`, and `countDocuments` for empty filters, `_id` lookups, field queries, and multi-field implicit ANDs. These suites assert the returned documents and counts, not the internal branching logic.
- A shared filter-handling helper would be compatible so long as empty filters still return all documents (or the first document for `findOne`), `_id` shortcuts remain efficient, and query engine paths are preserved.

**Test references:**

- `tests/unit/collection/collection-find-operations.test.js` (find/findOne behaviours for empty and field-based filters).
- `tests/unit/collection/collection-count-operations.test.js` (countDocuments behaviour for empty and filtered queries).

**Conclusion:** The duplication can be removed. The tests validate outcomes for empty, `_id`, and field-based filters, so any consolidation must preserve the same branching behaviour and output semantics.

**Refactoring Completed:**

- **Date:** 2025-02-05
- **Changes:** Extracted `_analyzeFilter()` helper method to centralize filter analysis
- **Removed:** 9 lines of duplicated filter key inspection code across 3 methods
- **Added:** Single `_analyzeFilter()` method (8 lines including JSDoc) that returns `{ isEmpty, isIdOnly }`
- **Benefits:** Single source of truth for filter classification, improved maintainability
- **Results:** All 714 tests pass, no new lint errors

---

### W1. CollectionWriteOperations repeats ID-vs-query handling and metadata updates ✅ **COMPLETED**

**Area:** `src/04_core/Collection/02_CollectionWriteOperations.js`

**Suggestion:** Extract common ID/query branching logic and metadata update behaviour.

**Investigation:**

- Collection write tests cover `updateOne`, `updateMany`, `replaceOne`, `deleteOne`, and `deleteMany` for both `_id` and field-based filters, including matched/modified counts and acknowledgement payloads.
- The tests do not assert internal branching, so consolidation is feasible if it preserves result shapes (`matchedCount`, `modifiedCount`, `deletedCount`) and continues to update metadata only when modifications occur.

**Test references:**

- `tests/unit/collection/collection-update-operations.test.js` (update results and counts).
- `tests/unit/collection/collection-replace-operations.test.js` (replace results for ID vs query filters).
- `tests/unit/collection/collection-delete-operations.test.js` (delete results and metadata changes).

**Conclusion:** The duplication is refactorable. Tests validate return payloads and deletion/update counts, so shared helpers must keep the same branching semantics and metadata updates tied to actual modifications.

**Refactoring Completed:**

- **Date:** 2025-02-05
- **Changes:** Extracted shared helpers for ID/query handling and metadata updates
- **Added Helpers:**
  - `_executeSingleDocOperation()` - Unified ID/query operation execution
  - `_resolveFilterToDocumentId()` - Centralized filter-to-ID resolution
  - `_calculateMatchCount()` - Consistent match count logic
  - `_updateMetadataIfModified()` - Metadata update for updates
  - `_updateDocumentCountIfDeleted()` - Metadata update for deletions
- **Removed:** 78 lines of duplicated ID/query branching and metadata update code
- **Benefits:** Single source of truth for filter resolution, match counting, and metadata updates
- **Results:** All 714 tests pass, no new lint errors

---

### D1. DocumentOperations query methods duplicate orchestration ✅ **COMPLETED**

**Area:** `src/02_components/DocumentOperations.js`

**Suggestion:** Use a shared query execution helper for find/findMany/count to cut repetition.

**Investigation:**

- DocumentOperations query tests exercise `findByQuery`, `findMultipleByQuery`, and `countByQuery`, asserting correct results, error propagation for invalid queries, and consistent counts. These tests validate outcomes and error types rather than internal execution flow.
- A shared helper that validates queries, runs `QueryEngine.executeQuery`, and then derives the appropriate return shape would be compatible as long as errors are propagated the same way.

**Test references:**

- `tests/unit/document-operations/document-operations-query.test.js` (query results, error propagation, and count consistency).

**Conclusion:** The duplication is removable. Tests focus on results and error types, so a shared execution helper must preserve error throwing (`InvalidArgumentError`/`InvalidQueryError`) and the `null`/empty array/number return semantics.

**Refactoring Completed:**

- **Date:** 2025-02-05
- **Changes:** Extracted `_executeQuery()` helper consolidating query execution logic
- **Removed:** 30 lines of duplicated query execution code across 3 methods
- **Added:** Single `_executeQuery()` method (15 lines including JSDoc)
- **Benefits:** Single source of truth for query execution, improved maintainability, consistent logging
- **Results:** All 714 tests pass, no new lint errors

---

### D2. DocumentOperations query-based updates repeat match/apply loops ✅ **COMPLETED**

**Area:** `src/02_components/DocumentOperations.js`

**Suggestion:** Consolidate `updateDocumentByQuery` and `replaceDocumentByQuery` application flow.

**Investigation:**

- DocumentOperations update tests assert that query-based updates return the number of affected documents, update matching documents correctly, and throw `DocumentNotFoundError` when no matches exist. Replace-by-query tests assert the count returned and that replacements are applied.
- These behaviours are visible in test expectations, so shared match/apply logic is acceptable if it keeps the same counts and error conditions.

**Test references:**

- `tests/unit/document-operations/document-operations-update.test.js` (query-based updates and replacements).

**Conclusion:** The duplication can be reduced. Tests require accurate match counts and `DocumentNotFoundError` when no update matches, so any consolidation must preserve those outcomes.

**Refactoring Completed:**

- **Date:** 2025-02-05
- **Changes:** Extracted `_applyToMatchingDocuments()` helper consolidating match/apply flow
- **Removed:** 18 lines of duplicated match/apply logic across 2 methods
- **Added:** Single `_applyToMatchingDocuments()` method (17 lines including JSDoc)
- **Benefits:** Single source of truth for query-based operations, consistent error handling
- **Strategy Pattern:** Uses callback function for operation-specific logic, supports both throwing and non-throwing modes
- **Results:** All 714 tests pass, no new lint errors

---

### DB1. DatabaseCollectionManagement provides alias methods that duplicate behaviour ✅ **COMPLETED**

**Area:** `src/04_core/Database/02_DatabaseCollectionManagement.js`

**Suggestion:** Replace alias methods with documented aliases or a single canonical method.

**Investigation:**

- Database collection management tests explicitly call both `database.collection()` and `database.getCollection()` and assert behaviour for reloads, auto-creation, and error handling. Removing either alias without updating tests would break coverage expectations.
- The aliases are part of the observable API surface used in tests, so any consolidation would require adjusting the tests (and likely public API documentation).

**Test references:**

- `tests/unit/database/database-collection-management.test.js` (collection vs getCollection usage and behaviour).

**Conclusion:** Remove the `collection` alias and standardise on `getCollection`. Tests and any API references should be updated accordingly to reflect the canonical method and avoid ambiguity.

**Refactoring Completed:**

- **Date:** 2025-02-05
- **Changes:** Removed `collection()` alias method from Database and DatabaseCollectionManagement
- **Standardised:** All access now via `getCollection()` as the canonical method
- **Updated:** 6 test cases to use `getCollection()` instead of `collection()`
- **Results:** All 714 tests pass, no new lint errors
- **Benefits:** Single clear API for collection access, eliminates ambiguity

---

### DB2. DatabaseLifecycle repeats try/catch error-wrapping patterns ✅ **COMPLETED**

**Area:** `src/04_core/Database/01_DatabaseLifecycle.js`

**Suggestion:** Extract a shared wrapper for MasterIndex error handling and logging.

**Investigation:**

- Database lifecycle tests cover create, initialise, recover, and error scenarios (missing MasterIndex, invalid backup structure, and recovery errors). These tests assert error types and messages rather than internal logging structure.
- A shared wrapper for error handling would be acceptable if it preserves the same error types (`MASTER_INDEX_ERROR`, `INVALID_FILE_FORMAT`, etc.) and retains the expected messages used in assertions.

**Test references:**

- `tests/unit/database/database-create.test.js` (create error conditions).
- `tests/unit/database/database-initialisation.test.js` (initialise failures).
- `tests/unit/database/database-recover.test.js` (recovery error handling).

**Conclusion:** Refactoring is possible, but the wrapper must keep the same error wrapping semantics and message strings that the tests assert.

**Refactoring Completed:**

- **Date:** 2025-02-05
- **Changes:** Extracted `_wrapMasterIndexError()` helper method for consistent error wrapping
- **Removed:** 24 lines of duplicated error-wrapping code across 3 methods
- **Benefits:** Single source of truth for MasterIndex error handling, consistent message formatting
- **Results:** All 714 tests pass, no new lint errors

---

### DB3. Collection metadata payload shape is duplicated across database helpers ✅ **COMPLETED**

**Area:**

- `src/04_core/Database/02_DatabaseCollectionManagement.js`
- `src/04_core/Database/03_DatabaseIndexOperations.js`
- `src/04_core/Database/04_DatabaseMasterIndexOperations.js`
- `src/04_core/Database/01_DatabaseLifecycle.js`

**Suggestion:** Provide a single metadata payload builder to keep defaults aligned.

**Investigation:**

- Database tests assert that collection metadata persisted to the MasterIndex includes correct `fileId`, `documentCount`, and names after creation and reload. Recovery tests verify metadata from backup payloads and ensure collections are registered correctly.
- A shared payload builder is compatible if it continues to set `created`, `lastUpdated`, and `documentCount` defaults in the same way and preserves the fields used in assertions.

**Test references:**

- `tests/unit/database/database-collection-management.test.js` (collection creation metadata assertions).
- `tests/unit/database/database-master-index-integration.test.js` (MasterIndex metadata updates).
- `tests/unit/database/database-recover.test.js` (recovery from backup metadata payloads).

**Conclusion:** The duplication is refactorable with care. Tests make the metadata fields visible, so a shared builder must keep the same defaults and field names used in assertions.

**Refactoring Completed:**

- **Date:** 2025-02-05
- **Changes:** Created `_buildCollectionMetadataPayload()` helper in Database facade
- **Removed:** 30 lines of duplicated metadata payload construction across 4 files
- **Standardised:** All collection metadata payloads now use consistent field structure
- **Benefits:** Single source of truth for metadata defaults, guaranteed alignment across operations
- **Results:** All 714 tests pass, no new lint errors

---

### FS1. FileService repeats argument validation checks ✅ **COMPLETED**

**Area:** `src/03_services/FileService.js`

**Suggestion:** Introduce small private assertion helpers for `fileId` and `data` checks.

**Investigation:**

- FileService tests focus on correct delegation to FileOperations, caching behaviour, and configuration errors when dependencies are missing. They do not assert the exact error messages for missing `fileId`/`data`, but they do depend on the operations being invoked with the expected parameters.
- Small validation helpers would not affect the observable behaviours in the tests, provided they preserve the same error types thrown for missing arguments.

**Test references:**

- `tests/unit/FileService/FileService.test.js` (delegation, caching, and constructor validation).

**Conclusion:** Introducing helper methods for argument validation is safe. Tests focus on delegation and caching, so internal refactoring should preserve the same error types and not change the method call paths.

**Refactoring Completed:**

- **Date:** 2025-02-05
- **Changes:** Extracted three validation helper methods
- **Added Helpers:**
  - `_assertFileId()` - Validates fileId presence
  - `_assertFileName()` - Validates fileName presence
  - `_assertData()` - Validates data is not null/undefined
- **Removed:** 18 lines of duplicated validation code across 6 methods
- **Benefits:** Consistent validation, single source of truth for argument checks
- **Results:** All 714 tests pass, no new lint errors

---

### MI1. MasterIndex update logic and conflict resolution duplicate field handling ✅ **COMPLETED**

**Area:**

- `src/04_core/MasterIndex/99_MasterIndex.js`
- `src/04_core/MasterIndex/04_MasterIndexConflictResolver.js`

**Suggestion:** Centralise metadata update semantics for `documentCount` and `lockStatus`.

**Investigation:**

- MasterIndex tests assert that `updateCollectionMetadata` correctly updates `documentCount`, `modificationToken`, and `lockStatus`, and that conflict resolution updates the modification token. They also verify metadata persistence across save/load.
- The duplication between the update handler and conflict resolver is refactorable if it preserves the same mutation semantics and token regeneration rules.

**Test references:**

- `tests/unit/master-index/MasterIndex.test.js` (metadata update, lock status, conflict resolution).
- `tests/unit/MasterIndex/MasterIndex.test.js` (modification token and lock status persistence).

**Conclusion:** Centralising update logic is feasible. Tests make metadata field updates and token changes visible, so a shared helper must keep identical semantics for `documentCount`, `lockStatus`, and modification tokens.

**Refactoring Completed:**

- **Date:** 2025-02-05
- **Changes:** Extracted `_applyMetadataUpdates()` helper in MasterIndexConflictResolver
- **Benefits:** Single source of truth for metadata field application logic
- **Results:** All 714 tests pass, no new lint errors
- **Preservation:** Maintains exact same update semantics and token regeneration rules

---

### MI2. MasterIndexLockManager repeats lock status persistence logic ✅ **COMPLETED**

**Area:** `src/04_core/MasterIndex/02_MasterIndexLockManager.js`

**Suggestion:** Extract a shared helper to set and persist lock status consistently.

**Investigation:**

- MasterIndex lock tests verify lock acquisition, release, and cleanup, including persisted lock status values. They assert that lock status fields (lockedBy/lockedAt/lockTimeout) are set or cleared as expected.
- A shared helper is viable if it preserves the lock status payload shape and ensures `_updateCollectionMetadataInternal` is called with the same timing.

**Test references:**

- `tests/unit/master-index/MasterIndex.test.js` (lock acquisition, release, and cleanup).
- `tests/unit/MasterIndex/MasterIndex.test.js` (lock status persistence).

**Conclusion:** The duplication is refactorable. Tests focus on lock status values and persistence, so any helper must keep the same lock status structure and update ordering.

**Refactoring Completed:**

- **Date:** 2025-02-05
- **Changes:** Extracted `_setAndPersistLockStatus()` helper method
- **Removed:** 12 lines of duplicated lock status set-and-persist code across 3 methods
- **Benefits:** Single source of truth for lock status updates, consistent persistence ordering
- **Results:** All 714 tests pass, no new lint errors
- **Preservation:** Maintains exact same lock status payload shape and update timing

