# QueryEngine Developer Documentation

- [QueryEngine Developer Documentation](#queryengine-developer-documentation)
  - [Overview](#overview)
  - [Core Principles](#core-principles)
  - [Composition and entry point](#composition-and-entry-point)
  - [Supported Query Operators](#supported-query-operators)
  - [Error Handling](#error-handling)
  - [Query Validation System](#query-validation-system)
    - [Input Validation](#input-validation)
    - [Structure Validation](#structure-validation)
    - [Security Features](#security-features)

## Overview

The `QueryEngine` class filters in-memory documents with MongoDB-style query objects. For the query language itself, see [Querying Collections](../Querying.md).

**Key Responsibilities:**

- Parsing and validating query objects.
- Matching documents against query criteria.
- Supporting nested field queries using dot notation.
- Handling supported data types and operators.

**Dependencies:**

- `InvalidQueryError` and `InvalidArgumentError`: For standardised error reporting.
- `Validate`: For input validation and type checking.
- `JDbLogger`: For component logging and debugging.

## Core Principles

- **Read-Only Operations**: The engine only filters documents; it does not modify them.
- **Dot notation**: Nested fields are addressed with dot-separated paths.

## Composition and entry point

`QueryEngine` is a facade. Its public entry point, `executeQuery(documents, query)`, validates the query with `QueryEngineValidation` and then delegates filtering to `QueryEngineMatcher`. Parameter, return and error contracts live on the symbols.

- [`QueryEngine`](../../src/02_components/QueryEngine/99_QueryEngine.js) — facade and public entry point.
- [`QueryEngineValidation`](../../src/02_components/QueryEngine/01_QueryEngineValidation.js) — `validateQuery` checks inputs, operator support and nesting depth.
- [`QueryEngineMatcher`](../../src/02_components/QueryEngine/02_QueryEngineMatcher.js) — `filterDocuments` evaluates documents; `COMPARISON_EVALUATORS` maps `$eq`, `$gt` and `$lt` to `ComparisonUtils`.

Equality and ordering are non-coercive: types must match, so a numeric string does not match a number. See [`ComparisonUtils`](../../src/01_utils/ComparisonUtils.js).

> **Timing:** `executeQuery` emits a DEBUG-gated `queryEngine.executeQuery` timing event, and
> the matcher emits `queryEngine.filterDocuments`; see
> [Infrastructure Components — Execution-Time Tracking](Infrastructure_Components.md#1205-execution-time-tracking).

## Supported Query Operators

Supported operators are `$eq`, `$gt`, `$lt`, `$and` and `$or`. Defaults come from `DatabaseConfig` and can be overridden through the `QueryEngine` constructor; other operators are rejected.

- `$eq`: equality, implicit for a simple field-value pair.
- `$gt`: greater than.
- `$lt`: less than.
- `$and`: every clause must match, implicit when several fields share one level.
- `$or`: at least one clause must match.

## Error Handling

The `QueryEngine` uses the following error types for different issues:

- `InvalidQueryError`: For query structure problems such as:
  - Unrecognised query operators
  - Invalid operator syntax or values (e.g., `$and` without an array value)
  - Query nesting depth exceeded
- `InvalidArgumentError`: For input validation problems such as:
  - Non-array documents parameter
  - Null, undefined, string, or array query parameters

## Query Validation System

`QueryEngineValidation` runs before matching; its `validateQuery` method owns the checks below.

### Input Validation

- `documents` must be an array.
- `query` must be a non-null, non-array object. These checks run before matching.

### Structure Validation

- Nesting cannot exceed `maxNestedDepth`.
- Only supported operators are accepted, and nested query structures are checked recursively.

### Security Features

- Depth limits bound recursion and prevent excessive processing.
- Errors identify the invalid input so callers can correct it.
