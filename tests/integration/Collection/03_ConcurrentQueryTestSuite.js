/**
 * Concurrent Query Integration Test Suite
 * Tests that multiple queries can be executed simultaneously without conflicts
 */
function createConcurrentQueryTestSuite() {
  const suite = new TestSuite('Concurrent Query Integration');
  
  suite.addTest('testConcurrentReadOperations', function() {
    // Arrange
    const collection = createPopulatedTestCollection(INTEGRATION_TEST_DATA.largeDataset.slice(0, 500));
    
    // Act - Simulate concurrent read operations
    const query1Results = collection.find({ 'profile.department': 'Engineering' });
    const query2Results = collection.find({ salary: { $gt: 50000 } });
    const query3Results = collection.find({ active: true });
    const countResult = collection.countDocuments({ 'address.city': 'London' });
    
    // Assert - All operations should succeed without interference
    AssertionUtilities.assertTrue(Array.isArray(query1Results), 'Query 1 should return array');
    AssertionUtilities.assertTrue(Array.isArray(query2Results), 'Query 2 should return array');
    AssertionUtilities.assertTrue(Array.isArray(query3Results), 'Query 3 should return array');
    AssertionUtilities.assertTrue(typeof countResult === 'number', 'Count should return number');
    
    // Results should be consistent with expectations
    query1Results.forEach(user => {
      AssertionUtilities.assertEquals(user.profile.department, 'Engineering', 
        'All query 1 results should be Engineering users');
    });
    
    query2Results.forEach(user => {
      AssertionUtilities.assertTrue(user.salary > 50000, 
        'All query 2 results should have salary > 50000');
    });
  });
  
  suite.addTest('testConcurrentMixedOperations', function() {
    // Arrange
    const testUsers = MockQueryData.getTestUsers();
    const collection = createPopulatedTestCollection(testUsers);
    
    // Act - Mix of read, update, and count operations
    const findResult = collection.find({ 'profile.department': 'Engineering' });
    const updateResult = collection.updateOne(
      { 'profile.department': 'Marketing' }, 
      { name: 'Updated Marketing User' }
    );
    const countResult = collection.countDocuments({ active: true });
    const findOneResult = collection.findOne({ name: 'Updated Marketing User' });
    
    // Assert - All operations should succeed
    AssertionUtilities.assertTrue(Array.isArray(findResult), 'Find should return array');
    AssertionUtilities.assertEquals(updateResult.modifiedCount, 1, 'Update should modify one document');
    AssertionUtilities.assertTrue(typeof countResult === 'number', 'Count should return number');
    AssertionUtilities.assertNotNull(findOneResult, 'Should find updated user');
    AssertionUtilities.assertEquals(findOneResult.name, 'Updated Marketing User', 
      'Updated user should have correct name');
  });
  
  return suite;
}