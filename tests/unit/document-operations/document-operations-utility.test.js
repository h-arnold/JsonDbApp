/**
 * DocumentOperations Utility Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  setupTestEnvironment,
  resetCollection
} from '../../helpers/document-operations-test-helpers.js';

describe('DocumentOperations Utility Operations', () => {
  let env, docOps;

  beforeEach(() => {
    env = setupTestEnvironment();
    resetCollection(env.collection);
    docOps = new DocumentOperations(env.collection);
  });

  it('should count documents correctly', () => {
    let count = docOps.countDocuments();
    expect(count).toBe(0);

    docOps.insertDocument({ name: 'User 1' });
    count = docOps.countDocuments();
    expect(count).toBe(1);

    docOps.insertDocument({ name: 'User 2' });
    docOps.insertDocument({ name: 'User 3' });
    count = docOps.countDocuments();
    expect(count).toBe(3);

    const allDocs = docOps.findAllDocuments();
    docOps.deleteDocument(allDocs[0]._id);
    count = docOps.countDocuments();
    expect(count).toBe(2);

    env.collection._loadData();
    const documentsInDrive = Object.keys(env.collection._documents).length;
    expect(documentsInDrive).toBe(2);
  });

  it('should check document existence correctly', () => {
    const testDoc = { name: 'Existence Test User' };
    const insertedDoc = docOps.insertDocument(testDoc);

    expect(docOps.documentExists(insertedDoc._id)).toBe(true);
    expect(docOps.documentExists('non-existent-id')).toBe(false);

    env.collection._loadData();
    const existsInDrive = env.collection._documents.hasOwnProperty(insertedDoc._id);
    expect(existsInDrive).toBe(true);
  });

  it('should throw error when checking existence with invalid ID', () => {
    expect(() => docOps.documentExists(null)).toThrow(InvalidArgumentError);
    expect(() => docOps.documentExists(undefined)).toThrow(InvalidArgumentError);
    expect(() => docOps.documentExists('')).toThrow(InvalidArgumentError);
  });

  it('should generate valid document IDs', () => {
    const doc1 = docOps.insertDocument({ name: 'Test 1' });
    const doc2 = docOps.insertDocument({ name: 'Test 2' });
    const doc3 = docOps.insertDocument({ name: 'Test 3' });

    expect(doc1._id).toBeDefined();
    expect(doc2._id).toBeDefined();
    expect(doc3._id).toBeDefined();
    expect(typeof doc1._id).toBe('string');
    expect(typeof doc2._id).toBe('string');
    expect(typeof doc3._id).toBe('string');
    expect(doc1._id.length).toBeGreaterThan(0);
    expect(doc2._id.length).toBeGreaterThan(0);
    expect(doc3._id.length).toBeGreaterThan(0);

    expect(doc1._id).not.toBe(doc2._id);
    expect(doc1._id).not.toBe(doc3._id);
    expect(doc2._id).not.toBe(doc3._id);

    env.collection._loadData();
    expect(env.collection._documents.hasOwnProperty(doc1._id)).toBe(true);
    expect(env.collection._documents.hasOwnProperty(doc2._id)).toBe(true);
    expect(env.collection._documents.hasOwnProperty(doc3._id)).toBe(true);
  });
});
