/**
 * Error Propagation Integration Test Suite
 * Tests that errors are properly caught and propagated from QueryEngine → DocumentOperations → Collection
 */
function createErrorPropagationTestSuite() {
  const suite = new TestSuite('Error Propagation Integration');
  
  suite.addTest('testInvalidQueryErrorPropagation', function() {
    // Arrange
    const testUsers = MockQueryData.getTestUsers();
    const collection = createPopulatedTestCollection(testUsers);
    
    // Act & Assert - Test malformed query error propagation
    try {
      collection.find({ $invalidOperator: 'test' });
      AssertionUtilities.fail('Should throw InvalidQueryError for unsupported operator');
    } catch (error) {
      AssertionUtilities.assertEquals(error.constructor.name, 'InvalidQueryError', 
        'Should propagate InvalidQueryError from QueryEngine');
      AssertionUtilities.assertTrue(error.message.includes('$invalidOperator'), 
        'Error message should mention invalid operator');
    }
  });
  
  suite.addTest('testInvalidArgumentErrorPropagation', function() {
    // Arrange
    const testUsers = MockQueryData.getTestUsers();
    const collection = createPopulatedTestCollection(testUsers);
    
    // Act & Assert - Test invalid arguments error propagation
    try {
      collection.find(null);
      AssertionUtilities.fail('Should throw InvalidArgumentError for null query');
    } catch (error) {
      AssertionUtilities.assertEquals(error.constructor.name, 'InvalidArgumentError', 
        'Should propagate InvalidArgumentError from DocumentOperations');
    }
  });
  
  suite.addTest('testDocumentNotFoundErrorPropagation', function() {
    // Arrange
    const collection = createPopulatedTestCollection([]); // Empty collection
    
    // Act & Assert - Test document not found error propagation
    const result = collection.findOne({ name: 'NonExistentUser' });
    AssertionUtilities.assertNull(result, 'Should return null for non-existent document');
    
    // Test update on non-existent document
    const updateResult = collection.updateOne({ name: 'NonExistentUser' }, { updated: true });
    AssertionUtilities.assertEquals(updateResult.modifiedCount, 0, 'Should not modify any documents');
  });
  
  suite.addTest('testRecursionDepthErrorPropagation', function() {
    // Arrange
    const collection = createPopulatedTestCollection([]);
    
    // Create deeply nested query to test recursion protection
    let deepQuery = { field: 'value' };
    for (let i = 0; i < 20; i++) {
      deepQuery = { $and: [deepQuery, { anotherField: 'value' }] };
    }
    
    // Act & Assert - Test recursion depth protection
    try {
      collection.find(deepQuery);
      AssertionUtilities.fail('Should throw error for excessively deep query');
    } catch (error) {
      AssertionUtilities.assertTrue(error.message.includes('recursion') || error.message.includes('depth'), 
        'Should throw recursion/depth related error');
    }
  });
  
  return suite;
}