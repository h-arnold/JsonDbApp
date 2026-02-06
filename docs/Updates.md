# Update Operations

- [Update Operations](#update-operations)
  - [Overview](#overview)
  - [Basic Update Syntax](#basic-update-syntax)
  - [Field Update Operators](#field-update-operators)
    - [$set - Set Field Value](#set---set-field-value)
    - [$unset - Remove Field](#unset---remove-field)
    - [$inc - Increment Numeric Value](#inc---increment-numeric-value)
    - [$mul - Multiply Numeric Value](#mul---multiply-numeric-value)
    - [$min - Set Minimum Value](#min---set-minimum-value)
    - [$max - Set Maximum Value](#max---set-maximum-value)
    - [$rename - Rename Field](#rename---rename-field)
  - [Array Update Operators](#array-update-operators)
    - [$push - Append to Array](#push---append-to-array)
    - [$pull - Remove from Array](#pull---remove-from-array)
    - [$addToSet - Add Unique to Array](#addtoset---add-unique-to-array)
    - [$pop - Remove First or Last Element](#pop---remove-first-or-last-element)
  - [Update Patterns](#update-patterns)
    - [Creating Nested Structures](#creating-nested-structures)
    - [Type Changes](#type-changes)
    - [Partial Object Updates](#partial-object-updates)
    - [Multiple Field Updates](#multiple-field-updates)
  - [Edge Cases and Validation](#edge-cases-and-validation)
    - [The \_id Field](#the-_id-field)
    - [Non-Existent Fields](#non-existent-fields)
    - [Type Mismatches](#type-mismatches)
    - [Empty Values](#empty-values)
  - [Update Methods](#update-methods)
    - [updateOne(filter, update)](#updateonefilter-update)
    - [updateMany(filter, update)](#updatemanyfilter-update)
    - [replaceOne(filter, replacement)](#replaceonefilter-replacement)
  - [Complete Examples](#complete-examples)

## Overview

JsonDbApp provides MongoDB-compatible update operators for modifying documents in collections. Updates are expressed using operator syntax where operator names (prefixed with `$`) map to update actions. This guide covers all supported update operators with practical examples.

## Basic Update Syntax

Updates are performed using `updateOne()`, `updateMany()`, or `replaceOne()` methods:

```javascript
const users = db.getCollection('users');

// Update single document
users.updateOne({ _id: 'user123' }, { $set: { status: 'active' } });

// Update multiple documents
users.updateMany({ status: 'pending' }, { $set: { reviewed: true } });

// Replace entire document (except _id)
users.replaceOne({ _id: 'user123' }, { _id: 'user123', name: 'New Name', role: 'admin' });

// Persist changes to Drive
users.save();
```

## Field Update Operators

Field operators modify specific fields within documents.

### $set - Set Field Value

Sets the value of a field. If the field does not exist, `$set` creates it. Works with all data types and supports dot notation for nested fields.

**Overwriting Existing Values:**

```javascript
const persons = db.getCollection('persons');

// String values
persons.updateOne({ _id: 'person1' }, { $set: { 'name.first': 'Alexandra' } });

// Numeric values
persons.updateOne({ _id: 'person1' }, { $set: { age: 35, score: 92.7 } });

// Boolean values
persons.updateOne({ _id: 'person1' }, { $set: { isActive: false } });

// Array values
persons.updateOne({ _id: 'person1' }, { $set: { 'preferences.tags': ['updated', 'test'] } });

// Object values
const newContact = { email: 'new@example.com', phones: ['999-111-2222'] };
persons.updateOne({ _id: 'person1' }, { $set: { contact: newContact } });
```

**Creating New Fields:**

```javascript
// Create top-level fields
persons.updateOne({ _id: 'person1' }, { $set: { newField: 'new value', anotherField: 42 } });

// Create nested fields using dot notation
persons.updateOne({ _id: 'person1' }, { $set: { 'preferences.settings.theme': 'auto' } });

// Create deeply nested fields (intermediate objects created automatically)
persons.updateOne(
  {
    _id: 'person1'
  },
  {
    $set: { 'preferences.settings.notifications.push.enabled': true }
  }
);
```

**Type Changes:**

```javascript
// String to number
persons.updateOne({ _id: 'person1' }, { $set: { age: 30 } }); // Was string, now number

// Number to array
persons.updateOne({ _id: 'person1' }, { $set: { score: [85, 90, 95] } });

// Object to primitive
persons.updateOne({ _id: 'person1' }, { $set: { contact: 'email@example.com' } });

// Null to non-null
persons.updateOne({ _id: 'person1' }, { $set: { lastLogin: new Date() } });
```

### $unset - Remove Field

Removes the specified field from a document. The value provided to `$unset` is ignored—any value works (typically empty string `''` or `1`).

**Basic Field Removal:**

```javascript
// Remove single top-level field
persons.updateOne({ _id: 'person1' }, { $unset: { tempField: '' } });

// Remove multiple fields
persons.updateOne({ _id: 'person1' }, { $unset: { temp1: '', temp3: '' } });

// Remove nested field using dot notation
persons.updateOne({ _id: 'person1' }, { $unset: { 'preferences.newsletter': '' } });

// Remove deeply nested field
persons.updateOne(
  {
    _id: 'person1'
  },
  {
    $unset: { 'preferences.settings.notifications.email.frequency': '' }
  }
);
```

**Object Structure Preservation:**

```javascript
// Parent object remains after removing field
persons.updateOne({ _id: 'person1' }, { $unset: { 'name.first': '' } });
// document.name still exists as { last: 'Brown' }

// Removing all fields leaves empty object
persons.updateOne({ _id: 'person1' }, { $unset: { 'name.first': '', 'name.last': '' } });
// document.name now equals {}

// Object hierarchy maintained
persons.updateOne({ _id: 'person1' }, { $unset: { 'preferences.settings.theme': '' } });
// document.preferences and document.preferences.settings still exist
```

**Edge Cases:**

```javascript
// Removing non-existent field is a no-op
const result = persons.updateOne({ _id: 'person1' }, { $unset: { nonExistent: '' } });
console.log(result.modifiedCount); // 0

// Cannot remove _id field
// Attempting to unset _id may throw error or be ignored
```

### $inc - Increment Numeric Value

Increments a numeric field by a specified amount. If the field does not exist, it is created with the increment value. Accepts positive or negative numbers.

**Basic Incrementation:**

```javascript
// Increment positive integer
persons.updateOne({ _id: 'person1' }, { $inc: { age: 5 } });

// Increment decimal
persons.updateOne({ _id: 'person1' }, { $inc: { score: 10.5 } });

// Decrement with negative value
persons.updateOne({ _id: 'person4' }, { $inc: { age: -3, score: -8.1 } });

// Zero increment is no-op
const result = persons.updateOne({ _id: 'person3' }, { $inc: { age: 0 } });
console.log(result.modifiedCount); // 0 (no change)
```

**Field Creation:**

```javascript
// Create field with increment value if it does not exist
persons.updateOne({ _id: 'person2' }, { $inc: { newCounter: 100 } });
// document.newCounter now equals 100

// Create nested field
persons.updateOne({ _id: 'person2' }, { $inc: { 'stats.loginCount': 1 } });
// document.stats.loginCount created with value 1
```

**Type Validation:**

```javascript
// Incrementing non-numeric field throws error
try {
  persons.updateOne({ _id: 'person1' }, { $inc: { 'name.first': 1 } });
} catch (error) {
  console.log('Cannot increment non-numeric field');
}

// Non-numeric increment value throws error
try {
  persons.updateOne({ _id: 'person1' }, { $inc: { age: 'five' } });
} catch (error) {
  console.log('Increment value must be numeric');
}
```

**Boundary Cases:**

```javascript
// Large numbers
persons.updateOne({ _id: 'person1' }, { $inc: { balance: 1000000 } });

// Floating point precision
persons.updateOne({ _id: 'person1' }, { $inc: { score: 0.1 } });
// Be aware of floating point arithmetic limitations

// Maximum safe integer (Number.MAX_SAFE_INTEGER = 9007199254740991)
// Exceeding this may cause precision issues
```

### $mul - Multiply Numeric Value

Multiplies a numeric field by a specified value. If the field does not exist, it is created with value `0`.

**Basic Multiplication:**

```javascript
// Multiply by positive number
persons.updateOne({ _id: 'person1' }, { $mul: { score: 1.1 } });

// Multiply by fraction
persons.updateOne({ _id: 'person1' }, { $mul: { balance: 0.9 } });

// Multiply by zero (sets field to 0)
persons.updateOne({ _id: 'person1' }, { $mul: { age: 0 } });

// Multiply by negative (inverts sign)
persons.updateOne({ _id: 'person3' }, { $mul: { balance: -1 } });
```

**Field Creation:**

```javascript
// Non-existent field created as 0
const result = persons.updateOne({ _id: 'person2' }, { $mul: { newField: 5 } });
// document.newField now equals 0 (0 * 5)
```

### $min - Set Minimum Value

Updates field value only if the specified value is less than the current field value. If the field does not exist, sets the field to the specified value.

**Basic Usage:**

```javascript
// Update if new value is smaller
persons.updateOne({ _id: 'person1' }, { $min: { age: 25 } });
// If age was 29, now 25; if age was 20, still 20

// Works with decimals
persons.updateOne({ _id: 'person1' }, { $min: { score: 80.0 } });

// Works with negative numbers
persons.updateOne({ _id: 'person1' }, { $min: { balance: -100 } });

// Works with dates
const minDate = new Date('2025-01-01T00:00:00Z');
persons.updateOne({ _id: 'person1' }, { $min: { lastLogin: minDate } });
```

**Field Creation:**

```javascript
// Creates field if it does not exist
persons.updateOne({ _id: 'person2' }, { $min: { newMin: 50 } });
// document.newMin now equals 50
```

### $max - Set Maximum Value

Updates field value only if the specified value is greater than the current field value. If the field does not exist, sets the field to the specified value.

**Basic Usage:**

```javascript
// Update if new value is larger
persons.updateOne({ _id: 'person1' }, { $max: { age: 40 } });
// If age was 29, now 40; if age was 50, still 50

// Works with decimals
persons.updateOne({ _id: 'person1' }, { $max: { score: 95.0 } });

// Works with negative numbers
persons.updateOne({ _id: 'person3' }, { $max: { balance: 0 } });

// Works with dates
const maxDate = new Date('2025-12-31T23:59:59Z');
persons.updateOne({ _id: 'person1' }, { $max: { lastLogin: maxDate } });
```

### $rename - Rename Field

Renames a field. If the new field name already exists, it is overwritten. If the old field does not exist, no operation is performed.

**Basic Usage:**

```javascript
// Rename top-level field
persons.updateOne({ _id: 'person1' }, { $rename: { oldName: 'newName' } });

// Rename nested field
persons.updateOne({ _id: 'person1' }, { $rename: { 'name.first': 'name.firstName' } });

// Rename with overwrite
persons.updateOne({ _id: 'person1' }, { $rename: { tempValue: 'age' } });
// If 'age' exists, it is overwritten with 'tempValue'
```

## Array Update Operators

Array operators modify array fields within documents.

### $push - Append to Array

Appends a value to an array field. If the field does not exist, creates a new array with the value. If the field exists but is not an array, throws an error.

**Basic Appending:**

```javascript
// Append single value
persons.updateOne({ _id: 'person1' }, { $push: { 'preferences.tags': 'new-tag' } });
// tags: ['sports', 'music', 'new-tag']

// Append object
const inventory = db.getCollection('inventory');
const newAlert = { type: 'high-temp', value: 30 };
inventory.updateOne({ _id: 'inv1' }, { $push: { alerts: newAlert } });
```

**Array Creation:**

```javascript
// Create array when field does not exist
persons.updateOne({ _id: 'person2' }, { $push: { newArrayField: 'first-element' } });
// document.newArrayField now equals ['first-element']

// Create nested array
persons.updateOne({ _id: 'person2' }, { $push: { 'newly.nested.array': 'value' } });
// Intermediate objects created automatically
```

**$each Modifier:**

```javascript
// Push multiple values at once
persons.updateOne(
  {
    _id: 'person4'
  },
  {
    $push: { 'preferences.tags': { $each: ['new1', 'new2', 'new3'] } }
  }
);
// tags: ['travel', 'photography', 'music', 'new1', 'new2', 'new3']

// Empty $each array is no-op
const result = persons.updateOne(
  {
    _id: 'person5'
  },
  {
    $push: { 'preferences.tags': { $each: [] } }
  }
);
console.log(result.modifiedCount); // 0

// Push array of objects
const newAlerts = [
  { type: 'temp', level: 'warning' },
  { type: 'pressure', level: 'critical' }
];
inventory.updateOne({ _id: 'inv1' }, { $push: { alerts: { $each: newAlerts } } });
```

**Type Validation:**

```javascript
// Pushing to non-array field throws error
try {
  persons.updateOne({ _id: 'person1' }, { $push: { 'name.first': 'invalid' } });
} catch (error) {
  console.log('Cannot push to non-array field');
}
```

### $pull - Remove from Array

Removes all elements from an array that match the specified condition. Can remove by value or by query operator.

**Basic Value Removal:**

```javascript
// Remove specific value
persons.updateOne({ _id: 'person3' }, { $pull: { 'preferences.tags': 'alerts' } });
// tags: ['news', 'sports'] (removed 'alerts')

// Remove all occurrences
const orders = db.getCollection('orders');
orders.updateOne({ _id: 'order3' }, { $pull: { items: { sku: 'prod1' } } });
// Removes all items where sku equals 'prod1'
```

**Edge Cases:**

```javascript
// Pulling from non-array field is gracefully ignored
const result = persons.updateOne({ _id: 'person1' }, { $pull: { 'name.first': 'Anna' } });
console.log(result.modifiedCount); // 0

// Pulling non-existent value is no-op
const result2 = persons.updateOne(
  {
    _id: 'person1'
  },
  {
    $pull: { 'preferences.tags': 'non-existent' }
  }
);
console.log(result2.modifiedCount); // 0

// Pulling from empty array is no-op
const result3 = persons.updateOne({ _id: 'person2' }, { $pull: { 'contact.phones': '123' } });
console.log(result3.modifiedCount); // 0
```

**Operator Predicates:**

```javascript
// Remove with comparison operator
orders.updateOne({ _id: 'order1' }, { $pull: { 'items.quantity': { $lt: 5 } } });

// Remove with multiple conditions
inventory.updateOne(
  {
    _id: 'inv1'
  },
  {
    $pull: { alerts: { type: 'low-stock', level: { $ne: 'critical' } } }
  }
);
```

### $addToSet - Add Unique to Array

Adds a value to an array only if it does not already exist in the array. Ensures array elements remain unique.

**Adding Unique Values:**

```javascript
// Add unique primitive value
persons.updateOne({ _id: 'person1' }, { $addToSet: { 'preferences.tags': 'new-tag' } });
// Added only if 'new-tag' not already present

// Add unique object
const inventory = db.getCollection('inventory');
const alert = { type: 'security-alert', level: 'high' };
inventory.updateOne({ _id: 'inv1' }, { $addToSet: { alerts: alert } });
```

**Duplicate Prevention:**

```javascript
// No-op if value already exists
const result = persons.updateOne(
  {
    _id: 'person1'
  },
  {
    $addToSet: { 'preferences.tags': 'sports' }
  }
);
console.log(result.modifiedCount); // 0 (already exists)

// Object equality checked by value
const existingAlert = { type: 'low-stock', product: 'prod3', threshold: 10 };
const result2 = inventory.updateOne({ _id: 'inv1' }, { $addToSet: { alerts: existingAlert } });
console.log(result2.modifiedCount); // 0 if exact object exists
```

**$each Modifier:**

```javascript
// Add multiple unique values
persons.updateOne(
  {
    _id: 'person4'
  },
  {
    $addToSet: { 'preferences.tags': { $each: ['tag1', 'tag2', 'tag3'] } }
  }
);
// Only non-duplicate tags added

// Combining new and existing values
persons.updateOne(
  {
    _id: 'person1'
  },
  {
    $addToSet: { 'preferences.tags': { $each: ['sports', 'new1', 'music', 'new2'] } }
  }
);
// Only 'new1' and 'new2' added (sports and music already exist)
```

**Array Creation:**

```javascript
// Create array if field does not exist
persons.updateOne({ _id: 'person2' }, { $addToSet: { newSetField: 'first-unique' } });
// document.newSetField now equals ['first-unique']
```

### $pop - Remove First or Last Element

Removes the first or last element from an array. Use value `1` to remove the last element, `-1` to remove the first.

**Basic Usage:**

```javascript
// Remove last element
persons.updateOne({ _id: 'person3' }, { $pop: { 'preferences.tags': 1 } });

// Remove first element
persons.updateOne({ _id: 'person4' }, { $pop: { 'contact.phones': -1 } });

// Empty array results in no-op
const result = persons.updateOne({ _id: 'person2' }, { $pop: { 'contact.phones': 1 } });
console.log(result.modifiedCount); // 0
```

## Update Patterns

### Creating Nested Structures

`$set` automatically creates intermediate objects when using dot notation:

```javascript
// Create entire nested structure
persons.updateOne(
  {
    _id: 'person1'
  },
  {
    $set: {
      'newly.created.nested.field': 'value',
      'newly.created.sibling': 'another value'
    }
  }
);
// Creates: { newly: { created: { nested: { field: 'value' }, sibling: 'another value' } } }

// Mixing existing and new nested paths
persons.updateOne(
  {
    _id: 'person1'
  },
  {
    $set: {
      'preferences.settings.newSetting': true,
      'preferences.newTopLevel': 'value'
    }
  }
);
```

### Type Changes

Update operators can change field types:

```javascript
// String to number
persons.updateOne({ _id: 'person1' }, { $set: { age: '30' } }); // String
persons.updateOne({ _id: 'person1' }, { $set: { age: 30 } }); // Now number

// Scalar to array
persons.updateOne({ _id: 'person1' }, { $set: { score: 85 } }); // Number
persons.updateOne({ _id: 'person1' }, { $set: { score: [85, 90, 95] } }); // Now array

// Object to scalar
persons.updateOne({ _id: 'person1' }, { $set: { contact: { email: 'test@example.com' } } });
persons.updateOne({ _id: 'person1' }, { $set: { contact: 'simple string' } });
```

### Partial Object Updates

Use dot notation to update specific fields within objects without replacing the entire object:

```javascript
// Update one field, preserve others
persons.updateOne({ _id: 'person1' }, { $set: { 'name.first': 'Anna' } });
// document.name.last remains unchanged

// Update multiple nested fields
persons.updateOne(
  {
    _id: 'person1'
  },
  {
    $set: {
      'preferences.newsletter': false,
      'preferences.settings.theme': 'dark'
    }
  }
);
// Other preferences fields remain unchanged
```

### Multiple Field Updates

Combine multiple operators in a single update:

```javascript
// Multiple $set operations
persons.updateOne(
  {
    _id: 'person1'
  },
  {
    $set: {
      'name.first': 'Anna',
      age: 30,
      isActive: true
    }
  }
);

// Combine different operators
persons.updateOne(
  {
    _id: 'person1'
  },
  {
    $set: { status: 'active' },
    $inc: { loginCount: 1 },
    $push: { 'activity.logins': new Date() },
    $unset: { tempFlag: '' }
  }
);
```

## Edge Cases and Validation

### The \_id Field

The `_id` field is immutable and cannot be updated:

```javascript
// Attempting to update _id may throw error or be ignored
try {
  persons.updateOne({ _id: 'person1' }, { $set: { _id: 'newId' } });
} catch (error) {
  console.log('Cannot modify _id field');
}

// $unset on _id may also fail
try {
  persons.updateOne({ _id: 'person1' }, { $unset: { _id: '' } });
} catch (error) {
  console.log('Cannot remove _id field');
}
```

### Non-Existent Fields

Most operators handle non-existent fields gracefully:

```javascript
// $set creates field
persons.updateOne({ _id: 'person1' }, { $set: { newField: 'value' } });

// $inc creates field with increment value
persons.updateOne({ _id: 'person1' }, { $inc: { counter: 1 } });

// $mul creates field as 0
persons.updateOne({ _id: 'person1' }, { $mul: { multiplier: 5 } });
// Field created with value 0

// $min/$max create field with specified value
persons.updateOne({ _id: 'person1' }, { $min: { minValue: 100 } });

// $unset on non-existent field is no-op
const result = persons.updateOne({ _id: 'person1' }, { $unset: { nonExistent: '' } });
console.log(result.modifiedCount); // 0
```

### Type Mismatches

Type mismatches generally throw errors:

```javascript
// $inc on non-numeric field
try {
  persons.updateOne({ _id: 'person1' }, { $inc: { 'name.first': 1 } });
} catch (error) {
  console.log('Cannot increment non-numeric field');
}

// $push on non-array field
try {
  persons.updateOne({ _id: 'person1' }, { $push: { age: 'value' } });
} catch (error) {
  console.log('Cannot push to non-array field');
}

// $pull on non-array field may be gracefully ignored
const result = persons.updateOne({ _id: 'person1' }, { $pull: { age: 30 } });
console.log(result.modifiedCount); // 0 (no error, no change)
```

### Empty Values

Handling of empty values varies by operator:

```javascript
// $set with null
persons.updateOne({ _id: 'person1' }, { $set: { lastLogin: null } });
// Field set to null

// $set with undefined may behave like $unset
persons.updateOne({ _id: 'person1' }, { $set: { field: undefined } });
// Check implementation details

// $set with empty string
persons.updateOne({ _id: 'person1' }, { $set: { 'contact.email': '' } });
// Field set to empty string (distinct from null)

// $set with empty array
persons.updateOne({ _id: 'person1' }, { $set: { 'contact.phones': [] } });
// Field set to empty array

// $set with empty object
persons.updateOne({ _id: 'person1' }, { $set: { metadata: {} } });
// Field set to empty object
```

## Update Methods

JsonDbApp provides three primary update methods:

### updateOne(filter, update)

Updates a single document matching the filter:

```javascript
const result = persons.updateOne({ _id: 'person1' }, { $set: { status: 'active' } });

console.log(result.matchedCount); // 1 if document found
console.log(result.modifiedCount); // 1 if document changed
```

### updateMany(filter, update)

Updates all documents matching the filter:

```javascript
const result = persons.updateMany({ isActive: false }, { $set: { reviewed: true } });

console.log(result.matchedCount); // Number of documents matched
console.log(result.modifiedCount); // Number of documents changed
```

### replaceOne(filter, replacement)

Replaces an entire document (except `_id`):

```javascript
const replacement = {
  _id: 'person1',
  name: { first: 'Anna', last: 'Brown' },
  age: 30,
  isActive: true
};

const result = persons.replaceOne({ _id: 'person1' }, replacement);
// All fields replaced except _id
```

## Complete Examples

**Increment Login Count and Update Last Login:**

```javascript
persons.updateOne(
  {
    _id: 'person1'
  },
  {
    $inc: { 'stats.loginCount': 1 },
    $set: { lastLogin: new Date() }
  }
);
```

**Add Tags and Update Preferences:**

```javascript
persons.updateOne(
  {
    _id: 'person1'
  },
  {
    $addToSet: { 'preferences.tags': { $each: ['premium', 'verified'] } },
    $set: { 'preferences.newsletter': true }
  }
);
```

**Update Nested Settings:**

```javascript
persons.updateOne(
  {
    _id: 'person1'
  },
  {
    $set: {
      'preferences.settings.theme': 'dark',
      'preferences.settings.notifications.email.enabled': true,
      'preferences.settings.notifications.email.frequency': 'daily'
    }
  }
);
```

**Clean Up Old Fields and Add New Ones:**

```javascript
persons.updateOne(
  {
    _id: 'person1'
  },
  {
    $unset: { legacyField: '', deprecatedSetting: '' },
    $set: { newField: 'value', version: 2 }
  }
);
```

**Batch Update with Multiple Operators:**

```javascript
persons.updateMany(
  {
    isActive: true,
    lastLogin: { $lt: new Date('2025-01-01') }
  },
  {
    $set: { status: 'stale', reviewRequired: true },
    $inc: { inactivityScore: 10 },
    $push: { 'history.events': { type: 'flagged', date: new Date() } }
  }
);
```

**Complex Nested Array Update:**

```javascript
const orders = db.getCollection('orders');

orders.updateOne(
  {
    _id: 'order1'
  },
  {
    $push: { items: { sku: 'prod5', quantity: 3, price: 29.99 } },
    $inc: { totalAmount: 89.97, 'metrics.itemCount': 3 },
    $set: { updatedAt: new Date(), status: 'modified' }
  }
);
```

---

For query operations, see [Querying.md](Querying.md). For more examples, see [Examples.md](Examples.md). For technical details, see [developers/UpdateEngine.md](developers/UpdateEngine.md).
