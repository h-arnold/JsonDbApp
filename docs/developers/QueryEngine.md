# QueryEngine Developer Documentation

- [QueryEngine Developer Documentation](#queryengine-developer-documentation)
  - [Overview](#overview)
  - [Core Principles](#core-principles)
  - [API Reference](#api-reference)
    - [`constructor()`](#constructor)
    - [`executeQuery(documents, query)`](#executequerydocuments-query)
    - [`_matches(document, query)`](#_matchesdocument-query)
    - [`_evaluateCondition(value, condition)`](#_evaluateconditionvalue-condition)
    - [`_getFieldValue(document, fieldPath)`](#_getfieldvaluedocument-fieldpath)
  - [Supported Query Operators](#supported-query-operators)
    - [Comparison Operators](#comparison-operators)
    - [Logical Operators](#logical-operators)
    - [Element Operators](#element-operators)
    - [Array Operators](#array-operators)
  - [Usage Examples](#usage-examples)
    - [Simple Equality Match](#simple-equality-match)
    - [Using Comparison Operators](#using-comparison-operators)
    - [Using Logical Operators](#using-logical-operators)
    - [Querying Nested Fields](#querying-nested-fields)
    - [Querying Array Fields](#querying-array-fields)
  - [Error Handling](#error-handling)
  - [Best Practices](#best-practices)

## Overview

The `QueryEngine` class is responsible for filtering a list of documents based on a MongoDB-style query object. It evaluates documents against query criteria, supporting a variety of comparison, logical, and element operators.

**Key Responsibilities:**

- Parsing and validating query objects.
- Matching documents against complex query criteria.
- Supporting nested field queries using dot notation.
- Handling various data types and operators.

**Dependencies:**

- `ErrorHandler`: For standardised error reporting.
- `ObjectUtils`: For deep equality checks, particularly with array operators.

## Core Principles

- **MongoDB-like Syntax**: The query language closely mirrors MongoDB's query syntax for familiarity and ease of use.
- **Read-Only Operations**: The engine only filters documents; it does not modify them.
- **Extensibility**: Designed to allow for the addition of new query operators.
- **Performance Considerations**: While aiming for comprehensive functionality, it's mindful of the Google Apps Script environment's limitations.

## API Reference

### `constructor()`

Creates a new `QueryEngine` instance.

```javascript
const queryEngine = new QueryEngine();
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
  { name: "Alice", age: 30, city: "New York" },
  { name: "Bob", age: 24, city: "London" },
  { name: "Charlie", age: 30, city: "Paris" }
];

const results = queryEngine.executeQuery(docs, { age: 30, city: "New York" });
// results: [{ name: "Alice", age: 30, city: "New York" }]
```

### `_matches(document, query)`

(Private) Determines if a single document matches the given query. This method iterates through the query conditions and evaluates them against the document.

**Parameters:**

- `document` (Object): The document to evaluate.
- `query` (Object): The query object or a sub-query object.

**Returns:**

- `Boolean`: `true` if the document matches the query, `false` otherwise.

### `_evaluateCondition(value, condition)`

(Private) Evaluates a specific field's value against a condition, which can be a simple value for equality or an object containing query operators (e.g., `{ $gt: 10 }`).

**Parameters:**

- `value` (*): The actual value from the document field.
- `condition` (*|Object): The condition from the query to evaluate against.

**Returns:**

- `Boolean`: `true` if the value satisfies the condition, `false` otherwise.

**Throws:**

- `ErrorHandler.ErrorTypes.INVALID_QUERY`: If an unrecognised operator is encountered.

### `_getFieldValue(document, fieldPath)`

(Private) Retrieves a value from a document using a dot-notation path. Handles nested objects.

**Parameters:**

- `document` (Object): The document to read from.
- `fieldPath` (String): The dot-notation path (e.g., `"address.street"`).

**Returns:**

- `*`: The value at the specified path, or `undefined` if the path does not exist.

## Supported Query Operators

The `QueryEngine` supports a subset of MongoDB query operators.

### Comparison Operators

- `$eq`: Matches values that are equal to a specified value. (Implicit for simple key-value pairs)
- `$ne`: Matches all values that are not equal to a specified value.
- `$gt`: Matches values that are greater than a specified value.
- `$gte`: Matches values that are greater than or equal to a specified value.
- `$lt`: Matches values that are less than a specified value.
- `$lte`: Matches values that are less than or equal to a specified value.
- `$in`: Matches any of the values specified in an array.
- `$nin`: Matches none of the values specified in an array.

### Logical Operators

- `$and`: Joins query clauses with a logical AND. Returns all documents that match the conditions of all clauses. (Implicit when multiple fields are specified at the same level)
- `$or`: Joins query clauses with a logical OR. Returns all documents that match the conditions of at least one clause.
- `$not`: Inverts the effect of a query expression. Returns documents that do not match the query expression. (Applied to an operator, e.g. `{ $not: { $eq: "value" } }`)
- `$nor`: Joins query clauses with a logical NOR. Returns all documents that fail to match all clauses.

### Element Operators

- `$exists`: Matches documents that have (or do not have, if `false`) the specified field.
- `$type`: Matches documents where the type of a field matches a specified BSON type string (e.g., "string", "number", "array", "object", "bool", "date", "null").

### Array Operators

*(Support for these may vary or be in development)*

- `$all`: Matches arrays that contain all elements specified in the query.
- `$elemMatch`: Selects documents if an element in its array field matches all specified `$elemMatch` conditions.
- `$size`: Selects documents if the array field is a specific size.


## Usage Examples

### Simple Equality Match

```javascript
const queryEngine = new QueryEngine();
const documents = [{ item: "apple", qty: 10 }, { item: "banana", qty: 20 }];

// Equivalent to: { item: { $eq: "apple" } }
const result = queryEngine.executeQuery(documents, { item: "apple" });
// result: [{ item: "apple", qty: 10 }]
```

### Using Comparison Operators

```javascript
const queryEngine = new QueryEngine();
const documents = [
  { product: "A", price: 10 },
  { product: "B", price: 20 },
  { product: "C", price: 30 }
];

// Price greater than 15
const expensive = queryEngine.executeQuery(documents, { price: { $gt: 15 } });
// expensive: [{ product: "B", price: 20 }, { product: "C", price: 30 }]

// Price is 10 or 30
const specificPrices = queryEngine.executeQuery(documents, { price: { $in: [10, 30] } });
// specificPrices: [{ product: "A", price: 10 }, { product: "C", price: 30 }]
```

### Using Logical Operators

```javascript
const queryEngine = new QueryEngine();
const documents = [
  { name: "Shirt", color: "blue", stock: 5 },
  { name: "Pants", color: "blue", stock: 0 },
  { name: "Shirt", color: "red", stock: 10 }
];

// Blue items that are in stock
const blueAndInStock = queryEngine.executeQuery(documents, {
  $and: [
    { color: "blue" },
    { stock: { $gt: 0 } }
  ]
});
// blueAndInStock: [{ name: "Shirt", color: "blue", stock: 5 }]

// Implicit AND
const blueAndInStockImplicit = queryEngine.executeQuery(documents, {
  color: "blue",
  stock: { $gt: 0 }
});
// blueAndInStockImplicit: [{ name: "Shirt", color: "blue", stock: 5 }]


// Red items OR items with no stock
const redOrNoStock = queryEngine.executeQuery(documents, {
  $or: [
    { color: "red" },
    { stock: 0 }
  ]
});
// redOrNoStock: [
//   { name: "Pants", color: "blue", stock: 0 },
//   { name: "Shirt", color: "red", stock: 10 }
// ]
```

### Querying Nested Fields

Use dot notation to query fields within embedded documents.

```javascript
const queryEngine = new QueryEngine();
const documents = [
  { item: "journal", details: { supplier: "X", pages: 200 } },
  { item: "pen", details: { supplier: "Y", color: "blue" } }
];

const journalsFromX = queryEngine.executeQuery(documents, { "details.supplier": "X" });
// journalsFromX: [{ item: "journal", details: { supplier: "X", pages: 200 } }]
```

### Querying Array Fields

```javascript
const queryEngine = new QueryEngine();
const documents = [
  { item: "A", tags: ["red", "round"], ratings: [5, 8, 9] },
  { item: "B", tags: ["blue", "square"], ratings: [7, 8] },
  { item: "C", tags: ["red", "square"], ratings: [6] }
];

// Items tagged "red" (simple match in array)
const redItems = queryEngine.executeQuery(documents, { tags: "red" });
// redItems: [
//   { item: "A", tags: ["red", "round"], ratings: [5, 8, 9] },
//   { item: "C", tags: ["red", "square"], ratings: [6] }
// ]

// Items with a rating of 9
const highRated = queryEngine.executeQuery(documents, { ratings: 9 });
// highRated: [{ item: "A", tags: ["red", "round"], ratings: [5, 8, 9] }]


// Using $all - item must have both "red" and "square" tags
const redSquareItems = queryEngine.executeQuery(documents, { tags: { $all: ["red", "square"] } });
// redSquareItems: [{ item: "C", tags: ["red", "square"], ratings: [6] }]

// Using $elemMatch - find documents where at least one rating is between 7 and 8 inclusive
// (Assuming $elemMatch is implemented for complex conditions on array elements)
// const specificRatingRange = queryEngine.executeQuery(documents, {
//   ratings: { $elemMatch: { $gte: 7, $lte: 8 } }
// });
// specificRatingRange might be:
// [
//   { item: "A", tags: ["red", "round"], ratings: [5, 8, 9] }, (due to 8)
//   { item: "B", tags: ["blue", "square"], ratings: [7, 8] }  (due to 7 and 8)
// ]

// Using $size - find documents where tags array has exactly 2 elements
const twoTagsItems = queryEngine.executeQuery(documents, { tags: { $size: 2 } });
// twoTagsItems: [
//  { item: "A", tags: ["red", "round"], ratings: [5, 8, 9] },
//  { item: "B", tags: ["blue", "square"], ratings: [7, 8] },
//  { item: "C", tags: ["red", "square"], ratings: [6] }
// ]
```

## Error Handling

The `QueryEngine` uses `ErrorHandler.ErrorTypes.INVALID_QUERY` for issues such as:

- Unrecognised query operators.
- Invalid operator syntax or values (e.g., `$in` without an array value).

Refer to `ErrorHandler.js` for details on error objects.

## Best Practices

- **Specificity**: Make queries as specific as possible for better performance, especially with large datasets.
- **Operator Knowledge**: Understand the behaviour of each operator, particularly how they interact (e.g., implicit AND vs. explicit `$and` or `$or`).
- **Data Types**: Be mindful of data types when performing comparisons. The engine attempts type coercion in some cases (e.g., comparing numbers and strings that represent numbers) but strict type matching is generally safer.
- **Nested Queries**: While dot notation is powerful, overly deep nesting or complex queries on deeply nested structures can impact readability and potentially performance.
- **Array Queries**: Array operators like `$all` or `$elemMatch` can be powerful but may have performance implications on very large arrays or complex element matching conditions.
- **Index Utilisation (Conceptual)**: While this `QueryEngine` operates on in-memory arrays, in a full database system, query structure significantly impacts index utilisation. Designing queries with this in mind is good practice.
