# GAS DB Code Generation Instructions

## Overview

A synchronous document database for Google Apps Script, using MongoDB-like syntax. Supports CRUD on named collections, each stored as a JSON file in Google Drive. Access is via authenticated Apps Script libraries. Data consistency is managed with a ScriptProperties-based master index.

## Core Principles

**TDD**: Red-Green-Refactor cycle. Write failing tests first, implement minimal passing code, then refactor.  
**Component Separation**: Single responsibility classes with dependency injection via constructor.
**GAS Limitations**: Remember that Google App Script uses the V8 Engine, but this does not provide full javascript support.  
**British English**: All naming, documentation, comments use British English unless referencing American English APIs.

## File Structure

```
src/core/: Database.js, Collection.js, MasterIndex.js
src/components/: DocumentOperations.js, CollectionMetadata.js, FileOperations.js, FileCache.js  
src/engines/: QueryEngine.js, UpdateEngine.js
src/services/: FileService.js
src/utils/: Logger.js (GASDBLogger), ErrorHandler.js, IdGenerator.js
tests/unit/, tests/integration/, tests/utils/
```

## Naming Conventions

**Classes**: PascalCase (`DocumentOperations`, `FileService`)  
**Methods**: camelCase (`insertDocument`, `findOne`)  
**Private methods**: `_underscore` prefix (`_validateDocument`)  
**Variables**: camelCase (`collectionName`, `fileId`)  
**Constants**: `UPPER_SNAKE_CASE` (`LOCK_TIMEOUT`, `MAX_RETRIES`)  
**Private properties**: `this._underscore` (`this._documents`)  
**Files**: Match class name (`DocumentOperations.js`)  
**Tests**: `ClassNameTest.js` (`DocumentOperationsTest.js`)  
**Test functions**: `testClassNameScenario` (`testCollectionInsertOne`)  
**Mock objects**: `createMockClassName` (`createMockFileService`)  
**Error classes**: End with `Error` (`DocumentNotFoundError`)  
**Config objects**: `config` or `componentConfig` (`dbConfig`, `lockConfig`)

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
**Specific errors**: `DocumentNotFoundError`, `LockTimeoutError`, `ConflictError`  
**Error codes**: `'DOCUMENT_NOT_FOUND'`, `'LOCK_TIMEOUT'`  
**Message format**: `"Operation failed: specific reason"`

## Test Structure

```javascript
function testClassNameMethod() {
  const suite = new TestSuite('ClassName.methodName');
  
  suite.addTest('should behaviour when condition', () => {
    // Arrange
    // Act
    // Assert
  });
  
  return suite.run();
}
```

## Implementation Requirements

**Every class**: PascalCase name, constructor validates inputs, JSDoc on all methods, error handling patterns, component separation  
**Every test**: Matches `ClassNameTest.js`, descriptive function names, Arrange-Act-Assert pattern, independent execution, mock dependencies

**Key constants**: `LOCK_TIMEOUT`, `MAX_CACHE_SIZE`, `DEFAULT_LOCK_TIMEOUT`, `MASTER_INDEX_KEY`

Follow TDD process: Write failing tests → Implement minimal code → Refactor → Verify completion criteria → Proceed to next section.
