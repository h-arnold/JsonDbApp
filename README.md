# JsonDbApp

A document database implemented in Google Apps Script using the Google Drive API with no external dependencies. Capable of storing any serialisable data in a JSON file. Supports a limited subset of MongoDB syntax for CRUD operations on named collections, with data consistency managed through a ScriptProperties-based master index. It is designed to be as performant as possible within the constraints of Google Apps Script, minimising API calls and storing relatively large chunks of data in memory when querying or manipluating data.

📖 **[View Full Documentation](https://h-arnold.github.io/JsonDbApp/)**

- [JsonDbApp](#jsondbapp)
  - [Who is this for?](#who-is-this-for)
  - [But whhhyyyy?](#but-whhhyyyy)
  - [Getting started](#getting-started)
  - [Supported MongoDB query operators](#supported-mongodb-query-operators)
  - [Supported update operators](#supported-update-operators)
  - [Roadmap - priorities and next steps](#roadmap---priorities-and-next-steps)
  - [Docs](#docs)

## Who is this for?

- You want a database with no external dependencies.
- You want to develop a project in GAS which handles sensitive data without having to worry about external data security.
- You don't want to be endlessly debugging issues with transforming data structures to fit into a spreadsheet.
- Your datasets are relatively small (collections no larger than 2GB so as not to exceed the GAS memory limits)
- Traffic for your app is relatively low.

## But whhhyyyy?

Lots of reasons! Some of them good, some of them less so. The main ones are:

- **Avoid transforming data structures to fit on a Google Sheet**: Once your data structures start getting a little more complex, storing the data in tables as you would in a relational database becomes brittle and error-prone. As you'll likely transform the data into a JSON structure anyway, why not just store it that way in the first place?
- **More performant than storing data in a Google Sheet**: The largest bottleneck in GAS is the number of API calls you make. By storing data in a a single (or a few) JSON files, you greatly reduce the number of API calls you need to make. Manipulating relatively large amounts of data in memory is much faster.
- **You can't just hoik your data into a proper database**: If you can store your data in a proper databse, do. If, like me, your org doesn't allow you to do that, or you don't want to have to manage the security implications of doing so, this is the next best thing.
- **You've normalised your class structures already, dammit!**: And you'll be damned if you have to noramlise them to fit into a relational database, or worse, a spreadsheet.

## Getting started

[Make a copy of this project](https://drive.google.com/drive/u/0/folders/15YylpMppIdidm_G1kWN2D0ha6YAOWyom) in your Google Drive.

- If you plan on doing development work, use the version **with tests**.
- If you just plan on using the library, use the version **without tests**. This makes the file much smaller and faster to load.

Connect this project as a Library in your Apps Script project (Resources > Libraries...).

Public API functions exposed by the library identifier (e.g. `JsonDbApp`):

- `createAndInitialiseDatabase(config)` – First-time setup; creates a new MasterIndex and initialises the DB
- `loadDatabase(config)` – Load an existing database (MasterIndex must already exist)

Examples:

```javascript
// First-time setup
function setupDb() {
  const db = JsonDbApp.createAndInitialiseDatabase({
    masterIndexKey: 'myMasterIndex',
    lockTimeout: 5000
  });
  // db is initialised and ready to use
}

// Load existing database
function getDb() {
  const config = {
    masterIndexKey: 'myMasterIndex'
    // rootFolderId: 'your-folder-id', // optional; where new files/backups are created
    // lockTimeout: 5000,              // optional; override defaults as needed
    // logLevel: 'INFO'                // optional
  };
  const db = JsonDbApp.loadDatabase(config);
  return db;
}

// Work with a collection
function demo() {
  const db = JsonDbApp.loadDatabase({ masterIndexKey: 'myMasterIndex' });
  const users = db.collection('users'); // auto-creates if enabled (default true)
  users.insertOne({ _id: 'u1', name: 'Ada', role: 'admin' });
  users.save(); // persist changes to Drive
  const admins = users.find({ role: 'admin' });
  console.log(JSON.stringify(admins));
}
```

Notes:

- Use `masterIndexKey` (not `masterIndexName`).
- Avoid `JSON.stringify(db)`; inspect specific values instead (e.g. `db.listCollections()`).
- Write operations are in-memory until you call `collection.save()`. Batch multiple writes, then `save()` once to persist to Drive.

## Supported MongoDB query operators

Current query support focuses on a small, fast subset:

- Comparison: $eq, $gt, $lt
- Logical: $and, $or

Notes:

- Multiple top-level fields are implicitly ANDed (e.g. { a: 1, b: 2 }).
- Nested fields are supported via dot notation (e.g. "profile.department").
- Equality against arrays treats a scalar as a membership test (Mongo-style).

See also:

- Query details: [docs/developers/QueryEngine.md#supported-query-operators](docs/developers/QueryEngine.md#supported-query-operators)
- Validation overview: [docs/developers/QueryEngine.md#query-validation-system](docs/developers/QueryEngine.md#query-validation-system)

## Supported update operators

Implemented MongoDB-style update operators:

- Field: $set, $unset
- Numeric: $inc, $mul, $min, $max
- Array: $push, $pull, $addToSet

Notes:

- Dot notation is supported for nested fields (e.g. "profile.name").
- $push and $addToSet support the $each modifier for multiple values.
- $addToSet enforces uniqueness; creates the array if missing; errors if target exists and isn’t an array.
- $push creates the array if missing; errors if target exists and isn’t an array.
- $pull removes matching elements; non-array or missing targets are a no-op. Object criteria support simple field predicates and basic comparison operators.

See also:

- Update API: [docs/developers/UpdateEngine.md#applyoperatorsdocument-updateops](docs/developers/UpdateEngine.md#applyoperatorsdocument-updateops)
- Operator handlers: [docs/developers/UpdateEngine.md#private-operator-handlers](docs/developers/UpdateEngine.md#private-operator-handlers)
- $each modifier: [docs/developers/UpdateEngine.md#each-modifier-in-array-operators](docs/developers/UpdateEngine.md#each-modifier-in-array-operators)
- Enhanced $pull semantics: [docs/developers/UpdateEngine.md#enhanced-pull-semantics-mongo-fidelity-subset-matching](docs/developers/UpdateEngine.md#enhanced-pull-semantics-mongo-fidelity-subset-matching)
- Comparison utilities: [docs/developers/UpdateEngine.md#shared-comparison-utilities](docs/developers/UpdateEngine.md#shared-comparison-utilities)

## Roadmap - priorities and next steps

1. **Refactoring** - code isn't as tidy as I would like it to be, some classes are too large and the testing framework was made up as a I went along so could do with some work.
2. **Implement file caching** using the GAS `CacheService` to speed up read and write operations.
3. **Implement collection indexing** to speed up query operations, especially across collections.
4. **Implement schema creation** and validation. For now, you can store any object with a `fromJSON` and a `toJSON` method, but it would be good to be able to define and enforce a schema.
5. **Expand query and update operator support** to cover a larger subset of MongoDB syntax.
6. **Add user access levels** - at the moment, access is handled by Google Drive File permissions. It would be good to have more granular control over user access.
7. A GAS WebApp query interface for testing and debugging queries.

## Docs

📖 **[Full Documentation Site](https://h-arnold.github.io/JsonDbApp/)**

- [Quick Start Guide](docs/Quick_Start.md) - Get up and running quickly
- [Examples](docs/Examples.md) - Detailed usage examples
- [Querying Guide](docs/Querying.md) - Comprehensive guide to querying collections
- [Updates Guide](docs/Updates.md) - Comprehensive guide to update operations
- [Developer Documentation](docs/developers/README.md) - Architecture and technical details
