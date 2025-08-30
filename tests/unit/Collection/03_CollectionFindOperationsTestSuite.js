/**
 * Creates a test suite for verifying the find operations of the Collection class.
 *
 * The suite includes tests for:
 * - Finding a single document in an empty collection.
 * - Finding a document by its ID.
 * - Field-based queries using findOne and find.
 * - Finding all documents in a collection.
 * - Matching documents by single and multiple fields, including nested fields (dot notation).
 * - Using comparison operators ($gt, $lt) in queries.
 * - Ensuring correct behaviour when no documents match the query.
 *
 * @function
 * @returns {TestSuite} A test suite containing unit tests for Collection find operations.
 */
/**
 * Test Collection find operations
 */
function createCollectionFindOperationsTestSuite() {
  const suite = new TestSuite('Collection Find Operations');
  
  suite.addTest('testCollectionFindOneEmpty', function() {
    // Arrange & Act - Use proper helper to create registered collection
    const collection = createTestCollection('findOneEmptyTestCollection');
    
    // Test findOne on empty collection
    const result = collection.findOne({});
    TestFramework.assertNull(result, 'findOne on empty collection should return null');
  });
  
  suite.addTest('testCollectionFindOneById', function() {
    // Arrange & Act - Use proper helper to create registered collection
    const collection = createTestCollection('findOneByIdTestCollection');
    
    // Insert test documents
    const doc1 = collection.insertOne({ name: 'First Doc', value: 100 });
    const doc2 = collection.insertOne({ name: 'Second Doc', value: 200 });
    
    // Test findOne by ID
    const foundDoc1 = collection.findOne({ _id: doc1.insertedId });
    TestFramework.assertNotNull(foundDoc1, 'Should find first document by ID');
    TestFramework.assertEquals('First Doc', foundDoc1.name, 'Should return correct document');
  });
  
  suite.addTest('testCollectionFindOneUnsupportedQuery', function() {
    // Arrange & Act - Use proper helper to create registered collection
    const collection = createTestCollection('findOneUnsupportedTestCollection');
    
    // Insert test document
    collection.insertOne({ name: 'Test', value: 100 });
    
    // Test field-based query - should work with QueryEngine
    const result = collection.findOne({ name: 'Test' });
    TestFramework.assertNotNull(result, 'Should find document by field-based query');
    TestFramework.assertEquals('Test', result.name, 'Should return correct document');
    
    // Test non-matching query
    const noResult = collection.findOne({ name: 'NonExistent' });
    TestFramework.assertNull(noResult, 'Should return null for non-matching query');
  });
  
  suite.addTest('testCollectionFindEmpty', function() {
    // Arrange & Act - Use proper helper to create registered collection
    const collection = createTestCollection('findEmptyTestCollection');
    
    // Test find on empty collection
    const results = collection.find({});
    TestFramework.assertArrayEquals([], results, 'find on empty collection should return empty array');
    TestFramework.assertTrue(Array.isArray(results), 'find should always return an array');
  });
  
  suite.addTest('testCollectionFindAll', function() {
    // Arrange & Act - Use proper helper to create registered collection
    const collection = createTestCollection('findAllTestCollection');
    
    // Insert multiple test documents
    collection.insertOne({ name: 'Doc A', value: 100, category: 'test' });
    collection.insertOne({ name: 'Doc B', value: 200, category: 'prod' });
    collection.insertOne({ name: 'Doc C', value: 300, category: 'test' });
    
    // Test find all documents
    const allDocs = collection.find({});
    TestFramework.assertEquals(3, allDocs.length, 'Should find all 3 documents');
    TestFramework.assertTrue(Array.isArray(allDocs), 'find should return an array');
  });
  
  suite.addTest('testCollectionFindUnsupportedQuery', function() {
    // Arrange & Act - Use proper helper to create registered collection
    const collection = createTestCollection('findUnsupportedTestCollection');
    
    // Insert test documents
    collection.insertOne({ name: 'Test', value: 100 });
    collection.insertOne({ name: 'Other', value: 200 });
    
    // Test field-based query - should work with QueryEngine
    const results = collection.find({ name: 'Test' });
    TestFramework.assertEquals(1, results.length, 'Should find 1 document by field-based query');
    TestFramework.assertEquals('Test', results[0].name, 'Should return correct document');
    
    // Test non-matching query
    const noResults = collection.find({ name: 'NonExistent' });
    TestFramework.assertEquals(0, noResults.length, 'Should return empty array for non-matching query');
  });
  
  // RED PHASE: Collection API Enhancement Tests - Field-based queries
  suite.addTest('testCollectionFindByFieldMatching', function() {
    // Arrange & Act - Use proper helper to create registered collection
    const collection = createTestCollection('findByFieldTestCollection');
    
    // Insert test documents with various field types
    collection.insertOne({ name: 'Alice', age: 30, active: true, department: 'Engineering' });
    collection.insertOne({ name: 'Bob', age: 25, active: false, department: 'Marketing' });
    collection.insertOne({ name: 'Charlie', age: 30, active: true, department: 'Engineering' });
    
    // Act & Assert - Should find documents by exact field match
    const engineeringDocs = collection.find({ department: 'Engineering' });
    TestFramework.assertEquals(2, engineeringDocs.length, 'Should find 2 Engineering documents');
    TestFramework.assertEquals('Alice', engineeringDocs[0].name, 'First result should be Alice');
    TestFramework.assertEquals('Charlie', engineeringDocs[1].name, 'Second result should be Charlie');
    
    // Test numeric field matching
    const age30Docs = collection.find({ age: 30 });
    TestFramework.assertEquals(2, age30Docs.length, 'Should find 2 documents with age 30');
    
    // Test boolean field matching
    const activeDocs = collection.find({ active: true });
    TestFramework.assertEquals(2, activeDocs.length, 'Should find 2 active documents');
  });
  
  suite.addTest('testCollectionFindByMultipleFields', function() {
    // Arrange & Act - Use proper helper to create registered collection
    const collection = createTestCollection('findMultiFieldTestCollection');
    
    // Insert test documents
    collection.insertOne({ name: 'Alice', age: 30, active: true, department: 'Engineering' });
    collection.insertOne({ name: 'Bob', age: 30, active: false, department: 'Engineering' });
    collection.insertOne({ name: 'Charlie', age: 25, active: true, department: 'Engineering' });
    
    // Act & Assert - Should find documents matching multiple fields (implicit AND)
    const results = collection.find({ age: 30, active: true, department: 'Engineering' });
    TestFramework.assertEquals(1, results.length, 'Should find 1 document matching all criteria');
    TestFramework.assertEquals('Alice', results[0].name, 'Should find Alice');
  });
  
  suite.addTest('testCollectionFindByNestedField', function() {
    // Arrange & Act - Use proper helper to create registered collection
    const collection = createTestCollection('findNestedFieldTestCollection');
    
    // Insert documents with nested fields
    collection.insertOne({ 
      name: 'Alice', 
      profile: { email: 'alice@company.com', yearsOfService: 5 },
      address: { city: 'London', country: 'UK' }
    });
    collection.insertOne({ 
      name: 'Bob', 
      profile: { email: 'bob@company.com', yearsOfService: 3 },
      address: { city: 'Manchester', country: 'UK' }
    });
    
    // Act & Assert - Should find documents by nested field (dot notation)
    const londonDocs = collection.find({ 'address.city': 'London' });
    TestFramework.assertEquals(1, londonDocs.length, 'Should find 1 document in London');
    TestFramework.assertEquals('Alice', londonDocs[0].name, 'Should find Alice');
    
    // Test nested numeric field
    const experiencedDocs = collection.find({ 'profile.yearsOfService': 5 });
    TestFramework.assertEquals(1, experiencedDocs.length, 'Should find 1 experienced document');
    TestFramework.assertEquals('Alice', experiencedDocs[0].name, 'Should find Alice');
  });
  
  suite.addTest('testCollectionFindByComparisonOperators', function() {
    // Arrange & Act - Use proper helper to create registered collection
    const collection = createTestCollection('findComparisonTestCollection');
    
    // Insert test documents with numeric values
    collection.insertOne({ name: 'Alice', score: 85, joinDate: new Date('2020-01-15') });
    collection.insertOne({ name: 'Bob', score: 92, joinDate: new Date('2021-03-20') });
    collection.insertOne({ name: 'Charlie', score: 78, joinDate: new Date('2019-11-10') });
    
    // Act & Assert - Should find documents using comparison operators
    const highScoreDocs = collection.find({ score: { $gt: 80 } });
    TestFramework.assertEquals(2, highScoreDocs.length, 'Should find 2 documents with score > 80');
    
    const lowScoreDocs = collection.find({ score: { $lt: 80 } });
    TestFramework.assertEquals(1, lowScoreDocs.length, 'Should find 1 document with score < 80');
    TestFramework.assertEquals('Charlie', lowScoreDocs[0].name, 'Should find Charlie');
    
    // Test date comparison
    const recentDocs = collection.find({ joinDate: { $gt: new Date('2020-06-01') } });
    // Debug: Check what we actually found and the date types
    if (recentDocs.length !== 1) {
      console.log('Date comparison test failing. Found documents:', recentDocs.length);
      console.log('All documents:');
      const allDocs = collection.find({});
      allDocs.forEach(doc => {
        console.log(`  ${doc.name}: joinDate = ${doc.joinDate} (type: ${typeof doc.joinDate}) (instanceof Date: ${doc.joinDate instanceof Date})`);
      });
      console.log('Query date:', new Date('2020-06-01'), '(type:', typeof new Date('2020-06-01'), ')');
      
      // Check if our date conversion method is working
      console.log('Expected: Bob (2021-03-20) should be > query date (2020-06-01)');
      const bobDoc = allDocs.find(doc => doc.name === 'Bob');
      if (bobDoc) {
        console.log(`Bob's actual comparison: ${bobDoc.joinDate} > ${new Date('2020-06-01')} = ${bobDoc.joinDate > new Date('2020-06-01')}`);
      }
    }
    TestFramework.assertEquals(1, recentDocs.length, 'Should find 1 document with recent join date');
    TestFramework.assertEquals('Bob', recentDocs[0].name, 'Should find Bob');
  });
  
  suite.addTest('testCollectionFindOneByFieldMatching', function() {
    // Arrange & Act - Use proper helper to create registered collection
    const collection = createTestCollection('findOneFieldTestCollection');
    
    // Insert test documents
    collection.insertOne({ name: 'Alice', department: 'Engineering', priority: 1 });
    collection.insertOne({ name: 'Bob', department: 'Engineering', priority: 2 });
    collection.insertOne({ name: 'Charlie', department: 'Marketing', priority: 1 });
    
    // Act & Assert - Should find first matching document
    const engineeringDoc = collection.findOne({ department: 'Engineering' });
    TestFramework.assertNotNull(engineeringDoc, 'Should find an Engineering document');
    TestFramework.assertEquals('Engineering', engineeringDoc.department, 'Should return Engineering document');
    TestFramework.assertTrue(['Alice', 'Bob'].includes(engineeringDoc.name), 'Should be Alice or Bob');
    
    // Test findOne with multiple field criteria
    const specificDoc = collection.findOne({ department: 'Engineering', priority: 2 });
    TestFramework.assertNotNull(specificDoc, 'Should find specific document');
    TestFramework.assertEquals('Bob', specificDoc.name, 'Should find Bob');
    
    // Test findOne that returns null
    /**
     * Retrieves a single document from the collection where the department is 'NonExistent'.
     * If no matching document is found, returns null.
     *
     * @type {Object|null}
     */
    const nonExistentDoc = collection.findOne({ department: 'NonExistent' });
    TestFramework.assertNull(nonExistentDoc, 'Should return null for non-existent criteria');
  });
  
  return suite;
}