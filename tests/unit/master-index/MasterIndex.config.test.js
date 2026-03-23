/* global MasterIndex, ErrorHandler, DatabaseConfig */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanupMasterIndexTests } from '../../helpers/master-index-test-helpers.js';

afterEach(() => {
  cleanupMasterIndexTests();
});

describe('MasterIndex configuration defaults', () => {
  it('should fail fast when DatabaseConfig defaults are unavailable', () => {
    const originalGetDefaultMasterIndexKey = DatabaseConfig.getDefaultMasterIndexKey;
    try {
      DatabaseConfig.getDefaultMasterIndexKey = undefined;
      try {
        new MasterIndex();
      } catch (error) {
        expect(error).toBeInstanceOf(ErrorHandler.ErrorTypes.CONFIGURATION_ERROR);
        expect(error.context).toMatchObject({
          setting: 'DatabaseConfig.getDefaultMasterIndexKey()',
          reason: 'MasterIndex requires DatabaseConfig.getDefaultMasterIndexKey() for defaults.'
        });
        return;
      }
      throw new Error('Expected MasterIndex construction to fail fast');
    } finally {
      DatabaseConfig.getDefaultMasterIndexKey = originalGetDefaultMasterIndexKey;
    }
  });

  it('should fail fast when the default lock timeout provider is unavailable', () => {
    const originalGetDefaultCollectionLockLeaseMs =
      DatabaseConfig.getDefaultCollectionLockLeaseMs;
    try {
      DatabaseConfig.getDefaultCollectionLockLeaseMs = undefined;
      try {
        new MasterIndex();
      } catch (error) {
        expect(error).toBeInstanceOf(ErrorHandler.ErrorTypes.CONFIGURATION_ERROR);
        expect(error.context).toMatchObject({
          setting: 'DatabaseConfig.getDefaultCollectionLockLeaseMs()',
          reason:
            'MasterIndex requires DatabaseConfig.getDefaultCollectionLockLeaseMs() for defaults.'
        });
        return;
      }
      throw new Error('Expected MasterIndex construction to fail fast');
    } finally {
      DatabaseConfig.getDefaultCollectionLockLeaseMs = originalGetDefaultCollectionLockLeaseMs;
    }
  });
});
