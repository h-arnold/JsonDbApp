# Performance Findings

This note summarises the highest-impact performance opportunities I found while tracing the collection, query, update, file, and coordination paths.

## 1. Full-collection cloning on query reads

The query paths clone every document before matching, even when the caller only needs a single result. That makes `findOne()`, query-based `updateOne()`, query-based `replaceOne()`, and query-based `deleteOne()` all pay an O(n) cloning cost up front.

Relevant code:

- `src/02_components/DocumentOperations.js:96`
- `src/02_components/DocumentOperations.js:241`
- `src/02_components/QueryEngine/99_QueryEngine.js:65`
- `src/02_components/QueryEngine/02_QueryEngineMatcher.js:65`
- `src/04_core/Collection/02_CollectionWriteOperations.js:135`

Suggested improvement:

- Add an internal streaming or early-exit matcher that scans stored documents directly.
- Clone only the document or documents that actually cross the public API boundary.

## 2. Repeated metadata updates inside bulk writes

Bulk write paths update metadata repeatedly inside inner loops. `updateMany()` calls `updateDocumentWithOperators()` for each matching document, and that helper updates metadata and marks the collection dirty on every modification. `deleteMany()` has a similar pattern through `deleteDocument()`.

Relevant code:

- `src/04_core/Collection/02_CollectionWriteOperations.js:182`
- `src/04_core/Collection/02_CollectionWriteOperations.js:364`
- `src/02_components/DocumentOperations.js:326`
- `src/02_components/DocumentOperations.js:157`
- `src/04_core/Collection/99_Collection.js:168`

Suggested improvement:

- Add bulk-internal helpers that suppress per-document metadata churn.
- Update `documentCount` and `lastModified` once per batch instead of once per document.

## 3. Whole-document clone plus whole-document comparison for operator updates

`UpdateEngine.applyOperators()` deep-clones the whole document before applying the first operator, then `updateDocumentWithOperators()` deep-compares the original and updated document afterwards. For large documents, that means each operator update does two full-document traversals.

Relevant code:

- `src/02_components/UpdateEngine/99_UpdateEngine.js:45`
- `src/02_components/DocumentOperations.js:342`

Suggested improvement:

- Have operator handlers report whether they made a change.
- Consider copy-on-write behaviour for nested paths so unchanged branches are not cloned.

## 4. Cache copy overhead in FileService

The file cache deep-clones on cache hits, deep-clones again when storing content, and `createFile()` serialises and deserialises just to seed the cache. For larger collection payloads, that can erase much of the benefit of caching.

Relevant code:

- `src/03_services/FileService.js:53`
- `src/03_services/FileService.js:105`
- `src/03_services/FileService.js:298`
- `src/02_components/FileOperations.js:69`
- `src/02_components/FileOperations.js:134`

Suggested improvement:

- Keep one immutable cached snapshot per file version.
- Clone only when mutation is required, not on every read.

## 5. Coordination overhead on every write

Every coordinated write pays for lock acquisition, conflict checks, lease handling, and master-index persistence. The collection metadata is rewritten to Script Properties after each operation, so small writes incur a large fixed cost.

Relevant code:

- `src/02_components/CollectionCoordinator.js:50`
- `src/02_components/CollectionCoordinator.js:320`
- `src/04_core/MasterIndex/99_MasterIndex.js:97`
- `src/04_core/MasterIndex/99_MasterIndex.js:170`

Suggested improvement:

- Coalesce master-index updates for batch work.
- Separate transient lock state from collection metadata where possible.

## 6. Logging still pays some stringification cost

Some hot paths build expensive log context eagerly, for example `JSON.stringify(query)`, before the logger decides whether the message will actually be emitted. That cost is small individually, but it shows up on heavily used read and update paths.

Relevant code:

- `src/01_utils/JDbLogger.js:114`
- `src/02_components/QueryEngine/99_QueryEngine.js:70`
- `src/02_components/DocumentOperations.js:247`

Suggested improvement:

- Guard expensive log context creation at the call site.
- Or let the logger accept lazy context suppliers.

## Priority order

1. Remove full-collection cloning from query reads.
2. Eliminate repeated metadata updates in bulk writes.
3. Reduce whole-document clone and compare work in update operators.
4. Simplify cache copy behaviour in `FileService`.
5. Reduce coordination and logging overhead on hot paths.

## Notes

- I did not run runtime benchmarks for this review.
- The repo already contains some large mock data for test generation, but I did not find a dedicated benchmark harness.
