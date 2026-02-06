# Querying Collections

- [Querying Collections](#querying-collections)
  - [Overview](#overview)
  - [Basic Query Syntax](#basic-query-syntax)
  - [Comparison Operators](#comparison-operators)
    - [$eq - Equality](#eq---equality)
    - [$gt - Greater Than](#gt---greater-than)
    - [$gte - Greater Than or Equal](#gte---greater-than-or-equal)
    - [$lt - Less Than](#lt---less-than)
    - [$lte - Less Than or Equal](#lte---less-than-or-equal)
    - [$ne - Not Equal](#ne---not-equal)
    - [$in - Match Any Value in Array](#in---match-any-value-in-array)
    - [$nin - Match No Values in Array](#nin---match-no-values-in-array)
  - [Logical Operators](#logical-operators)
    - [$and - Logical AND](#and---logical-and)
    - [$or - Logical OR](#or---logical-or)
    - [$nor - Logical NOR](#nor---logical-nor)
    - [$not - Logical NOT](#not---logical-not)
    - [Combining Logical Operators](#combining-logical-operators)
  - [Querying Nested Fields](#querying-nested-fields)
    - [Dot Notation](#dot-notation)
    - [Nested Object Equality](#nested-object-equality)
    - [Deep Nesting](#deep-nesting)
  - [Array Queries](#array-queries)
    - [Matching Array Values](#matching-array-values)
    - [Empty Arrays](#empty-arrays)
    - [Array Length](#array-length)
  - [Edge Cases and Special Values](#edge-cases-and-special-values)
    - [Null Values](#null-values)
    - [Zero and False](#zero-and-false)
    - [Empty Strings](#empty-strings)
    - [Missing Fields](#missing-fields)
  - [Query Performance Tips](#query-performance-tips)
  - [Complete Examples](#complete-examples)

## Overview

JsonDbApp provides MongoDB-compatible query operators for finding documents in collections. Queries are expressed as JavaScript objects where field names map to matching criteria. This guide covers all supported query operators with practical examples.

## Basic Query Syntax

Simple equality queries match documents where a field equals a specific value:

```javascript
const users = db.getCollection('users');

// Find by exact match
const activeUsers = users.find({ isActive: true });

// Find by _id
const user = users.findOne({ _id: 'user123' });

// Find by nested field using dot notation
const anna = users.findOne({ 'name.first': 'Anna' });
```

## Comparison Operators

Comparison operators evaluate field values against specified criteria.

### $eq - Equality

Matches documents where a field equals a specified value. Explicit `$eq` is optional—implicit equality works the same way.

```javascript
// Arrange - persons collection with various ages
const persons = db.getCollection('persons');

// Act - find person aged exactly 29
const results = persons.find({ age: { $eq: 29 } });
// Equivalent implicit syntax
const results2 = persons.find({ age: 29 });

// Assert
console.log(results[0]._id); // 'person1'
```

**Edge Cases:**

```javascript
// Zero is distinct from false
const zeroAge = persons.find({ age: { $eq: 0 } });
const falseActive = persons.find({ isActive: { $eq: false } });

// Null matching
const noLogin = persons.find({ lastLogin: { $eq: null } });

// Date matching requires exact timestamp
const targetDate = new Date('2025-06-20T10:30:00Z');
const loginMatch = persons.find({ lastLogin: { $eq: targetDate } });

// Empty string vs null
const emptyEmail = persons.find({ 'contact.email': { $eq: '' } });
const nullEmail = persons.find({ 'contact.email': { $eq: null } });
```

### $gt - Greater Than

Matches documents where a field value is greater than the specified value.

```javascript
// Numeric comparisons
const olderPersons = persons.find({ age: { $gt: 40 } });

// Float comparisons
const highScores = persons.find({ score: { $gt: 90.0 } });

// Mixed integer and float
const aboveThreshold = persons.find({ score: { $gt: 80 } });

// Negative numbers
const positiveBalance = persons.find({ balance: { $gt: -200 } });

// Zero boundary
const creditBalance = persons.find({ balance: { $gt: 0 } });

// Date comparisons - chronological
const cutoffDate = new Date('2025-06-15T00:00:00Z');
const recentLogins = persons.find({ lastLogin: { $gt: cutoffDate } });
```

**String Comparisons:**

Strings are compared lexicographically (alphabetically):

```javascript
// String comparison is case-sensitive
const namesAfterM = persons.find({ 'name.last': { $gt: 'M' } });
// Returns: 'Miller', 'Prince', 'Smith'
```

### $gte - Greater Than or Equal

Matches documents where a field value is greater than or equal to the specified value.

```javascript
// Include boundary value
const adults = persons.find({ age: { $gte: 18 } });

// Date ranges - inclusive start
const startDate = new Date('2025-06-15T00:00:00Z');
const fromDate = persons.find({ lastLogin: { $gte: startDate } });
```

### $lt - Less Than

Matches documents where a field value is less than the specified value.

```javascript
// Numeric comparisons
const youngPersons = persons.find({ age: { $lt: 30 } });

// Float comparisons
const lowScores = persons.find({ score: { $lt: 50.0 } });

// Negative numbers
const debtBalance = persons.find({ balance: { $lt: 0 } });

// Date comparisons
const beforeDate = new Date('2025-06-20T00:00:00Z');
const olderLogins = persons.find({ lastLogin: { $lt: beforeDate } });
```

### $lte - Less Than or Equal

Matches documents where a field value is less than or equal to the specified value.

```javascript
// Include boundary value
const maxAge = persons.find({ age: { $lte: 65 } });

// Date ranges - inclusive end
const endDate = new Date('2025-06-25T23:59:59Z');
const untilDate = persons.find({ lastLogin: { $lte: endDate } });

// Combining with $gte for ranges
const ageRange = persons.find({
  $and: [{ age: { $gte: 30 } }, { age: { $lte: 50 } }]
});
```

### $ne - Not Equal

Matches documents where a field does not equal the specified value, including documents where the field does not exist.

```javascript
// Not equal to value
const notAnna = persons.find({ 'name.first': { $ne: 'Anna' } });

// Exclude null
const hasLogin = persons.find({ lastLogin: { $ne: null } });

// Exclude false
const notInactive = persons.find({ isActive: { $ne: false } });

// Exclude zero
const nonZeroAge = persons.find({ age: { $ne: 0 } });
```

### $in - Match Any Value in Array

Matches documents where a field value equals any value in the specified array.

```javascript
// String values
const specificNames = persons.find({
  'name.first': { $in: ['Anna', 'Clara', 'Frank'] }
});

// Numeric values
const specificAges = persons.find({ age: { $in: [29, 38, 45] } });

// Mixed types (use with caution)
const mixedValues = persons.find({ age: { $in: [0, null, false] } });

// Empty array matches nothing
const noMatch = persons.find({ age: { $in: [] } });
```

### $nin - Match No Values in Array

Matches documents where a field value does not equal any value in the specified array, including documents where the field does not exist.

```javascript
// Exclude multiple names
const excludeNames = persons.find({
  'name.first': { $nin: ['Ben', 'Ethan'] }
});

// Exclude multiple numeric values
const excludeAges = persons.find({ age: { $nin: [0, 29, 65] } });

// Empty array matches all documents
const allMatch = persons.find({ age: { $nin: [] } });
```

## Logical Operators

Logical operators combine multiple query conditions.

### $and - Logical AND

Matches documents that satisfy all specified conditions. Can be expressed implicitly or explicitly.

```javascript
// Implicit AND - most common
const result1 = persons.find({
  isActive: true,
  age: { $gt: 30 }
});

// Explicit $and
const result2 = persons.find({
  $and: [{ isActive: { $eq: true } }, { age: { $gt: 30 } }]
});

// Multiple conditions
const result3 = persons.find({
  $and: [
    { isActive: { $eq: true } },
    { score: { $gt: 80 } },
    { balance: { $gt: 1000 } }
  ]
});

// Mixed comparison operators
const result4 = persons.find({
  $and: [
    { 'name.first': { $eq: 'Anna' } },
    { age: { $lt: 35 } },
    { score: { $gt: 80 } }
  ]
});
```

**Nested $and Operations:**

```javascript
const complex = persons.find({
  $and: [
    {
      $and: [{ isActive: { $eq: true } }, { age: { $gt: 25 } }]
    },
    { score: { $gt: 85 } }
  ]
});
```

### $or - Logical OR

Matches documents that satisfy at least one of the specified conditions.

```javascript
// Basic disjunction
const youngOrOld = persons.find({
  $or: [{ age: { $lt: 30 } }, { age: { $gt: 60 } }]
});

// Multiple conditions
const multipleNames = persons.find({
  $or: [
    { 'name.first': { $eq: 'Anna' } },
    { 'name.first': { $eq: 'Clara' } },
    { 'name.first': { $eq: 'Frank' } }
  ]
});

// Mixed comparison operators
const mixed = persons.find({
  $or: [{ score: { $gt: 95 } }, { balance: { $lt: 0 } }, { age: { $eq: 0 } }]
});
```

**Nested $or Operations:**

```javascript
const nested = persons.find({
  $or: [
    {
      $or: [{ age: { $lt: 30 } }, { age: { $gt: 60 } }]
    },
    { score: { $gt: 90 } }
  ]
});
```

### $nor - Logical NOR

Matches documents that fail all specified conditions.

```javascript
// Neither condition is true
const result = persons.find({
  $nor: [{ isActive: { $eq: false } }, { age: { $lt: 30 } }]
});
// Returns documents where isActive is true AND age >= 30
```

### $not - Logical NOT

Inverts the effect of a query expression.

```javascript
// Not greater than (effectively less than or equal)
const notHigh = persons.find({ age: { $not: { $gt: 50 } } });

// Not in range
const outsideRange = persons.find({
  score: { $not: { $gte: 70, $lte: 90 } }
});
```

### Combining Logical Operators

Complex queries often require combining multiple logical operators.

**$and Containing $or Clauses:**

```javascript
const result = persons.find({
  $and: [
    {
      $or: [{ 'name.first': { $eq: 'Anna' } }, { 'name.first': { $eq: 'Diana' } }]
    },
    { isActive: { $eq: true } }
  ]
});
// Active users named Anna or Diana
```

**$or Containing $and Clauses:**

```javascript
const result = persons.find({
  $or: [
    {
      $and: [{ isActive: { $eq: false } }, { age: { $gt: 40 } }]
    },
    { score: { $gt: 95 } }
  ]
});
// Inactive users over 40, or users with score > 95
```

**Complex Nested Operations:**

```javascript
const complex = persons.find({
  $and: [
    {
      $or: [{ age: { $lt: 35 } }, { age: { $gt: 60 } }]
    },
    {
      $or: [{ isActive: { $eq: true } }, { score: { $gt: 90 } }]
    }
  ]
});
// (Young or old) AND (active or high scorer)
```

## Querying Nested Fields

JsonDbApp supports querying nested document structures using dot notation or whole-object matching.

### Dot Notation

Use dot notation to query fields within nested objects:

```javascript
// Query nested string field
const anna = persons.findOne({ 'name.first': 'Anna' });

// Query nested numeric field
const specificScore = persons.find({ 'metadata.version': { $eq: 1 } });

// Query nested boolean
const newsletter = persons.find({ 'preferences.newsletter': true });

// Query nested array
const withPhone = persons.find({ 'contact.phones': { $ne: [] } });
```

### Nested Object Equality

Match entire nested objects by providing the complete object structure:

```javascript
// Exact object match
const result = persons.find({
  name: { $eq: { first: 'Anna', last: 'Brown' } }
});

// Field order matters for object equality
const noMatch = persons.find({
  name: { $eq: { last: 'Brown', first: 'Anna' } } // Won't match
});
```

### Deep Nesting

Dot notation works at any nesting level:

```javascript
// Deep nested field access
const weeklyEmail = persons.find({
  'preferences.settings.notifications.email.frequency': 'weekly'
});

// Multiple deep nested conditions
const complexNested = persons.find({
  'preferences.settings.notifications.email.enabled': true,
  'preferences.settings.notifications.email.frequency': { $ne: 'immediate' }
});
```

## Array Queries

Query documents based on array field contents.

### Matching Array Values

```javascript
// Array contains value
const withTag = persons.find({ 'preferences.tags': 'sports' });

// Array contains any of multiple values
const withTags = persons.find({
  'preferences.tags': { $in: ['music', 'travel'] }
});

// All values must be present (use $all if supported)
// Note: $all may not be implemented - check documentation
```

### Empty Arrays

```javascript
// Match empty array
const emptyPhones = persons.find({ 'contact.phones': [] });

// Match non-empty array using $ne
const hasPhones = persons.find({ 'contact.phones': { $ne: [] } });

// Match empty array explicitly with $eq
const noPhones = persons.find({ 'contact.phones': { $eq: [] } });
```

### Array Length

Array length queries may require combining with custom logic:

```javascript
// Find documents where array has specific length
// This requires application logic as $size may not be implemented
const docs = persons.find({ 'contact.phones': { $exists: true } });
const multiplePhones = docs.filter((doc) => doc.contact.phones.length > 1);
```

## Edge Cases and Special Values

### Null Values

```javascript
// Match null explicitly
const nullEmail = persons.find({ 'contact.email': { $eq: null } });

// Exclude null
const hasEmail = persons.find({ 'contact.email': { $ne: null } });

// Null vs undefined
// Missing fields are treated as undefined, not null
const missingField = persons.find({ nonExistent: { $eq: null } });
// This may or may not match depending on implementation
```

### Zero and False

```javascript
// Zero is distinct from false
const ageZero = persons.find({ age: 0 });
const ageFalse = persons.find({ age: false }); // Won't match age: 0

// Explicit distinction
const zeroAge = persons.find({ age: { $eq: 0 } });
const falseActive = persons.find({ isActive: { $eq: false } });

// Both zero and false are falsy, but not equal
const notZero = persons.find({ age: { $ne: 0 } }); // Includes false, null, etc.
```

### Empty Strings

```javascript
// Empty string is distinct from null
const emptyEmail = persons.find({ 'contact.email': '' });
const nullEmail = persons.find({ 'contact.email': null });

// Exclude both empty and null
const validEmail = persons.find({
  $and: [{ 'contact.email': { $ne: '' } }, { 'contact.email': { $ne: null } }]
});
```

### Missing Fields

```javascript
// Query for non-existent fields
// Behaviour depends on operator

// $eq: null may match missing fields
const result1 = persons.find({ nonExistent: { $eq: null } });

// $ne: value matches missing fields
const result2 = persons.find({ nonExistent: { $ne: 'value' } });

// Use $exists if implemented
// const hasField = persons.find({ field: { $exists: true } });
```

## Query Performance Tips

1. **Use Specific Queries**: More specific queries reduce the number of documents scanned:

   ```javascript
   // Better
   const result = persons.find({ _id: 'person1' });

   // Less efficient
   const result = persons.find({ 'name.first': 'Anna' });
   ```

1. **Combine Filters Efficiently**: Place most restrictive conditions first in implicit AND queries:

   ```javascript
   // More efficient (fewer documents pass first filter)
   const result = persons.find({
     isActive: true,
     age: { $gt: 30 },
     score: { $gt: 80 }
   });
   ```

1. **Avoid Redundant Operators**: Use implicit equality when possible:

   ```javascript
   // Simpler
   const result = persons.find({ isActive: true });

   // Unnecessary explicit $eq
   const result = persons.find({ isActive: { $eq: true } });
   ```

1. **Limit Result Sets**: Use query specificity to reduce result set size before application-level filtering.

## Complete Examples

**Find Active Adults with High Scores:**

```javascript
const eliteUsers = persons.find({
  isActive: true,
  age: { $gte: 18 },
  score: { $gt: 85 }
});
```

**Find Users Who Recently Logged In:**

```javascript
const cutoffDate = new Date('2025-06-20T00:00:00Z');
const recentUsers = persons.find({
  lastLogin: { $gte: cutoffDate },
  isActive: true
});
```

**Complex Nested Query:**

```javascript
const premiumUsers = persons.find({
  $and: [
    { balance: { $gt: 1000 } },
    { 'preferences.newsletter': true },
    { 'preferences.settings.notifications.email.enabled': true },
    {
      $or: [{ 'preferences.settings.theme': 'dark' }, { 'preferences.settings.theme': 'auto' }]
    }
  ]
});
```

**Multi-Condition Search:**

```javascript
const targetUsers = persons.find({
  $or: [
    {
      $and: [{ isActive: true }, { age: { $lt: 30 } }, { score: { $gt: 80 } }]
    },
    {
      $and: [{ isActive: false }, { balance: { $gt: 5000 } }]
    }
  ]
});
```

---

For more examples, see [Examples.md](Examples.md). For update operations, see [Updates.md](Updates.md). For technical details, see [developers/QueryEngine.md](developers/QueryEngine.md).

