/**
 * MongoDB Compatibility Integration Test Suite
 * Tests that query syntax and behaviour matches MongoDB standards
 */

function createMongoDBCompatibilityTestSuite() {
  const suite = new TestSuite('MongoDB Compatibility Integration');
  
  suite.addTest('testMongoDBFieldQueryCompatibility', function() {
    // Arrange
    const testUsers = MockQueryData.getTestUsers();
    const collection = createPopulatedTestCollection(testUsers);
    
    // Act & Assert - Test MongoDB-standard field queries
    
    // Direct field matching (MongoDB standard)
    const directMatch = collection.find({ name: 'John Smith' });
    AssertionUtilities.assertTrue(directMatch.length > 0, 'Direct field matching should work');
    
    // Nested field dot notation (MongoDB standard)
    const nestedMatch = collection.find({ 'profile.department': 'Engineering' });
    AssertionUtilities.assertTrue(nestedMatch.length > 0, 'Nested field dot notation should work');
    
    // Array field matching (MongoDB standard)
    const arrayMatch = collection.find({ 'profile.skills': 'JavaScript' });
    AssertionUtilities.assertTrue(arrayMatch.length > 0, 'Array field matching should work');
    
    // Boolean field matching (MongoDB standard)
    const booleanMatch = collection.find({ active: true });
    AssertionUtilities.assertTrue(booleanMatch.length > 0, 'Boolean field matching should work');
  });
  
  suite.addTest('testMongoDBComparisonOperatorCompatibility', function() {
    // Arrange
    const testUsers = MockQueryData.getTestUsers();
    const collection = createPopulatedTestCollection(testUsers);
    
    // Act & Assert - Test MongoDB-standard comparison operators
    
    // $eq operator (MongoDB standard)
    const eqMatch = collection.find({ age: { $eq: 30 } });
    eqMatch.forEach(user => {
      AssertionUtilities.assertEquals(user.age, 30, '$eq operator should match exactly');
    });
    
    // $gt operator (MongoDB standard)
    const gtMatch = collection.find({ age: { $gt: 35 } });
    gtMatch.forEach(user => {
      AssertionUtilities.assertTrue(user.age > 35, '$gt operator should match greater than');
    });
    
    // $lt operator (MongoDB standard)
    const ltMatch = collection.find({ age: { $lt: 25 } });
    ltMatch.forEach(user => {
      AssertionUtilities.assertTrue(user.age < 25, '$lt operator should match less than');
    });
  });
  
  suite.addTest('testMongoDBMethodSignatureCompatibility', function() {
    // Arrange
    const testUsers = MockQueryData.getTestUsers();
    const collection = createPopulatedTestCollection(testUsers);
    
    // Act & Assert - Test MongoDB-standard method signatures
    
    // find() method (MongoDB standard)
    const findAll = collection.find({});
    AssertionUtilities.assertTrue(Array.isArray(findAll), 'find({}) should return array');
    
    // findOne() method (MongoDB standard)
    const findOneResult = collection.findOne({ name: 'John Smith' });
    AssertionUtilities.assertTrue(findOneResult === null || typeof findOneResult === 'object', 
      'findOne should return object or null');
    
    // countDocuments() method (MongoDB standard)
    const countResult = collection.countDocuments({});
    AssertionUtilities.assertTrue(typeof countResult === 'number', 'countDocuments should return number');
    
    // updateOne() method (MongoDB standard)
    const updateResult = collection.updateOne({ name: 'John Smith' }, { updated: true });
    AssertionUtilities.assertTrue(typeof updateResult.modifiedCount === 'number', 
      'updateOne should return result with modifiedCount');
    
    // deleteOne() method (MongoDB standard)
    const deleteResult = collection.deleteOne({ name: 'Non-existent User' });
    AssertionUtilities.assertTrue(typeof deleteResult.deletedCount === 'number', 
      'deleteOne should return result with deletedCount');
  });
  
  return suite;
}