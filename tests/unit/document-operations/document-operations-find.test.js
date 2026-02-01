/**
 * DocumentOperations Find Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestEnvironment, resetCollection, DocumentOperations, InvalidArgumentError } from '../../helpers/document-operations-test-helpers.js';

describe('DocumentOperations Find Operations', () => {
  let env, docOps;

  beforeEach(() => {
    env = setupTestEnvironment();
    resetCollection(env.collection);
    docOps = new DocumentOperations(env.collection);
  });

  it('should find document by valid ID', () => {
    const testDoc = { name: 'Findable User', email: 'findable@example.com' };
    const insertedDoc = docOps.insertDocument(testDoc);
    
    const foundDoc = docOps.findDocumentById(insertedDoc._id);
    
    expect(foundDoc).toBeDefined();
    expect(foundDoc._id).toBe(insertedDoc._id);
    expect(foundDoc.name).toBe(testDoc.name);
    expect(foundDoc.email).toBe(testDoc.email);
  });

  it('should return null when document not found by ID', () => {
    const foundDoc = docOps.findDocumentById('non-existent-id-123');
    expect(foundDoc).toBeNull();
  });

  it('should throw error when finding with invalid ID', () => {
    expect(() => docOps.findDocumentById(null)).toThrow(InvalidArgumentError);
    expect(() => docOps.findDocumentById(undefined)).toThrow(InvalidArgumentError);
    expect(() => docOps.findDocumentById('')).toThrow(InvalidArgumentError);
  });

  it('should find all documents when collection has content', () => {
    docOps.insertDocument({ name: 'User One', email: 'one@example.com' });
    docOps.insertDocument({ name: 'User Two', email: 'two@example.com' });
    docOps.insertDocument({ name: 'User Three', email: 'three@example.com' });
    
    const allDocs = docOps.findAllDocuments();
    
    expect(allDocs).toBeDefined();
    expect(Array.isArray(allDocs)).toBe(true);
    expect(allDocs.length).toBe(3);
    
    const names = allDocs.map(doc => doc.name);
    expect(names).toContain('User One');
    expect(names).toContain('User Two');
    expect(names).toContain('User Three');
  });

  it('should return empty array when finding all documents in empty collection', () => {
    const allDocs = docOps.findAllDocuments();
    
    expect(allDocs).toBeDefined();
    expect(Array.isArray(allDocs)).toBe(true);
    expect(allDocs.length).toBe(0);
  });
});
