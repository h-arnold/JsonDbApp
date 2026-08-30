/**
 * script-order.cjs - Shared legacy src load-order manifest.
 *
 * Single source of truth for the ordered list of legacy src scripts as loaded by the
 * Vitest global setup. Consumed by tests/setup/gas-mocks.setup.js and
 * tools/benchmarks/bench.cjs so the two load orders cannot drift apart. Ordering is
 * load-order critical (classic GAS scripts share one global scope), so entries must
 * never be reordered or removed without a deliberate behavioural review.
 * `src/04_core/99_PublicAPI.js` is deliberately excluded here; only the benchmark
 * harness appends it, after this manifest.
 */
module.exports = {
  legacyScripts: [
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
  ]
};
