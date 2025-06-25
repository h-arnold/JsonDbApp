# GAS DB Code Generation Guidelines (LLM-Optimised)

## Overview
- Synchronous document DB for Google Apps Script (GAS), MongoDB-like syntax.
- CRUD on named collections (JSON files in Google Drive).
- Access via authenticated Apps Script libraries.
- Consistency via ScriptProperties-based master index.

## Core Principles
- **TDD**: Red-Green-Refactor. Write failing tests first, minimal passing code, then refactor.
- **Component Separation**: Single responsibility, dependency injection via constructor.
- **SOLID**: Follow SOLID principles.
- **Reuse**: Check for existing functionality before new code.
- **GAS Limitations**: V8 engine, not full JS support.
- **Style**: Concise, analytical, British English (except for American APIs). Challenge incorrect assumptions.

## File Structure

- `docs/`: General and planning docs
- `docs/developers/`: Feature and class docs
- `src/01_utils/`: ErrorHandler.js, GASDBLogger.js, IdGenerator.js, ObjectUtils.js, Validation.js
- `src/02_components/`: CollectionMetadata.js, DocumentOperations.js, FileOperations.js, QueryEngine.js, UpdateEngine.js
- `src/03_services/`: DbLockService.js, FileService.js
- `src/04_core/`: Collection.js, Database.js, DatabaseConfig.js, MasterIndex.js
- `tests/data/`: Mock data for tests
- `tests/framework/`: AssertionUtilities.js, TestFramework.js, TestResult.js, TestRunner.js, TestSuite.js
- `tests/integration/`: Integration test suites (e.g. Collection, MasterIndexCollectionMetadataIntegrationTest.js)
- `tests/unit/`: Unit test suites (e.g. Collection, DbLockService, DocumentOperations, UtilityTests, etc.)
- `test-runner.sh`: Test runner script
- `clasp-watch.sh`: Clasp watch script
- `README.md`, `LICENSE`, `package.json`, `appsscript.json`: Project config and metadata

## Naming Conventions
- **Classes**: PascalCase (e.g. `DocumentOperations`)
- **Methods**: camelCase (`insertDocument`)
- **Private methods**: `_underscore` prefix
- **Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Private properties**: `this._underscore`
- **Files**: Match class name
- **Tests**: `ClassNameTest.js`
- **Test functions**: `testClassNameScenario`
- **Errors**: End with `Error`
- **Config**: `config` or `componentConfig`

## Method Template
```javascript
/**
 * Description
 * @param {Type} param - Description
 * @returns {Type} Description  
 * @throws {ErrorType} When thrown
 */
methodName(param) {
  if (!param) throw new ErrorHandler.ErrorTypes.INVALID_ARGUMENT('param', param, 'param is required');
  const result = this._performOperation(param);
  return result;
}
```

## Error Standards
- **Base**: `GASDBError`
- **Common**: `DocumentNotFoundError`, `DuplicateKeyError`, `InvalidQueryError`, `LockTimeoutError`, `FileIOError`, `ConflictError`, `InvalidArgumentError`
- **Codes**: `'DOCUMENT_NOT_FOUND'`, `'DUPLICATE_KEY'`, etc.
- **Message**: `"Operation failed: specific reason"`

## Implementation Requirements
- **Classes**: Constructor validates inputs, JSDoc on all methods, naming/error patterns.
- **Tests**: Descriptive, Arrange-Act-Assert, independent, per-class folder, per-suite file, orchestrator for all tests.
- **Serialisation**: Use `ObjectUtils.serialise()`/`deserialise()`. Classes needing serialisation: implement `toJSON()`, static `fromJSON()`, register in `ObjectUtils._classRegistry`.
- **Validation**: Use `Validate` class; class-specific validation as private method.
- **TDD**: Always follow Red-Green-Refactor.

## After Implementation
1. Run `clasp push`.
2. Ask user to run tests and await instructions.

**Always write concisely in British English.**
