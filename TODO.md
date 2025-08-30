# Class Diagram Update TODO

This document outlines the necessary updates for the class diagrams in `docs/developers/Class_Diagrams.md` to ensure they accurately reflect the current source code. The tasks are prioritised based on the severity of the inaccuracies.

## High Priority: Redraw Required

These diagrams are significantly outdated or incorrect and should be completely redrawn.

- [x] **QueryEngine Diagram**
    - The diagram lists conceptual methods (`evaluateComparison`, `evaluateLogical`, `evaluateElementOperator`) that do not exist in the code.
    - It omits the constructor, `_logger`, and `_config` properties.
    - It is missing the actual private methods that perform matching (`_matchDocument`, `_matchField`) and validation (`_validateQuery`, etc.).

- [x] **UpdateEngine Diagram**
    - The public method `executeUpdate` does not exist; it should be `applyOperators`.
    - It is missing handlers for implemented operators: `$mul`, `$min`, `$max`, `$push`, `$pull`, `$addToSet`.
    - It incorrectly lists a `$rename` operator (`applyRenameOperator`) which is not implemented.
    - It incorrectly groups array operators into a single conceptual method.
    - It omits the constructor, properties (`_logger`, `_operatorHandlers`), and numerous private helper methods.

- [x] **DbLockService Diagram**
    - The diagram is completely inaccurate. It describes a resource-based locking mechanism, whereas the code is a wrapper for the global Google Apps Script `LockService`.
    - All listed properties (`locks`) and methods (`acquireLock`, `releaseLock`, `isLocked`) are incorrect. The diagram should be redrawn to show `acquireScriptLock` and `releaseScriptLock`.

- [x] **JsonDbError & Specific Errors Diagram**
    - The base `JsonDbError` diagram is missing the `name` property.
    - The specific error class diagrams show incorrect, generic constructor signatures (`constructor(message, code, context)`). The actual constructors are highly specific (e.g., `DocumentNotFoundError(query, collectionName)`).
    - The inheritance diagram is missing more than half of the custom error classes, including `FileNotFoundError`, `InvalidArgumentError`, `OperationError`, and many others.

- [x] **MasterIndex Diagram**
    - The core locking methods have been renamed in the code (e.g., `acquireLock` is now `acquireCollectionLock`).
    - The diagram lists several methods that do not exist (`_removeLock`, `_internalCleanupExpiredLocks`).
    - It is missing implemented methods like `addCollections` and `load`.
    - The return type for `cleanupExpiredLocks` is `void`, not `boolean`.
    - The `_dbLockService` property is missing.

## Medium Priority: Significant Corrections Needed

These diagrams are recognisable but have significant errors or omissions in their public API representation.

- [x] **Database Diagram**
    - Add missing methods: `createDatabase()`, `recoverDatabase()`, `getCollection()`, `deleteCollection()`, `backupIndexToDrive()`, and several private helpers.
    - Remove the non-existent `_loadIndexFile()` method.
    - Clarify that the `initialised` property is an implied state, not an explicit boolean.

- [x] **DocumentOperations Diagram**
    - Correct the return types for the following methods. They return a result object (e.g., `{modifiedCount: 1}`), not the document `Object`:
        - `updateDocument()`
        - `deleteDocument()`
        - `updateDocumentWithOperators()`
        - `replaceDocument()`

- [x] **ErrorHandler Diagram**
    - Add the missing static validation helper methods, which are part of the public API:
        - `validateRequired()`
        - `validateType()`
        - `validateNotEmpty()`
        - `validateNotEmptyArray()`
        - `validateRange()`
        - `detectDoubleParsing()`

## Low Priority: Minor Corrections

These diagrams are mostly accurate but could be improved with minor tweaks.

- [x] **DatabaseConfig Diagram**
    - Add the missing properties: `retryAttempts` and `retryDelayMs`.
    - Correct the method name `toObject()` to `toJSON()`.
    - Add the static `fromJSON()` method.

- [x] **Collection & Operations Diagram**
    - In `CollectionWriteOperations`, add the missing `_coordinator` property.
    - Optionally, add the private helper methods `_updateOneWithOperators` and `_updateOneWithReplacement` for completeness.

## Verified: No Changes Needed

These diagrams are accurate and require no updates.
- `CollectionMetadata`
- `FileService`
- `FileOperations`
- `JDbLogger`
- `IdGenerator`
