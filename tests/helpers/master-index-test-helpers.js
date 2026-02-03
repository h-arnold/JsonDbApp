/* global PropertiesService, MasterIndex, ObjectUtils */

/**
 * Master Index Test Helpers for Vitest
 *
 * Provides utilities for isolating ScriptProperties-backed master index state during tests.
 */

const scriptProperties = PropertiesService.getScriptProperties();
const trackedMasterIndexKeys = new Set();

/**
 * Registers a master index key for cleanup after a test.
 * @param {string} masterIndexKey - Master index key to register.
 * @returns {string} The registered master index key.
 */
export const registerMasterIndexKey = (masterIndexKey) => {
  if (typeof masterIndexKey === 'string' && masterIndexKey.trim()) {
    trackedMasterIndexKeys.add(masterIndexKey);
  }
  return masterIndexKey;
};

/**
 * Generates and registers a unique master index key for testing.
 * @returns {string} Newly created master index key.
 */
export const createMasterIndexKey = () => {
  const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const masterIndexKey = `VITEST_MASTER_INDEX_${uniqueSuffix}`;
  return registerMasterIndexKey(masterIndexKey);
};

/**
 * Creates a MasterIndex instance with isolated configuration.
 * @param {Object} [config] - Optional overrides passed to MasterIndex.
 * @returns {{ key: string, masterIndex: MasterIndex }} Master index key and instance.
 */
export const createTestMasterIndex = (config = {}) => {
  const masterIndexKey = typeof config.masterIndexKey === 'string'
    ? registerMasterIndexKey(config.masterIndexKey)
    : createMasterIndexKey();
  const masterIndex = new MasterIndex({ ...config, masterIndexKey });
  return { key: masterIndexKey, masterIndex };
};

/**
 * Seeds ScriptProperties with a serialised master index payload.
 * @param {string} masterIndexKey - Target master index key.
 * @param {Object} data - Serialised master index data.
 */
export const seedMasterIndex = (masterIndexKey, data) => {
  const registeredKey = registerMasterIndexKey(masterIndexKey);
  const serialised = ObjectUtils.serialise(data);
  scriptProperties.setProperty(registeredKey, serialised);
};

/**
 * Cleans up master index keys registered during a test run.
 */
export const cleanupMasterIndexTests = () => {
  for (const masterIndexKey of trackedMasterIndexKeys) {
    try {
      scriptProperties.deleteProperty(masterIndexKey);
    } catch {
      // Property may already be removed; best-effort cleanup.
    }
  }
  trackedMasterIndexKeys.clear();
};
