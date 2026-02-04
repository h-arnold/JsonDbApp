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

## QueryEngine suite bootstrap duplication

- Each describe block re-declares the same `beforeAll`, `beforeEach`, and `afterAll` scaffolding; see [tests/unit/QueryEngine/QueryEngine.test.js](tests/unit/QueryEngine/QueryEngine.test.js#L32-L47) and the repeated block starting at [tests/unit/QueryEngine/QueryEngine.test.js#L262](tests/unit/QueryEngine/QueryEngine.test.js#L262-L277).
- Recommendation: wrap the setup in a helper like `withQueryEngineDataset(describeName, suiteFn)` or move the shared hooks to the top-level describe so individual sections inherit the same context without duplication.

**Affected code to refactor (exact locations to change):**

- `tests/unit/QueryEngine/QueryEngine.test.js`: consolidate the repeated `beforeAll`, `beforeEach`, and `afterAll` blocks into a single helper or top-level describe. Replace each repeated hook block with the helper call so all suites share the same `queryEngine` and `testUsers` setup. Keep the dataset bootstrapping (`MockQueryData.getAllTestDocuments()` and `.getEdgeCaseDocuments()`) in one place.
- `tests/data/MockQueryData.js`: no logic changes expected, but any helper you add should continue to call the existing `MockQueryData` methods so data loading remains centralised.

**Search terms to locate affected test cases:**

- Repeated hook blocks: `rg -n "beforeAll\\(|beforeEach\\(|afterAll\\(" tests/unit/QueryEngine/QueryEngine.test.js`
- Data bootstrap: `rg -n "MockQueryData\\.get" tests/unit/QueryEngine/QueryEngine.test.js`

**Agent to use for the affected test cases:**

- Use the **Test Review Agent** after the refactor, because this is a structural change to the test file and must keep the same coverage and hook semantics.

## Validation operator suite bootstrapping

- Every validation operator file repeats the same global `testEnv` variable with `beforeAll`/`afterAll` to call `setupValidationTestEnvironment` and `cleanupValidationTests`; examples in [tests/unit/validation/gt-operator.test.js](tests/unit/validation/gt-operator.test.js#L24-L31) and [tests/unit/validation/addtoset-operator.test.js](tests/unit/validation/addtoset-operator.test.js#L24-L31).
- Recommendation: add a `describeValidationOperatorSuite(description, callback)` helper that supplies the prepared `testEnv`, letting each operator file focus on scenarios while sharing lifecycle management.

**Affected code to refactor (exact locations to change):**

- `tests/helpers/validation-test-helpers.js`: add a `describeValidationOperatorSuite(description, callback)` helper that wraps `describe`, and internally sets up `testEnv` via `beforeAll` and cleans up via `afterAll`. The callback should receive `testEnv` so test files can destructure it without repeating setup code.
- `tests/unit/validation/*.test.js`: replace the top-level `let testEnv; beforeAll(...); afterAll(...)` blocks with the shared helper. Affected files include `gt-operator.test.js`, `lt-operator.test.js`, `eq-operator.test.js`, `and-operator.test.js`, `or-operator.test.js`, `combined-logical-operators.test.js`, and the update operator suites (`set-operator`, `inc-operator`, `addtoset-operator`, `push-operator`, `pull-operator`, `min-operator`, `max-operator`, `mul-operator`, `unset-operator`). Keep any per-suite data seeding inside the callback.

**Search terms to locate affected test cases:**

- Shared lifecycle: `rg -n "setupValidationTestEnvironment|cleanupValidationTests" tests/unit/validation`
- Global test env variable: `rg -n "let testEnv" tests/unit/validation`
- Operator suite files: `rg -n "Operator Tests" tests/unit/validation`

**Agent to use for the affected test cases:**

- Use the **Test Review Agent** once the helper is adopted across operator suites, because this refactor touches many tests and needs a lint/structure review.
