/* global CollectionMetadata, InvalidArgumentError */

/**
 * CollectionMetadata Serialization Tests
 *
 * Tests for CollectionMetadata serialization, cloning, and factory methods.
 */

import { describe, it, expect } from 'vitest';
import { createTestMetadata, createTestLockStatus, waitForTimestamp } from '../../helpers/collection-metadata-test-helpers.js';

describe('CollectionMetadata Serialization', () => {
  describe('Object Conversion', () => {
    it('should return plain object from toJSON with correct types', () => {
      const metadata = new CollectionMetadata('testCollection', 'testFileId');
      const metadataSnapshot = metadata.toJSON();

      expect(typeof metadataSnapshot).toBe('object');
      expect(metadataSnapshot.created).toBeInstanceOf(Date);
      expect(metadataSnapshot.lastUpdated).toBeInstanceOf(Date);
      expect(typeof metadataSnapshot.documentCount).toBe('number');
    });

    it('should include all fields in serialised output', () => {
      const name = 'testCollection';
      const fileId = 'file123';
      const modificationToken = 'mod-token-12345';
      const lockStatus = createTestLockStatus();
      
      const metadata = new CollectionMetadata(name, fileId);
      metadata.setModificationToken(modificationToken);
      metadata.setLockStatus(lockStatus);

      const metadataSnapshot = metadata.toJSON();
      expect(metadataSnapshot.name).toBe(name);
      expect(metadataSnapshot.fileId).toBe(fileId);
      expect(metadataSnapshot.modificationToken).toBe(modificationToken);
      expect(metadataSnapshot).toHaveProperty('lockStatus');
      expect(metadataSnapshot.lockStatus.isLocked).toBe(lockStatus.isLocked);
      expect(metadataSnapshot.lockStatus.lockedBy).toBe(lockStatus.lockedBy);
      expect(metadataSnapshot.lockStatus.lockedAt).toBe(lockStatus.lockedAt);
      expect(metadataSnapshot.lockStatus.lockTimeout).toBe(lockStatus.lockTimeout);
      expect(metadataSnapshot.created).toBeInstanceOf(Date);
      expect(metadataSnapshot.lastUpdated).toBeInstanceOf(Date);
      expect(typeof metadataSnapshot.documentCount).toBe('number');
    });
  });

  describe('Cloning', () => {
    it('should create independent clone', () => {
      const name = 'testCollection';
      const fileId = 'file123';
      const modificationToken = 'mod-token-12345';
      const lockStatus = createTestLockStatus();
      
      const original = new CollectionMetadata(name, fileId);
      original.setModificationToken(modificationToken);
      original.setLockStatus(lockStatus);
      
      const cloned = original.clone();
      
      expect(cloned.name).toBe(original.name);
      expect(cloned.fileId).toBe(original.fileId);
      expect(cloned.getModificationToken()).toBe(original.getModificationToken());
      
      original.setModificationToken('different-token');
      expect(cloned.getModificationToken()).not.toBe(original.getModificationToken());
    });

    it('should clone with independent timestamps', async () => {
      const original = new CollectionMetadata('testCollection', 'file123');
      
      const cloned = original.clone();
      
      await waitForTimestamp();
      
      original.updateLastModified();
      
      expect(cloned.lastUpdated.getTime()).not.toBe(original.lastUpdated.getTime());
    });
  });

  describe('Factory Methods', () => {
    it('should create instance from object using constructor', () => {
      const sourceObject = createTestMetadata({
        documentCount: 5,
        modificationToken: 'mod-token-12345',
        lockStatus: {
          isLocked: true,
          lockedBy: 'user123',
          lockedAt: new Date('2024-01-02T01:00:00Z').getTime(),
          lockTimeout: 300000
        }
      });
      
      const metadata = new CollectionMetadata(sourceObject);
      
      expect(metadata.name).toBe(sourceObject.name);
      expect(metadata.fileId).toBe(sourceObject.fileId);
      expect(metadata.created.getTime()).toBe(sourceObject.created.getTime());
      expect(metadata.lastUpdated.getTime()).toBe(sourceObject.lastUpdated.getTime());
      expect(metadata.documentCount).toBe(sourceObject.documentCount);
      expect(metadata.getModificationToken()).toBe(sourceObject.modificationToken);
      
      const lockStatus = metadata.getLockStatus();
      expect(lockStatus.isLocked).toBe(sourceObject.lockStatus.isLocked);
      expect(lockStatus.lockedBy).toBe(sourceObject.lockStatus.lockedBy);
      expect(lockStatus.lockedAt).toBe(sourceObject.lockStatus.lockedAt);
      expect(lockStatus.lockTimeout).toBe(sourceObject.lockStatus.lockTimeout);
    });

    it('should create instance using create factory method', () => {
      const name = 'testCollection';
      const fileId = 'file123';
      
      const metadata = CollectionMetadata.create(name, fileId);
      
      expect(metadata.name).toBe(name);
      expect(metadata.fileId).toBe(fileId);
      expect(metadata.documentCount).toBe(0);
      expect(metadata.getModificationToken()).toBe(null);
      expect(metadata.getLockStatus()).toBe(null);
      expect(metadata.created).toBeInstanceOf(Date);
      expect(metadata.lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe('Validation', () => {
    it('should throw error for invalid object in constructor', () => {
      expect(() => {
        new CollectionMetadata('validName', 'validFileId', []);
      }).toThrow(InvalidArgumentError);
      
      expect(() => {
        new CollectionMetadata('validName', 'validFileId', 'invalid-metadata');
      }).toThrow(InvalidArgumentError);
    });

    it('should throw error for invalid field values in constructor', () => {
      expect(() => {
        new CollectionMetadata({
          created: new Date(),
          lastUpdated: new Date(),
          documentCount: 5
        });
      }).toThrow(InvalidArgumentError);
      
      expect(() => {
        new CollectionMetadata({
          name: 'validName',
          created: new Date()
        });
      }).toThrow(InvalidArgumentError);
      
      expect(() => {
        new CollectionMetadata({
          fileId: 'validFileId',
          created: new Date()
        });
      }).toThrow(InvalidArgumentError);
      
      expect(() => {
        new CollectionMetadata({
          name: 'validName',
          fileId: 'validFileId',
          created: 'invalid-date'
        });
      }).toThrow(InvalidArgumentError);
      
      expect(() => {
        new CollectionMetadata({
          name: 'validName', 
          fileId: 'validFileId',
          documentCount: 'invalid-count'
        });
      }).toThrow(InvalidArgumentError);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large document counts', () => {
      const metadata = new CollectionMetadata('testCollection', 'testFileId');
      const largeCount = Number.MAX_SAFE_INTEGER;
      
      metadata.setDocumentCount(largeCount);
      
      expect(metadata.documentCount).toBe(largeCount);
    });

    it('should handle partial metadata objects', () => {
      const partialMetadata = {
        name: 'testCollection',
        fileId: 'testFileId',
        documentCount: 3
      };
      
      const metadata = new CollectionMetadata(partialMetadata);
      const metadataSnapshot = metadata.toJSON();

      expect(metadataSnapshot.name).toBe('testCollection');
      expect(metadataSnapshot.fileId).toBe('testFileId');
      expect(metadataSnapshot.documentCount).toBe(3);
      expect(metadataSnapshot.created).toBeInstanceOf(Date);
      expect(metadataSnapshot.lastUpdated).toBeInstanceOf(Date);
    });

    it('should validate Date objects in input metadata', () => {
      const invalidMetadata = {
        created: 'not-a-date',
        lastUpdated: new Date(),
        documentCount: 0
      };
      
      expect(() => {
        new CollectionMetadata(invalidMetadata);
      }).toThrow(InvalidArgumentError);
    });

    it('should handle zero document count operations', () => {
      const metadata = new CollectionMetadata('testCollection', 'testFileId');
      
      metadata.setDocumentCount(0);
      expect(metadata.documentCount).toBe(0);
      
      expect(() => {
        metadata.decrementDocumentCount();
      }).toThrow(InvalidArgumentError);
    });
  });
});
