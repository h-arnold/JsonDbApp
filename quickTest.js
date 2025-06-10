/**
 * quickTest.js - Investigation of QueryEngine Logical Operator Issue
 * 
 * This file demonstrates the problem with logical operators in QueryEngine.
 * Run investigateLogicalOperatorIssue() in Apps Script to see the results.
 */

/**
 * Main investigation function - run this in Apps Script
 */
function investigateLogicalOperatorIssue() {
  const logger = GASDBLogger.createComponentLogger('QuickTest');
  
  try {
    logger.info('=== Starting QueryEngine Logical Operator Investigation ===');
    
    // Test data
    const testDocuments = [
      { _id: "doc1", name: "John", age: 30, active: true },
      { _id: "doc2", name: "Jane", age: 25, active: true },
      { _id: "doc3", name: "Bob", age: 35, active: false }
    ];
    
    // Create QueryEngine with $and and $or as "supported" operators
    const queryEngineWithLogical = new QueryEngine({
      validateQueries: true,
      supportedOperators: ['$eq', '$gt', '$lt', '$and', '$or']
    });
    
    logger.info('Test 1: Simple $and query');
    const andQuery = {
      $and: [
        { active: true },
        { age: { $gt: 25 } }
      ]
    };
    
    logger.info('Query:', { query: JSON.stringify(andQuery) });
    
    try {
      const andResults = queryEngineWithLogical.executeQuery(testDocuments, andQuery);
      logger.info('$and query results:', { 
        resultCount: andResults.length,
        results: andResults.map(doc => ({ _id: doc._id, name: doc.name, age: doc.age, active: doc.active }))
      });
      
      // Expected: Should return John (age 30, active true) but NOT Jane (age 25, not > 25)
      // Actual: Let's see what happens
      
    } catch (error) {
      logger.error('$and query failed:', { error: error.message });
    }
    
    logger.info('Test 2: Simple $or query');
    const orQuery = {
      $or: [
        { age: { $lt: 26 } },  // Should match Jane (25)
        { age: { $gt: 34 } }   // Should match Bob (35)
      ]
    };
    
    logger.info('Query:', { query: JSON.stringify(orQuery) });
    
    try {
      const orResults = queryEngineWithLogical.executeQuery(testDocuments, orQuery);
      logger.info('$or query results:', { 
        resultCount: orResults.length,
        results: orResults.map(doc => ({ _id: doc._id, name: doc.name, age: doc.age, active: doc.active }))
      });
      
      // Expected: Should return Jane (25) and Bob (35) but NOT John (30)
      // Actual: Let's see what happens
      
    } catch (error) {
      logger.error('$or query failed:', { error: error.message });
    }
    
    logger.info('Test 3: Implicit AND (current working behavior)');
    const implicitAndQuery = {
      active: true,
      age: { $gt: 25 }
    };
    
    logger.info('Query:', { query: JSON.stringify(implicitAndQuery) });
    
    try {
      const implicitResults = queryEngineWithLogical.executeQuery(testDocuments, implicitAndQuery);
      logger.info('Implicit AND query results:', { 
        resultCount: implicitResults.length,
        results: implicitResults.map(doc => ({ _id: doc._id, name: doc.name, age: doc.age, active: doc.active }))
      });
      
      // Expected: Should return John (age 30, active true) but NOT Jane (age 25, not > 25)
      // This should work correctly with current implementation
      
    } catch (error) {
      logger.error('Implicit AND query failed:', { error: error.message });
    }
    
    logger.info('Test 4: Demonstrating the root cause');
    
    // Let's manually trace what happens with $and
    logger.info('--- Manual trace of $and processing ---');
    
    const document = testDocuments[0]; // John
    logger.info('Testing document:', { doc: document });
    logger.info('Query fields:', { fields: Object.keys(andQuery) });
    
    // The current _matchDocument method does this:
    const queryFields = Object.keys(andQuery); // ["$and"]
    for (const field of queryFields) {
      logger.info('Processing field:', { field: field });
      
      // This calls _getFieldValue(document, "$and")
      // Which tries to find document["$and"] or document.$and
      const fieldValue = getFieldValueTrace(document, field);
      logger.info('Field value from document:', { fieldValue: fieldValue });
      
      const queryValue = andQuery[field];
      logger.info('Query value:', { queryValue: JSON.stringify(queryValue) });
      
      // Since fieldValue is undefined and queryValue is an array,
      // this will fail the equality check
      const matches = (fieldValue === queryValue);
      logger.info('Field matches:', { matches: matches });
    }
    
    logger.info('=== Investigation Complete ===');
    
  } catch (error) {
    logger.error('Investigation failed:', { 
      error: error.message,
      stack: error.stack
    });
  }
}

/**
 * Helper function to trace field value extraction
 */
function getFieldValueTrace(document, fieldPath) {
  if (!fieldPath || typeof fieldPath !== 'string') {
    return undefined;
  }

  const pathParts = fieldPath.split('.');
  let currentValue = document;

  for (const part of pathParts) {
    if (currentValue == null || typeof currentValue !== 'object') {
      return undefined;
    }
    currentValue = currentValue[part];
  }

  return currentValue;
}

/**
 * Additional test to show the difference between intended and actual behavior
 */
function demonstrateLogicalOperatorFlaw() {
  const logger = GASDBLogger.createComponentLogger('LogicalOperatorFlaw');
  
  logger.info('=== Demonstrating Logical Operator Implementation Flaw ===');
  
  const testDoc = { _id: "test", name: "Test", age: 30, active: true };
  
  // What the current implementation does with $and query
  const andQuery = { $and: [{ active: true }, { age: { $gt: 25 } }] };
  
  logger.info('Document:', { doc: testDoc });
  logger.info('$and Query:', { query: JSON.stringify(andQuery) });
  
  // Current implementation treats "$and" as a field name
  logger.info('Current implementation looks for field "$and" in document');
  logger.info('Document.$and =', { value: testDoc.$and }); // undefined
  logger.info('Query.$and =', { value: andQuery.$and }); // array of conditions
  logger.info('undefined === array? =', { result: testDoc.$and === andQuery.$and }); // false
  
  logger.info('Therefore, $and query fails to match even when it should');
  
  // What it SHOULD do:
  logger.info('--- What it SHOULD do ---');
  logger.info('1. Recognize "$and" as a logical operator');
  logger.info('2. Process each condition in the array');
  logger.info('3. Return true only if ALL conditions match');
  
  // For the $and: [{ active: true }, { age: { $gt: 25 } }]
  logger.info('Condition 1: active === true?', { result: testDoc.active === true });
  logger.info('Condition 2: age > 25?', { result: testDoc.age > 25 });
  logger.info('Both true? Should match:', { result: (testDoc.active === true) && (testDoc.age > 25) });
}

/**
 * Run both investigations
 */
function runQuickTest() {
  investigateLogicalOperatorIssue();
  demonstrateLogicalOperatorFlaw();
}
