/**
 * IdGeneratorTest.js - IdGenerator Class Tests
 * 
 * Tests for the IdGenerator utility class including UUID generation,
 * timestamp IDs, custom generators, and format validation.
 * 
 * Migrated from Section1Tests.js - runUtilityClassTests() (ID portion)
 */

/**
 * IdGenerator Tests
 * Tests for the IdGenerator utility class functionality
 */
function createIdGeneratorTestSuite() {
  const suite = new TestSuite('IdGenerator Tests');
  
  // IdGenerator basic functionality tests
  suite.addTest('testIdGeneratorBasicFunctionality', function() {
    TestFramework.assertEquals('function', typeof IdGenerator.generateUUID, 'Should have generateUUID method');
    TestFramework.assertEquals('function', typeof IdGenerator.generateTimestampId, 'Should have generateTimestampId method');
    TestFramework.assertEquals('function', typeof IdGenerator.generateShortId, 'Should have generateShortId method');
  });
  
  suite.addTest('testIdGeneratorUniqueness', function() {
    // Test that generated IDs are unique
    const id1 = IdGenerator.generateUUID();
    const id2 = IdGenerator.generateUUID();
    TestFramework.assertNotEquals(id1, id2, 'UUIDs should be unique');
    
    const timestampId1 = IdGenerator.generateTimestampId();
    const timestampId2 = IdGenerator.generateTimestampId();
    TestFramework.assertNotEquals(timestampId1, timestampId2, 'Timestamp IDs should be unique');
  });
  
  suite.addTest('testIdGeneratorFormats', function() {
    // Test ID format validation
    const uuid = IdGenerator.generateFallbackUUID(); // Use fallback for testing
    TestFramework.assertTrue(IdGenerator.isValidUUID(uuid), 'Generated UUID should be valid');
    
    const objectId = IdGenerator.generateObjectId();
    TestFramework.assertTrue(IdGenerator.isValidObjectId(objectId), 'Generated ObjectId should be valid');
    TestFramework.assertEquals(24, objectId.length, 'ObjectId should be 24 characters');
    
    const shortId = IdGenerator.generateShortId(8);
    TestFramework.assertEquals(8, shortId.length, 'Short ID should have specified length');
  });
  
  suite.addTest('testIdGeneratorCustomGenerator', function() {
    const customGen = IdGenerator.createCustomGenerator({ type: 'short', length: 6 });
    const customId = customGen();
    TestFramework.assertEquals(6, customId.length, 'Custom generator should respect length parameter');
    
    const prefixGen = IdGenerator.createCustomGenerator({ type: 'timestamp', prefix: 'test' });
    const prefixId = prefixGen();
    TestFramework.assertTrue(prefixId.startsWith('test_'), 'Should include prefix');
  });
  
  return suite;
}

/**
 * Register the IdGenerator test suite with the TestFramework
 */
function registerIdGeneratorTests() {
  const testFramework = new TestFramework();
  testFramework.registerTestSuite(createIdGeneratorTestSuite());
  return testFramework;
}

/**
 * Run IdGenerator Tests independently
 */
function runIdGeneratorTests() {
  GASDBLogger.info('Running IdGenerator Tests: ID Generation Functionality');
  
  const testFramework = registerIdGeneratorTests();
  const results = testFramework.runTestSuite('IdGenerator Tests');
  
  // Log summary
  GASDBLogger.info('IdGenerator Test Results:');
  GASDBLogger.info(results.getSummary());
  
  return results;
}
