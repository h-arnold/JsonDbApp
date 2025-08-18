/**
 * 97_ValidationResetHelper.js - Provides a reset function to restore validation test data
 * Ensures test isolation across suites by reloading original mock documents into each collection.
 */

/**
 * Reset validation test data to the original mock dataset.
 * Idempotent; overwrites in-memory documents and persists so subsequent operations see a clean state.
 */
function resetValidationTestData() {
  if (typeof VALIDATION_TEST_ENV === 'undefined' || !VALIDATION_TEST_ENV.collections || !VALIDATION_TEST_ENV.initialDataMap) {
    return; // Environment not ready yet
  }
  const logger = JDbLogger.createComponentLogger('ValidationTests-Reset');
  try {
    Object.keys(VALIDATION_TEST_ENV.collections).forEach(collectionName => {
      const collection = VALIDATION_TEST_ENV.collections[collectionName];
      const dataArray = VALIDATION_TEST_ENV.initialDataMap[collectionName];
      if (!collection || !Array.isArray(dataArray)) return;

      // Directly replace the underlying _documents map; rely on Collection internals
      const newDocs = {};
      dataArray.forEach(doc => { newDocs[doc._id] = JSON.parse(JSON.stringify(doc)); });
      // Safely assign: collection has _documents private-ish property
      collection._documents = newDocs;
      // Update metadata counts and save
      if (typeof collection._updateMetadata === 'function') {
        collection._updateMetadata({ documentCount: dataArray.length });
      }
      if (typeof collection._markDirty === 'function') {
        collection._markDirty();
      }
      if (typeof collection._saveData === 'function') {
        collection._saveData();
      }
    });
  } catch (e) {
    logger.error('Reset failed', { error: e.message });
    throw e;
  }
}

/* exported resetValidationTestData */
"";
