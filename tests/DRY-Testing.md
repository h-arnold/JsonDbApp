# DRY Testing Opportunities

## Collection operation fixtures and result assertions

- Multiple collection suites inline near-identical employee fixtures (Alice/Bob/Charlie) before running the same acknowledgement checks; see [tests/unit/collection/collection-update-operations.test.js](tests/unit/collection/collection-update-operations.test.js#L89-L154) and [tests/unit/collection/collection-delete-operations.test.js](tests/unit/collection/collection-delete-operations.test.js#L59-L123). The same fixture pattern also appears in find/count/replace suites alongside manual assertions that only vary by filter conditions.
- Similar insert/find/update/delete/replace suites repeat `expect(result.acknowledged).toBe(true)` alongside manual document lookups. Consolidating this into a `assertAcknowledgedWrite(result, expectedCounts)` helper would remove dozens of duplicated lines across the collection folder.
- Recommendation: extend `tests/helpers/collection-test-helpers.js` with a `seedStandardEmployees(collection)` factory (wrapping the Alice/Bob/Charlie dataset) and a dedicated assertion helper to centralise MongoDB-style result validation.

**Affected code to refactor (exact locations to change):**

- `tests/helpers/collection-test-helpers.js`: add `seedStandardEmployees(collection)` plus an acknowledgement assertion helper (e.g. `assertAcknowledgedWrite(result, { matchedCount, modifiedCount, deletedCount, insertedId })`), and expose any optional fixtures (e.g. score/bonus/lastActive variants) that currently live in-line. Ensure helper registration follows the existing helper export pattern in this file.
- `tests/unit/collection/collection-update-operations.test.js`: replace inline `collection.insertOne` fixtures for Alice/Bob/Charlie and repeated `acknowledged` assertions with the helper; update assertions to call the helper for `updateOne`/`updateMany` results.
- `tests/unit/collection/collection-delete-operations.test.js`: replace inline `collection.insertOne` fixtures for Alice/Bob/Charlie and repeated `acknowledged` assertions with the helper; update assertions to call the helper for `deleteOne`/`deleteMany` results.
- `tests/unit/collection/collection-replace-operations.test.js`: replace inline `collection.insertOne` fixtures and `acknowledged` assertions with helper calls where applicable.
- `tests/unit/collection/collection-count-operations.test.js` and `tests/unit/collection/collection-find-operations.test.js`: replace recurring Alice/Bob/Charlie seeding blocks with `seedStandardEmployees(collection)` or a variant (if you add it), and adjust per-test expectations accordingly.
- `tests/unit/collection/collection-insert-operations.test.js`: replace `acknowledged` checks with the shared assertion helper to keep insert result expectations aligned.

**Search terms to locate affected test cases:**

- Fixture duplication: `rg -n "Alice|Bob|Charlie" tests/unit/collection`
- Acknowledged result checks: `rg -n "acknowledged" tests/unit/collection`
- Write result counts: `rg -n "matchedCount|modifiedCount|deletedCount|insertedId" tests/unit/collection`
- Seeding patterns: `rg -n "insertOne\\(\\{ name: 'Alice'" tests/unit/collection`

**Agent to use for the affected test cases:**

- Use the **Test Review Agent** once the refactor is applied, because these are test modifications that must remain lint-clean and aligned with the Vitest conventions described in the testing framework documentation.

## DocumentOperations environment setup and persistence checks

- Every DocumentOperations suite repeats the same `beforeEach` block to build `env` and `docOps`; e.g. [tests/unit/document-operations/document-operations-update.test.js](tests/unit/document-operations/document-operations-update.test.js#L11-L18) and [tests/unit/document-operations/document-operations-insert.test.js](tests/unit/document-operations/document-operations-insert.test.js#L11-L18).
- Result verification also duplicates `expect(result).toBeDefined(); expect(result.acknowledged).toBe(true);` and the `_loadData()` persistence check; see [tests/unit/document-operations/document-operations-update.test.js](tests/unit/document-operations/document-operations-update.test.js#L25-L39) and [tests/unit/document-operations/document-operations-delete.test.js](tests/unit/document-operations/document-operations-delete.test.js#L21-L36).
- Recommendation: introduce a `createDocumentOperationsContext()` helper that returns `{ env, docOps, reload }`, plus small assertion helpers for acknowledged results and persisted state so each suite can focus on behaviour rather than scaffolding.

**Affected code to refactor (exact locations to change):**

- `tests/helpers/document-operations-test-helpers.js`: add a `createDocumentOperationsContext()` helper that calls `setupTestEnvironment`, resets the collection, and instantiates `DocumentOperations`. Provide a `reload()` helper that wraps `env.collection._loadData()` and returns `env.collection._documents` for persistence assertions. Consider a tiny `assertAcknowledgedResult(result, { modifiedCount, deletedCount })` helper to reduce repeated checks.
- `tests/unit/document-operations/document-operations-insert.test.js`: replace `beforeEach` body with the new helper and replace `_loadData()` + direct `_documents` access with `reload()` helper. Update acknowledged assertions to use the shared helper.
- `tests/unit/document-operations/document-operations-update.test.js`: replace `beforeEach` body with the new helper and use `reload()` when checking persisted values for `_documents`; replace repeated `result` assertions with the shared helper.
- `tests/unit/document-operations/document-operations-delete.test.js`: replace `beforeEach` body with the new helper, use `reload()` when checking deleted values, and replace repeated `result` assertions with the shared helper.

**Search terms to locate affected test cases:**

- Common setup blocks: `rg -n "beforeEach\\(\\(\\) => \\{" tests/unit/document-operations`
- Environment helper usage: `rg -n "setupTestEnvironment|resetCollection" tests/unit/document-operations`
- Persistence checks: `rg -n "_loadData\\(\\)" tests/unit/document-operations`
- Acknowledged assertions: `rg -n "acknowledged" tests/unit/document-operations`

**Agent to use for the affected test cases:**

- Use the **Test Review Agent** once the helper refactor is applied, because this touches multiple test suites and must preserve Vitest/AAA conventions.

## Database master index verification scaffolding

- Many database tests recreate MasterIndex assertions inline immediately after collection creation; compare [tests/unit/database/database-collection-management.test.js](tests/unit/database/database-collection-management.test.js#L29-L112) with [tests/unit/database/database-master-index-integration.test.js](tests/unit/database/database-master-index-integration.test.js#L60-L75).
- Recommendation: add a helper such as `expectCollectionPersisted(databaseContext, collectionName)` that encapsulates `registerDatabaseFile`, MasterIndex instantiation, and metadata assertions, reducing the repeated boilerplate whenever collections are created or reloaded.

**Affected code to refactor (exact locations to change):**

- `tests/helpers/database-test-helpers.js`: add an assertion helper (e.g. `expectCollectionPersisted({ masterIndexKey, database }, collectionName, { fileId, documentCount })`) that instantiates a `MasterIndex`, reads collection metadata, and asserts `fileId`/`documentCount`/`name`. It should also call `registerDatabaseFile` if the `fileId` is passed to it, to keep cleanup consistent.
- `tests/unit/database/database-collection-management.test.js`: replace repeated `new MasterIndex({ masterIndexKey })` + `getCollections/getCollection` assertions with the helper after each collection creation or reload.
- `tests/unit/database/database-master-index-integration.test.js`: replace the inline MasterIndex metadata assertions in the "update MasterIndex metadata" test with the helper; keep the explicit MasterIndex seeding in the hydrate test (helper should still validate the result).

**Search terms to locate affected test cases:**

- MasterIndex assertions: `rg -n "MasterIndex\\(\\{ masterIndexKey" tests/unit/database`
- Collection persistence checks: `rg -n "getCollections\\(\\)|getCollection\\(" tests/unit/database`
- Cleanup registration: `rg -n "registerDatabaseFile" tests/unit/database`

**Agent to use for the affected test cases:**

- Use the **Test Review Agent** after refactoring because the change affects database test behaviour and helper usage across suites.

## QueryEngine suite bootstrap duplication - ✅ COMPLETED

**Refactoring completed on 2026-02-05:**

- Consolidated duplicate `beforeAll`, `beforeEach`, and `afterAll` hooks into a single top-level `describe('QueryEngine')` block
- Four nested describe blocks now inherit the shared setup: Basic Functionality, Comparison Operators, Logical Operators, Error Handling
- Edge Cases describe block retains its own `beforeAll` for `edgeCaseDocuments` while still inheriting `queryEngine` and `testUsers`
- Eliminated ~45 lines of duplicated code
- All 48 tests pass ✅
- Zero lint errors/warnings ✅

## Validation operator suite bootstrapping - ✅ COMPLETED

**Refactoring completed on 2026-02-05:**

- Added `describeValidationOperatorSuite(description, callback)` helper to `tests/helpers/validation-test-helpers.js`
- Helper wraps `describe` and handles `beforeAll`/`afterAll` setup/cleanup automatically
- Provides `getTestEnv()` callback function for accessing test environment in tests
- Refactored all 15 validation operator test files to use the new helper:
  - gt-operator.test.js
  - lt-operator.test.js
  - eq-operator.test.js
  - and-operator.test.js
  - or-operator.test.js
  - combined-logical-operators.test.js
  - set-operator.test.js
  - inc-operator.test.js
  - addtoset-operator.test.js
  - push-operator.test.js
  - pull-operator.test.js
  - min-operator.test.js
  - max-operator.test.js
  - mul-operator.test.js
  - unset-operator.test.js
- Eliminated ~75 lines of duplicated setup/cleanup code
- All 714 tests pass ✅
- Zero lint errors/warnings ✅
