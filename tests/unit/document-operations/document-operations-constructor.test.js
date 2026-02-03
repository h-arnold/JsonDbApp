/**
 * DocumentOperations Constructor Tests
 *
 * Tests for DocumentOperations constructor validation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestEnvironment } from '../../helpers/document-operations-test-helpers.js';

describe('DocumentOperations Constructor', () => {
  let env;

  beforeEach(() => {
    env = setupTestEnvironment();
  });

  it('should create DocumentOperations with valid collection reference', () => {
    const docOps = new DocumentOperations(env.collection);

    expect(docOps).toBeDefined();
    expect(typeof docOps.insertDocument).toBe('function');
    expect(typeof docOps.findDocumentById).toBe('function');
    expect(typeof docOps.findAllDocuments).toBe('function');
    expect(typeof docOps.updateDocument).toBe('function');
    expect(typeof docOps.deleteDocument).toBe('function');
    expect(typeof docOps.countDocuments).toBe('function');
    expect(typeof docOps.documentExists).toBe('function');
  });
});
