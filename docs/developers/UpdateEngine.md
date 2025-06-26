# UpdateEngine Developer Documentation

- [UpdateEngine Developer Documentation](#updateengine-developer-documentation)
  - [Overview](#overview)
  - [Core Principles](#core-principles)
  - [API Reference](#api-reference)
    - [`constructor()`](#constructor)
    - [`applyOperators(document, updateOps)`](#applyoperatorsdocument-updateops)
    - [Private Operator Handlers](#private-operator-handlers)
      - [`_applySet(document, ops)`](#_applysetdocument-ops)
      - [`_applyInc(document, ops)`](#_applyincdocument-ops)
      - [`_applyMul(document, ops)`](#_applymuldocument-ops)
      - [`_applyMin(document, ops)`](#_applymindocument-ops)
      - [`_applyMax(document, ops)`](#_applymaxdocument-ops)
      - [`_applyUnset(document, ops)`](#_applyunsetdocument-ops)
      - [`_applyPush(document, ops)`](#_applypushdocument-ops)
      - [`_applyPull(document, ops)`](#_applypulldocument-ops)
      - [`_applyAddToSet(document, ops)`](#_applyaddtosetdocument-ops)
      - [`$each` Modifier in Array Operators](#each-modifier-in-array-operators)
      - [`_valuesEqual(a, b)`](#_valuesequala-b)
    - [Utility Methods](#utility-methods)
      - [`_getFieldValue(document, fieldPath)`](#_getfieldvaluedocument-fieldpath)
      - [`_setFieldValue(document, fieldPath, value)`](#_setfieldvaluedocument-fieldpath-value)
  - [Usage Examples](#usage-examples)
    - [Applying Multiple Operators](#applying-multiple-operators)
    - [Updating Nested Fields](#updating-nested-fields)
    - [Array Manipulations](#array-manipulations)
  - [Error Handling](#error-handling)
    - [Private Validation Methods](#private-validation-methods)
  - [Best Practices](#best-practices)
    - [Dot Notation and Nested Paths](#dot-notation-and-nested-paths)

## Overview

The `UpdateEngine` class is responsible for applying MongoDB-style update operators to documents. It provides a robust mechanism for modifying documents based on a set of specified operations. This class is a key component in the document update process within GAS DB.

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
- **Immutability (conceptual)**: While the provided document object is modified directly for performance reasons within the GAS environment, the conceptual model is that operators transform a document into a new state.
- **Comprehensive operator support**: Aims to support a wide range of MongoDB update operators.
- **Error reporting**: Provides clear error messages for invalid operations or data types.

## API Reference

### `constructor()`

Creates a new `UpdateEngine` instance.

```javascript
const updateEngine = new UpdateEngine();
```

### `applyOperators(document, updateOps)`

Applies a set of MongoDB-style update operators to a given document. This is the main public method of the class.

**Parameters:**

- `document` (Object): The document to be modified.
- `updateOps` (Object): An object specifying the update operations to apply. Keys are update operators (e.g., `$set`, `$inc`), and values are the operator-specific arguments.

**Returns:**

- `Object`: A deep clone of the original document, with the updates applied. The original document is not mutated.

**Throws:**

- `ErrorHandler.ErrorTypes.INVALID_QUERY`: If the `updateOps` object is empty, contains no valid '$' prefixed operators, or if an unknown operator is encountered.

**Example:**

```javascript
const updateEngine = new UpdateEngine();
let doc = { name: "Test Document", count: 10, tags: ["a", "b"] };
const operations = {
  $set: { name: "Updated Document", status: "active" },
  $inc: { count: 5 },
  $push: { tags: "c" }
};

doc = updateEngine.applyOperators(doc, operations);
// doc is now:
// { name: "Updated Document", count: 15, tags: ["a", "b", "c"], status: "active" }
```

### Private Operator Handlers

These methods are called internally by `applyOperators` to handle specific update logic.

#### `_applySet(document, ops)`

Sets the value of specified fields. If the field does not exist, it creates the field. This includes creating nested objects if the field path contains dot notation.

**Parameters:**

- `document` (Object): The document to modify.
- `ops` (Object): An object where keys are field paths (can be dot-notation for nested fields) and values are the new values for those fields.

**Returns:**

- `Object`: The modified document.

**Example:**

```javascript
// Assuming doc = { name: "Test" }
updateEngine._applySet(doc, { name: "New Name", "details.host": "server1" });
// doc is now: { name: "New Name", details: { host: "server1" } }
```

#### `_applyInc(document, ops)`

Increments the value of specified numeric fields by a given amount.

**Parameters:**

- `document` (Object): The document to modify.
- `ops` (Object): An object where keys are field paths and values are the amounts to increment by.

**Returns:**

- `Object`: The modified document.

**Throws:**

- `ErrorHandler.ErrorTypes.INVALID_QUERY`: If a target field or increment value is non-numeric.

**Example:**

```javascript
// Assuming doc = { views: 100 }
updateEngine._applyInc(doc, { views: 10, "metrics.downloads": 1 });
// doc is now: { views: 110, metrics: { downloads: 1 } }
```

#### `_applyMul(document, ops)`

Multiplies the value of specified numeric fields by a given factor.

**Parameters:**

- `document` (Object): The document to modify.
- `ops` (Object): An object where keys are field paths and values are the multiplication factors.

**Returns:**

- `Object`: The modified document.

**Throws:**

- `ErrorHandler.ErrorTypes.INVALID_QUERY`: If a target field or factor is non-numeric.

**Example:**

```javascript
// Assuming doc = { price: 10 }
updateEngine._applyMul(doc, { price: 1.2 });
// doc is now: { price: 12 }
```

#### `_applyMin(document, ops)`

Sets fields to the minimum of their current value and a provided value. Only updates if the new value is less than the existing value.

**Parameters:**

- `document` (Object): The document to modify.
- `ops` (Object): An object where keys are field paths and values are the values to compare against.

**Returns:**

- `Object`: The modified document.

**Throws:**

- `ErrorHandler.ErrorTypes.INVALID_QUERY`: If a comparison between values is invalid (e.g., comparing a number to a string).

**Example:**

```javascript
// Assuming doc = { score: 100 }
updateEngine._applyMin(doc, { score: 90 }); // score becomes 90
updateEngine._applyMin(doc, { score: 95 }); // score remains 90
```

#### `_applyMax(document, ops)`

Sets fields to the maximum of their current value and a provided value. Only updates if the new value is greater than the existing value.

**Parameters:**

- `document` (Object): The document to modify.
- `ops` (Object): An object where keys are field paths and values are the values to compare against.

**Returns:**

- `Object`: The modified document.

**Throws:**

- `ErrorHandler.ErrorTypes.INVALID_QUERY`: If a comparison between values is invalid.

**Example:**

```javascript
// Assuming doc = { highScore: 200 }
updateEngine._applyMax(doc, { highScore: 250 }); // highScore becomes 250
updateEngine._applyMax(doc, { highScore: 240 }); // highScore remains 250
```

#### `_applyUnset(document, ops)`

Removes specified fields from a document.

**Parameters:**

- `document` (Object): The document to modify.
- `ops` (Object): An object where keys are field paths to remove. The values are typically `true` or `1` but are not strictly checked.

**Returns:**

- `Object`: The modified document.

**Example:**

```javascript
// Assuming doc = { name: "Test", temporary: true, "config.old": 1 }
updateEngine._applyUnset(doc, { temporary: "", "config.old": true });
// doc is now: { name: "Test", config: {} }
```

#### `_applyPush(document, ops)`

Appends a value to an array field. If the field does not exist, it creates an array field with the new value. If the field exists but is not an array, an error is thrown. Supports the `$each` modifier to append multiple values.

**Parameters:**

- `document` (Object): The document to modify.
- `ops` (Object): An object where keys are field paths. Values can be a single item to push or an object with an `$each` property containing an array of items to push.

**Returns:**

- `Object`: The modified document.

**Throws:**

- `ErrorHandler.ErrorTypes.INVALID_QUERY`: If the target field is not an array (and exists), or if `$each` modifier is not an array.

**Example:**

```javascript
// Assuming doc = { tags: ["alpha"] }
updateEngine._applyPush(doc, { tags: "beta" });
// doc is now: { tags: ["alpha", "beta"] }

updateEngine._applyPush(doc, { tags: { $each: ["gamma", "delta"] } });
// doc is now: { tags: ["alpha", "beta", "gamma", "delta"] }
```

#### `_applyPull(document, ops)`

Removes all instances of specified values from an array field.

**Parameters:**

- `document` (Object): The document to modify.
- `ops` (Object): An object where keys are field paths and values are the items to remove from the array.

**Returns:**

- `Object`: The modified document.

**Throws:**

- `ErrorHandler.ErrorTypes.INVALID_QUERY`: If the target field is not an array.

**Example:**

```javascript
// Assuming doc = { scores: [10, 20, 30, 20, 40] }
updateEngine._applyPull(doc, { scores: 20 });
// doc is now: { scores: [10, 30, 40] }
```

#### `_applyAddToSet(document, ops)`

Adds values to an array field only if they are not already present. Supports the `$each` modifier.

**Parameters:**

- `document` (Object): The document to modify.
- `ops` (Object): An object where keys are field paths. Values can be a single item or an object with `$each`.

**Returns:**

- `Object`: The modified document.

**Throws:**

- `ErrorHandler.ErrorTypes.INVALID_QUERY`: If the target field is not an array, or if `$each` modifier is not an array.

**Example:**

```javascript
// Assuming doc = { categories: ["news"] }
updateEngine._applyAddToSet(doc, { categories: "tech" });
// doc is now: { categories: ["news", "tech"] }

updateEngine._applyAddToSet(doc, { categories: "news" }); // no change
// doc is still: { categories: ["news", "tech"] }

updateEngine._applyAddToSet(doc, { categories: { $each: ["sports", "tech"] } });
// doc is now: { categories: ["news", "tech", "sports"] }
```

#### `$each` Modifier in Array Operators

For array operators like `$push` and `$addToSet`, the `$each` modifier allows multiple values to be added at once. The `UpdateEngine` enforces that the value of `$each` must be an array. If `$each` is not an array, an `ErrorHandler.ErrorTypes.INVALID_QUERY` error is thrown. This ensures consistent and predictable behaviour when using array modifiers.

#### `_valuesEqual(a, b)`

Performs a deep comparison between two values (primitives, arrays, or objects) to determine equality. Used internally for array and object matching, especially in operators like `$pull` and `$addToSet`.

**Parameters:**
- `a` (*): First value for comparison.
- `b` (*): Second value for comparison.

**Returns:**
- `boolean`: `true` if values are deeply equal, `false` otherwise.

**Example:**
```javascript
updateEngine._valuesEqual([1, 2], [1, 2]); // true
updateEngine._valuesEqual({x: 1}, {x: 1}); // true
updateEngine._valuesEqual({x: 1}, {x: 2}); // false
```

### Utility Methods

#### `_getFieldValue(document, fieldPath)`

Retrieves a value from a document using a dot-notation path.

**Parameters:**

- `document` (Object): The document to read from.
- `fieldPath` (String): The dot-notation path to the field (e.g., `"address.city"`).

**Returns:**

- `*`: The value at the specified path, or `undefined` if the path does not exist.

**Example:**

```javascript
const doc = { user: { name: "John", address: { city: "New York" } } };
const cityName = updateEngine._getFieldValue(doc, "user.address.city"); // "New York"
const zipCode = updateEngine._getFieldValue(doc, "user.address.zip"); // undefined
```

#### `_setFieldValue(document, fieldPath, value)`

Sets a value in a document using a dot-notation path. Creates nested objects as needed if they don't exist along the path.

**Parameters:**

- `document` (Object): The document to modify.
- `fieldPath` (String): The dot-notation path to the field.
- `value` (*): The value to set at the specified path.

**Example:**

```javascript
let doc = { user: { name: "Jane" } };
updateEngine._setFieldValue(doc, "user.contact.email", "jane@example.com");
// doc is now:
// { user: { name: "Jane", contact: { email: "jane@example.com" } } }

updateEngine._setFieldValue(doc, "user.age", 30);
// doc is now:
// { user: { name: "Jane", age: 30, contact: { email: "jane@example.com" } } }
```

#### `_unsetFieldValue(document, fieldPath)`

Removes a field or array element at a given dot-notation path.

**Parameters:**

- `document` (Object): The document to modify.
- `fieldPath` (String): The dot-notation path of the field or element to remove.

**Example:**

```javascript
let doc = { user: { name: "Jane", age: 30, temp: "delete me" } };
updateEngine._unsetFieldValue(doc, "user.temp");
// doc is now: { user: { name: "Jane", age: 30 } }

// For arrays
let doc2 = { items: ["a", "b", "c"] };
updateEngine._unsetFieldValue(doc2, "items.1");
// doc2 is now: { items: ["a", undefined, "c"] } // preserves array length
```

## Usage Examples

### Applying Multiple Operators

The `UpdateEngine` can apply several operators in a single `applyOperators` call.

```javascript
const updateEngine = new UpdateEngine();
let product = {
  name: "Laptop",
  price: 1200,
  stock: 10,
  features: ["SSD", "16GB RAM"],
  ratings: []
};

const updates = {
  $set: { status: "available", "details.manufacturer": "TechCorp" },
  $inc: { stock: -1, views: 100 }, // 'views' will be created
  $mul: { price: 0.9 }, // 10% discount
  $push: { features: "Backlit Keyboard" },
  $addToSet: { tags: { $each: ["electronics", "computer"] } }
};

product = updateEngine.applyOperators(product, updates);
/*
product is now:
{
  name: "Laptop",
  price: 1080,
  stock: 9,
  features: ["SSD", "16GB RAM", "Backlit Keyboard"],
  ratings: [],
  status: "available",
  details: { manufacturer: "TechCorp" },
  views: 100,
  tags: ["electronics", "computer"]
}
*/
```

### Updating Nested Fields

Operators can target fields within nested objects using dot notation.

```javascript
const updateEngine = new UpdateEngine();
let user = {
  id: 1,
  profile: {
    name: "Alice",
    preferences: { theme: "dark", notifications: true }
  }
};

const profileUpdates = {
  $set: { "profile.name": "Alicia", "profile.preferences.language": "en" },
  $unset: { "profile.preferences.notifications": "" }
};

user = updateEngine.applyOperators(user, profileUpdates);
/*
user is now:
{
  id: 1,
  profile: {
    name: "Alicia",
    preferences: { theme: "dark", language: "en" }
  }
}
*/
```

### Array Manipulations

Demonstrating various array operators.

```javascript
const updateEngine = new UpdateEngine();
let article = {
  title: "GAS DB Guide",
  authors: ["John"],
  comments: [
    { user: "UserA", text: "Great!" },
    { user: "UserB", text: "Helpful." }
  ],
  tags: ["database", "apps script"],
  scores: [10, 20, 30, 20, 40]
};

const arrayUpdates = {
  $push: { authors: "Jane" },
  $pull: { scores: 20 }, // Removes all instances of 20
  $addToSet: { tags: "guide" }
};

article = updateEngine.applyOperators(article, arrayUpdates);
/*
article is now:
{
  title: "GAS DB Guide",
  authors: ["John", "Jane"],
  comments: [
    { user: "UserA", text: "Great!" },
    { user: "UserB", text: "Helpful." }
  ],
  tags: ["database", "apps script", "guide"],
  scores: [10, 30, 40]
}
*/
```

## Error Handling

The `UpdateEngine` uses `ErrorHandler.ErrorTypes.INVALID_QUERY` for most operational errors, such as:

- Applying an operator to a field of an incompatible type (e.g., `$inc` on a string).
- Using an invalid operator structure (e.g., `$each` modifier not being an array).
- Providing an empty `updateOps` object or one with no valid `$`-prefixed operators to `applyOperators`.
- Encountering an unknown update operator.

It also uses `ErrorHandler.ErrorTypes.INVALID_ARGUMENT` for invalid or missing arguments, such as when required parameters are not provided or are of the wrong type.

Refer to `ErrorHandler.js` for details on error objects and codes.

### Private Validation Methods

The `UpdateEngine` class includes several private validation methods to ensure robust error handling and input correctness. These methods are invoked internally before or during operator application:

- `_validateApplyOperatorsInputs(document, updateOps)`: Ensures both arguments are valid objects.
- `_validateUpdateOperationsNotEmpty(updateOps)`: Ensures the update operations object is not empty.
- `_validateOperationsNotEmpty(ops, operatorName)`: Ensures the operator-specific operations object is not empty.
- `_validateNumericValue(value, fieldPath, operation)`: Ensures a value is numeric for arithmetic operations.
- `_validateCurrentFieldNumeric(value, fieldPath, operation)`: Ensures the current field value is numeric before arithmetic operations.
- `_validateArrayValue(value, fieldPath, operation)`: Ensures a value is an array for array operations.
- `_validateComparableValues(currentValue, newValue, fieldPath, operation)`: Ensures two values can be compared (same type or both numeric).

These methods throw `ErrorHandler.ErrorTypes.INVALID_ARGUMENT` or `INVALID_QUERY` as appropriate, providing clear error messages for invalid input or misuse of operators.

## Best Practices

- **Validate inputs**: Ensure the `updateOps` object is well-formed before passing it to `applyOperators`.
- **Understand operator behaviour**: Be familiar with how each MongoDB operator functions, especially with edge cases like non-existent fields or type mismatches. The `UpdateEngine` aims to mimic MongoDB behaviour.
- **Nested paths**: Use dot notation carefully for nested fields. The `_setFieldValue` utility will create intermediate objects if they don't exist when using `$set`. Other operators might behave differently if parent paths are missing.
- **Array operations**: Be mindful of how array operators like `$pull` match elements (e.g., exact match for objects in an array).
- **Performance**: For very large documents or frequent updates, consider the performance implications, as each operation involves traversing and potentially restructuring parts of the document.

### Dot Notation and Nested Paths

The `UpdateEngine` supports dot notation for targeting nested fields in documents (e.g., `profile.name`).

- The `_setFieldValue` utility will create intermediate objects as needed when using `$set` or similar operators.
- For other operators, if a parent path does not exist, behaviour may differ:
  - `$inc`, `$mul`, `$min`, `$max` will create the field if it does not exist, but only if the operation is valid for the value type.
  - `$unset` will silently do nothing if the path does not exist.
  - Array operators (`$push`, `$pull`, `$addToSet`) will throw an error if the target is not an array or does not exist (unless the operator is designed to create the array).
- Edge cases: If an intermediate object in the path is not an object (e.g., a string or number), an error will be thrown.

Careful use of dot notation is recommended to avoid unexpected behaviour, especially with deeply nested or missing paths.
