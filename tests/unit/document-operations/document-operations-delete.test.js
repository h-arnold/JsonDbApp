/**
 * DocumentOperations Delete Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  setupTestEnvironment,
  resetCollection
} from '../../helpers/document-operations-test-helpers.js';

describe('DocumentOperations Delete Operations', () => {
  let env, docOps;

  beforeEach(() => {
    env = setupTestEnvironment();
    resetCollection(env.collection);
    docOps = new DocumentOperations(env.collection);
  });

  it('should delete existing document by ID', () => {
    const testDoc = { name: 'Deletable User', email: 'deletable@example.com' };
    const insertedDoc = docOps.insertDocument(testDoc);

    const result = docOps.deleteDocument(insertedDoc._id);

    expect(result).toBeDefined();
    expect(result.acknowledged).toBe(true);
    expect(result.deletedCount).toBe(1);

    const foundDoc = docOps.findDocumentById(insertedDoc._id);
    expect(foundDoc).toBeNull();

    env.collection._loadData();
    const savedDoc = env.collection._documents[insertedDoc._id];
    expect(savedDoc).toBeUndefined();
  });

  it('should return error result when deleting non-existent document', () => {
    const result = docOps.deleteDocument('non-existent-id-789');

    expect(result).toBeDefined();
    expect(result.acknowledged).toBe(true);
    expect(result.deletedCount).toBe(0);
  });

  it('should throw error when deleting with invalid ID', () => {
    expect(() => docOps.deleteDocument(null)).toThrow(InvalidArgumentError);
    expect(() => docOps.deleteDocument(undefined)).toThrow(InvalidArgumentError);
    expect(() => docOps.deleteDocument('')).toThrow(InvalidArgumentError);
  });
});
