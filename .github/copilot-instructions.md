# GAS DB Code Generation Instructions

## Overview

A synchronous document database for Google Apps Script, using MongoDB-like syntax. Supports CRUD on named collections, each stored as a JSON file in Google Drive. Access is via authenticated Apps Script libraries. Data consistency is managed with a ScriptProperties-based master index.

## Documentation Reference

## Core Principles

**TDD**: Red-Green-Refactor cycle. Write failing tests first, implement minimal passing code, then refactor.  
**Component Separation**: Single responsibility classes with dependency injection via constructor.
**SOLID Principles**: Follow SOLID principles for maintainable code.
**Search for existing functionality**: Before implementing new features, check if they already exist in the codebase.
**GAS Limitations**: Remember that Google App Script uses the V8 Engine, but this does not provide full javascript support.
**Concise Writing**: Write code, docmentations and plans that are concise and to the point, avoiding unnecessary verbosity.  
**British English**: All naming, documentation, comments use British English unless referencing American English APIs.

## File Structure

```
docs/developer: docs for all implemented features
src/core/: MasterIndex.js, Database.js, DatabaseConfig.js
src/components/:FileOperations.js
src/services/: FileService.js
src/utils/: GASDBLogger.js, ErrorHandler.js, IdGenerator.js
tests/unit/, tests/integration/ 
tests/test-framework/AssertionUtilities.js, TestExecution.js, TestRunner.js, UnifiedTestExecution.js
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


## Implementation Requirements

**Every class**: PascalCase name, constructor validates inputs, JSDoc on all methods, error handling patterns, component separation  
**Every test**: Matches `ClassNameTest.js`, descriptive function names, Arrange-Act-Assert pattern, independent execution, mock dependencies

Follow TDD process: Write failing tests → Implement minimal code → Refactor → Verify completion criteria → Proceed to next section.

## After you have implemented the code
1. Run `clasp push`.
2. Ask the user to run the tests and await further instructions.

** REMEMBER **: Always write using British English
