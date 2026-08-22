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
- `.opencode/agents/`: Sub-agent definitions (one Markdown config per agent; see _Calling Sub-Agents_ below)
- `src/01_utils/`: ComparisonUtils.js, ErrorHandler.js, FieldPathUtils.js, JDbLogger.js, IdGenerator.js, ObjectUtils.js, Validation.js
- `src/02_components/`: CollectionCoordinator.js, CollectionMetadata.js, DocumentOperations.js, FileOperations.js
  - `src/02_components/QueryEngine/`: 01_QueryEngineValidation.js, 02_QueryEngineMatcher.js, 99_QueryEngine.js (multi-file structure)
  - `src/02_components/UpdateEngine/`: 01_UpdateEngineFieldOperators.js, 02_UpdateEngineArrayOperators.js, 03_UpdateEngineFieldPathAccess.js, 04_UpdateEngineValidation.js, 99_UpdateEngine.js (multi-file structure)
- `src/03_services/`: DbLockService.js, FileService.js
- `src/04_core/`: Database.js, DatabaseConfig.js, MasterIndex.js, 99_PublicAPI.js
  - `src/04_core/Collection/`: 01_CollectionReadOperations.js, 02_CollectionWriteOperations.js, 99_Collection.js (multi-file structure)
  - `src/04_core/Database/`: 01_DatabaseLifecycle.js through 04_DatabaseMasterIndexOperations.js, 99_Database.js (multi-file structure)
  - `src/04_core/MasterIndex/`: 01_MasterIndexMetadataNormaliser.js, 02_MasterIndexLockManager.js, 04_MasterIndexConflictResolver.js, 99_MasterIndex.js (multi-file structure)
- `tests/vitest.config.js`: Vitest configuration (include patterns pick up `tests/unit/**/*.test.js` and `tests/helpers/**/*.test.js`)
- `tests/setup/gas-mocks.setup.js`: Vitest setup injecting the mocked GAS surface (`DriveApp`, `PropertiesService`, `LockService`, etc.) via `tools/gas-mocks/`
- `tests/data/`: MockQueryData.js (and other mock data)
- `tests/helpers/`: Shared per-component test helpers (`*-test-helpers.js`)
- `tests/unit/`: Unit test suites by component folder:
  - Kebab-case folders: collection/, collection-coordinator/, collection-metadata/, database/, db-lock-service/, document-operations/, master-index/, utils/, validation/
  - Legacy PascalCase folders: DatabaseConfig/, FileOperations/, FileService/, MasterIndex/, QueryEngine/, UpdateEngine/ (folder casing is currently mixed; use kebab case for new folders)
- `README.md`, `LICENSE`, `package.json`, `appsscript.json`: Project config and metadata

## Naming Conventions

- **Classes**: PascalCase (e.g. `DocumentOperations`)
- **Methods**: camelCase (`insertDocument`)
- **Private methods**: `_underscore` prefix
- **Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Private properties**: `this._underscore`
- **Files**: Match class name
- **Multi-file classes**: For large classes (e.g. Collection), use numbered file prefixes (01__, 02__, 99_*) to control load order; `99_*.js` composes/exports the class
- **Tests**: `<topic>.test.js` under `tests/unit/<component>/` in kebab case (the Vitest include patterns only pick up `*.test.js` files)
- **Test functions**: behaviour-focused `it(...)` descriptions grouped in `describe(...)` blocks named after the class/component under test
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
- **Tests**: Descriptive, Arrange-Act-Assert, independent; one suite per component under `tests/unit/<component>/`; Vitest discovers suites automatically via `tests/vitest.config.js`.
- **Serialisation**: Use `ObjectUtils.serialise()`/`deserialise()`. Classes needing serialisation: implement `toJSON()`, static `fromJSON()`, register in `ObjectUtils._classRegistry`.
- **Validation**: Use `Validate` class; class-specific validation as private method.
- **Fail Fast and Loud**: This is a prime directive. Do not add fallbacks or defaults unless they are explicitly requested by the user or task requirements. When a dependency is missing or state is invalid, surface the error immediately and clearly instead of recovering silently.
- **TDD**: Always follow Red-Green-Refactor.
- **Linting**: `no-magic-numbers` is an error for source code. Tests may use numeric literals for clarity because the rule is disabled for `tests/**/*.js`.

## Calling Sub-Agents

Agent definitions live in `.opencode/agents/` (one Markdown config per agent). These files are the source of truth for each agent's role, workflow, validation gates, and reporting format. Read the relevant file before delegating to an agent.

MANDATORY: Every sub-agent delegation must explicitly name the target agent (names are case-sensitive). Delegations that omit the agent name violate the workflow contract and should be rejected/retried.

### Available Sub-Agents

The following specialized agents are available (names are case-sensitive; definition path in parentheses):

1. **Agent Orchestrator** (`.opencode/agents/agent-orchestrator.md`) - Coordinates subagents through structured implement/review loops
2. **Action Plan Implementer** (`.opencode/agents/action-plan-implementer.md`) - Delivers `ACTION_PLAN.md` in a strict TDD-first workflow with baseline/regression/commit gates
3. **Planner** (`.opencode/agents/planner.md`) - Creates `SPEC.md` and `ACTION_PLAN.md` through clarification-driven planning
4. **Planner Reviewer** (`.opencode/agents/planner-reviewer.md`) - Impartial second-pass review of planning artefacts
5. **Implementation** (`.opencode/agents/implementation.md`) - Implements code changes; handoff blocked until lint/tests pass with zero errors and zero warnings
6. **Testing Specialist** (`.opencode/agents/testing-specialist.md`) - Creates, maintains, and debugs Vitest unit tests using the GAS mocks
7. **Code Reviewer** (`.opencode/agents/code-reviewer.md`) - Reviews source and test code for standards compliance and defects:
   - Lint compliance (0 errors, 0 warnings - NON-NEGOTIABLE)
   - DRY principles (no code duplication)
   - SOLID principles
   - Idiomatic JavaScript/GAS patterns
   - Architecture compliance
   - Complete JSDoc documentation (`@param`, `@returns`, `@throws`, `@remarks`)
   - Proper error handling (`ErrorHandler.ErrorTypes`, project error codes)
8. **De-Sloppification** (`.opencode/agents/de-sloppification.md`) - Finds and removes AI-slop, duplication, unnecessary complexity, and stale code
9. **Data Shapes Agent** (`.opencode/agents/data-shapes-agent.md`) - Maintains canonical data-shape specifications under `docs/developers/data-shapes/`
10. **Docs** (`.opencode/agents/docs.md`) - Keeps documentation accurate and current:
    - Ensures docs match code changes
    - Updates developer documentation (`docs/developers/`) and user guides (`docs/`)
    - Updates agent instructions when workflows change
    - Verifies code examples are current
    - Maintains cross-references
11. **Kif** (`.opencode/agents/kif.md`) - Performs simple, menial tasks with minimal judgement (searching, locating files, read-only git commands)

### Mandatory Code Review Process

**NON-NEGOTIABLE REQUIREMENT**: All non-trivial code changes MUST be verified by the appropriate review agent before a task can be considered complete.

**Source Code Changes:**

- New classes or significant modifications → `Implementation` followed by `Code Reviewer`
- Refactoring existing classes → `Implementation` (multi-file structure, Collection pattern) followed by `Code Reviewer`; a `De-Sloppification` pass is recommended for larger refactors
- Must pass lint with 0 errors, 0 warnings
- Must pass all tests

**Test Code Changes:**

- New or modified tests → `Testing Specialist` followed by `Code Reviewer`
- Must pass lint with 0 errors, 0 warnings
- Must maintain or improve coverage

**Documentation Review (Final Step):**

- After code review passes → `Docs`
- Updates developer docs to match code changes
- Updates agent instructions with new patterns/helpers
- Verifies all code examples are current
- Required for all non-trivial changes

**Planning Artefacts:**

- New features or multi-step work → `Planner` for `SPEC.md`/`ACTION_PLAN.md`, reviewed by `Planner Reviewer`

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

When delegating, name the target agent, state the outcome required, and pass task-specific context as `@`-prefixed worktree-relative paths (opencode injects the contents of each `@path` token automatically):

```text
Mandatory reading:
- @ACTION_PLAN.md (section 3)
- @src/02_components/UpdateEngine/99_UpdateEngine.js
- @tests/unit/update-engine/update-engine-operators.test.js

Testing Specialist, add Vitest coverage for the new update-operator validation behaviour
using the existing GAS mock helpers. All checks must pass with zero errors and zero warnings.
```

For source code review, the same pattern applies with `Code Reviewer` as the named agent and the changed files passed as `@`-prefixed paths.

### Review Agent Workflow

1. **Make Changes**: Implement the requested functionality
2. **Self-Check**: Run lint and tests locally
3. **Call Review Agent**: Pass to appropriate review agent (`Code Reviewer` for source and test changes)
4. **Address Feedback**: Fix any issues identified by review agent
5. **Final Verification**: Confirm 0 lint errors/warnings and all tests pass
6. **Documentation Review**: Pass to `Docs` to update docs
7. **Complete Task**: Only mark complete after all reviews approved

**Always write concisely in British English.**
