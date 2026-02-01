# Custom Test Agents

This directory contains specialized agents for working with the JsonDbApp test suite.

## Available Agents

### 1. Test Creation Agent (`test-creation-agent.md`)

**Purpose**: Creates high-quality Vitest tests following project conventions.

**Use when**:
- Creating new test files
- Refactoring tests from old framework to Vitest
- Adding test coverage for new features

**Key features**:
- Knows the Vitest framework and GAS mocks setup
- Enforces DRY principles and lint compliance
- Maintains helper function registry
- Follows Arrange-Act-Assert pattern

**Usage**:
Delegate test creation tasks to this agent with instructions like:
```
Create tests for [component] that cover [scenarios].
Use the test-creation-agent instructions.
```

### 2. Test Code Review Agent (`test-code-review-agent.md`)

**Purpose**: Reviews test code for quality, correctness, and compliance.

**Use when**:
- Reviewing newly created tests
- Verifying refactored tests
- Quality checking before merge

**Key features**:
- Checks completeness (all tests covered)
- Enforces DRY (no code duplication)
- Verifies lint compliance (0 errors, 0 warnings)
- Validates idiomatic patterns
- Ensures proper helper usage

**Usage**:
Delegate code review tasks to this agent with instructions like:
```
Review the test files in [directory] for quality and compliance.
Use the test-code-review-agent instructions.
```

## Agent Responsibilities

Both agents are responsible for:
- **Maintaining helper lists**: When helpers are added/modified, both agent instruction files must be updated
- **Lint enforcement**: All code must pass `npx eslint 'tests/**/*.js' --ext .js` with 0 errors, 0 warnings
- **DRY compliance**: No code duplication - extract to helpers
- **Test quality**: Proper isolation, cleanup, and coverage

## Test Framework Documentation

See `tests/README.md` for the full testing framework documentation that these agents are based on.

## Updating Agent Instructions

When updating these agents:

1. **Update both files** when:
   - Adding new test helpers
   - Changing helper signatures
   - Modifying test patterns
   - Updating framework configuration

2. **Keep consistent**:
   - Helper function lists must match in both files
   - Framework documentation should be consistent
   - Examples should follow same patterns

3. **Test the changes**:
   - Use the agents to create/review test code
   - Verify they produce correct results
   - Ensure lint checks pass

## Integration with Workflow

These agents are designed to work with the test refactoring workflow:

1. **Creation Agent** creates tests following framework patterns
2. **Review Agent** validates the created tests
3. If issues found, **Review Agent** fixes them
4. Final verification: all tests pass, lint clean

This ensures high-quality, maintainable test code throughout the project.
