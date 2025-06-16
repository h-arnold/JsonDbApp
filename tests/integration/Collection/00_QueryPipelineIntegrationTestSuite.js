/**
 * Query Pipeline Integration Test Suite
 * Tests Collection API → DocumentOperations → QueryEngine flow
 */

function createQueryPipelineIntegrationTestSuite() {
  const suite = new TestSuite('Query Pipeline Integration');
  
  suite.addTest('testCompleteQueryPipelineFieldMatching', function() {
    // Arrange - Create collection with test data
    const testUsers = MockQueryData.getTestUsers();
    const collection = createPopulatedTestCollection(testUsers);
    
    // Act - Execute field-based query through complete pipeline
    const engineeringUsers = collection.find({ 'profile.department': 'Engineering' });
    
    // Assert - Verify pipeline worked correctly
    AssertionUtilities.assertTrue(Array.isArray(engineeringUsers), 'Should return array');
    AssertionUtilities.assertTrue(engineeringUsers.length > 0, 'Should find engineering users');
    
    engineeringUsers.forEach(user => {
      AssertionUtilities.assertEquals(user.profile.department, 'Engineering', 
        'All returned users should be in Engineering');
    });
  });
  
  suite.addTest('testCompleteQueryPipelineComparisonOperators', function() {
    // Arrange
    const testUsers = MockQueryData.getTestUsers();
    const collection = createPopulatedTestCollection(testUsers);
    
    // Act - Test comparison operators through pipeline
    const seniorUsers = collection.find({ age: { $gt: 35 } });
    const exactAgeUsers = collection.find({ age: { $eq: 30 } });
    
    // Assert
    AssertionUtilities.assertTrue(Array.isArray(seniorUsers), 'Should return array for $gt query');
    AssertionUtilities.assertTrue(Array.isArray(exactAgeUsers), 'Should return array for $eq query');
    
    seniorUsers.forEach(user => {
      AssertionUtilities.assertTrue(user.age > 35, 'All users should be older than 35');
    });
    
    exactAgeUsers.forEach(user => {
      AssertionUtilities.assertEquals(user.age, 30, 'All users should be exactly 30 years old');
    });
  });
  
  suite.addTest('testCompleteQueryPipelineNestedFields', function() {
    // Arrange
    const testUsers = MockQueryData.getTestUsers();
    const collection = createPopulatedTestCollection(testUsers);
    
    // Act - Test nested field queries through pipeline
    const skilledUsers = collection.find({ 'profile.skills': 'JavaScript' });
    const londonUsers = collection.find({ 'address.city': 'London' });
    
    // Assert
    AssertionUtilities.assertTrue(Array.isArray(skilledUsers), 'Should return array for nested field query');
    AssertionUtilities.assertTrue(Array.isArray(londonUsers), 'Should return array for nested address query');
    
    skilledUsers.forEach(user => {
      AssertionUtilities.assertTrue(user.profile.skills.includes('JavaScript'), 
        'All users should have JavaScript skill');
    });
    
    londonUsers.forEach(user => {
      AssertionUtilities.assertEquals(user.address.city, 'London', 
        'All users should be in London');
    });
  });
  
  suite.addTest('testCompleteQueryPipelineUpdateOperations', function() {
    // Arrange
    const testUsers = MockQueryData.getTestUsers();
    const collection = createPopulatedTestCollection(testUsers);
    
    // Act - Test update through pipeline
    const updateResult = collection.updateOne(
      { 'profile.department': 'Engineering' },
      { name: 'Updated Engineer', email: 'updated@example.com' }
    );
    
    // Assert
    AssertionUtilities.assertEquals(updateResult.modifiedCount, 1, 'Should update one document');
    
    // Verify update took effect
    const updatedUser = collection.findOne({ name: 'Updated Engineer' });
    AssertionUtilities.assertNotNull(updatedUser, 'Should find updated user');
    AssertionUtilities.assertEquals(updatedUser.email, 'updated@example.com', 'Email should be updated');
  });
  
  suite.addTest('testCompleteQueryPipelineDeleteOperations', function() {
    // Arrange
    const testUsers = MockQueryData.getTestUsers();
    const collection = createPopulatedTestCollection(testUsers);
    const initialCount = collection.countDocuments({});
    
    // Act - Test delete through pipeline
    const deleteResult = collection.deleteOne({ 'profile.department': 'Marketing' });
    
    // Assert
    AssertionUtilities.assertEquals(deleteResult.deletedCount, 1, 'Should delete one document');
    
    // Verify deletion took effect
    const remainingCount = collection.countDocuments({});
    AssertionUtilities.assertEquals(remainingCount, initialCount - 1, 'Document count should decrease');
    
    const marketingUsers = collection.find({ 'profile.department': 'Marketing' });
    AssertionUtilities.assertTrue(marketingUsers.length < testUsers.filter(u => u.profile.department === 'Marketing').length, 
      'Should have fewer marketing users after deletion');
  });
  
  return suite;
}