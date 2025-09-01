# Developer Documentation

This section contains detailed documentation for developers contributing to or working with the GAS DB project.

⚠️ **HEALTH WARNING** ⚠️

These documents have been created by various LLMs and I've only given them a cursory skim for accuracy so they may not be fully updated.

### Important step to avoid weird issues

Make sure you've enabled the DriveAPI in your Google Cloud project. This is crucial for the JsonDbApp to function correctly, especially for features like MasterIndex and file watching.

## Core Documentation

- [**Class Diagrams**](./Class_Diagrams.md) - Updated UML class and sequence diagrams for the JsonDbApp MVP

## Public API (for Apps Script consumers)

Use the top-level library functions instead of constructing classes directly:

- `JsonDbApp.createAndInitialiseDatabase(config)` – first-time setup
- `JsonDbApp.loadDatabase(config)` – load existing DB

Within this repo (tests/dev), you can still use `new Database(config)` then call `createDatabase()`/`initialise()` explicitly.
- [**clasp-watch.sh Documentation**](./clasp-watch.sh.md) - Continuous deployment script for automatic file watching and pushing to Google Apps Script
- [**Collection Components**](./Collection_Components.md) - Detailed explanation of Collection, CollectionMetadata, and DocumentOperations classes for MongoDB-compatible document operations
- [**Database**](./Database.md) - Main database class for collection management and coordination with MasterIndex
- [**DatabaseConfig**](./DatabaseConfig.md) - Database configuration management with validation and defaults
- [**Infrastructure Components**](./Infrastructure_Components.md) - Complete reference for logging, error handling, and ID generation utilities
- [**MasterIndex**](./MasterIndex.md) - Cross-instance coordination system using ScriptProperties for virtual locking and conflict detection
- [**QueryEngine**](./QueryEngine.md) - Engine for parsing and executing MongoDB-style queries
- [**test-runner.sh Documentation**](./test-runner.sh.md) - Automated testing script for streamlined development workflow
- [**Testing Framework**](./Testing_Framework.md) - Comprehensive guide to the GAS DB testing infrastructure, including AssertionUtilities and TestRunner classes
- [**UpdateEngine**](./UpdateEngine.md) - Engine for applying MongoDB-style update operators to documents

## Documentation Structure

- **clasp-watch.sh**: Manage continuous deployment with automatic file watching and clasp authentication
- **Collection Components**: Understand how Collection, CollectionMetadata, and DocumentOperations work together for MongoDB-compatible operations
- **Database**: Main entry point for database operations, collection management, and index file coordination
- **DatabaseConfig**: Configuration validation, defaults, and management for database instances
- **Infrastructure Components**: Use GASDBLogger, ErrorHandler, and IdGenerator in your code
- **MasterIndex**: Understand cross-instance coordination, virtual locking, and conflict resolution
- **QueryEngine**: Learn how to use the query engine for document retrieval
- **test-runner.sh**: Streamline development with automated testing and deployment
- **Testing Framework**: Learn to write effective tests using AssertionUtilities and TestRunner
- **UpdateEngine**: Understand how to apply update operators to documents
