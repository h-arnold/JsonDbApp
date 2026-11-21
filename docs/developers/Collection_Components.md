# Collection Components Developer Guide

This document explains the roles and interactions of the Collection, CollectionMetadata and DocumentOperations classes in JsonDbApp. Together they provide MongoDB-compatible collection operations with Google Drive persistence. Method contracts live in the source JSDoc; this guide covers what each class owns, how the classes collaborate and the invariants that are easy to miss.

- [Collection Components Developer Guide](#collection-components-developer-guide)
  - [Overview](#overview)
    - [Architecture](#architecture)
  - [Collection](#collection)
    - [Collection responsibilities](#collection-responsibilities)
    - [Collection construction](#collection-construction)
  - [CollectionMetadata](#collectionmetadata)
    - [CollectionMetadata responsibilities](#collectionmetadata-responsibilities)
    - [CollectionMetadata construction](#collectionmetadata-construction)
  - [DocumentOperations](#documentoperations)
    - [DocumentOperations responsibilities](#documentoperations-responsibilities)
    - [DocumentOperations construction](#documentoperations-construction)
    - [DocumentOperations timing](#documentoperations-timing)

---

## Overview

The Collection Components form the core of JsonDbApp's document storage system:

- **Collection**: The main interface providing MongoDB-compatible CRUD operations
- **CollectionMetadata**: Manages collection metadata (timestamps, document counts)
- **DocumentOperations**: Handles low-level document manipulation

### Architecture

```mermaid
graph TD
    Collection[Collection (High-level MongoDB API)] --> CollectionMetadata[CollectionMetadata (Metadata management)]
    Collection --> DocumentOperations[DocumentOperations (Document CRUD operations)]
    DocumentOperations --> QueryEngine[QueryEngine (Query processing)]
    DocumentOperations --> UpdateEngine[UpdateEngine (Update operation processing)]
```

---

## Collection

`Collection` is the main interface for document operations. It presents a MongoDB-compatible CRUD API whilst managing persistence to Google Drive and owns a `CollectionMetadata` and a `DocumentOperations` instance (see [Architecture](#architecture)).

### Collection responsibilities

- **CRUD and queries**: `insertOne`, `findOne`, `find`, `updateOne`, `updateMany`, `replaceOne`, `deleteOne`, `deleteMany` and `countDocuments`. `aggregate()` runs aggregation pipelines. `getDriveFileId()`, `getDatabase()`, `getFileService()` and `getLogger()` are simple accessors. Full method contracts are in the source JSDoc under `src/04_core/Collection/`.
- **Filter routing**: filters are validated objects. Empty `{}` and `_id`-only filters take dedicated fast paths; every other filter is routed to [QueryEngine](QueryEngine.md) as a MongoDB-compatible query.
- **Operators**: `$gt`, `$inc` and the other supported operators are available by default, as listed in [QueryEngine — Supported Query Operators](QueryEngine.md#supported-query-operators) and [UpdateEngine — Composition and entry point](UpdateEngine.md#composition-and-entry-point); the default set comes from `DatabaseConfig`.
- **Lazy loading**: construction performs no Drive access. The first data access loads metadata and documents from Drive.
- **Dirty tracking and persistence**: mutations mark the collection dirty; `save()` coordinates a write to Drive and clears the flag. See [CollectionCoordinator](CollectionCoordinator.md) for the coordination contract.
- **Metadata**: `getMetadata()` returns the serialisable snapshot produced by `CollectionMetadata.toJSON()`, which includes `name`, `fileId`, `modificationToken` and `lockStatus` as well as timestamps and `documentCount`.

Every public CRUD method wraps its delegate in a DEBUG-gated `collection.<operation>` timing event; see [Infrastructure Components — Execution-Time Tracking](Infrastructure_Components.md#1205-execution-time-tracking).

### Collection construction

`Collection` is created by `Database`, not directly. Its constructor takes `(name, driveFileId, database, fileService)` and throws `InvalidArgumentError` for invalid parameters. See the constructor JSDoc in `src/04_core/Collection/99_Collection.js`.

---

## CollectionMetadata

`CollectionMetadata` holds the persisted state for a collection: its identity (`name`, `fileId`), timestamps (`created`, `lastUpdated`), `documentCount`, `modificationToken` for optimistic concurrency and `lockStatus`. `Collection` owns one instance (see [Architecture](#architecture)).

### CollectionMetadata responsibilities

- Validates metadata values on assignment and provides timestamp, document-count, modification-token and lock-status mutators, plus `clone()` for an independent copy.
- `toJSON()` produces the serialisable snapshot returned by `Collection.getMetadata()`; `fromJSON()` reverses it. The shape is defined by `toJSON()` in `src/02_components/CollectionMetadata.js`.

Method contracts are in the source JSDoc of `src/02_components/CollectionMetadata.js`.

### CollectionMetadata construction

The constructor accepts either `(name, fileId, initialMetadata?)` or a single metadata object containing `name` and `fileId`. Both forms are validated by the constructor; see the constructor JSDoc in `src/02_components/CollectionMetadata.js` for defaults and constraints.

---

## DocumentOperations

`DocumentOperations` performs low-level CRUD on the collection's in-memory documents (`_documents`) on behalf of `Collection`. It mutates those objects and asks the owning `Collection` to refresh metadata and mark itself dirty; it does not access Drive. See [Architecture](#architecture).

### DocumentOperations responsibilities

- **Collaborators**: `Collection` creates and owns the instance. Query methods delegate filtering to [QueryEngine](QueryEngine.md) and operator-based updates delegate to [UpdateEngine](UpdateEngine.md).
- **ID-based updates merge**: `updateDocument(id, updateData)` merges `updateData` into the existing document and preserves its `_id`. Use `replaceDocument(id, doc)` for full replacement.
- **Missing documents**: ID-based `updateDocument` and `replaceDocument` return `{ acknowledged: true, modifiedCount: 0 }` when the id is absent.
- **Query-based updates**: `updateDocumentByQuery` applies operators to every match and throws `DOCUMENT_NOT_FOUND` when nothing matches. `replaceDocumentByQuery` replaces every matching document and returns the number replaced.

Method contracts are in the source JSDoc of `src/02_components/DocumentOperations.js`; see [Examples](../Examples.md) for usage.

### DocumentOperations construction

`Collection` creates the instance with `new DocumentOperations(collection)`. The constructor stores the collection reference and lazily initialises `QueryEngine` and `UpdateEngine`.

### DocumentOperations timing

Bulk operations apply to all matches once per call so the outer timing boundary stays a single `docOps.applyToMatching` event; see [Infrastructure Components — Execution-Time Tracking](Infrastructure_Components.md#1205-execution-time-tracking).

---
