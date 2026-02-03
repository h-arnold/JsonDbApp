# JsonDbApp Code Generation Guidelines

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
- `src/01_utils/`: ComparisonUtils.js, ErrorHandler.js, JDbLogger.js, IdGenerator.js, ObjectUtils.js, Validation.js
- `src/02_components/`: CollectionCoordinator.js, CollectionMetadata.js, DocumentOperations.js, FileOperations.js, QueryEngine.js, UpdateEngine.js
- `src/03_services/`: DbLockService.js, FileService.js
- `src/04_core/`: Database.js, DatabaseConfig.js, MasterIndex.js
  - `src/04_core/Collection/`: 01_CollectionReadOperations.js, 02_CollectionWriteOperations.js, 99_Collection.js (composed into a single Collection class at runtime)
- `tests/data/`: MockQueryData.js (and other mock data)
- `tests/framework/`: 01_AssertionUtilities.js, 02_TestResult.js, 03_TestRunner.js, 04_TestSuite.js, 05_TestFramework.js
- `tests/unit/`: Unit test suites by class/component:
  - Collection/ (multiple test suites)
  - CollectionCoordinator/ (multiple test suites)
  - DbLockService/
  - DocumentOperations/
  - UtilityTests/
  - ...
- `tests/validation/`: Operator validation suites and orchestrator
- `README.md`, `LICENSE`, `package.json`, `appsscript.json`: Project config and metadata

## Naming Conventions

- **Classes**: PascalCase (e.g. `DocumentOperations`)
- **Methods**: camelCase (`insertDocument`)
- **Private methods**: `_underscore` prefix
- **Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Private properties**: `this._underscore`
- **Files**: Match class name
- **Multi-file classes**: For large classes (e.g. Collection), use numbered file prefixes (01*, 02*, 99*) to control load order; `99*\*.js` composes/exports the class
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
 * @remarks *optional*: Additional notes explaining nuances, reasoning behind design choices or explaining the logic flow of complex methods.
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
- **Additional in project**: `MasterIndexError`, `CollectionNotFoundError`, `ConfigurationError`, `FileNotFoundError`, `PermissionDeniedError`, `QuotaExceededError`, `InvalidFileFormatError`, `OperationError`, `LockAcquisitionFailureError`, `ModificationConflictError`, `CoordinationTimeoutError`
- **Codes**: `'DOCUMENT_NOT_FOUND'`, `'DUPLICATE_KEY'`, `'INVALID_QUERY'`, `'LOCK_TIMEOUT'`, `'FILE_IO_ERROR'`, `'CONFLICT_ERROR'`, `'INVALID_ARGUMENT'`, `'MASTER_INDEX_ERROR'`, `'COLLECTION_NOT_FOUND'`, `'CONFIGURATION_ERROR'`, `'FILE_NOT_FOUND'`, `'PERMISSION_DENIED'`, `'QUOTA_EXCEEDED'`, `'INVALID_FILE_FORMAT'`, `'OPERATION_ERROR'`, `'LOCK_ACQUISITION_FAILURE'`, `'MODIFICATION_CONFLICT'`, `'COORDINATION_TIMEOUT'`
- **Message**: `"Operation failed: specific reason"`

## Implementation Requirements

- **Classes**: Constructor validates inputs, JSDoc on all methods, naming/error patterns.
- **Tests**: Descriptive, Arrange-Act-Assert, independent, per-class folder, per-suite file, orchestrator for all tests.
- **Serialisation**: Use `ObjectUtils.serialise()`/`deserialise()`. Classes needing serialisation: implement `toJSON()`, static `fromJSON()`, register in `ObjectUtils._classRegistry`.
- **Validation**: Use `Validate` class; class-specific validation as private method.
- **TDD**: Always follow Red-Green-Refactor.
- **Linting**: `no-magic-numbers` is an error for source code. Tests may use numeric literals for clarity because the rule is disabled for `tests/**/*.js`.

## Calling Sub-Agents

MANDATORY: Every #runSubagent call must include the agent name. Calls that omit this parameter violate the workflow contract and should be rejected/retried.

### Available Sub-Agents

The following specialized agents are available (names are case-sensitive):

1. **Code Review Agent** - Reviews source code for:
   - Lint compliance (0 errors, 0 warnings - NON-NEGOTIABLE)
   - DRY principles (no code duplication)
   - SOLID principles
   - Idiomatic JavaScript/GAS patterns
   - Architecture compliance
   - Complete JSDoc documentation
   - Proper error handling

2. **Test Review Agent** - Reviews test code for:
   - Lint compliance (0 errors, 0 warnings - NON-NEGOTIABLE)
   - Test framework compliance (Vitest patterns)
   - DRY principles (no duplication)
   - Proper helper usage
   - Complete test coverage
   - Proper cleanup and isolation

3. **Test Creation Agent** - Creates new Vitest tests:
   - Follows project testing conventions
   - Uses existing test helpers
   - Maintains DRY principles
   - Ensures lint compliance
   - Documents GAS mock limitations

4. **Refactoring Agent** - Refactors large classes:
   - Splits into multi-file structure (Collection pattern)
   - Maintains test compatibility
   - Ensures SOLID compliance
   - Preserves all functionality

5. **docs-review-agent** - Reviews and updates documentation:
   - Ensures docs match code changes
   - Updates developer documentation
   - Updates agent instructions
   - Verifies code examples are current
   - Maintains cross-references

### Mandatory Code Review Process

**NON-NEGOTIABLE REQUIREMENT**: All non-trivial code changes MUST be verified by the appropriate review agent before a task can be considered complete.

**Source Code Changes:**

- New classes or significant modifications → `code-review-agent`
- Refactoring existing classes → `refactoring-agent` followed by `code-review-agent`
- Must pass lint with 0 errors, 0 warnings
- Must pass all tests

**Test Code Changes:**

- New tests → `test-creation-agent` followed by `test-code-review-agent`
- Modified tests → `test-code-review-agent`
- Must pass lint with 0 errors, 0 warnings
- Must maintain or improve coverage

**Documentation Review (Final Step):**

- After code review passes → `docs-review-agent`
- Updates developer docs to match code changes
- Updates agent instructions with new patterns/helpers
- Verifies all code examples are current
- Required for all non-trivial changes

**What Counts as Trivial:**

- Single-line documentation fixes
- Typo corrections in comments
- Whitespace/formatting only changes
- Version number updates

**What Requires Review:**

- Any logic changes
- New methods or classes
- Refactoring
- Error handling changes
- Algorithm modifications
- Test additions or modifications

### Usage Example

When you need to review code, call the appropriate agent:

```javascript
// For source code review
runSubagent({
  prompt:
    'Please review the new UpdateEngine class for lint compliance, DRY, SOLID, and proper documentation.',
  description: 'Code review for UpdateEngine',
  agentName: 'Code Review Agent'
});

// For test review
runSubagent({
  prompt:
    'Please review the CollectionReadOperations tests for completeness, DRY, and lint compliance.',
  description: 'Test review for CollectionReadOperations',
  agentName: 'Test Review Agent'
});
```

### Review Agent Workflow

1. **Make Changes**: Implement the requested functionality
2. **Self-Check**: Run lint and tests locally
3. **Call Review Agent**: Pass to appropriate review agent (code or test review)
4. **Address Feedback**: Fix any issues identified by review agent
5. **Final Verification**: Confirm 0 lint errors/warnings and all tests pass
6. **Documentation Review**: Pass to `docs-review-agent` to update docs
7. **Complete Task**: Only mark complete after all reviews approved

**Always write concisely in British English.**
