// 00_CollectionCoordinatorConstructorValidationTestSuite.js
// Unit test suite for CollectionCoordinator constructor validation (RED PHASE)

function createCollectionCoordinatorConstructorValidationTestSuite() {
  const suite = new TestSuite('CollectionCoordinator Constructor Validation');

  suite.addTest('testCollectionCoordinatorConstructorValidation', function() {
    // Arrange
    // Intentionally pass invalid dependencies (e.g. nulls)
    // Act & Assert
    TestFramework.assertThrows(
      function() {
        new CollectionCoordinator(null, null, null, null);
      },
      InvalidArgumentError,
      'Should throw InvalidArgumentError when dependencies are missing'
    );
  });

  return suite;
}

registerTestSuite(createCollectionCoordinatorConstructorValidationTestSuite());
