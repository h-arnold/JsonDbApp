# QueryEngine Developer Documentation

- [QueryEngine Developer Documentation](#queryengine-developer-documentation)
  - [Overview](#overview)
  - [Core Principles](#core-principles)
  - [API Reference](#api-reference)
    - [`constructor(config)`](#constructorconfig)
    - [`executeQuery(documents, query)`](#executequerydocuments-query)
    - [`_matchDocument(document, query)`](#_matchdocumentdocument-query)
    - [`_matchField(document, fieldPath, queryValue)`](#_matchfielddocument-fieldpath-queryvalue)
    - [`_compareValues(documentValue, queryValue, operator)`](#_comparevaluesdocumentvalue-queryvalue-operator)
    - [`_getFieldValue(document, fieldPath)`](#_getfieldvaluedocument-fieldpath)
    - [`_isOperatorObject(value)`](#_isoperatorobjectvalue)
    - [`_matchOperators(documentValue, operators)`](#_matchoperatorsdocumentvalue-operators)
    - [Shared Comparison Utilities](#shared-comparison-utilities)
    - [`_validateQuery(documents, query)`](#_validatequerydocuments-query)
    - [`_validateQueryInputs(documents, query)`](#_validatequeryinputsdocuments-query)
    - [`_validateQueryDepth(obj, depth)`](#_validatequerydepthobj-depth)
    - [`_validateOperators(query)`](#_validateoperatorsquery)
    - [`_findOperators(obj, operators)`](#_findoperatorsobj-operators)
    - [`_validateOperatorValues(query)`](#_validateoperatorvaluesquery)
    - [`_validateOperatorValuesRecursive(obj, depth)`](#_validateoperatorvaluesrecursiveobj-depth)
    - [`_matchLogicalAnd(document, conditions)`](#_matchlogicalanddocument-conditions)
    - [`_matchLogicalOr(document, conditions)`](#_matchlogicalordocument-conditions)
  - [Supported Query Operators](#supported-query-operators)
    - [Currently Supported Operators](#currently-supported-operators)
  - [Usage Examples](#usage-examples)
    - [Simple Equality Match](#simple-equality-match)
    - [Using Comparison Operators](#using-comparison-operators)
    - [Using Logical Operators](#using-logical-operators)
    - [Querying Nested Fields](#querying-nested-fields)
    - [Querying Array Fields](#querying-array-fields)
    - [Future Array Operators (Not Yet Implemented)](#future-array-operators-not-yet-implemented)
  - [Error Handling](#error-handling)
  - [Query Validation System](#query-validation-system)
    - [Input Validation](#input-validation)
    - [Structure Validation](#structure-validation)
    - [Security Features](#security-features)
    - [Validation Process](#validation-process)
  - [Best Practices](#best-practices)

## Overview

The `QueryEngine` class is responsible for filtering a list of documents based on a MongoDB-style query object. It evaluates documents against query criteria, supporting a variety of comparison, logical, and element operators.

**Key Responsibilities:**

- Parsing and validating query objects.
- Matching documents against complex query criteria.
- Supporting nested field queries using dot notation.
- Handling various data types and operators.

**Dependencies:**

- `InvalidQueryError` and `InvalidArgumentError`: For standardised error reporting.
- `Validate`: For input validation and type checking.
- `JDbLogger`: For component logging and debugging.

## Core Principles

- **MongoDB-like Syntax**: The query language closely mirrors MongoDB's query syntax for familiarity and ease of use.
- **Read-Only Operations**: The engine only filters documents; it does not modify them.
- **Extensibility**: Designed to allow for the addition of new query operators.
- **Performance Considerations**: While aiming for comprehensive functionality, it's mindful of the Google Apps Script environment's limitations.

## API Reference

### `constructor(config)`

Creates a new `QueryEngine` instance with optional configuration.

**Parameters:**

- `config` (Object, optional): Configuration object with the following optional properties:
  - `maxNestedDepth` (Number): Maximum allowed query nesting depth (defaults to 10)

**Example:**

```javascript
// Default configuration
const queryEngine = new QueryEngine();

// Custom configuration
const queryEngine = new QueryEngine({ maxNestedDepth: 5 });
```

### `executeQuery(documents, query)`

Filters an array of documents based on the provided query object.

**Parameters:**

- `documents` (Array\<Object>): An array of documents to query.
- `query` (Object): The MongoDB-style query object.

**Returns:**

- `Array<Object>`: An array containing only the documents that match the query.

**Example:**

```javascript
const queryEngine = new QueryEngine();
const docs = [
  { name: 'Alice', age: 30, city: 'New York' },
  { name: 'Bob', age: 24, city: 'London' },
  { name: 'Charlie', age: 30, city: 'Paris' }
];

const results = queryEngine.executeQuery(docs, { age: 30, city: 'New York' });
// results: [{ name: "Alice", age: 30, city: "New York" }]
```

### `_matchDocument(document, query)`

(Private) Determines if a single document matches the given query. This method iterates through the query conditions and evaluates them against the document, handling both logical operators and field-based queries.

**Parameters:**

- `document` (Object): The document to evaluate.
- `query` (Object): The query object or a sub-query object.

**Returns:**

- `Boolean`: `true` if the document matches the query, `false` otherwise.

### `_matchField(document, fieldPath, queryValue)`

(Private) Evaluates a specific field's value against a query condition, which can be a simple value for equality or an object containing query operators (e.g., `{ $gt: 10 }`).

**Parameters:**

- `document` (Object): The document to test.
- `fieldPath` (String): Field path (supports dot notation).
- `queryValue` (\*|Object): Expected value or operator object.

**Returns:**

- `Boolean`: `true` if the field matches the query, `false` otherwise.

### `_compareValues(documentValue, queryValue, operator)`

(Private) Compares values using a specified operator such as `$eq`, `$gt`, or `$lt`.

**Parameters:**

- `documentValue` (\*): Value from document.
- `queryValue` (\*): Value from query.
- `operator` (String): Comparison operator (`$eq`, `$gt`, `$lt`).

**Returns:**

- `Boolean`: `true` if comparison succeeds, `false` otherwise.

**Throws:**

- `InvalidQueryError`: If an unsupported operator is encountered.

### `_getFieldValue(document, fieldPath)`

(Private) Retrieves a value from a document using a dot-notation path. Handles nested objects.

**Parameters:**

- `document` (Object): The document to read from.
- `fieldPath` (String): The dot-notation path (e.g., `"address.street"`).

**Returns:**

- `*`: The value at the specified path, or `undefined` if the path does not exist.

### `_isOperatorObject(value)`

(Private) Checks if a value represents an operator object (plain object, not Date or Array).

**Parameters:**

- `value` (\*): Value to check.

**Returns:**

- `Boolean`: `true` if value is a plain operator object, `false` otherwise.

### `_matchOperators(documentValue, operators)`

(Private) Matches operators against a document value, ensuring all operators in the object match.

**Parameters:**

- `documentValue` (\*): Value from document.
- `operators` (Object): Operator object (e.g., `{$gt: 5, $lt: 10}`).

**Returns:**

- `Boolean`: `true` if all operators match, `false` otherwise.

### Shared Comparison Utilities

`QueryEngine` delegates all equality and ordering logic to `ComparisonUtils`:

- Equality (`$eq` implicit or explicit) uses `ComparisonUtils.equals` with `arrayContainsScalar:true` enabling Mongo-like "array contains" semantics, so `{ tags: 'alpha' }` matches `{ tags:['alpha','beta'] }`.
- `$gt` / `$lt` use `ComparisonUtils.compareOrdering` (supports numbers, strings, Dates; non-comparable -> non-match).
- Operator object evaluation loops operators and dispatches to these shared helpers; unsupported operators raise `InvalidQueryError` during validation.

Benefits: single source of truth for comparison rules, consistent Date handling, simplified maintenance when new operators are added.

### `_validateQuery(documents, query)`

(Private) Validates query structure and operators comprehensively for security and robustness.

**Parameters:**

- `documents` (Array): Documents array to validate.
- `query` (Object): Query object to validate.

**Throws:**

- `InvalidArgumentError`: When inputs are invalid.
- `InvalidQueryError`: When query structure or operators are invalid.

### `_validateQueryInputs(documents, query)`

(Private) Validates basic input types for executeQuery method.

**Parameters:**

- `documents` (Array): Documents array to validate.
- `query` (Object): Query object to validate.

**Throws:**

- `InvalidArgumentError`: When inputs are invalid.

### `_validateQueryDepth(obj, depth)`

(Private) Validates query depth to prevent excessive nesting attacks.

**Parameters:**

- `obj` (\*): Object to check.
- `depth` (Number): Current depth.

**Throws:**

- `InvalidQueryError`: When depth exceeds configured limit.

### `_validateOperators(query)`

(Private) Validates that all operators used in query are supported.

**Parameters:**

- `query` (Object): Query object.

**Throws:**

- `InvalidQueryError`: When unsupported operator is found.

### `_findOperators(obj, operators)`

(Private) Recursively finds all operators used in a query object.

**Parameters:**

- `obj` (\*): Object to search.
- `operators` (Array): Array to collect operators (optional, defaults to empty array).

**Returns:**

- `Array`: Array of operator strings found.

### `_validateOperatorValues(query)`

(Private) Validates operator values in query for correctness.

**Parameters:**

- `query` (Object): Query object to validate.

**Throws:**

- `InvalidQueryError`: When operator values are invalid.

### `_validateOperatorValuesRecursive(obj, depth)`

(Private) Recursively validates operator values in query with depth protection.

**Parameters:**

- `obj` (\*): Object to validate.
- `depth` (Number): Current recursion depth.

**Throws:**

- `InvalidQueryError`: When operator values are invalid or depth exceeds limit.

### `_matchLogicalAnd(document, conditions)`

(Private) Handles `$and` logical operator evaluation.

**Parameters:**

- `document` (Object): Document to test.
- `conditions` (Array): Array of conditions that must all match.

**Returns:**

- `Boolean`: `true` if all conditions match, `false` otherwise.

**Throws:**

- `InvalidQueryError`: When conditions is not an array.

### `_matchLogicalOr(document, conditions)`

(Private) Handles `$or` logical operator evaluation.

**Parameters:**

- `document` (Object): Document to test.
- `conditions` (Array): Array of conditions where at least one must match.

**Returns:**

- `Boolean`: `true` if any condition matches, `false` otherwise.

**Throws:**

- `InvalidQueryError`: When conditions is not an array.

## Supported Query Operators

> **Note:** The following table summarises operator support in the current implementation. Only operators marked as "✔ Implemented" are available. Others are planned for future development.

| Operator     | Implemented | Notes     |
| ------------ | :---------: | --------- |
| `$eq`        |      ✔      | Supported |
| `$gt`        |      ✔      | Supported |
| `$lt`        |      ✔      | Supported |
| `$and`       |      ✔      | Supported |
| `$or`        |      ✔      | Supported |
| `$ne`        |      ✖      | Planned   |
| `$gte`       |      ✖      | Planned   |
| `$lte`       |      ✖      | Planned   |
| `$in`        |      ✖      | Planned   |
| `$nin`       |      ✖      | Planned   |
| `$not`       |      ✖      | Planned   |
| `$nor`       |      ✖      | Planned   |
| `$exists`    |      ✖      | Planned   |
| `$type`      |      ✖      | Planned   |
| `$all`       |      ✖      | Planned   |
| `$elemMatch` |      ✖      | Planned   |
| `$size`      |      ✖      | Planned   |

### Currently Supported Operators

- `$eq`: Matches values that are equal to a specified value. (Implicit for simple key-value pairs)
- `$gt`: Matches values that are greater than a specified value.
- `$lt`: Matches values that are less than a specified value.
- `$and`: Joins query clauses with a logical AND. Returns all documents that match the conditions of all clauses. (Implicit when multiple fields are specified at the same level)
- `$or`: Joins query clauses with a logical OR. Returns all documents that match the conditions of at least one clause.

## Usage Examples

### Simple Equality Match

```javascript
const queryEngine = new QueryEngine();
const documents = [
  { item: 'apple', qty: 10 },
  { item: 'banana', qty: 20 }
];

// Equivalent to: { item: { $eq: "apple" } }
const result = queryEngine.executeQuery(documents, { item: 'apple' });
// result: [{ item: "apple", qty: 10 }]
```

### Using Comparison Operators

```javascript
const queryEngine = new QueryEngine();
const documents = [
  { product: 'A', price: 10 },
  { product: 'B', price: 20 },
  { product: 'C', price: 30 }
];

// Price greater than 15
const expensive = queryEngine.executeQuery(documents, { price: { $gt: 15 } });
// expensive: [{ product: "B", price: 20 }, { product: "C", price: 30 }]

// Price less than 25
const affordable = queryEngine.executeQuery(documents, { price: { $lt: 25 } });
// affordable: [{ product: "A", price: 10 }, { product: "B", price: 20 }]
```

### Using Logical Operators

```javascript
const queryEngine = new QueryEngine();
const documents = [
  { name: 'Shirt', colour: 'blue', stock: 5 },
  { name: 'Pants', colour: 'blue', stock: 0 },
  { name: 'Shirt', colour: 'red', stock: 10 }
];

// Blue items that are in stock
const blueAndInStock = queryEngine.executeQuery(documents, {
  $and: [{ colour: 'blue' }, { stock: { $gt: 0 } }]
});
// blueAndInStock: [{ name: "Shirt", colour: "blue", stock: 5 }]

// Implicit AND
const blueAndInStockImplicit = queryEngine.executeQuery(documents, {
  colour: 'blue',
  stock: { $gt: 0 }
});
// blueAndInStockImplicit: [{ name: "Shirt", colour: "blue", stock: 5 }]

// Red items OR items with no stock
const redOrNoStock = queryEngine.executeQuery(documents, {
  $or: [{ colour: 'red' }, { stock: 0 }]
});
// redOrNoStock: [
//   { name: "Pants", colour: "blue", stock: 0 },
//   { name: "Shirt", colour: "red", stock: 10 }
// ]
```

### Querying Nested Fields

Use dot notation to query fields within embedded documents.

```javascript
const queryEngine = new QueryEngine();
const documents = [
  { item: 'journal', details: { supplier: 'X', pages: 200 } },
  { item: 'pen', details: { supplier: 'Y', colour: 'blue' } }
];

const journalsFromX = queryEngine.executeQuery(documents, { 'details.supplier': 'X' });
// journalsFromX: [{ item: "journal", details: { supplier: "X", pages: 200 } }]
```

### Querying Array Fields

```javascript
const queryEngine = new QueryEngine();
const documents = [
  { item: 'A', tags: ['red', 'round'], ratings: [5, 8, 9] },
  { item: 'B', tags: ['blue', 'square'], ratings: [7, 8] },
  { item: 'C', tags: ['red', 'square'], ratings: [6] }
];

// Items tagged "red" (simple match in array)
const redItems = queryEngine.executeQuery(documents, { tags: 'red' });
// redItems: [
//   { item: "A", tags: ["red", "round"], ratings: [5, 8, 9] },
//   { item: "C", tags: ["red", "square"], ratings: [6] }
// ]

// Items with a rating of 9
const highRated = queryEngine.executeQuery(documents, { ratings: 9 });
// highRated: [{ item: "A", tags: ["red", "round"], ratings: [5, 8, 9] }]
```

### Future Array Operators (Not Yet Implemented)

The following examples show planned functionality for future releases:

```javascript
// PLANNED: Using $all - item must have both "red" and "square" tags
// const redSquareItems = queryEngine.executeQuery(documents, { tags: { $all: ["red", "square"] } });

// PLANNED: Using $elemMatch - find documents where at least one rating is between 7 and 8 inclusive
// const specificRatingRange = queryEngine.executeQuery(documents, {
//   ratings: { $elemMatch: { $gte: 7, $lte: 8 } }
// });

// PLANNED: Using $size - find documents where tags array has exactly 2 elements
// const twoTagsItems = queryEngine.executeQuery(documents, { tags: { $size: 2 } });
```

## Error Handling

The `QueryEngine` uses the following error types for different issues:

- `InvalidQueryError`: For query structure problems such as:
  - Unrecognised query operators
  - Invalid operator syntax or values (e.g., `$and` without an array value)
  - Query nesting depth exceeded
- `InvalidArgumentError`: For input validation problems such as:
  - Non-array documents parameter
  - Null, undefined, string, or array query parameters

**Example error handling:**

```javascript
try {
  const results = queryEngine.executeQuery(documents, query);
} catch (error) {
  if (error instanceof InvalidQueryError) {
    console.error('Invalid query:', error.message);
  } else if (error instanceof InvalidArgumentError) {
    console.error('Invalid argument:', error.message);
  }
}
```

## Query Validation System

The `QueryEngine` includes a comprehensive validation system to ensure query security and robustness:

### Input Validation

- **Type Checking**: Ensures `documents` is an array and `query` is a valid object
- **Null Safety**: Prevents null, undefined, string, or array query parameters
- **Fail-Fast**: Basic input validation occurs before expensive query processing

### Structure Validation

- **Depth Protection**: Prevents excessive query nesting (configurable via `maxNestedDepth`)
- **Operator Validation**: Ensures only supported operators are used
- **Recursive Validation**: Validates nested query structures thoroughly

### Security Features

- **Malicious Query Prevention**: Deep validation prevents potential security exploits
- **Resource Protection**: Depth limits prevent stack overflow or excessive processing
- **Comprehensive Error Reporting**: Clear error messages for debugging

### Validation Process

1. **Input Types**: Validates basic parameter types (documents array, query object)
2. **Query Depth**: Recursively checks nesting doesn't exceed configured limit
3. **Operator Support**: Verifies all operators in query are supported
4. **Operator Values**: Validates operator values are correctly structured (e.g., `$and` requires arrays)

This multi-layered approach ensures queries are safe, valid, and performant before execution begins.

## Best Practices

- **Specificity**: Make queries as specific as possible for better performance, especially with large datasets.
- **Operator Knowledge**: Understand the behaviour of each operator, particularly how they interact (e.g., implicit AND vs. explicit `$and` or `$or`).
- **Data Types**: Be mindful of data types when performing comparisons. The engine attempts type coercion in some cases (e.g., comparing numbers and strings that represent numbers) but strict type matching is generally safer.
- **Nested Queries**: While dot notation is powerful, overly deep nesting or complex queries on deeply nested structures can impact readability and potentially performance.
- **Array Queries**: Array operators like `$all` or `$elemMatch` can be powerful but may have performance implications on very large arrays or complex element matching conditions.
- **Index Utilisation (Conceptual)**: While this `QueryEngine` operates on in-memory arrays, in a full database system, query structure significantly impacts index utilisation. Designing queries with this in mind is good practice.
