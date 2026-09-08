/* global MasterIndex, PropertiesService */

import { afterEach, describe, expect, it } from 'vitest';
import {
  cleanupMasterIndexTests,
  createMasterIndexKey,
  createTestMasterIndex,
  seedMasterIndex
} from '../../helpers/master-index-test-helpers.js';

const scriptProperties = PropertiesService.getScriptProperties();

/**
 * Add a collection using consistent defaults for timestamp scenarios.
 * @param {MasterIndex} masterIndex - MasterIndex under test.
 * @param {string} name - Collection identifier.
 * @returns {void}
 */
const addTestCollection = (masterIndex, name) => {
  masterIndex.addCollection(name, {
    name,
    fileId: `${name}-file`,
    documentCount: 0,
    modificationToken: masterIndex.generateModificationToken(),
    lockStatus: null
  });
};

afterEach(() => {
  cleanupMasterIndexTests();
});

describe('MasterIndex timestamp normalisation contract', () => {
  describe('save() timestamp coercion (Red)', () => {
    it('should coerce an ISO date string into a Date when saving', () => {
      const { key, masterIndex } = createTestMasterIndex();
      const iso = '2025-06-02T10:00:00Z';

      masterIndex.save({ version: 1, collections: {} }, iso);

      const stored = JSON.parse(scriptProperties.getProperty(key));
      expect(stored.lastUpdated).toBe('2025-06-02T10:00:00.000Z');
    });

    it('should coerce an epoch-millisecond number into a Date when saving', () => {
      const { key, masterIndex } = createTestMasterIndex();
      const epochMs = Date.parse('2025-06-02T10:00:00Z');

      masterIndex.save({ version: 1, collections: {} }, epochMs);

      const stored = JSON.parse(scriptProperties.getProperty(key));
      expect(stored.lastUpdated).toBe('2025-06-02T10:00:00.000Z');
    });
  });

  describe('save() defensive copying and fallback (characterisation)', () => {
    it('should defensively copy a supplied Date so the caller cannot mutate the stored timestamp', () => {
      const { key, masterIndex } = createTestMasterIndex();
      const supplied = new Date('2025-06-02T10:00:00Z');

      masterIndex.save({ version: 1, collections: {} }, supplied);
      supplied.setUTCFullYear(2030);

      const stored = JSON.parse(scriptProperties.getProperty(key));
      expect(stored.lastUpdated).toBe('2025-06-02T10:00:00.000Z');
    });

    it('should fall back to the current timestamp for an invalid Date', () => {
      const { key, masterIndex } = createTestMasterIndex();
      const before = Date.now();

      masterIndex.save({ version: 1, collections: {} }, new Date(NaN));

      const after = Date.now();
      const storedMs = Date.parse(JSON.parse(scriptProperties.getProperty(key)).lastUpdated);
      expect(storedMs).toBeGreaterThanOrEqual(before - 1);
      expect(storedMs).toBeLessThanOrEqual(after + 1);
    });

    it('should fall back to the current timestamp for null rather than stamping epoch 0', () => {
      const { key, masterIndex } = createTestMasterIndex();
      const before = Date.now();

      masterIndex.save({ version: 1, collections: {} }, null);

      const after = Date.now();
      const storedMs = Date.parse(JSON.parse(scriptProperties.getProperty(key)).lastUpdated);
      expect(storedMs).toBeGreaterThanOrEqual(before - 1);
      expect(storedMs).toBeLessThanOrEqual(after + 1);
      expect(storedMs).not.toBe(0);
    });

    it('should fall back to the current timestamp when the timestamp is explicitly undefined', () => {
      const { key, masterIndex } = createTestMasterIndex();
      const before = Date.now();

      masterIndex.save({ version: 1, collections: {} }, undefined);

      const after = Date.now();
      const storedMs = Date.parse(JSON.parse(scriptProperties.getProperty(key)).lastUpdated);
      expect(storedMs).toBeGreaterThanOrEqual(before - 1);
      expect(storedMs).toBeLessThanOrEqual(after + 1);
    });

    it('should fall back to the current timestamp for an unparseable date string', () => {
      const { key, masterIndex } = createTestMasterIndex();
      const before = Date.now();

      masterIndex.save({ version: 1, collections: {} }, 'not-a-date');

      const after = Date.now();
      const storedMs = Date.parse(JSON.parse(scriptProperties.getProperty(key)).lastUpdated);
      expect(storedMs).toBeGreaterThanOrEqual(before - 1);
      expect(storedMs).toBeLessThanOrEqual(after + 1);
    });

    it('should fall back to the current timestamp for a boolean rather than coercing it', () => {
      const { key, masterIndex } = createTestMasterIndex();
      const before = Date.now();

      masterIndex.save({ version: 1, collections: {} }, true);

      const after = Date.now();
      const storedMs = Date.parse(JSON.parse(scriptProperties.getProperty(key)).lastUpdated);
      expect(storedMs).toBeGreaterThanOrEqual(before - 1);
      expect(storedMs).toBeLessThanOrEqual(after + 1);
      expect(storedMs).not.toBe(1);
    });

    it('should fall back to the current timestamp for a parseable array rather than coercing it', () => {
      const { key, masterIndex } = createTestMasterIndex();
      const before = Date.now();

      masterIndex.save({ version: 1, collections: {} }, ['2025-06-02T10:00:00Z']);

      const after = Date.now();
      const storedMs = Date.parse(JSON.parse(scriptProperties.getProperty(key)).lastUpdated);
      expect(storedMs).toBeGreaterThanOrEqual(before - 1);
      expect(storedMs).toBeLessThanOrEqual(after + 1);
      expect(storedMs).not.toBe(Date.parse('2025-06-02T10:00:00Z'));
    });

    it('should fall back to the current timestamp for a plain object rather than coercing it', () => {
      const { key, masterIndex } = createTestMasterIndex();
      const before = Date.now();

      masterIndex.save({ version: 1, collections: {} }, {});

      const after = Date.now();
      const storedMs = Date.parse(JSON.parse(scriptProperties.getProperty(key)).lastUpdated);
      expect(storedMs).toBeGreaterThanOrEqual(before - 1);
      expect(storedMs).toBeLessThanOrEqual(after + 1);
    });
  });

  describe('index timestamp propagation (characterisation)', () => {
    it('should advance the index lastUpdated when collection metadata is updated', () => {
      const { key, masterIndex } = createTestMasterIndex();
      addTestCollection(masterIndex, 'advanceTest');
      const before = Date.now();

      masterIndex.updateCollectionMetadata('advanceTest', { documentCount: 3 });

      const after = Date.now();
      const storedMs = Date.parse(JSON.parse(scriptProperties.getProperty(key)).lastUpdated);
      expect(storedMs).toBeGreaterThanOrEqual(before - 1);
      expect(storedMs).toBeLessThanOrEqual(after + 1);
    });

    it('should persist a current timestamp on the index when adding a collection', () => {
      const { key, masterIndex } = createTestMasterIndex();
      const before = Date.now();

      addTestCollection(masterIndex, 'persistTs');

      const after = Date.now();
      const storedMs = Date.parse(JSON.parse(scriptProperties.getProperty(key)).lastUpdated);
      expect(storedMs).toBeGreaterThanOrEqual(before - 1);
      expect(storedMs).toBeLessThanOrEqual(after + 1);
    });

    it('should preserve a valid stored timestamp when repairing legacy modification history', () => {
      const key = createMasterIndexKey();
      const seededData = {
        version: 1,
        lastUpdated: new Date('2025-01-01T00:00:00Z'),
        collections: {},
        modificationHistory: []
      };
      seedMasterIndex(key, seededData);

      new MasterIndex({ masterIndexKey: key });

      const stored = JSON.parse(scriptProperties.getProperty(key));
      expect(stored.lastUpdated).toBe('2025-01-01T00:00:00.000Z');
      expect(stored.modificationHistory).toBeUndefined();
    });
  });
});
