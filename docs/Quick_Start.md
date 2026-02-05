# Quick Start Guide

- [Quick Start Guide](#quick-start-guide)
  - [Overview](#overview)
  - [Prerequisites](#prerequisites)
  - [Create or Load a Database](#create-or-load-a-database)
  - [Create a Collection and Insert Data](#create-a-collection-and-insert-data)
  - [Read, Update, and Delete](#read-update-and-delete)
  - [Persist Changes](#persist-changes)

## Overview

This guide walks through creating a database, adding data, and running basic queries using the public JsonDbApp API. It targets Apps Script library consumers and mirrors the MongoDB-style collection interface.

## Prerequisites

- Google Apps Script project with the JsonDbApp library added.
- Drive API enabled for the Google Cloud project that backs your Apps Script deployment.

## Create or Load a Database

Use the public wrappers exposed by the library identifier (typically `JsonDbApp`). For first-time setup, create and initialise the MasterIndex. For subsequent use, load the existing database.

```javascript
const config = new DatabaseConfig({
  rootFolderId: 'YOUR_DRIVE_FOLDER_ID',
  autoCreateCollections: true
});

// First-time setup
const db = JsonDbApp.createAndInitialiseDatabase(config);

// Existing database
// const db = JsonDbApp.loadDatabase(config);
```

## Create a Collection and Insert Data

```javascript
const users = db.createCollection('users');

const result = users.insertOne({
  name: 'Ada',
  role: 'Engineer',
  age: 36
});

const userId = result.insertedId;
```

## Read, Update, and Delete

```javascript
// Read
const ada = users.findOne({ _id: userId });
const engineers = users.find({ role: 'Engineer' });

// Update
users.updateOne({ _id: userId }, { $set: { role: 'Lead Engineer' } });

// Delete
users.deleteOne({ _id: userId });
```

## Persist Changes

Write operations mark collections as dirty. Call `save()` after a batch of changes so data is written to Drive.

```javascript
users.save();
```
