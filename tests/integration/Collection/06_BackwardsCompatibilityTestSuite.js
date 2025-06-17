/**
 * Backwards Compatibility Integration Test Suite
 * Tests that existing ID-based query patterns continue to work
 */

function createBackwardsCompatibilityTestSuite() {
  const suite = new TestSuite('Backwards Compatibility Integration');
  
  suite.addTest('testSection5IdBasedQueriesStillWork', function() {
    // Arrange
    const testUsers = MockQueryData.getTestUsers();
    const collection = createPopulatedTestCollection(testUsers);
    
    // Act & Assert - Test Section 5 ID-based patterns still work
    
    // findOne by ID (Section 5 pattern)
    const userById = collection.findOne({ _id: 'user1' });
    AssertionUtilities.assertNotNull(userById, 'Should find user by ID');
    AssertionUtilities.assertEquals(userById._id, 'user1', 'Should return correct user');
    
    // updateOne by ID (Section 5 pattern)
    const updateResult = collection.updateOne({ _id: 'user1' }, { updated: true });
    AssertionUtilities.assertEquals(updateResult.modifiedCount, 1, 'Should update user by ID');
    
    // deleteOne by ID (Section 5 pattern)
    const deleteResult = collection.deleteOne({ _id: 'user2' });
    AssertionUtilities.assertEquals(deleteResult.deletedCount, 1, 'Should delete user by ID');
    
    // Verify deletion
    const deletedUser = collection.findOne({ _id: 'user2' });
    AssertionUtilities.assertNull(deletedUser, 'Deleted user should not be found');
  });
  
  suite.addTest('testSection5AndSection6PatternsCoexist', function() {
    // Arrange
    const testUsers = MockQueryData.getTestUsers();
    const collection = createPopulatedTestCollection(testUsers);
    
    // Act & Assert - Test that Section 5 and Section 6 patterns work together
    
    // Section 5: Find by ID
    const userById = collection.findOne({ _id: 'user1' });
    AssertionUtilities.assertNotNull(userById, 'Section 5 ID query should work');
    
    // Section 6: Find by field
    const userByName = collection.findOne({ name: userById.name });
    AssertionUtilities.assertNotNull(userByName, 'Section 6 field query should work');
    AssertionUtilities.assertEquals(userById._id, userByName._id, 'Should find same user');
    
    // Mixed operations
    const engineeringCount = collection.countDocuments({ 'profile.department': 'Engineering' });
    const totalCount = collection.countDocuments({});
    
    AssertionUtilities.assertTrue(engineeringCount <= totalCount, 
      'Engineering count should not exceed total');
    AssertionUtilities.assertTrue(engineeringCount >= 0, 'Engineering count should be non-negative');
  });
  
  return suite;
}