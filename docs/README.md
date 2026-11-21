# JsonDbApp Documentation

Use this index to find guides for JsonDbApp, a MongoDB-style document database for Google Apps Script with synchronous CRUD operations on named collections stored as JSON files in Google Drive.

[Get a copy of the script](https://drive.google.com/drive/folders/1tp3U6tJtB3SsKG-iNq-_xfoSRJx31ooI?usp=drive_link)

## Getting Started

- **[Quick Start Guide](Quick_Start.md)** - Get up and running with JsonDbApp in minutes. Covers database initialisation, basic CRUD operations, and saving data to Drive.

- **[Examples](Examples.md)** - Detailed end-to-end examples including configuration variants, collection lifecycle management, read/write patterns, and aggregation workflows.

## Core Features

- **[Querying Collections](Querying.md)** - Guide to the supported operators, dot notation and array queries.

- **[Update Operations](Updates.md)** - Guide to the supported field, numeric and array update operators, including nested updates and validation.

## Technical Documentation

For developers working on JsonDbApp internals or requiring detailed technical specifications:

- **[Developer Documentation](developers/README.md)** - Technical documentation including:
  - Architecture overview
  - Component specifications
  - Class diagrams
  - Testing framework
  - Implementation details
- **[Documentation Style Guide](developers/documentation-style-guide.md)** - Writing rules, ownership and audit exclusions for contributors and agents

## Key Concepts

### Database and Collections

JsonDbApp organises data into **collections** (similar to MongoDB collections or SQL tables). Each collection is stored as a JSON file in Google Drive. Documents within collections are JavaScript objects with a unique `_id` field.

```javascript
// Create or load database
const config = { rootFolderId: 'YOUR_FOLDER_ID' };
const db = JsonDbApp.createAndInitialiseDatabase(config);

// Work with collections
const users = db.createCollection('users');
const posts = db.getCollection('posts');
```

### CRUD Operations

JsonDbApp provides familiar MongoDB-style methods:

- **Create**: `insertOne()`, `insertMany()`
- **Read**: `find()`, `findOne()`, `countDocuments()`
- **Update**: `updateOne()`, `updateMany()`, `replaceOne()`
- **Delete**: `deleteOne()`, `deleteMany()`

### Persistence

Changes are held in memory until explicitly saved to Drive:

```javascript
users.insertOne({ name: 'Anna', role: 'Engineer' });
users.updateOne({ name: 'Anna' }, { $set: { role: 'Lead Engineer' } });

// Persist changes to Drive
users.save();
```

### Query Operators

Build complex queries using MongoDB-compatible operators:

```javascript
// Find active users aged over 25 and under 40 with high scores
const results = users.find({
  $and: [{ isActive: true }, { age: { $gt: 25 } }, { age: { $lt: 40 } }, { score: { $gt: 85 } }]
});
```

See [Querying.md](Querying.md) for complete details.

### Update Operators

Modify documents precisely using update operators:

```javascript
// Increment counter, add tag, update timestamp
users.updateOne(
  { _id: 'user123' },
  {
    $inc: { loginCount: 1 },
    $addToSet: { tags: 'premium' },
    $set: { lastLogin: new Date() }
  }
);
```

See [Updates.md](Updates.md) for complete details.

## MongoDB Compatibility

JsonDbApp aims for MongoDB query and update operator compatibility, making it familiar to developers with MongoDB experience. Key similarities:

- Document-oriented data model
- Dot notation for nested fields
- Array operators

**Key Differences:**

- Synchronous operations (no callbacks or promises)
- Data stored in Google Drive (not MongoDB server)
- Manual `save()` required for persistence
- Subset of MongoDB operators; see [Querying.md](Querying.md) for query operators and [Updates.md](Updates.md) for update operators
- No indexing or aggregation pipeline (basic `$match` only)

## Configuration

Customise database behaviour with a configuration object:

```javascript
const config = {
  rootFolderId: 'YOUR_DRIVE_FOLDER_ID',
  autoCreateCollections: true,
  collectionLockLeaseMs: 15000,
  retryAttempts: 5,
  logLevel: 'INFO',
  backupOnInitialise: true
};

const db = JsonDbApp.createAndInitialiseDatabase(config);
```

See [developers/DatabaseConfig.md](developers/DatabaseConfig.md) for all configuration options.

## Use Cases

JsonDbApp is ideal for:

- **Apps Script Projects**: Native JavaScript integration with Google Workspace
- **Small to Medium Datasets**: Documents stored in Drive (not suitable for millions of records)
- **Prototyping**: Rapid development with familiar MongoDB syntax
- **Google Workspace Integration**: Leverage Drive for data storage and access control
- **Synchronous Workflows**: No async/await complexity

JsonDbApp is **not** suitable for:

- Large-scale applications (millions of documents)
- High-frequency writes (Drive API has quotas)
- Real-time applications (Drive I/O has latency)
- Multi-user concurrent writes (basic locking, not distributed)

## Architecture

JsonDbApp uses a layered architecture:

1. **Public API** (`JsonDbApp.*`) - Simple interface for library consumers
2. **Core Components** (`Database`, `Collection`, `MasterIndex`) - Business logic
3. **Services** (`FileService`, `DbLockService`) - I/O and concurrency control
4. **Utilities** (`QueryEngine`, `UpdateEngine`, `ErrorHandler`) - Query processing and error handling

The **MasterIndex** (stored in Script Properties) maintains collection metadata and ensures consistency across Drive files.

See [developers/README.md](developers/README.md) for detailed architecture documentation.

## Error Handling

JsonDbApp provides descriptive errors inheriting from `GASDBError`:

```javascript
try {
  users.insertOne({ name: 'Anna' }); // Missing _id or auto-generated
} catch (error) {
  if (error.code === 'DUPLICATE_KEY') {
    console.log('Document with this _id already exists');
  } else {
    throw error;
  }
}
```

Common error codes:

- `DOCUMENT_NOT_FOUND`
- `DUPLICATE_KEY`
- `INVALID_QUERY`
- `LOCK_TIMEOUT`
- `COORDINATION_TIMEOUT`
- `FILE_IO_ERROR`
- `COLLECTION_NOT_FOUND`

A coordination timeout can arrive after a write has been applied, so do not assume that failure means no change. See the [Collection Coordinator developer documentation](developers/CollectionCoordinator.md) for the throw sites and reason codes.

## Testing

Tests run with Vitest against GAS mocks; see the [Testing Framework](developers/Testing_Framework.md) doc for layout and commands.

## Contributing

JsonDbApp follows strict code quality standards:

- **TDD**: Test-Driven Development (Red-Green-Refactor)
- **SOLID**: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
- **DRY**: Don't Repeat Yourself
- **JSDoc**: All public methods documented
- **Lint Compliance**: Zero errors, zero warnings

See [AGENTS.md](../AGENTS.md) for development guidelines.

## Support and Resources

- **GitHub Repository**: [h-arnold/JsonDbApp](https://github.com/h-arnold/JsonDbApp)
- **Issue Tracker**: [Issues](https://github.com/h-arnold/JsonDbApp/issues)
- **Release Notes**: [Releases](https://github.com/h-arnold/JsonDbApp/releases)
- **License**: See [LICENSE](../LICENSE)

## Version Information

JsonDbApp is under active development. APIs may change between versions. Check [package.json](../package.json) for the current version and see [releases](https://github.com/h-arnold/JsonDbApp/releases) for version-specific changes.

---

**Quick Links:**

- [Quick Start Guide](Quick_Start.md)
- [Querying Collections](Querying.md)
- [Update Operations](Updates.md)
- [Examples](Examples.md)
- [Developer Documentation](developers/README.md)
