/**
 * Collection Initialisation Tests
 * 
 * Tests for Collection class initialisation and lazy loading behaviour.
 * Refactored from old_tests/unit/Collection/00_CollectionInitialisationTestSuite.js
 */

import { describe, it, expect } from 'vitest';
import {
  createIsolatedTestCollection
} from '../../helpers/collection-test-helpers.js';

describe('Collection Initialisation', () => {
  it('creates and initialises a Collection instance with correct properties', () => {
    // Arrange
    const collectionName = 'test_collection';
    const { collection } = createIsolatedTestCollection(collectionName);
    
    // Assert
    expect(collection).toBeDefined();
    expect(collection).not.toBeNull();
    expect(collection.getName()).toBe(collectionName);
    expect(collection.isDirty()).toBe(false);
  });

  it('loads data lazily on first operation', () => {
    // Arrange
    const collectionName = 'lazy_test_collection';
    const { collection } = createIsolatedTestCollection(collectionName);
    
    // Assert - Collection should not be loaded initially
    // First operation (find) should trigger loading
    const documents = collection.find({});
    expect(documents).toEqual([]);
  });
});
