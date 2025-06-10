# Clasp File Push Order

Put this list under the "filePushOrder" key in your `clasp.json` file to ensure that files are pushed in the correct order to avoid `xxx is not defined` errors.

```json
{
 "filePushOrder": [
        "src/utils/ErrorHandler.js",
        "src/utils/GASDBLogger.js",
        "src/utils/IdGenerator.js",
        "src/core/DatabaseConfig.js",
        "src/core/MasterIndex.js",
        "src/components/CollectionMetadata.js",
        "src/components/DocumentOperations.js",
        "src/components/FileOperations.js",
        "src/components/QueryEngine.js",
        "src/services/FileService.js",
        "src/core/Database.js",
        "src/core/Collection.js",
        "tests/data/MockQueryData.js",
        "tests/framework/TestResult.js",
        "tests/framework/AssertionUtilities.js",
        "tests/framework/TestSuite.js",
        "tests/framework/TestFramework.js",
        "tests/framework/TestRunner.js",
        "tests/unit/UtilityTests/EnvironmentTest.js",
        "tests/unit/UtilityTests/GASDBLoggerTest.js",
        "tests/unit/UtilityTests/ErrorHandlerTest.js",
        "tests/unit/UtilityTests/IdGeneratorTest.js",
        "tests/unit/UtilityTests/UtilityTest.js",
        "tests/unit/TestFrameworkTest.js",
        "tests/unit/CollectionMetadataTest.js",
        "tests/unit/DocumentOperationsTest.js",
        "tests/unit/MasterIndexTest.js",
        "tests/unit/FileOperationsTest.js",
        "tests/unit/FileServiceTest.js",
        "tests/unit/QueryEngineTest.js",
        "tests/unit/DatabaseConfigTest.js",
        "tests/unit/DatabaseTest.js",
        "tests/unit/CollectionTest.js"
 ]
}
```
