/**
 * DocumentOperations Update Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestEnvironment, resetCollection } from '../../helpers/document-operations-test-helpers.js';

describe('DocumentOperations Update Operations', () => {
  let env, docOps;

  beforeEach(() => {
    env = setupTestEnvironment();
    resetCollection(env.collection);
    docOps = new DocumentOperations(env.collection);
  });

  it('should update existing document by ID', () => {
    const originalDoc = { name: 'Original User', email: 'original@example.com' };
    const insertedDoc = docOps.insertDocument(originalDoc);
    const updatedData = { name: 'Updated User', email: 'updated@example.com', status: 'active' };
    
    const result = docOps.updateDocument(insertedDoc._id, updatedData);
    
    expect(result).toBeDefined();
    expect(result.acknowledged).toBe(true);
    expect(result.modifiedCount).toBe(1);
    
    const foundDoc = docOps.findDocumentById(insertedDoc._id);
    expect(foundDoc.name).toBe(updatedData.name);
    expect(foundDoc.email).toBe(updatedData.email);
    expect(foundDoc.status).toBe(updatedData.status);
    expect(foundDoc._id).toBe(insertedDoc._id);
    
    env.collection._loadData();
    const savedDoc = env.collection._documents[insertedDoc._id];
    expect(savedDoc.name).toBe(updatedData.name);
  });

  it('should return error result when updating non-existent document', () => {
    const result = docOps.updateDocument('non-existent-id-456', { name: 'Updated User' });
    
    expect(result).toBeDefined();
    expect(result.acknowledged).toBe(true);
    expect(result.modifiedCount).toBe(0);
  });

  it('should throw error when updating with invalid parameters', () => {
    expect(() => docOps.updateDocument(null, { name: 'Test' })).toThrow(InvalidArgumentError);
    expect(() => docOps.updateDocument('valid-id', null)).toThrow(InvalidArgumentError);
    expect(() => docOps.updateDocument('', { name: 'Test' })).toThrow(InvalidArgumentError);
    expect(() => docOps.updateDocument('valid-id', 'not-an-object')).toThrow(InvalidArgumentError);
  });

  it('should update document with operators by ID', () => {
    const original = { name: 'Alice', age: 30, tags: ['user'] };
    const inserted = docOps.insertDocument(original);
    const ops = { $inc: { age: 5 }, $push: { tags: 'admin' } };
    
    const result = docOps.updateDocumentWithOperators(inserted._id, ops);
    
    expect(result).toBeDefined();
    expect(result.acknowledged).toBe(true);
    expect(result.modifiedCount).toBe(1);
    
    const updated = docOps.findDocumentById(inserted._id);
    expect(updated.age).toBe(35);
    expect(Array.isArray(updated.tags)).toBe(true);
    expect(updated.tags).toContain('admin');
    
    env.collection._loadData();
    const saved = env.collection._documents[inserted._id];
    expect(saved.age).toBe(35);
    expect(saved.tags).toContain('admin');
  });

  it('should update documents matching query with single match', () => {
    const a = docOps.insertDocument({ name: 'Bob', score: 10 });
    docOps.insertDocument({ name: 'Carol', score: 5 });
    const ops = { $set: { passed: true } };
    
    const count = docOps.updateDocumentByQuery({ score: { $gt: 8 } }, ops);
    
    expect(count).toBe(1);
    const updated = docOps.findDocumentById(a._id);
    expect(updated.passed).toBe(true);
  });

  it('should update documents matching query with multiple matches', () => {
    const u1 = docOps.insertDocument({ name: 'Eve', active: false });
    const u2 = docOps.insertDocument({ name: 'Frank', active: false });
    docOps.insertDocument({ name: 'Grace', active: true });
    const ops = { $set: { active: true } };
    
    const count = docOps.updateDocumentByQuery({ active: false }, ops);
    
    expect(count).toBe(2);
    [u1, u2].forEach(u => {
      const doc = docOps.findDocumentById(u._id);
      expect(doc.active).toBe(true);
    });
  });

  it('should throw error when updateByQuery finds no matches', () => {
    expect(() => {
      docOps.updateDocumentByQuery({ missing: true }, { $set: { x: 1 } });
    }).toThrow(DocumentNotFoundError);
  });

  it('should replace document by ID', () => {
    const orig = docOps.insertDocument({ a: 1, b: 2 });
    const replacement = { a: 9, c: 3 };
    
    const result = docOps.replaceDocument(orig._id, replacement);
    
    expect(result.acknowledged).toBe(true);
    expect(result.modifiedCount).toBe(1);
    
    const found = docOps.findDocumentById(orig._id);
    expect(found.a).toBe(9);
    expect(found.b).toBeUndefined();
    expect(found.c).toBe(3);
  });

  it('should replace documents matching query', () => {
    const d1 = docOps.insertDocument({ val: 0 });
    docOps.insertDocument({ val: 1 });
    const replacement = { val: 100 };
    
    const count = docOps.replaceDocumentByQuery({ val: 0 }, replacement);
    
    expect(count).toBe(1);
    const updated = docOps.findDocumentById(d1._id);
    expect(updated.val).toBe(100);
  });

  it('should integrate with UpdateEngine for operator-based updates', () => {
    const doc = docOps.insertDocument({ nested: { count: 2 } });
    const ops = { $set: { 'nested.count': 5 } };
    
    docOps.updateDocumentWithOperators(doc._id, ops);
    
    expect(docOps.findDocumentById(doc._id).nested.count).toBe(5);
  });

  it('should throw error for unsupported update operators', () => {
    expect(() => {
      docOps.updateDocumentWithOperators('any-id', { '$invalidOp': {} });
    }).toThrow(InvalidQueryError);
  });

  it('should throw error when no operators provided to updateDocumentWithOperators', () => {
    expect(() => {
      docOps.updateDocumentWithOperators('any-id', { invalidField: 'value' });
    }).toThrow(InvalidArgumentError);
  });
});
