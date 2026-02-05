/**
 * DocumentOperations Delete Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createDocumentOperationsContext,
  assertAcknowledgedResult
} from '../../helpers/document-operations-test-helpers.js';

describe('DocumentOperations Delete Operations', () => {
  let docOps, reload;

  beforeEach(() => {
    ({ docOps, reload } = createDocumentOperationsContext());
  });

  it('should delete existing document by ID', () => {
    const testDoc = { name: 'Deletable User', email: 'deletable@example.com' };
    const insertedDoc = docOps.insertDocument(testDoc);

    const result = docOps.deleteDocument(insertedDoc._id);

    assertAcknowledgedResult(result, { deletedCount: 1 });

    const foundDoc = docOps.findDocumentById(insertedDoc._id);
    expect(foundDoc).toBeNull();

    const documents = reload();
    const savedDoc = documents[insertedDoc._id];
    expect(savedDoc).toBeUndefined();
  });

  it('should return error result when deleting non-existent document', () => {
    const result = docOps.deleteDocument('non-existent-id-789');

    assertAcknowledgedResult(result, { deletedCount: 0 });
  });

  it('should throw error when deleting with invalid ID', () => {
    expect(() => docOps.deleteDocument(null)).toThrow(InvalidArgumentError);
    expect(() => docOps.deleteDocument(undefined)).toThrow(InvalidArgumentError);
    expect(() => docOps.deleteDocument('')).toThrow(InvalidArgumentError);
  });
});
