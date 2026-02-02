/* global CollectionMetadata, InvalidArgumentError */

/**
 * CollectionMetadata Operations Tests
 *
 * Tests for CollectionMetadata update operations and property management.
 */

import { describe, it, expect } from 'vitest';
import { createTestLockStatus, waitForTimestamp } from '../../helpers/collection-metadata-test-helpers.js';

describe('CollectionMetadata Operations', () => {
  describe('Timestamp Updates', () => {
    it('should update lastModified timestamp', async () => {
      const metadata = new CollectionMetadata('testCollection', 'testFileId');
      const originalLastUpdated = metadata.lastUpdated;
      
      await waitForTimestamp();
      
      metadata.updateLastModified();
      
      expect(metadata.lastUpdated.getTime()).toBeGreaterThan(originalLastUpdated.getTime());
    });
  });

  describe('Document Count Operations', () => {
    it('should increment document count', () => {
      const metadata = new CollectionMetadata('testCollection', 'testFileId');
      const originalCount = metadata.documentCount;
      
      metadata.incrementDocumentCount();
      
      expect(metadata.documentCount).toBe(originalCount + 1);
    });

    it('should decrement document count', () => {
      const initialMetadata = { 
        name: 'testCollection',
        fileId: 'testFileId',
        documentCount: 5 
      };
      const metadata = new CollectionMetadata(initialMetadata);
      const originalCount = metadata.documentCount;
      
      metadata.decrementDocumentCount();
      
      expect(metadata.documentCount).toBe(originalCount - 1);
    });

    it('should not allow decrementing below zero', () => {
      const metadata = new CollectionMetadata('testCollection', 'testFileId');
      
      expect(() => {
        metadata.decrementDocumentCount();
      }).toThrow(InvalidArgumentError);
    });

    it('should set document count to specific value', () => {
      const metadata = new CollectionMetadata('testCollection', 'testFileId');
      const newCount = 42;
      
      metadata.setDocumentCount(newCount);
      
      expect(metadata.documentCount).toBe(newCount);
    });

    it('should throw error for invalid document count in setDocumentCount', () => {
      const metadata = new CollectionMetadata('testCollection', 'testFileId');
      
      expect(() => {
        metadata.setDocumentCount(-5);
      }).toThrow(InvalidArgumentError);
      
      expect(() => {
        metadata.setDocumentCount('not-a-number');
      }).toThrow(InvalidArgumentError);
    });

    it('should update lastModified when document count changes', async () => {
      const metadata = new CollectionMetadata('testCollection', 'testFileId');
      const originalLastUpdated = metadata.lastUpdated;
      
      await waitForTimestamp();
      
      metadata.setDocumentCount(5);
      
      expect(metadata.lastUpdated.getTime()).toBeGreaterThan(originalLastUpdated.getTime());
    });
  });

  describe('Modification Token Management', () => {
    it('should get and set modificationToken', () => {
      const metadata = new CollectionMetadata('testCollection', 'file123');
      const token = 'mod-token-12345';
      
      metadata.setModificationToken(token);
      
      expect(metadata.getModificationToken()).toBe(token);
      expect(metadata.modificationToken).toBe(token);
    });

    it('should include modificationToken when serialised', () => {
      const metadata = new CollectionMetadata('testCollection', 'file123');
      const token = 'mod-token-67890';
      
      metadata.setModificationToken(token);
      
      const serialised = metadata.toJSON();
      expect(serialised.modificationToken).toBe(token);
    });

    it('should throw error for invalid modificationToken type', () => {
      const metadata = new CollectionMetadata('testCollection', 'file123');
      
      expect(() => {
        metadata.setModificationToken(123);
      }).toThrow(InvalidArgumentError);
    });

    it('should throw error for empty modificationToken', () => {
      const metadata = new CollectionMetadata('testCollection', 'file123');
      
      expect(() => {
        metadata.setModificationToken('');
      }).toThrow(InvalidArgumentError);
    });

    it('should allow null modificationToken', () => {
      const metadata = new CollectionMetadata('testCollection', 'file123');
      metadata.setModificationToken('initial-token');
      
      metadata.setModificationToken(null);
      
      expect(metadata.getModificationToken()).toBe(null);
    });
  });

  describe('Lock Status Management', () => {
    it('should get and set lockStatus', () => {
      const metadata = new CollectionMetadata('testCollection', 'file123');
      const lockStatus = createTestLockStatus();
      
      metadata.setLockStatus(lockStatus);
      
      const retrievedLockStatus = metadata.getLockStatus();
      expect(retrievedLockStatus.isLocked).toBe(lockStatus.isLocked);
      expect(retrievedLockStatus.lockedBy).toBe(lockStatus.lockedBy);
      expect(retrievedLockStatus.lockedAt).toBe(lockStatus.lockedAt);
      expect(retrievedLockStatus.lockTimeout).toBe(lockStatus.lockTimeout);
    });

    it('should include lockStatus when serialised', () => {
      const metadata = new CollectionMetadata('testCollection', 'file123');
      const lockStatus = createTestLockStatus({
        isLocked: false,
        lockedBy: null,
        lockedAt: null,
        lockTimeout: null
      });
      
      metadata.setLockStatus(lockStatus);
      
      const serialised = metadata.toJSON();
      expect(serialised.lockStatus.isLocked).toBe(false);
      expect(serialised.lockStatus.lockedBy).toBe(null);
      expect(serialised.lockStatus.lockedAt).toBe(null);
      expect(serialised.lockStatus.lockTimeout).toBe(null);
    });

    it('should throw error for invalid lockStatus type', () => {
      const metadata = new CollectionMetadata('testCollection', 'file123');
      
      expect(() => {
        metadata.setLockStatus('invalid');
      }).toThrow(InvalidArgumentError);
    });

    it('should validate lockStatus properties', () => {
      const metadata = new CollectionMetadata('testCollection', 'file123');
      const invalidLockStatus = {
        isLocked: 'not-boolean',
        lockedBy: 123,
        lockedAt: 'not-date',
        lockTimeout: 'not-number'
      };
      
      expect(() => {
        metadata.setLockStatus(invalidLockStatus);
      }).toThrow(InvalidArgumentError);
    });

    it('should allow null lockStatus', () => {
      const metadata = new CollectionMetadata('testCollection', 'file123');
      const initialLockStatus = createTestLockStatus();
      metadata.setLockStatus(initialLockStatus);
      
      metadata.setLockStatus(null);
      
      expect(metadata.getLockStatus()).toBe(null);
    });
  });
});
