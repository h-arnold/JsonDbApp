# Detailed Examples

- [Detailed Examples](#detailed-examples)
  - [Overview](#overview)
  - [Configuration Variants](#configuration-variants)
  - [Collection Lifecycle](#collection-lifecycle)
  - [Read and Query Patterns](#read-and-query-patterns)
  - [Write Patterns](#write-patterns)
  - [Aggregation (Match-Only)](#aggregation-match-only)
  - [Index Backup Workflow](#index-backup-workflow)

## Overview

These examples show end-to-end usage patterns, including configuration, CRUD, and query workflows. They assume the JsonDbApp library is attached to your Apps Script project.

## Configuration Variants

```javascript
// Default configuration
const defaultConfig = new DatabaseConfig();

// Production-oriented configuration
const config = new DatabaseConfig({
  rootFolderId: 'YOUR_DRIVE_FOLDER_ID',
  autoCreateCollections: false,
  lockTimeout: 15000,
  retryAttempts: 5,
  logLevel: 'INFO',
  backupOnInitialise: true
});
```

## Collection Lifecycle

```javascript
const db = JsonDbApp.createAndInitialiseDatabase(config);

// Create or fetch collections
const orders = db.createCollection('orders');
const customers = db.getCollection('customers');

// List collections
const allCollections = db.listCollections();

// Drop a collection when it is no longer needed
const removed = db.dropCollection('legacy_orders');
```

## Read and Query Patterns

```javascript
// Simple equality
const openOrders = orders.find({ status: 'open' });

// Comparison operators
const highValue = orders.find({ total: { $gt: 1000 } });

// Logical operators
const priority = orders.find({
  $and: [{ status: 'open' }, { total: { $gt: 500 } }]
});

// Count documents
const openCount = orders.countDocuments({ status: 'open' });
```

## Write Patterns

```javascript
// Insert
const insertResult = orders.insertOne({
  customerId: 'cust_123',
  total: 240,
  status: 'open'
});

// Update with operators
orders.updateOne({ _id: insertResult.insertedId }, { $set: { status: 'paid' } });

// Replace a document entirely
orders.replaceOne(
  { _id: insertResult.insertedId },
  {
    _id: insertResult.insertedId,
    customerId: 'cust_123',
    total: 240,
    status: 'archived'
  }
);

// Update multiple documents
orders.updateMany({ status: 'open' }, { $set: { reviewed: true } });

// Delete patterns
orders.deleteOne({ _id: insertResult.insertedId });
orders.deleteMany({ status: 'archived' });

// Persist changes
orders.save();
```

## Aggregation (Match-Only)

The aggregation pipeline currently supports a `$match` stage for filtering.

```javascript
const matched = orders.aggregate([{ $match: { status: 'open' } }]);
```

## Index Backup Workflow

```javascript
const db = JsonDbApp.loadDatabase(config);

// Ensure the Drive index file exists and load it
const indexData = db.loadIndex();

// Back up MasterIndex data to Drive explicitly
const backedUp = db.backupIndexToDrive();
```
