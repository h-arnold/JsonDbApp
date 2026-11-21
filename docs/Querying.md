# Querying Collections

- [Querying Collections](#querying-collections)
  - [Overview](#overview)
  - [Basic Query Syntax](#basic-query-syntax)
  - [Comparison Operators](#comparison-operators)
    - [$eq - Equality](#eq---equality)
    - [$gt - Greater Than](#gt---greater-than)
    - [$lt - Less Than](#lt---less-than)
  - [Logical Operators](#logical-operators)
    - [$and - Logical AND](#and---logical-and)
    - [$or - Logical OR](#or---logical-or)
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

JsonDbApp supports five query operators: `$eq`, `$gt`, `$lt`, `$and` and `$or`. Queries are expressed as JavaScript objects where field names map to matching criteria. Any other operator is rejected. This guide shows how to use the supported operators.

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
  $and: [{ isActive: { $eq: true } }, { score: { $gt: 80 } }, { balance: { $gt: 1000 } }]
});

// Mixed comparison operators
const result4 = persons.find({
  $and: [{ 'name.first': { $eq: 'Anna' } }, { age: { $lt: 35 } }, { score: { $gt: 80 } }]
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
  'preferences.settings.notifications.email.frequency': 'weekly'
});
```

## Array Queries

Query documents based on array field contents.

### Matching Array Values

```javascript
// Array contains value
const withTag = persons.find({ 'preferences.tags': 'sports' });

// Match any of several values with $or
const withTags = persons.find({
  $or: [{ 'preferences.tags': 'music' }, { 'preferences.tags': 'travel' }]
});
```

`$in` and `$all` are not supported. Use `$or` for scalar alternatives, or check the array in application code.

### Empty Arrays

```javascript
// Match empty array
const emptyPhones = persons.find({ 'contact.phones': [] });

// Match empty array explicitly with $eq
const noPhones = persons.find({ 'contact.phones': { $eq: [] } });
```

`$ne` is not supported. To find documents with a non-empty array, fetch candidates with a supported filter and check the array in application code.

### Array Length

JsonDbApp has no array-length operator. Fetch candidate documents with a supported filter, then apply the length check in application code:

```javascript
const docs = persons.find({ isActive: true });
const multiplePhones = docs.filter((doc) => doc.contact.phones.length > 1);
```

## Edge Cases and Special Values

### Null Values

`$eq: null` matches only fields explicitly set to `null`. A missing field does not match.

```javascript
// Match a field explicitly set to null
const nullEmail = persons.find({ 'contact.email': { $eq: null } });

// A missing field yields no matches
const missingField = persons.find({ nonExistent: { $eq: null } });
```

To exclude null values, fetch candidates with a supported filter and filter out null in application code.

### Zero and False

```javascript
// Zero is distinct from false
const ageZero = persons.find({ age: 0 });
const ageFalse = persons.find({ age: false }); // Won't match age: 0

// Explicit distinction
const zeroAge = persons.find({ age: { $eq: 0 } });
const falseActive = persons.find({ isActive: { $eq: false } });
```

### Empty Strings

```javascript
// Empty string is distinct from null
const emptyEmail = persons.find({ 'contact.email': '' });
const nullEmail = persons.find({ 'contact.email': null });
```

To exclude empty and null values, check them in application code after fetching candidates.

### Missing Fields

`$exists` is not supported. Filter on a supported operator first, then check field presence in application code. See [Null Values](#null-values) for how `$eq: null` treats a missing field.

## Query Performance Tips

- Query on `_id` or another specific filter where possible. JsonDbApp scans collection data in memory, so narrower filters reduce the work done per query.

  ```javascript
  const user = persons.find({ _id: 'person1' });
  ```

## Complete Examples

**Find Active Users with High Scores:**

```javascript
const eliteUsers = persons.find({
  isActive: true,
  age: { $gt: 18 },
  score: { $gt: 85 }
});
```

**Find Users Who Recently Logged In:**

```javascript
const cutoffDate = new Date('2025-06-20T00:00:00Z');
const recentUsers = persons.find({
  lastLogin: { $gt: cutoffDate },
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
