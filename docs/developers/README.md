# Developer Documentation

This section contains detailed documentation for developers contributing to or working with JsonDbApp.

## Drive API prerequisite

Enable the Drive API in your Google Cloud project before using JsonDbApp.

## Core Documentation

- [**Quick Start Guide**](../Quick_Start.md) - Practical setup steps and basic CRUD walkthrough
- [**Detailed Examples**](../Examples.md) - Extended usage patterns for setup, CRUD, and querying

## Public API (for Apps Script consumers)

Use the top-level library functions instead of constructing classes directly:

- `JsonDbApp.createAndInitialiseDatabase(config)` – first-time setup
- `JsonDbApp.loadDatabase(config)` – load existing DB

## Developer Documentation Index

- [**Collection Components**](./Collection_Components.md) - Detailed explanation of Collection, CollectionMetadata, and DocumentOperations classes for MongoDB-compatible document operations
- [**Collection Coordinator**](./CollectionCoordinator.md) - Cross-instance coordination contract: locking, budget enforcement, violation policy, throw sites and logging
- [**Database**](./Database.md) - Main database class for collection management and coordination with MasterIndex
- [**DatabaseConfig**](./DatabaseConfig.md) - Database configuration management with validation and defaults
- [**Documentation Style Guide**](./documentation-style-guide.md) - Writing rules, ownership, naming and review exclusions for contributors and agents
- [**Infrastructure Components**](./Infrastructure_Components.md) - Logging, errors, IDs, validation, serialisation and backoff utilities
- [**MasterIndex**](./MasterIndex.md) - Cross-instance coordination system using ScriptProperties for virtual locking and conflict detection
- [**QueryEngine**](./QueryEngine.md) - Engine for parsing and executing MongoDB-style queries
- [**Testing Framework**](./Testing_Framework.md) - Vitest configuration, GAS mocks and shared test helpers
- [**UpdateEngine**](./UpdateEngine.md) - Engine for applying MongoDB-style update operators to documents

## Coding Standards

- **Linting**: `no-magic-numbers` is enforced as an error for source files to keep configuration and algorithmic values explicit. Tests allow numeric literals for readability because the rule is disabled for `tests/**/*.js`.
- **Documentation**: JSDoc completeness is enforced as errors; ensure descriptions, param types, and return details are present.
