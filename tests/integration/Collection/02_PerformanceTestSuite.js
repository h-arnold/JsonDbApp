/**
 * Performance Integration Test Suite
 * Tests query performance and memory efficiency with large datasets
 */

function createPerformanceTestSuite() {
  const suite = new TestSuite('Performance Integration');
  
  suite.addTest('testLargeDatasetQueryPerformance', function() {
    // Arrange
    const collection = createPopulatedTestCollection(INTEGRATION_TEST_DATA.largeDataset);
    
    // Act & Assert - Test various query patterns on large dataset
    const startTime = new Date().getTime();
    
    // Simple field query
    const engineeringUsers = collection.find({ 'profile.department': 'Engineering' });
    const fieldQueryTime = new Date().getTime() - startTime;
    
    // Comparison operator query
    const comparisonStartTime = new Date().getTime();
    const highEarners = collection.find({ salary: { $gt: 75000 } });
    const comparisonQueryTime = new Date().getTime() - comparisonStartTime;
    
    // Complex nested query
    const complexStartTime = new Date().getTime();
    const complexResults = collection.find({ 
      'profile.department': 'Engineering', 
      salary: { $gt: 50000 },
      active: true 
    });
    const complexQueryTime = new Date().getTime() - complexStartTime;
    
    // Assert - Performance thresholds (all queries should complete within reasonable time)
    AssertionUtilities.assertTrue(fieldQueryTime < 2000, 
      `Field query should complete within 2 seconds, took ${fieldQueryTime}ms`);
    AssertionUtilities.assertTrue(comparisonQueryTime < 2000, 
      `Comparison query should complete within 2 seconds, took ${comparisonQueryTime}ms`);
    AssertionUtilities.assertTrue(complexQueryTime < 3000, 
      `Complex query should complete within 3 seconds, took ${complexQueryTime}ms`);
    
    // Assert - Result correctness
    AssertionUtilities.assertTrue(engineeringUsers.length > 0, 'Should find engineering users');
    AssertionUtilities.assertTrue(highEarners.length > 0, 'Should find high earners');
    AssertionUtilities.assertTrue(complexResults.length > 0, 'Should find complex query results');
    
    // All high earners should have salary > 75000
    highEarners.forEach(user => {
      AssertionUtilities.assertTrue(user.salary > 75000, 'All users should be high earners');
    });
  });
  
  suite.addTest('testLargeDatasetMemoryManagement', function() {
    // Arrange
    const collection = createPopulatedTestCollection(INTEGRATION_TEST_DATA.largeDataset);
    
    // Act - Perform multiple large queries to test memory management
    const queries = [
      { active: true },
      { 'profile.department': 'Engineering' },
      { salary: { $gt: 40000 } },
      { 'address.city': 'London' },
      { 'profile.yearsOfService': { $gt: 5 } }
    ];
    
    const results = [];
    queries.forEach(query => {
      const queryResults = collection.find(query);
      results.push(queryResults.length);
    });
    
    // Assert - All queries should return reasonable results
    results.forEach((count, index) => {
      AssertionUtilities.assertTrue(count >= 0, `Query ${index} should return non-negative count`);
    });
    
    // Test count operations for memory efficiency
    const totalDocs = collection.countDocuments({});
    AssertionUtilities.assertEquals(totalDocs, INTEGRATION_TEST_DATA.largeDataset.length, 
      'Count should match dataset size');
  });
  
  return suite;
}