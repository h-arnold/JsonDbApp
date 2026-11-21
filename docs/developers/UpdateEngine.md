# UpdateEngine Developer Documentation

- [UpdateEngine Developer Documentation](#updateengine-developer-documentation)
  - [Overview](#overview)
  - [Core Principles](#core-principles)
  - [Composition and entry point](#composition-and-entry-point)
  - [Shared comparison utilities](#shared-comparison-utilities)
  - [Error Handling](#error-handling)
  - [Dot Notation and Nested Paths](#dot-notation-and-nested-paths)
  - [`$pull` matching rules](#pull-matching-rules)

## Overview

The `UpdateEngine` class applies MongoDB-style update operators to documents. It is a key component of the document update process in JsonDbApp. For operator usage, see [Update Operations](../Updates.md).

**Key Responsibilities:**

- Parsing and validating update operator objects.
- Applying various update operators to in-memory document representations.
- Handling nested field updates and array manipulations.
- Ensuring data integrity during update operations.

**Dependencies:**

- `ErrorHandler`: For standardised error reporting.
- `JDbLogger`: For component-level logging.
- `ObjectUtils`: For deep cloning documents.

## Core Principles

The `UpdateEngine` adheres to the following design principles:

- **Operator-based modifications**: All changes to documents are driven by explicit update operators.
- **Deep cloning**: `applyOperators` deep-clones the input document before applying operators and returns the new document. The original is not mutated.
- **Error reporting**: Provides clear error messages for invalid operations or data types.

## Composition and entry point

`UpdateEngine` is a facade. Its public entry point, `applyOperators(document, updateOps)`, validates the inputs, deep-clones the document and dispatches each operator to its handler. Parameter, return and error contracts live on the symbols.

- [`UpdateEngine`](../../src/02_components/UpdateEngine/99_UpdateEngine.js) — facade; `applyOperators` validates, clones and dispatches.
- [`UpdateEngineValidation`](../../src/02_components/UpdateEngine/04_UpdateEngineValidation.js) — input, operation and value validation.
- [`UpdateEngineFieldOperators`](../../src/02_components/UpdateEngine/01_UpdateEngineFieldOperators.js) — `$set`, `$unset`, `$inc`, `$mul`, `$min`, `$max`.
- [`UpdateEngineArrayOperators`](../../src/02_components/UpdateEngine/02_UpdateEngineArrayOperators.js) — `$push`, `$pull`, `$addToSet`.
- [`UpdateEngineFieldPathAccess`](../../src/02_components/UpdateEngine/03_UpdateEngineFieldPathAccess.js) — dot-path reads, writes and removals backed by `FieldPathUtils`.

## Shared comparison utilities

Equality, ordering and `$pull` predicate checks use [`ComparisonUtils`](../../src/01_utils/ComparisonUtils.js). It provides deep equality, ordering for numbers, strings and Dates, and operator evaluation for `$eq`, `$gt` and `$lt`. Array membership matching is disabled for `$addToSet` uniqueness and `$pull` primitive comparisons; `$pull` object criteria use `subsetMatch`.

## Error Handling

The `UpdateEngine` uses `ErrorHandler.ErrorTypes.INVALID_QUERY` for most operational errors, such as:

- Applying an operator to a field of an incompatible type (e.g., `$inc` on a string).
- Using an invalid operator structure (e.g., `$each` modifier not being an array).
- Providing an empty `updateOps` object or one with no valid `$`-prefixed operators to `applyOperators`.
- Encountering an unknown update operator.

It also uses `ErrorHandler.ErrorTypes.INVALID_ARGUMENT` for invalid or missing arguments, such as when required parameters are not provided or are of the wrong type.

Refer to `ErrorHandler.js` for details on error objects and codes.

## Dot Notation and Nested Paths

The `UpdateEngine` supports dot notation for targeting nested fields in documents (e.g., `profile.name`).

- `$set` creates intermediate objects as needed; see [UpdateEngineFieldPathAccess](../../src/02_components/UpdateEngine/03_UpdateEngineFieldPathAccess.js).
- For other operators, a missing parent path is handled as follows:
  - `$inc`, `$mul`, `$min`, `$max` will create the field if it does not exist, but only if the operation is valid for the value type.
  - `$unset` will silently do nothing if the path does not exist.
  - `$pull` skips missing or non-array targets. `$push` and `$addToSet` create the array or reject the value as described in [UpdateEngineArrayOperators](../../src/02_components/UpdateEngine/02_UpdateEngineArrayOperators.js).
- If an intermediate segment is a scalar, it is replaced with a new container chosen from the next segment (an array for a numeric segment, otherwise an object) and the write continues; see [FieldPathUtils](../../src/01_utils/FieldPathUtils.js).

## `$pull` matching rules

`$pull` matches array elements by strict equality or, for object criteria, by subset predicate with optional field-level operators.

### Matching Rules

- **Primitive, Date or array criterion**: removes elements that are deeply equal to the criterion; array membership matching is disabled.
- **Object criterion (field predicate)**: removes object elements that contain every specified field with a matching value. Extra fields on the element do not prevent a match.
- **Field-level operator objects**: within an object criterion, a field value may use `$eq`, `$gt` or `$lt`. All operators in that object must match; other query operators are rejected. Example: `{ items: { price: { $lt: 10 }, sku: 'A1' } }` removes objects whose `price < 10` and `sku === 'A1'`.
- **Top-level operator object**: a criterion whose keys all start with `$` (e.g. `{ $gt: 5 }`) applies only to primitive or Date elements; it does not match object elements.

### No-op cases

- Target field missing or not an array: no change.
- Object criterion referencing fields absent on the element: element retained.
- Operator predicates on incomparable types (e.g. `$gt` between string and number): element retained.

### Date handling

Dates are compared using their millisecond timestamps. `$gt` / `$lt` comparisons on Dates work when both sides are Dates. Field-level equality uses deep time equality.

### Null handling

`null` criterion matches only `null` elements (or object field values equal to `null` in subset predicates). Undefined values do not match `null`.

### Examples

Remove subset by key:

```javascript
const updateEngine = new UpdateEngine();
let doc = {
  items: [
    { sku: 'A', qty: 1, price: 5 },
    { sku: 'A', qty: 2, price: 5 },
    { sku: 'B', qty: 1, price: 9 }
  ]
};
doc = updateEngine.applyOperators(doc, { $pull: { items: { sku: 'A' } } });
// Removes both objects with sku A.
```

Mixed field + operator:

```javascript
doc = updateEngine.applyOperators(doc, { $pull: { items: { sku: 'A', price: { $lt: 6 } } } });
```

Primitive operator on numeric array:

```javascript
doc = updateEngine.applyOperators(doc, { $pull: { scores: { $gt: 90 } } });
```

Top-level operator against object elements (no removal):

```javascript
doc = updateEngine.applyOperators(doc, { $pull: { items: { $gt: 5 } } }); // items are objects -> no match
```
