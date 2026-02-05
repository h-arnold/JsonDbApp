/**
 * DocumentOperations Insert Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createDocumentOperationsContext } from '../../helpers/document-operations-test-helpers.js';

describe('DocumentOperations Insert Operations', () => {
  let docOps, reload;

  beforeEach(() => {
    ({ docOps, reload } = createDocumentOperationsContext());
  });

  it('should insert document with automatic ID generation', () => {
    const testDoc = { name: 'Test User', email: 'test@example.com' };
    const result = docOps.insertDocument(testDoc);

    expect(result).toBeDefined();
    expect(result._id).toBeDefined();
    expect(typeof result._id).toBe('string');
    expect(result._id.length).toBeGreaterThan(0);
    expect(result.name).toBe(testDoc.name);
    expect(result.email).toBe(testDoc.email);

    const documents = reload();
    const savedDoc = documents[result._id];
    expect(savedDoc).toBeDefined();
    expect(savedDoc.name).toBe(testDoc.name);
  });

  it('should insert document with provided ID when valid', () => {
    const customId = 'custom-id-123';
    const testDoc = { _id: customId, name: 'Test User', email: 'test@example.com' };
    const result = docOps.insertDocument(testDoc);

    expect(result._id).toBe(customId);
    expect(result.name).toBe(testDoc.name);

    const documents = reload();
    const savedDoc = documents[customId];
    expect(savedDoc).toBeDefined();
  });

  it('should throw error when inserting document with duplicate ID', () => {
    const duplicateId = 'duplicate-id-123';
    const firstDoc = { _id: duplicateId, name: 'First User' };
    const secondDoc = { _id: duplicateId, name: 'Second User' };

    docOps.insertDocument(firstDoc);

    expect(() => {
      docOps.insertDocument(secondDoc);
    }).toThrow(ConflictError);
  });

  it('should throw error when inserting invalid document', () => {
    expect(() => docOps.insertDocument(null)).toThrow(InvalidArgumentError);
    expect(() => docOps.insertDocument(undefined)).toThrow(InvalidArgumentError);
    expect(() => docOps.insertDocument('not-an-object')).toThrow(InvalidArgumentError);
    expect(() => docOps.insertDocument([])).toThrow(InvalidArgumentError);
  });
});
