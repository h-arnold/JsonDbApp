# Custom Agents

This directory contains the GitHub Copilot agent configs for JsonDbApp.

## Available Agents

### 1. Code Review Agent (`code-review-agent.md`)

Reviews source code for lint compliance, DRY, SOLID, JSDoc, architecture compliance, and error handling.

### 2. Test Review Agent (`test-code-review-agent.md`)

Reviews test code for lint compliance, DRY, completeness, helper usage, and test isolation.

### 3. Test Creation Agent (`test-creation-agent.md`)

Creates Vitest tests that follow the project testing conventions and helper patterns.

### 4. Refactoring Agent (`refactoring-agent.md`)

Refactors large classes into the multi-file Collection pattern while preserving behaviour and test compatibility.

### 5. docs-review-agent (`docs-review-agent.md`)

Reviews and updates documentation, agent instructions, and code examples to match code changes.

## Source of Truth

These configs mirror `.github/copilot-instructions.md`. Update both locations when agent responsibilities change.
