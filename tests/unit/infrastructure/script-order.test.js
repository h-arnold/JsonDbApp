/**
 * script-order.test.js - Vitest tests for tools/gas-mocks/script-order.cjs
 *
 * Verifies the shared legacy-script load-order manifest consumed by both the
 * Vitest setup file and (later) the benchmark harness, so the two can never
 * drift apart.
 */

import { describe, it, expect } from 'vitest';

import { legacyScripts } from '../../../tools/gas-mocks/script-order.cjs';

/**
 * The exact inline ordering previously held in tests/setup/gas-mocks.setup.js,
 * captured verbatim before extraction. Any change to the manifest ordering is a
 * behavioural change to every Vitest run and must be made deliberately.
 */
const EXPECTED_LEGACY_SCRIPT_ORDER = [
  'src/01_utils/ErrorHandler.js',
  'src/01_utils/Validation.js',
  'src/01_utils/JDbLogger.js',
  'src/01_utils/IdGenerator.js',
  'src/01_utils/ComparisonUtils.js',
  'src/04_core/DatabaseConfig.js',
  'src/04_core/Database.js',
  'src/04_core/Database/01_DatabaseLifecycle.js',
  'src/04_core/Database/02_DatabaseCollectionManagement.js',
  'src/04_core/Database/03_DatabaseIndexOperations.js',
  'src/04_core/Database/04_DatabaseMasterIndexOperations.js',
  'src/04_core/Database/99_Database.js',
  'src/01_utils/ObjectUtils.js',
  'src/01_utils/FieldPathUtils.js',
  'src/03_services/DbLockService.js',
  'src/02_components/CollectionMetadata.js',
  'src/04_core/MasterIndex.js',
  'src/04_core/MasterIndex/01_MasterIndexMetadataNormaliser.js',
  'src/04_core/MasterIndex/02_MasterIndexLockManager.js',
  'src/04_core/MasterIndex/04_MasterIndexConflictResolver.js',
  'src/04_core/MasterIndex/99_MasterIndex.js',
  'src/02_components/FileOperations.js',
  'src/03_services/FileService.js',
  'src/02_components/DocumentOperations.js',
  'src/02_components/QueryEngine/01_QueryEngineValidation.js',
  'src/02_components/QueryEngine/02_QueryEngineMatcher.js',
  'src/02_components/QueryEngine/99_QueryEngine.js',
  'src/02_components/UpdateEngine/01_UpdateEngineFieldOperators.js',
  'src/02_components/UpdateEngine/02_UpdateEngineArrayOperators.js',
  'src/02_components/UpdateEngine/03_UpdateEngineFieldPathAccess.js',
  'src/02_components/UpdateEngine/04_UpdateEngineValidation.js',
  'src/02_components/UpdateEngine/99_UpdateEngine.js',
  'src/02_components/CollectionCoordinator.js',
  'src/04_core/Collection/01_CollectionReadOperations.js',
  'src/04_core/Collection/02_CollectionWriteOperations.js',
  'src/04_core/Collection/99_Collection.js'
];

describe('tools/gas-mocks/script-order.cjs', () => {
  it('exports a non-empty ordered array of src-relative paths', () => {
    // Assert: shape of the exported manifest
    expect(Array.isArray(legacyScripts)).toBe(true);
    expect(legacyScripts.length).toBeGreaterThan(0);
    for (const entry of legacyScripts) {
      expect(typeof entry).toBe('string');
      expect(entry.length).toBeGreaterThan(0);
      expect(entry.startsWith('src/')).toBe(true);
    }
  });

  it('includes JDbLogger so the logger is loaded before dependent modules', () => {
    // Assert: logger presence in the manifest
    expect(legacyScripts).toContain('src/01_utils/JDbLogger.js');
  });

  it('excludes the public API shim which only the benchmark harness appends', () => {
    // Assert: bench-only script must not leak into the test-setup load order
    expect(legacyScripts).not.toContain('src/04_core/99_PublicAPI.js');
  });

  it('preserves the exact legacy load order captured from the setup file', () => {
    // Assert: byte-for-byte ordering parity with the previous inline list
    expect(legacyScripts).toEqual(EXPECTED_LEGACY_SCRIPT_ORDER);
  });
});
