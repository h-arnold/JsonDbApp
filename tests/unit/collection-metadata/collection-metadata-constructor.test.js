/* global CollectionMetadata, InvalidArgumentError */

/**
 * CollectionMetadata Constructor Tests
 *
 * Tests for CollectionMetadata constructor validation and initialization.
 */

import { describe, it, expect } from 'vitest';
import { createTestMetadata } from '../../helpers/collection-metadata-test-helpers.js';

describe('CollectionMetadata Constructor', () => {
  describe('Default Values', () => {
    it('should create metadata with default values when no input provided', () => {
      const metadata = new CollectionMetadata('testCollection', 'testFileId');
      
      expect(metadata.name).toBe('testCollection');
      expect(metadata.fileId).toBe('testFileId');
      expect(metadata).toHaveProperty('created');
      expect(metadata).toHaveProperty('lastUpdated');
      expect(metadata).toHaveProperty('documentCount');
      expect(metadata.documentCount).toBe(0);
      expect(metadata.created).toBeInstanceOf(Date);
      expect(metadata.lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe('Initial Values', () => {
    it('should create metadata with provided initial values', () => {
      const initialMetadata = createTestMetadata({
        documentCount: 5
      });
      
      const metadata = new CollectionMetadata(initialMetadata);
      
      expect(metadata.name).toBe('testCollection');
      expect(metadata.fileId).toBe('testFileId');
      expect(metadata.created.getTime()).toBe(initialMetadata.created.getTime());
      expect(metadata.lastUpdated.getTime()).toBe(initialMetadata.lastUpdated.getTime());
      expect(metadata.documentCount).toBe(5);
    });

    it('should create metadata with name and fileId parameters', () => {
      const name = 'testCollection';
      const fileId = 'file123';
      const initialMetadata = {
        created: new Date('2024-01-01T00:00:00Z'),
        lastUpdated: new Date('2024-01-02T00:00:00Z'),
        documentCount: 5
      };
      
      const metadata = new CollectionMetadata(name, fileId, initialMetadata);
      
      expect(metadata.name).toBe(name);
      expect(metadata.fileId).toBe(fileId);
      expect(metadata.created.getTime()).toBe(initialMetadata.created.getTime());
      expect(metadata.lastUpdated.getTime()).toBe(initialMetadata.lastUpdated.getTime());
      expect(metadata.documentCount).toBe(5);
    });
  });

  describe('Validation', () => {
    it('should require both name and fileId', () => {
      expect(() => {
        new CollectionMetadata('testCollection');
      }).toThrow(InvalidArgumentError);
    });

    it('should throw error for invalid name type', () => {
      expect(() => {
        new CollectionMetadata(123);
      }).toThrow(InvalidArgumentError);
    });

    it('should throw error for empty name string', () => {
      expect(() => {
        new CollectionMetadata('');
      }).toThrow(InvalidArgumentError);
    });

    it('should throw error for invalid fileId type', () => {
      expect(() => {
        new CollectionMetadata('validName', 123);
      }).toThrow(InvalidArgumentError);
    });
  });
});
