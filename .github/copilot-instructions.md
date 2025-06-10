# GAS DB Code Generation Instructions

## Overview

A synchronous document database for Google Apps Script, using MongoDB-like syntax. Supports CRUD on named collections, each stored as a JSON file in Google Drive. Access is via authenticated Apps Script libraries. Data consistency is managed with a ScriptProperties-based master index.

## Core Principles

**TDD**: Red-Green-Refactor cycle. Write failing tests first, implement minimal passing code, then refactor.  
**Component Separation**: Single responsibility classes with dependency injection via constructor.
**SOLID Principles**: Follow SOLID principles for maintainable code.
**Search for existing functionality**: Before implementing new features, check if they already exist in the codebase.
**GAS Limitations**: Remember that Google App Script uses the V8 Engine, but this does not provide full javascript support.
**Communication style**: Always concise and analytical. Always challenge incorrect assumptions or requirements. No fluff.
**British English**: All naming, documentation, comments use British English unless referencing American English APIs.

## File Structure

```
docs/developers/: docs for all implemented features
src/core/: Collection.js, Database.js, DatabaseConfig.js, MasterIndex.js
src/components/: CollectionMetadata.js, DocumentOperations.js, FileOperations.js
src/services/: FileService.js
src/utils/: ErrorHandler.js, GASDBLogger.js, IdGenerator.js
tests/unit/: All component test files
tests/framework/: AssertionUtilities.js, TestFramework.js, TestResult.js, TestRunner.js, TestSuite.js
```

## Naming Conventions

**Classes**: PascalCase (`DocumentOperations`)  
**Methods**: camelCase (`insertDocument`)  
**Private methods**: `_underscore` prefix (`_validateDocument`)  
**Variables**: camelCase (`collectionName`)  
**Constants**: `UPPER_SNAKE_CASE` (`LOCK_TIMEOUT`)  
**Private properties**: `this._underscore` (`this._documents`)  
**Files**: Match class name (`DocumentOperations.js`)  
**Tests**: `ClassNameTest.js` (`DocumentOperationsTest.js`)  
**Test functions**: `testClassNameScenario` (`testCollectionInsertOne`)  
**Mock objects**: `createMockClassName` (`createMockFileService`)  
**Error classes**: End with `Error` (`DocumentNotFoundError`)  
**Config objects**: `config` or `componentConfig` (`dbConfig`)

## Method Structure

```javascript
/**
 * Description
 * @param {Type} param - Description
 * @returns {Type} Description  
 * @throws {ErrorType} When thrown
 */
methodName(param) {
  if (!param) {
    throw new InvalidArgumentError('param is required');
  }
  
  const result = this._performOperation(param);
  return result;
}
```

## Error Standards

**Base error**: `GASDBError`  
**Common errors**: `DocumentNotFoundError`, `DuplicateKeyError`, `InvalidQueryError`, `LockTimeoutError`, `FileIOError`, `ConflictError`, `InvalidArgumentError`, and similar domain-specific errors  
**Error codes**: `'DOCUMENT_NOT_FOUND'`, `'DUPLICATE_KEY'`, `'INVALID_QUERY'`, `'LOCK_TIMEOUT'`, `'FILE_IO_ERROR'`, `'CONFLICT_ERROR'`, `'INVALID_ARGUMENT'`, etc.  
**Message format**: `"Operation failed: specific reason"`


## Implementation Requirements

**Every class**: Constructor validates inputs, JSDoc on all methods, follows naming conventions and error handling patterns  
**Every test**: Descriptive function names, Arrange-Act-Assert pattern, independent execution, mock dependencies
**Create a new branch**: Create a new branch when implementing a new feature.

Follow TDD process as outlined in Core Principles.

## After Implementation
1. Run `clasp push`.
2. Ask the user to run the tests and await further instructions.

** REMEMBER **: Always write concisely using British English
