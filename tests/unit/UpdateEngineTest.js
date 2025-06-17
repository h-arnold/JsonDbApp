/**
 * UpdateEngineTest.js - UpdateEngine Class Tests (Section 7 - Red Phase)
 *
 * Comprehensive tests for the UpdateEngine class including:
 * - Basic update operator application
 * - Nested field updates
 * - Array update operations
 * - Error handling for invalid operators
 *
 * Following TDD Red-Green-Refactor cycle for Section 7 implementation
 */

const UPDATE_ENGINE_TEST_DATA = {
  testEngine: null
};

/**
 * Setup test environment for UpdateEngine
 */
function setupUpdateEngineTestEnvironment() {
  UPDATE_ENGINE_TEST_DATA.testEngine = new UpdateEngine();
}

/**
 * Cleanup test environment
 */
function cleanupUpdateEngineTestEnvironment() {
  UPDATE_ENGINE_TEST_DATA.testEngine = null;
}

/**
 * Creates the UpdateEngine test suite with all operator tests
 */
function createUpdateEngineTestSuite() {
  const suite = new TestSuite('UpdateEngine Tests');

  suite.setBeforeAll(function() {
    setupUpdateEngineTestEnvironment();
  });

  suite.setAfterAll(function() {
    cleanupUpdateEngineTestEnvironment();
  });

  suite.addTest('testUpdateEngineSetStringField', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { name: 'Alice' };
    const update = { $set: { name: 'Bob' } };
    const result = engine.applyOperators(doc, update);
    TestFramework.assertEquals('Bob', result.name, 'Should update string field');
    TestFramework.assertEquals('Alice', doc.name, 'Original document should be unmodified');
  });

  suite.addTest('testUpdateEngineSetCreatesDeepPath', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = {};
    const update = { $set: { 'a.b.c': 5 } };
    const result = engine.applyOperators(doc, update);
    TestFramework.assertEquals(5, result.a.b.c, 'Should create deep path and set value');
  });

  suite.addTest('testUpdateEngineIncPositive', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { count: 1 };
    const update = { $inc: { count: 2 } };
    const result = engine.applyOperators(doc, update);
    TestFramework.assertEquals(3, result.count, 'Should increment positive value');
  });

  suite.addTest('testUpdateEngineIncNegative', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { count: 5 };
    const update = { $inc: { count: -2 } };
    const result = engine.applyOperators(doc, update);
    TestFramework.assertEquals(3, result.count, 'Should increment negative value');
  });

  suite.addTest('testUpdateEngineMulNumber', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { count: 2 };
    const update = { $mul: { count: 3 } };
    const result = engine.applyOperators(doc, update);
    TestFramework.assertEquals(6, result.count, 'Should multiply numeric value');
  });

  suite.addTest('testUpdateEngineMinNumeric', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { value: 10 };
    const update = { $min: { value: 5 } };
    const result = engine.applyOperators(doc, update);
    TestFramework.assertEquals(5, result.value, 'Should set minimum numeric value');
  });

  suite.addTest('testUpdateEngineMaxValue', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { value: 10 };
    const update = { $max: { value: 15 } };
    const result = engine.applyOperators(doc, update);
    TestFramework.assertEquals(15, result.value, 'Should set maximum numeric value');
  });

  suite.addTest('testUpdateEngineUnsetSimpleField', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { a: 1, b: 2 };
    const update = { $unset: { a: '' } };
    const result = engine.applyOperators(doc, update);
    TestFramework.assertUndefined(result.a, 'Should unset simple field');
    TestFramework.assertEquals(2, result.b, 'Other fields should remain');
  });

  suite.addTest('testUpdateEngineUnsetNestedField', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { a: { b: 2, c: 3 } };
    const update = { $unset: { 'a.b': '' } };
    const result = engine.applyOperators(doc, update);
    TestFramework.assertUndefined(result.a.b, 'Should unset nested field');
    TestFramework.assertEquals(3, result.a.c, 'Other nested fields should remain');
  });

  suite.addTest('testUpdateEnginePushArrayValue', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { arr: [1, 2] };
    const update = { $push: { arr: 3 } };
    const result = engine.applyOperators(doc, update);
    TestFramework.assertArrayEquals([1, 2, 3], result.arr, 'Should push value into array');
  });

  suite.addTest('testUpdateEnginePullArrayValue', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { arr: [1, 2, 3, 2] };
    const update = { $pull: { arr: 2 } };
    const result = engine.applyOperators(doc, update);
    TestFramework.assertArrayEquals([1, 3], result.arr, 'Should pull all matching values');
  });

  suite.addTest('testUpdateEngineAddToSetUnique', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { arr: [1, 2] };
    const update = { $addToSet: { arr: 2 } };
    const result = engine.applyOperators(doc, update);
    TestFramework.assertArrayEquals([1, 2], result.arr, 'Should not add duplicate to set');
  });

  suite.addTest('testUpdateEngineInvalidOperatorThrows', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { a: 1 };
    const update = { $foo: { a: 2 } };
    TestFramework.assertThrows(function() {
      engine.applyOperators(doc, update);
    }, ErrorHandler.ErrorTypes.INVALID_QUERY, 'Should throw invalid query error for unknown operator');
  });

  // New Field Modification Tests
  suite.addTest('testSetVariousDataTypes', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const originalDoc = { a: 1 };
    const update = { $set: { str: 'text', num: 123, bool: true, arr: [1, 2], obj: { k: 'v' }, n: null } };
    const result = engine.applyOperators(originalDoc, update);

    TestFramework.assertEquals('text', result.str, 'Should set string');
    TestFramework.assertEquals(123, result.num, 'Should set number');
    TestFramework.assertTrue(result.bool, 'Should set boolean true');
    TestFramework.assertArrayEquals([1, 2], result.arr, 'Should set array');
    TestFramework.assertEquals('v', result.obj.k, 'Should set object');
    TestFramework.assertNull(result.n, 'Should set null');
    TestFramework.assertEquals(1, result.a, 'Original field unrelated to $set should remain');
    TestFramework.assertEquals(1, originalDoc.a, 'Original document should be unmodified');
  });

  suite.addTest('testSetOnNonExistentTopLevelField', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { existing: 'value' };
    const update = { $set: { newField: 'newValue' } };
    const result = engine.applyOperators(doc, update);

    TestFramework.assertEquals('newValue', result.newField, 'Should create and set new top-level field');
    TestFramework.assertEquals('value', result.existing, 'Existing field should remain');
  });

  suite.addTest('testIncOnNonNumericThrows', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { val: 'text' };
    const update = { $inc: { val: 1 } };

    TestFramework.assertThrows(function() {
      engine.applyOperators(doc, update);
    }, ErrorHandler.ErrorTypes.INVALID_QUERY, 'Should throw when $inc target is non-numeric');
  });

  suite.addTest('testMulOnNonNumericThrows', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { val: 'text' };
    const update = { $mul: { val: 2 } };

    TestFramework.assertThrows(function() {
      engine.applyOperators(doc, update);
    }, ErrorHandler.ErrorTypes.INVALID_QUERY, 'Should throw when $mul target is non-numeric');
  });

  suite.addTest('testMinOnNonComparableThrows', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc1 = { val: 'text' };
    const update1 = { $min: { val: 1 } };
    TestFramework.assertThrows(function() {
      engine.applyOperators(doc1, update1);
    }, ErrorHandler.ErrorTypes.INVALID_QUERY, 'Should throw $min if current value is non-numeric string and new value is number');

    const doc2 = { val: { a: 1 } };
    const update2 = { $min: { val: 10 } };
    TestFramework.assertThrows(function() {
      engine.applyOperators(doc2, update2);
    }, ErrorHandler.ErrorTypes.INVALID_QUERY, 'Should throw $min if current value is object and new value is number');
  });

  suite.addTest('testMaxOnNonComparableThrows', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc1 = { val: 'text' };
    const update1 = { $max: { val: 1 } };
    TestFramework.assertThrows(function() {
      engine.applyOperators(doc1, update1);
    }, ErrorHandler.ErrorTypes.INVALID_QUERY, 'Should throw $max if current value is non-numeric string and new value is number');

    const doc2 = { val: { a: 1 } };
    const update2 = { $max: { val: 10 } };
    TestFramework.assertThrows(function() {
      engine.applyOperators(doc2, update2);
    }, ErrorHandler.ErrorTypes.INVALID_QUERY, 'Should throw $max if current value is object and new value is number');
  });

  suite.addTest('testMultipleOperatorsInSingleUpdate', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { a: 1, b: 10, d: 'original' };
    const update = { $set: { c: 3, d: 'changed' }, $inc: { a: 1 }, $mul: { b: 2 } };
    const result = engine.applyOperators(doc, update);

    TestFramework.assertEquals(2, result.a, '$inc should be applied');
    TestFramework.assertEquals(20, result.b, '$mul should be applied');
    TestFramework.assertEquals(3, result.c, '$set should create new field');
    TestFramework.assertEquals('changed', result.d, '$set should update existing field');
  });

  suite.addTest('testSetCanChangeFieldType', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { field: 123 };
    const update = { $set: { field: 'new string value' } };
    const result = engine.applyOperators(doc, update);

    TestFramework.assertEquals('new string value', result.field, 'Field value should be updated');
    TestFramework.assertEquals('string', typeof result.field, 'Field type should change from number to string');
  });

  suite.addTest('testNumericOperatorsPreserveNumericType', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { num1: 1.5, num2: 5 };
    const update = { $inc: { num1: 1, num2: 2.5 } };
    const result = engine.applyOperators(doc, update);

    TestFramework.assertEquals(2.5, result.num1, '$inc 1.5 + 1 should be 2.5');
    TestFramework.assertEquals('number', typeof result.num1, 'Type should remain number');
    TestFramework.assertEquals(7.5, result.num2, '$inc 5 + 2.5 should be 7.5');
    TestFramework.assertEquals('number', typeof result.num2, 'Type should remain number');
  });

  suite.addTest('testSetNullAndUndefinedBehaviour', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { a: 1, b: 2 };
    const update = { $set: { a: null, c: undefined } }; // Note: 'b' is not set to undefined, 'c' is new
    const result = engine.applyOperators(doc, update);

    TestFramework.assertNull(result.a, 'Field "a" should be set to null');
    TestFramework.assertEquals(2, result.b, 'Field "b" should be untouched');
    TestFramework.assertTrue(Object.prototype.hasOwnProperty.call(result, 'c'), 'Field "c" should exist');
    TestFramework.assertUndefined(result.c, 'Field "c" should be set to undefined');
  });

  suite.addTest('testIncExtremeValues', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc1 = { val: Number.MAX_SAFE_INTEGER };
    const update1 = { $inc: { val: 1 } };
    const result1 = engine.applyOperators(doc1, update1);
    TestFramework.assertEquals(Number.MAX_SAFE_INTEGER + 1, result1.val, 'Should increment MAX_SAFE_INTEGER correctly');

    const doc2 = { val: Number.MAX_VALUE };
    const update2 = { $inc: { val: Number.MAX_VALUE } }; // This will result in Infinity
    const result2 = engine.applyOperators(doc2, update2);
    TestFramework.assertEquals(Infinity, result2.val, 'Should handle incrementing by MAX_VALUE resulting in Infinity');

    const doc3 = { val: -Number.MAX_SAFE_INTEGER };
    const update3 = { $inc: { val: -1 } };
    const result3 = engine.applyOperators(doc3, update3);
    TestFramework.assertEquals(-Number.MAX_SAFE_INTEGER - 1, result3.val, 'Should decrement MIN_SAFE_INTEGER correctly');
  });

  suite.addTest('testMinOnEqualValueNoChange', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { val: 5 };
    const update = { $min: { val: 5 } };
    const result = engine.applyOperators(doc, update);
    TestFramework.assertEquals(5, result.val, '$min with equal value should not change field');
  });

  suite.addTest('testMaxOnEqualValueNoChange', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { val: 10 };
    const update = { $max: { val: 10 } };
    const result = engine.applyOperators(doc, update);
    TestFramework.assertEquals(10, result.val, '$max with equal value should not change field');
  });

  suite.addTest('testEmptyUpdateObjectThrows', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { a: 1 };
    const update = {};
    TestFramework.assertThrows(function() {
      engine.applyOperators(doc, update);
    }, ErrorHandler.ErrorTypes.INVALID_QUERY, 'Should throw for an empty update object');
  });

  suite.addTest('testUpdateObjectWithNoDollarOperatorsThrows', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { a: 1 };
    const update = { a: 2, b: 3 }; // No $ operators
    TestFramework.assertThrows(function() {
      engine.applyOperators(doc, update);
    }, ErrorHandler.ErrorTypes.INVALID_QUERY, 'Should throw if update object contains no $ operators');
  });

  // Field Removal Tests
  suite.addTest('testUnsetSimpleField', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { name: 'Alice', age: 30, city: 'London' };
    const update = { $unset: { age: '' } };
    const result = engine.applyOperators(doc, update);
    
    TestFramework.assertEquals('Alice', result.name, 'Name field should remain unchanged');
    TestFramework.assertEquals('London', result.city, 'City field should remain unchanged');
    TestFramework.assertUndefined(result.age, 'Age field should be removed');
    TestFramework.assertFalse(Object.prototype.hasOwnProperty.call(result, 'age'), 'Age property should not exist');
    TestFramework.assertEquals(30, doc.age, 'Original document should be unmodified');
  });

  suite.addTest('testUnsetNestedField', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { 
      user: { 
        profile: { name: 'Bob', email: 'bob@example.com' },
        settings: { theme: 'dark' }
      },
      status: 'active'
    };
    const update = { $unset: { 'user.profile.email': '' } };
    const result = engine.applyOperators(doc, update);
    
    TestFramework.assertEquals('Bob', result.user.profile.name, 'Nested name should remain');
    TestFramework.assertEquals('dark', result.user.settings.theme, 'Other nested objects should remain');
    TestFramework.assertEquals('active', result.status, 'Top-level fields should remain');
    TestFramework.assertUndefined(result.user.profile.email, 'Nested email field should be removed');
    TestFramework.assertFalse(
      Object.prototype.hasOwnProperty.call(result.user.profile, 'email'), 
      'Email property should not exist in nested object'
    );
  });

  suite.addTest('testUnsetNonExistentFieldNoError', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { a: 1, b: 2 };
    const update = { $unset: { nonExistent: '', 'nested.field': '' } };
    const result = engine.applyOperators(doc, update);
    
    TestFramework.assertEquals(1, result.a, 'Existing field a should remain');
    TestFramework.assertEquals(2, result.b, 'Existing field b should remain');
    TestFramework.assertUndefined(result.nonExistent, 'Non-existent field should remain undefined');
    TestFramework.assertUndefined(result.nested, 'Non-existent nested path should remain undefined');
    // Should not throw an error for attempting to unset non-existent fields
  });

  suite.addTest('testUnsetArrayElementByIndex', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { items: ['apple', 'banana', 'cherry'], count: 3 };
    const update = { $unset: { 'items.1': '' } }; // Remove second element
    const result = engine.applyOperators(doc, update);
    
    TestFramework.assertEquals('apple', result.items[0], 'First array element should remain');
    TestFramework.assertUndefined(result.items[1], 'Second array element should be undefined');
    TestFramework.assertEquals('cherry', result.items[2], 'Third array element should remain');
    TestFramework.assertEquals(3, result.items.length, 'Array length should remain unchanged');
    TestFramework.assertEquals(3, result.count, 'Other fields should remain unchanged');
  });

  suite.addTest('testUnsetDeepNestedPath', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { 
      level1: { 
        level2: { 
          level3: { 
            level4: { 
              target: 'remove me', 
              keep: 'preserve me' 
            },
            otherLevel4: 'should remain'
          },
          otherLevel3: 'should remain'
        },
        otherLevel2: 'should remain'
      },
      topLevel: 'should remain'
    };
    const update = { $unset: { 'level1.level2.level3.level4.target': '' } };
    const result = engine.applyOperators(doc, update);
    
    TestFramework.assertEquals('preserve me', result.level1.level2.level3.level4.keep, 'Keep field should remain');
    TestFramework.assertEquals('should remain', result.level1.level2.level3.otherLevel4, 'Other level4 should remain');
    TestFramework.assertEquals('should remain', result.level1.level2.otherLevel3, 'Other level3 should remain');
    TestFramework.assertEquals('should remain', result.level1.otherLevel2, 'Other level2 should remain');
    TestFramework.assertEquals('should remain', result.topLevel, 'Top level field should remain');
    TestFramework.assertUndefined(result.level1.level2.level3.level4.target, 'Deep nested target should be removed');
    TestFramework.assertFalse(
      Object.prototype.hasOwnProperty.call(result.level1.level2.level3.level4, 'target'),
      'Target property should not exist in deep nested object'
    );
  });

  suite.addTest('testDocumentStructureAfterUnset', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { 
      a: 1, 
      b: { x: 10, y: 20 }, 
      c: [1, 2, 3], 
      d: 'text' 
    };
    const update = { $unset: { 'b.x': '', 'c.1': '', d: '' } };
    const result = engine.applyOperators(doc, update);
    
    // Verify overall document structure integrity
    TestFramework.assertEquals(1, result.a, 'Top-level field a should remain');
    TestFramework.assertTrue(typeof result.b === 'object' && result.b !== null, 'Object b should remain an object');
    TestFramework.assertTrue(Array.isArray(result.c), 'Array c should remain an array');
    TestFramework.assertUndefined(result.d, 'Field d should be removed');
    
    // Verify nested object structure
    TestFramework.assertUndefined(result.b.x, 'Nested field b.x should be removed');
    TestFramework.assertEquals(20, result.b.y, 'Nested field b.y should remain');
    TestFramework.assertEquals(1, Object.keys(result.b).length, 'Object b should have only one property');
    
    // Verify array structure
    TestFramework.assertEquals(1, result.c[0], 'Array element 0 should remain');
    TestFramework.assertUndefined(result.c[1], 'Array element 1 should be undefined');
    TestFramework.assertEquals(3, result.c[2], 'Array element 2 should remain');
    TestFramework.assertEquals(3, result.c.length, 'Array length should be preserved');
    
    // Verify original document integrity
    TestFramework.assertEquals(10, doc.b.x, 'Original document nested field should be unmodified');
    TestFramework.assertEquals(2, doc.c[1], 'Original document array should be unmodified');
    TestFramework.assertEquals('text', doc.d, 'Original document field should be unmodified');
  });

  // Array Update Tests
  suite.addTest('testPushSingleValue', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { tags: ['javascript', 'mongodb'] };
    const update = { $push: { tags: 'database' } };
    const result = engine.applyOperators(doc, update);
    
    TestFramework.assertArrayEquals(['javascript', 'mongodb', 'database'], result.tags, 'Should push single value to array');
    TestFramework.assertArrayEquals(['javascript', 'mongodb'], doc.tags, 'Original document should remain unmodified');
  });

  suite.addTest('testPushMultipleValues', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { scores: [10, 20] };
    const update = { $push: { scores: { $each: [30, 40, 50] } } };
    const result = engine.applyOperators(doc, update);
    
    TestFramework.assertArrayEquals([10, 20, 30, 40, 50], result.scores, 'Should push multiple values using $each');
    TestFramework.assertArrayEquals([10, 20], doc.scores, 'Original document should remain unmodified');
  });

  suite.addTest('testPullByValueEquality', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { numbers: [1, 2, 3, 2, 4, 2] };
    const update = { $pull: { numbers: 2 } };
    const result = engine.applyOperators(doc, update);
    
    TestFramework.assertArrayEquals([1, 3, 4], result.numbers, 'Should remove all instances of value 2');
    TestFramework.assertArrayEquals([1, 2, 3, 2, 4, 2], doc.numbers, 'Original document should remain unmodified');
  });

  suite.addTest('testAddToSetUniqueOnly', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { categories: ['tech', 'news'] };
    const update = { $addToSet: { categories: 'sports' } };
    const result = engine.applyOperators(doc, update);
    
    TestFramework.assertArrayEquals(['tech', 'news', 'sports'], result.categories, 'Should add unique value to set');
    TestFramework.assertArrayEquals(['tech', 'news'], doc.categories, 'Original document should remain unmodified');
  });

  suite.addTest('testAddToSetMultipleUnique', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { tags: ['red', 'blue'] };
    const update = { $addToSet: { tags: { $each: ['green', 'yellow', 'purple'] } } };
    const result = engine.applyOperators(doc, update);
    
    TestFramework.assertArrayEquals(['red', 'blue', 'green', 'yellow', 'purple'], result.tags, 'Should add multiple unique values using $each');
    TestFramework.assertArrayEquals(['red', 'blue'], doc.tags, 'Original document should remain unmodified');
  });

  suite.addTest('testAddToSetDuplicatesIgnored', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { items: ['apple', 'banana', 'cherry'] };
    const update1 = { $addToSet: { items: 'banana' } }; // Duplicate
    const result1 = engine.applyOperators(doc, update1);
    
    TestFramework.assertArrayEquals(['apple', 'banana', 'cherry'], result1.items, 'Should ignore duplicate single value');
    
    const update2 = { $addToSet: { items: { $each: ['apple', 'date', 'banana', 'elderberry'] } } }; // Mix of duplicates and new
    const result2 = engine.applyOperators(doc, update2);
    
    TestFramework.assertArrayEquals(['apple', 'banana', 'cherry', 'date', 'elderberry'], result2.items, 'Should ignore duplicates in $each array');
  });

  suite.addTest('testPushNestedArray', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { matrix: [[1, 2], [3, 4]] };
    const update = { $push: { matrix: [5, 6] } };
    const result = engine.applyOperators(doc, update);
    
    TestFramework.assertEquals(3, result.matrix.length, 'Should have 3 nested arrays');
    TestFramework.assertArrayEquals([1, 2], result.matrix[0], 'First nested array should remain unchanged');
    TestFramework.assertArrayEquals([3, 4], result.matrix[1], 'Second nested array should remain unchanged');
    TestFramework.assertArrayEquals([5, 6], result.matrix[2], 'Should push nested array as single element');
  });

  suite.addTest('testPullNestedArray', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { 
      coordinates: [
        { x: 1, y: 2 }, 
        { x: 3, y: 4 }, 
        { x: 1, y: 2 }, 
        { x: 5, y: 6 }
      ] 
    };
    const update = { $pull: { coordinates: { x: 1, y: 2 } } };
    const result = engine.applyOperators(doc, update);
    
    TestFramework.assertEquals(2, result.coordinates.length, 'Should remove matching nested objects');
    TestFramework.assertEquals(3, result.coordinates[0].x, 'First remaining coordinate should be {x:3, y:4}');
    TestFramework.assertEquals(4, result.coordinates[0].y, 'First remaining coordinate should be {x:3, y:4}');
    TestFramework.assertEquals(5, result.coordinates[1].x, 'Second remaining coordinate should be {x:5, y:6}');
    TestFramework.assertEquals(6, result.coordinates[1].y, 'Second remaining coordinate should be {x:5, y:6}');
  });

  suite.addTest('testArrayPositionSpecifier', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { items: ['first', 'second', 'third'] };
    const update = { $set: { 'items.1': 'modified' } }; // Set specific array position
    const result = engine.applyOperators(doc, update);
    
    TestFramework.assertEquals('first', result.items[0], 'First element should remain unchanged');
    TestFramework.assertEquals('modified', result.items[1], 'Second element should be modified');
    TestFramework.assertEquals('third', result.items[2], 'Third element should remain unchanged');
    TestFramework.assertEquals(3, result.items.length, 'Array length should remain unchanged');
  });

  suite.addTest('testPushOnNonArrayThrows', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { field: 'not an array' };
    const update = { $push: { field: 'value' } };
    
    TestFramework.assertThrows(function() {
      engine.applyOperators(doc, update);
    }, ErrorHandler.ErrorTypes.INVALID_QUERY, 'Should throw when trying to $push to non-array field');
  });

  suite.addTest('testPullOnNonArrayThrows', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { field: 42 };
    const update = { $pull: { field: 42 } };
    
    TestFramework.assertThrows(function() {
      engine.applyOperators(doc, update);
    }, ErrorHandler.ErrorTypes.INVALID_QUERY, 'Should throw when trying to $pull from non-array field');
  });

  suite.addTest('testAddToSetOnNonArrayThrows', function() {
    const engine = UPDATE_ENGINE_TEST_DATA.testEngine;
    const doc = { field: { key: 'value' } };
    const update = { $addToSet: { field: 'new value' } };
    
    TestFramework.assertThrows(function() {
      engine.applyOperators(doc, update);
    }, ErrorHandler.ErrorTypes.INVALID_QUERY, 'Should throw when trying to $addToSet to non-array field');
  });

  return suite;
}

// Logger for file-level operations like initial suite registration
const updateEngineTestFileLogger = GASDBLogger.createComponentLogger('UpdateEngineTestFile');

// Register suite on default TestFramework instance
try {
  // This is the primary point of creation and registration for the suite.
  // createUpdateEngineTestSuite is called once here when the file loads.
  new TestFramework().registerTestSuite(createUpdateEngineTestSuite());
} catch (e) {
  // Fallback for environments where 'testFramework' global might not be initialized,
  // or if the above fails for another reason.
  updateEngineTestFileLogger.warn(
    'Direct registration via testFramework failed, attempting global registerTestSuite function.', 
    { error: e.message }
  );
  try {
    registerTestSuite(createUpdateEngineTestSuite()); // Uses global getTestFramework()
  } catch (e2) {
    updateEngineTestFileLogger.error(
      'Fallback global registration also failed for UpdateEngineTestSuite.', 
      { error: e2.message }
    );
  }
}

/**
 * Run all UpdateEngine tests
 * Convenience function to run the UpdateEngine-related suite
 */
function runUpdateEngineTests() {
  GASDBLogger.info('Running UpdateEngine Tests: Testing Update Operators');
  
  const testFramework = new TestFramework();
  testFramework.registerTestSuite(createUpdateEngineTestSuite());
  const results = testFramework.runTestSuite('UpdateEngine Tests');
  
  // Log summary
  GASDBLogger.info('UpdateEngine Test Results:');
  GASDBLogger.info(results.getSummary());
  
  return results;
}
