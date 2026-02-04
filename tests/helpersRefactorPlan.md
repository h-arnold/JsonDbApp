# Test Helpers Refactoring Plan: DRY Improvements

**Date:** 3 February 2026  
**Status:** Planning Phase  
**Target:** Reduce test code duplication and improve maintainability

---

## Executive Summary

SonarQube reports significant code duplication across the Vitest test framework. Four key DRY gaps were identified:

1. **Drive Resource Lifecycle** – Duplicated scaffold/cleanup logic across helper modules
2. **Collection Fixtures & Assertions** – Repeated Alice/Bob/Charlie datasets and result checks
3. **Validation Suite Seeding** – Verbose, nearly-identical collection initialisation repeated
4. **Metadata Registration** – Copy-pasted metadata builder logic across helpers

This document details each gap, provides concrete refactoring strategies, and recommends a phased implementation plan.

---

## Gap 1: Drive Resource Lifecycle Duplication

### Problem

Helper modules (`collection-test-helpers.js`, `database-test-helpers.js`, `collection-coordinator-test-helpers.js`, etc.) duplicate nearly-identical Drive resource setup and teardown:

- **Timestamp generation** – All create folders/files with timestamps; logic appears in each helper
- **Drive folder/file creation** – Similar iteration patterns for mocking GAS Drive API
- **Cleanup loops** – Same pattern to purge temporary resources after tests

**Examples:**

- `tests/helpers/collection-test-helpers.js` – Creates Drive folders and documents
- `tests/helpers/database-test-helpers.js` – Duplicates folder creation with nearly identical code
- `tests/helpers/collection-coordinator-test-helpers.js` – Further duplication of the same patterns

### Root Cause

Each helper was written independently without extracting common resource lifecycle logic. No shared utility for Drive resource operations existed.

### Proposed Solution

**Create `tests/helpers/drive-resource-utils.js`** to centralise lifecycle management:

```javascript
/**
 * Shared utilities for Drive resource setup and teardown in tests.
 */

/**
 * Generate a unique timestamp-based resource prefix for tests.
 * @returns {string} Prefix like 'test_20260203_143022_'
 */
function generateTestResourcePrefix() {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const time = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  return `test_${date}_${time}_`;
}

/**
 * Create a mock Drive folder with the given name.
 * @param {string} folderName - Name for the test folder
 * @returns {Object} Mock folder object with id property
 */
function createMockDriveFolder(folderName) {
  return {
    id: `folder-${folderName}-${Math.random().toString(36).substr(2, 9)}`,
    name: folderName
  };
}

/**
 * Create a mock Drive file with the given name and content.
 * @param {string} fileName - Name for the test file
 * @param {Object} content - File content as JSON-serialisable object
 * @returns {Object} Mock file object with id and content properties
 */
function createMockDriveFile(fileName, content = {}) {
  return {
    id: `file-${fileName}-${Math.random().toString(36).substr(2, 9)}`,
    name: fileName,
    mimeType: 'application/json',
    content
  };
}

/**
 * Register cleanup callbacks for Drive resources.
 * Simplifies test teardown by collecting all cleanup functions in one place.
 * @param {Array<Function>} callbacks - Array of cleanup functions to run
 * @returns {Function} Single cleanup function that runs all callbacks
 */
function registerCleanupCallbacks(callbacks = []) {
  return () => {
    callbacks.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        // Suppress cleanup errors to avoid masking test failures
        console.warn('Cleanup callback failed:', e.message);
      }
    });
  };
}

/**
 * Setup a test Drive environment with folder and files.
 * @param {Object} config - Configuration object
 * @param {string} config.folderName - Name for the test folder
 * @param {Array<{name: string, content: Object}>} config.files - Files to create
 * @returns {Object} Setup result containing folder, files, and cleanup function
 */
function setupTestDriveEnvironment(config) {
  const { folderName, files = [] } = config;

  const folder = createMockDriveFolder(folderName);
  const createdFiles = files.map(({ name, content }) => createMockDriveFile(name, content));

  const cleanupCallbacks = [
    () => {
      /* mock cleanup logic */
    }
  ];

  return {
    folder,
    files: createdFiles,
    cleanup: registerCleanupCallbacks(cleanupCallbacks)
  };
}
```

### Expected Outcomes

- **~200–300 lines** eliminated across all helper modules
- Single source of truth for Drive resource lifecycle
- Easier to modify resource creation behaviour (e.g. add tracing, logging)
- Future helpers inherit consistent lifecycle pattern without duplication

### Implementation Steps

1. Create `tests/helpers/drive-resource-utils.js` with above utilities
2. Refactor each helper to use the utilities instead of inline logic
3. Update JSDoc in each helper to reference the shared utility
4. Run tests to confirm no regressions

---

## Gap 2: Collection Fixtures & Assertions Duplication

### Problem

Multiple collection operation test suites repeat the same test data fixtures and assertion patterns:

- **Test Fixtures** – Alice, Bob, and Charlie documents with identical structure and values appear in:
  - `tests/unit/collection/collection-insert-operations.test.js`
  - `tests/unit/collection/collection-find-operations.test.js`
  - `tests/unit/collection/collection-update-operations.test.js`
  - Similar suites for other operations
- **Assertion Helpers** – MongoDB-style result checks (checking `acknowledged`, `matchedCount`, `modifiedCount`) are hand-coded in every suite

**Example duplication in multiple files:**

```javascript
// Repeated across several test files
const testDocuments = [
  { _id: 'alice', name: 'Alice', age: 30, city: 'London' },
  { _id: 'bob', name: 'Bob', age: 25, city: 'Paris' },
  { _id: 'charlie', name: 'Charlie', age: 35, city: 'Berlin' }
];

// Repeated assertion pattern
if (result.acknowledged !== true) throw new Error('Operation not acknowledged');
if (result.matchedCount < 0) throw new Error('Invalid matched count');
```

### Root Cause

Fixtures and assertions created inline for each test file without coordination. No central assertion utility for MongoDB-compatible results.

### Proposed Solution

**Extend `tests/data/MockQueryData.js`** to export reusable fixtures:

```javascript
/**
 * Standard test fixtures for collection operations.
 * These datasets are used consistently across all collection operation tests.
 */

// Standard person documents for testing
export const STANDARD_PERSONS = [
  { _id: 'alice', name: 'Alice', age: 30, city: 'London', joined: '2020-01-15' },
  { _id: 'bob', name: 'Bob', age: 25, city: 'Paris', joined: '2021-03-22' },
  { _id: 'charlie', name: 'Charlie', age: 35, city: 'Berlin', joined: '2019-11-08' }
];

// Standard order documents for testing
export const STANDARD_ORDERS = [
  { _id: 'order1', customerId: 'alice', total: 150.0, status: 'pending' },
  { _id: 'order2', customerId: 'bob', total: 75.5, status: 'shipped' }
];

// Standard inventory documents for testing
export const STANDARD_INVENTORY = [
  { _id: 'item1', name: 'Widget A', quantity: 100, price: 9.99 },
  { _id: 'item2', name: 'Widget B', quantity: 50, price: 14.99 }
];
```

**Create `tests/helpers/collection-assertion-helpers.js`** for MongoDB-style assertions:

```javascript
/**
 * Assertion helpers for MongoDB-compatible collection operations.
 */

/**
 * Assert that a write operation result is valid and acknowledged.
 * @param {Object} result - Write operation result
 * @param {Object} expected - Expected values (matchedCount, modifiedCount, etc.)
 * @throws {AssertionError} If result does not match expectations
 */
export function assertWriteResult(result, expected = {}) {
  if (!result) throw new Error('Write result is null or undefined');
  if (result.acknowledged !== true)
    throw new Error(`Expected acknowledged: true, got ${result.acknowledged}`);

  if (expected.matchedCount !== undefined && result.matchedCount !== expected.matchedCount) {
    throw new Error(`Expected matchedCount: ${expected.matchedCount}, got ${result.matchedCount}`);
  }

  if (expected.modifiedCount !== undefined && result.modifiedCount !== expected.modifiedCount) {
    throw new Error(
      `Expected modifiedCount: ${expected.modifiedCount}, got ${result.modifiedCount}`
    );
  }

  if (expected.insertedCount !== undefined && result.insertedCount !== expected.insertedCount) {
    throw new Error(
      `Expected insertedCount: ${expected.insertedCount}, got ${result.insertedCount}`
    );
  }

  if (expected.deletedCount !== undefined && result.deletedCount !== expected.deletedCount) {
    throw new Error(`Expected deletedCount: ${expected.deletedCount}, got ${result.deletedCount}`);
  }
}

/**
 * Assert that query results match expected documents.
 * @param {Array<Object>} results - Actual query results
 * @param {Array<Object>} expected - Expected documents (or partial matches)
 * @throws {AssertionError} If results do not match expectations
 */
export function assertQueryResults(results, expected) {
  if (!Array.isArray(results)) throw new Error('Expected results to be an array');
  if (results.length !== expected.length) {
    throw new Error(`Expected ${expected.length} results, got ${results.length}`);
  }

  expected.forEach((exp, idx) => {
    const result = results[idx];
    Object.entries(exp).forEach(([key, value]) => {
      if (result[key] !== value) {
        throw new Error(`Result ${idx}.${key}: expected ${value}, got ${result[key]}`);
      }
    });
  });
}

/**
 * Assert that a single query result matches expected properties.
 * @param {Object} result - Query result
 * @param {Object} expected - Expected properties
 * @throws {AssertionError} If result does not match
 */
export function assertQueryResult(result, expected) {
  if (!result) throw new Error('Expected a result, got null or undefined');

  Object.entries(expected).forEach(([key, value]) => {
    if (result[key] !== value) {
      throw new Error(`${key}: expected ${value}, got ${result[key]}`);
    }
  });
}
```

### Expected Outcomes

- **~150–200 lines** eliminated across all collection operation test files
- Consistent fixture structure shared by all suites
- Single assertion implementation for all write/query checks
- Easier to add new fixture datasets or modify assertion logic

### Implementation Steps

1. Extend `tests/data/MockQueryData.js` with standard fixture exports
2. Create `tests/helpers/collection-assertion-helpers.js` with assertion utilities
3. Update all collection operation test files to import fixtures and assertion helpers
4. Replace inline fixtures and assertions with helper calls
5. Run tests to validate coverage and compatibility

---

## Gap 3: Validation Suite Seeding Duplication

### Problem

Validation test suites (e.g., `tests/validation/operator-validation-orchestrator.test.js` and specific operator suites) manually seed three near-identical collections for testing:

```javascript
// Pattern repeated across multiple validation test files
const personCollection = await createTestCollection('persons');
await personCollection.insertOne({ _id: 'p1', name: 'Person 1', age: 30 });
await personCollection.insertOne({ _id: 'p2', name: 'Person 2', age: 25 });
// ... more inserts

const orderCollection = await createTestCollection('orders');
await orderCollection.insertOne({ _id: 'o1', customer: 'p1', total: 100 });
// ... more inserts

const inventoryCollection = await createTestCollection('inventory');
// ... similar pattern
```

This verbose setup is repeated across validation test files without abstraction.

### Root Cause

Each validation test independently builds its required collection state. No shared seeding utility exists to parameterise collection setup.

### Proposed Solution

**Create `tests/helpers/validation-seeding-helper.js`** with descriptor-based setup:

```javascript
/**
 * Validation suite seeding helpers using descriptors to reduce duplication.
 */

/**
 * Descriptor for a collection to be seeded during validation tests.
 * @typedef {Object} CollectionDescriptor
 * @property {string} name - Collection name
 * @property {Function} getInitialData - Function returning array of documents to insert
 */

/**
 * Get standard seeding descriptors for persons, orders, and inventory.
 * @returns {Array<CollectionDescriptor>} Standard collection descriptors
 */
export function getStandardValidationDescriptors() {
  return [
    {
      name: 'persons',
      getInitialData: () => [
        { _id: 'p1', name: 'Alice', age: 30, tags: ['admin'] },
        { _id: 'p2', name: 'Bob', age: 25, tags: ['user'] },
        { _id: 'p3', name: 'Charlie', age: 35, tags: ['user', 'moderator'] }
      ]
    },
    {
      name: 'orders',
      getInitialData: () => [
        { _id: 'o1', customerId: 'p1', total: 150.0, items: ['item1', 'item2'] },
        { _id: 'o2', customerId: 'p2', total: 75.5, items: ['item3'] }
      ]
    },
    {
      name: 'inventory',
      getInitialData: () => [
        { _id: 'inv1', name: 'Widget A', quantity: 100, price: 9.99 },
        { _id: 'inv2', name: 'Widget B', quantity: 50, price: 14.99 }
      ]
    }
  ];
}

/**
 * Seed collections from descriptors in a test database.
 * Abstracts the repetitive pattern of creating collections and inserting standard data.
 * @param {Database} database - Test database instance
 * @param {Array<CollectionDescriptor>} descriptors - Collection descriptors to seed
 * @returns {Promise<Object>} Object mapping collection names to collection instances
 */
export async function seedValidationCollections(database, descriptors) {
  const collections = {};

  for (const descriptor of descriptors) {
    const collection = database.collection(descriptor.name);
    const initialData = descriptor.getInitialData();

    for (const doc of initialData) {
      await collection.insertOne(doc);
    }

    collections[descriptor.name] = collection;
  }

  return collections;
}

/**
 * Custom descriptors for specialised validation test scenarios.
 * @param {Object} overrides - Descriptor property overrides
 * @returns {Array<CollectionDescriptor>} Modified descriptors
 */
export function getCustomValidationDescriptors(overrides = {}) {
  const base = getStandardValidationDescriptors();

  if (overrides.personCount) {
    const persons = base.find((d) => d.name === 'persons');
    if (persons) {
      const originalData = persons.getInitialData;
      persons.getInitialData = () => {
        const data = originalData();
        // Generate additional persons as needed
        for (let i = data.length; i < overrides.personCount; i++) {
          data.push({ _id: `p${i + 1}`, name: `Person ${i + 1}`, age: 20 + i });
        }
        return data;
      };
    }
  }

  return base;
}
```

**Usage in validation test files:**

```javascript
import {
  seedValidationCollections,
  getStandardValidationDescriptors
} from '../../helpers/validation-seeding-helper.js';

describe('Operator Validation', () => {
  let collections;

  beforeEach(async () => {
    const database = createTestDatabase();
    collections = await seedValidationCollections(database, getStandardValidationDescriptors());
  });

  it('should validate $set operator', () => {
    // Test logic using collections.persons, collections.orders, etc.
  });
});
```

### Expected Outcomes

- **100–150 lines** eliminated across validation test files
- Centralised collection seed logic with parameterisation
- Easy to add new collection descriptors or override seed data
- Future validation tests inherit consistent seeding pattern

### Implementation Steps

1. Create `tests/helpers/validation-seeding-helper.js` with descriptors and seeding function
2. Update validation test files to use `seedValidationCollections()` instead of inline setup
3. Replace collection-specific setup loops with descriptor iterations
4. Run validation tests to confirm correctness

---

## Gap 4: Metadata Registration Duplication

### Problem

Metadata builder logic is duplicated between multiple helpers:

- `tests/helpers/collection-metadata-test-helpers.js` – Contains `createTestMetadata()` and inline metadata serialisation
- `tests/helpers/database-test-helpers.js` – Duplicates metadata creation with similar token generation and timestamp logic
- Other helpers – Repeat metadata builder pattern

**Example duplication:**

```javascript
// In collection-metadata-test-helpers.js
function createTestMetadata() {
  const timestamp = new Date().toISOString();
  const token = Math.random().toString(36).substr(2, 9);
  return {
    name: 'test_collection',
    driveFileId: `file-${token}`,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

// Nearly identical in database-test-helpers.js
function createMetadata() {
  const now = new Date().toISOString();
  const uid = Math.random().toString(36).substr(2, 9);
  return {
    name: 'collection',
    driveFileId: `file-${uid}`,
    createdAt: now,
    updatedAt: now
  };
}
```

### Root Cause

Each helper independently implemented metadata builders without coordination. Token generation and timestamp logic not factored into a shared utility.

### Proposed Solution

**Create `tests/helpers/metadata-builder-helper.js`** for centralised metadata construction:

```javascript
/**
 * Metadata builder helpers for consistent test metadata generation.
 */

/**
 * Generate a unique token for test identifiers.
 * @returns {string} Random 9-character token
 */
function generateUniqueToken() {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * Create a test metadata object with sensible defaults.
 * @param {Object} overrides - Property overrides
 * @returns {Object} Metadata object
 */
export function createTestMetadata(overrides = {}) {
  const timestamp = new Date().toISOString();
  const token = generateUniqueToken();

  return {
    name: overrides.name || `test_collection_${token}`,
    driveFileId: overrides.driveFileId || `file_${token}`,
    createdAt: overrides.createdAt || timestamp,
    updatedAt: overrides.updatedAt || timestamp,
    documentCount: overrides.documentCount || 0,
    indexes: overrides.indexes || [],
    ...overrides
  };
}

/**
 * Create multiple metadata objects for test scenarios.
 * @param {number} count - Number of metadata objects to create
 * @param {Object} baseOverrides - Overrides applied to all objects
 * @returns {Array<Object>} Array of metadata objects
 */
export function createTestMetadataBatch(count, baseOverrides = {}) {
  const batch = [];
  for (let i = 0; i < count; i++) {
    batch.push(
      createTestMetadata({
        ...baseOverrides,
        name: `${baseOverrides.name || 'collection'}_${i}`,
        driveFileId: `file_batch_${i}_${generateUniqueToken()}`
      })
    );
  }
  return batch;
}

/**
 * Register metadata in a test MasterIndex.
 * Centralises serialisation, token generation, and timestamp updates.
 * @param {MasterIndex} masterIndex - Test MasterIndex instance
 * @param {string} collectionName - Collection name
 * @param {Object} metadataOverrides - Metadata property overrides
 * @returns {Object} Registered metadata object
 */
export function registerTestMetadata(masterIndex, collectionName, metadataOverrides = {}) {
  const metadata = createTestMetadata({
    name: collectionName,
    ...metadataOverrides
  });

  masterIndex.addCollection(collectionName, metadata);

  return metadata;
}

/**
 * Create a serialisable metadata representation (toJSON format).
 * @param {Object} metadata - Metadata object
 * @returns {Object} JSON-serialisable metadata
 */
export function serializeTestMetadata(metadata) {
  return {
    name: metadata.name,
    driveFileId: metadata.driveFileId,
    createdAt: metadata.createdAt,
    updatedAt: metadata.updatedAt,
    documentCount: metadata.documentCount || 0,
    indexes: metadata.indexes || []
  };
}
```

### Expected Outcomes

- **50–80 lines** eliminated across helpers
- Single source of truth for metadata object structure
- Consistent token and timestamp generation
- Easier to modify metadata builder behaviour (e.g. add fields, change defaults)

### Implementation Steps

1. Create `tests/helpers/metadata-builder-helper.js` with builders and serialisers
2. Update `tests/helpers/collection-metadata-test-helpers.js` to use the shared builder
3. Update `tests/helpers/database-test-helpers.js` to use the shared builder
4. Remove duplicate metadata builder logic from all helpers
5. Run tests to confirm no regressions

---

## Implementation Roadmap

### Phase 1: Foundation (High Priority)

1. Create `drive-resource-utils.js` – Centralise Drive lifecycle logic
2. Extend `MockQueryData.js` – Add standard fixture exports
3. Create `metadata-builder-helper.js` – Centralise metadata construction

**Estimated effort:** 2–3 hours  
**Benefit:** ~400–450 lines eliminated; foundation for remaining refactors

### Phase 2: Assertion & Fixture Consolidation (High Priority)

4. Create `collection-assertion-helpers.js` – MongoDB-style result checks
5. Refactor collection operation test files – Use fixtures and assertion helpers

**Estimated effort:** 3–4 hours  
**Benefit:** ~200–250 lines eliminated; consistent assertion patterns

### Phase 3: Validation & Seeding Refactor (Medium Priority)

6. Create `validation-seeding-helper.js` – Descriptor-based collection seeding
7. Refactor validation test files – Use seeding helper

**Estimated effort:** 2–3 hours  
**Benefit:** ~150 lines eliminated; easier to add new validation scenarios

### Phase 4: Integration & Verification (Medium Priority)

8. Run full test suite – Confirm all tests pass
9. Run lint – Verify 0 errors, 0 warnings
10. Check SonarQube – Verify duplication metrics improve

**Estimated effort:** 1–2 hours  
**Benefit:** Validated refactoring; baseline for future DRY improvements

**Total Estimated Effort:** ~8–12 hours  
**Expected Duplication Reduction:** ~800–900 lines eliminated; SonarQube duplication score should improve by 15–25%

---

## Success Criteria

- ✓ All new helpers created with lint compliance (0 errors, 0 warnings)
- ✓ Full test suite passes after refactoring (no regressions)
- ✓ SonarQube duplication score improves by ≥15%
- ✓ Total duplicate lines reduced by ~800–900
- ✓ All shared helpers documented with JSDoc
- ✓ No functionality changes; only structural DRY improvements

---

## Open Questions & Decisions

1. **Location for Drive resource utilities:** Create `tests/helpers/drive-resource-utils.js` or locate under `src/` test support?
   - **Recommendation:** Keep in `tests/helpers/` – test-specific utilities belong with other test infrastructure.

2. **Fixture dataset ownership:** Should `tests/data/MockQueryData.js` be extended or should a new `tests/data/fixtures.js` be created?
   - **Recommendation:** Extend `MockQueryData.js` – centralise all mock data in one location for discoverability.

3. **Validation descriptor overrides:** Should custom descriptors support full object replacement or only property-level overrides?
   - **Recommendation:** Support both – base descriptors + property overrides + full custom descriptors for maximum flexibility.

4. **Metadata builder versioning:** Should metadata builders support multiple schema versions?
   - **Recommendation:** Start with current version; add versioning if schema evolution occurs.

---

## Related Documentation

- [Test Framework Guide](./README.md)
- [Vitest Configuration](./vitest.config.js)
- [GAS Mocks Setup](./setup/gas-mocks.setup.js)

---

## Appendix: Code Duplication Examples

### Example 1: Drive Folder Creation (Current Duplication)

**collection-test-helpers.js:**

```javascript
const folder = {
  id: `folder-test-${Date.now()}`,
  name: 'Test Collection Folder'
};
```

**database-test-helpers.js:**

```javascript
const testFolder = {
  id: `folder-${Math.random().toString(36).substr(2, 9)}`,
  name: 'Test Database Folder'
};
```

**Proposed Refactor (using drive-resource-utils):**

```javascript
import { createMockDriveFolder } from './drive-resource-utils.js';

const folder = createMockDriveFolder('Test Collection Folder');
```

### Example 2: Collection Fixture Setup (Current Duplication)

**collection-insert-operations.test.js:**

```javascript
const testDocs = [
  { _id: 'alice', name: 'Alice', age: 30, city: 'London' },
  { _id: 'bob', name: 'Bob', age: 25, city: 'Paris' },
  { _id: 'charlie', name: 'Charlie', age: 35, city: 'Berlin' }
];
```

**collection-find-operations.test.js:**

```javascript
const documents = [
  { _id: 'alice', name: 'Alice', age: 30, city: 'London' },
  { _id: 'bob', name: 'Bob', age: 25, city: 'Paris' },
  { _id: 'charlie', name: 'Charlie', age: 35, city: 'Berlin' }
];
```

**Proposed Refactor (using fixtures from MockQueryData):**

```javascript
import { STANDARD_PERSONS } from '../../data/MockQueryData.js';

const testDocs = STANDARD_PERSONS;
```

### Example 3: Metadata Builder (Current Duplication)

**collection-metadata-test-helpers.js:**

```javascript
function createTestMetadata() {
  const timestamp = new Date().toISOString();
  const token = Math.random().toString(36).substr(2, 9);
  return {
    name: 'test_collection',
    driveFileId: `file-${token}`,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}
```

**database-test-helpers.js:**

```javascript
function createMetadata() {
  const now = new Date().toISOString();
  const uid = Math.random().toString(36).substr(2, 9);
  return {
    name: 'collection',
    driveFileId: `file-${uid}`,
    createdAt: now,
    updatedAt: now
  };
}
```

**Proposed Refactor (using metadata-builder-helper):**

```javascript
import { createTestMetadata } from './metadata-builder-helper.js';

const metadata = createTestMetadata({ name: 'test_collection' });
```

---

**Document Version:** 1.0  
**Last Updated:** 3 February 2026
