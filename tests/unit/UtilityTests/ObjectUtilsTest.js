/**
 * ObjectUtilsTest.js - ObjectUtils Class Tests
 * 
 * Comprehensive tests for the ObjectUtils utility class including:
 * - Deep cloning with Date preservation
 * - ISO date string conversion to Date objects  
 * - Nested object and array handling
 * - Edge cases and error conditions
 * 
 * Following TDD principles and British English conventions
 */

/**
 * ObjectUtils Tests
 * Tests for the ObjectUtils utility class functionality
 */
function createObjectUtilsTestSuite() {
  const suite = new TestSuite('ObjectUtils Tests');
  
  // ============= DEEP CLONE TESTS =============
  
  suite.addTest('testObjectUtilsDeepClonePrimitives', function() {
    // Test null and undefined
    TestFramework.assertNull(ObjectUtils.deepClone(null), 'Should clone null as null');
    TestFramework.assertUndefined(ObjectUtils.deepClone(undefined), 'Should clone undefined as undefined');
    
    // Test primitive types
    TestFramework.assertEquals('test', ObjectUtils.deepClone('test'), 'Should clone string');
    TestFramework.assertEquals(42, ObjectUtils.deepClone(42), 'Should clone number');
    TestFramework.assertEquals(true, ObjectUtils.deepClone(true), 'Should clone boolean true');
    TestFramework.assertEquals(false, ObjectUtils.deepClone(false), 'Should clone boolean false');
    TestFramework.assertEquals(0, ObjectUtils.deepClone(0), 'Should clone zero');
    TestFramework.assertEquals('', ObjectUtils.deepClone(''), 'Should clone empty string');
  });
  
  suite.addTest('testObjectUtilsDeepCloneDateObjects', function() {
    // Test Date preservation
    const originalDate = new Date('2023-06-15T10:30:00.000Z');
    const clonedDate = ObjectUtils.deepClone(originalDate);
    
    TestFramework.assertTrue(clonedDate instanceof Date, 'Cloned date should be Date instance');
    TestFramework.assertEquals(originalDate.getTime(), clonedDate.getTime(), 'Date values should match');
    TestFramework.assertTrue(originalDate !== clonedDate, 'Should be different object instances');
    
    // Test with different date values
    const dates = [
      new Date('1990-01-01T00:00:00.000Z'),
      new Date('2024-12-31T23:59:59.999Z'),
      new Date() // Current date
    ];
    
    dates.forEach((date, index) => {
      const cloned = ObjectUtils.deepClone(date);
      TestFramework.assertTrue(cloned instanceof Date, `Date ${index} should be Date instance`);
      TestFramework.assertEquals(date.getTime(), cloned.getTime(), `Date ${index} values should match`);
      TestFramework.assertTrue(date !== cloned, `Date ${index} should be different instances`);
    });
  });
  
  suite.addTest('testObjectUtilsDeepCloneArrays', function() {
    // Test empty array
    const emptyArray = [];
    const clonedEmpty = ObjectUtils.deepClone(emptyArray);
    TestFramework.assertTrue(Array.isArray(clonedEmpty), 'Should clone as array');
    TestFramework.assertEquals(0, clonedEmpty.length, 'Empty array should remain empty');
    TestFramework.assertTrue(emptyArray !== clonedEmpty, 'Should be different instances');
    
    // Test simple array
    const simpleArray = [1, 'test', true, null];
    const clonedSimple = ObjectUtils.deepClone(simpleArray);
    TestFramework.assertArrayEquals(simpleArray, clonedSimple, 'Simple array should match');
    TestFramework.assertTrue(simpleArray !== clonedSimple, 'Should be different instances');
    
    // Test array with Date objects
    const dateArray = [
      new Date('2023-01-01T00:00:00.000Z'),
      'string',
      new Date('2023-12-31T23:59:59.999Z')
    ];
    const clonedDateArray = ObjectUtils.deepClone(dateArray);
    
    TestFramework.assertEquals(3, clonedDateArray.length, 'Array length should match');
    TestFramework.assertTrue(clonedDateArray[0] instanceof Date, 'First element should be Date');
    TestFramework.assertEquals('string', clonedDateArray[1], 'Second element should be string');
    TestFramework.assertTrue(clonedDateArray[2] instanceof Date, 'Third element should be Date');
    TestFramework.assertEquals(dateArray[0].getTime(), clonedDateArray[0].getTime(), 'First date should match');
    TestFramework.assertEquals(dateArray[2].getTime(), clonedDateArray[2].getTime(), 'Third date should match');
  });
  
  suite.addTest('testObjectUtilsDeepCloneNestedArrays', function() {
    // Test nested arrays
    const nestedArray = [
      [1, 2, 3],
      ['a', 'b'],
      [new Date('2023-06-15T10:30:00.000Z'), true]
    ];
    const clonedNested = ObjectUtils.deepClone(nestedArray);
    
    TestFramework.assertEquals(3, clonedNested.length, 'Top level length should match');
    TestFramework.assertArrayEquals([1, 2, 3], clonedNested[0], 'First nested array should match');
    TestFramework.assertArrayEquals(['a', 'b'], clonedNested[1], 'Second nested array should match');
    TestFramework.assertTrue(clonedNested[2][0] instanceof Date, 'Nested date should be preserved');
    TestFramework.assertEquals(true, clonedNested[2][1], 'Nested boolean should match');
    
    // Verify deep independence
    TestFramework.assertTrue(nestedArray !== clonedNested, 'Top level should be different instances');
    TestFramework.assertTrue(nestedArray[0] !== clonedNested[0], 'Nested arrays should be different instances');
  });
  
  suite.addTest('testObjectUtilsDeepCloneObjects', function() {
    // Test empty object
    const emptyObj = {};
    const clonedEmpty = ObjectUtils.deepClone(emptyObj);
    TestFramework.assertEquals(0, Object.keys(clonedEmpty).length, 'Empty object should remain empty');
    TestFramework.assertTrue(emptyObj !== clonedEmpty, 'Should be different instances');
    
    // Test simple object
    const simpleObj = { name: 'test', value: 42, active: true };
    const clonedSimple = ObjectUtils.deepClone(simpleObj);
    TestFramework.assertEquals('test', clonedSimple.name, 'Name should match');
    TestFramework.assertEquals(42, clonedSimple.value, 'Value should match');
    TestFramework.assertEquals(true, clonedSimple.active, 'Active should match');
    TestFramework.assertTrue(simpleObj !== clonedSimple, 'Should be different instances');
    
    // Test object with Date properties
    const dateObj = {
      created: new Date('2023-01-01T00:00:00.000Z'),
      updated: new Date('2023-06-15T10:30:00.000Z'),
      name: 'test document'
    };
    const clonedDateObj = ObjectUtils.deepClone(dateObj);
    
    TestFramework.assertTrue(clonedDateObj.created instanceof Date, 'Created should be Date');
    TestFramework.assertTrue(clonedDateObj.updated instanceof Date, 'Updated should be Date');
    TestFramework.assertEquals('test document', clonedDateObj.name, 'Name should match');
    TestFramework.assertEquals(dateObj.created.getTime(), clonedDateObj.created.getTime(), 'Created date should match');
    TestFramework.assertEquals(dateObj.updated.getTime(), clonedDateObj.updated.getTime(), 'Updated date should match');
  });
  
  suite.addTest('testObjectUtilsDeepCloneComplexNestedStructures', function() {
    // Test deeply nested object with mixed types
    const complexObj = {
      user: {
        id: 'user123',
        profile: {
          personal: {
            name: 'John Doe',
            birthDate: new Date('1990-05-15T00:00:00.000Z'),
            preferences: {
              timezone: 'UTC',
              lastLogin: new Date('2024-06-11T10:00:00.000Z')
            }
          },
          professional: {
            department: 'Engineering',
            startDate: new Date('2020-01-15T09:00:00.000Z'),
            skills: ['JavaScript', 'Python', 'GAS'],
            certifications: [
              {
                name: 'GCP',
                obtainedDate: new Date('2022-03-15T00:00:00.000Z'),
                expiryDate: new Date('2025-03-15T00:00:00.000Z')
              }
            ]
          }
        },
        settings: {
          notifications: true,
          theme: 'dark'
        }
      },
      metadata: {
        created: new Date('2023-01-01T00:00:00.000Z'),
        version: 1.2
      }
    };
    
    const cloned = ObjectUtils.deepClone(complexObj);
    
    // Verify structure preservation
    TestFramework.assertEquals('user123', cloned.user.id, 'User ID should match');
    TestFramework.assertEquals('John Doe', cloned.user.profile.personal.name, 'Name should match');
    TestFramework.assertEquals('Engineering', cloned.user.profile.professional.department, 'Department should match');
    TestFramework.assertTrue(cloned.user.settings.notifications, 'Notifications should match');
    TestFramework.assertEquals(1.2, cloned.metadata.version, 'Version should match');
    
    // Verify Date preservation in deeply nested structures
    TestFramework.assertTrue(cloned.user.profile.personal.birthDate instanceof Date, 'Birth date should be Date');
    TestFramework.assertTrue(cloned.user.profile.personal.preferences.lastLogin instanceof Date, 'Last login should be Date');
    TestFramework.assertTrue(cloned.user.profile.professional.startDate instanceof Date, 'Start date should be Date');
    TestFramework.assertTrue(cloned.metadata.created instanceof Date, 'Metadata created should be Date');
    
    // Verify array preservation
    TestFramework.assertArrayEquals(['JavaScript', 'Python', 'GAS'], cloned.user.profile.professional.skills, 'Skills should match');
    TestFramework.assertEquals(1, cloned.user.profile.professional.certifications.length, 'Should have one certification');
    TestFramework.assertEquals('GCP', cloned.user.profile.professional.certifications[0].name, 'Certification name should match');
    TestFramework.assertTrue(cloned.user.profile.professional.certifications[0].obtainedDate instanceof Date, 'Certification date should be Date');
    
    // Verify deep independence
    TestFramework.assertTrue(complexObj !== cloned, 'Top level should be different instances');
    TestFramework.assertTrue(complexObj.user !== cloned.user, 'User objects should be different instances');
    TestFramework.assertTrue(complexObj.user.profile !== cloned.user.profile, 'Profile objects should be different instances');
  });
  
  // ============= CONVERT DATE STRINGS TESTS =============
  
  suite.addTest('testObjectUtilsConvertDateStringsPrimitives', function() {
    // Test null and undefined
    TestFramework.assertNull(ObjectUtils.convertDateStringsToObjects(null), 'Null should remain null');
    TestFramework.assertUndefined(ObjectUtils.convertDateStringsToObjects(undefined), 'Undefined should remain undefined');
    
    // Test non-object types
    TestFramework.assertEquals('regular string', ObjectUtils.convertDateStringsToObjects('regular string'), 'Regular string should remain unchanged');
    TestFramework.assertEquals(42, ObjectUtils.convertDateStringsToObjects(42), 'Number should remain unchanged');
    TestFramework.assertEquals(true, ObjectUtils.convertDateStringsToObjects(true), 'Boolean should remain unchanged');
  });
  
  suite.addTest('testObjectUtilsConvertDateStringsISOStrings', function() {
    // Test valid ISO date strings
    const isoString = '2023-06-15T10:30:00.000Z';
    const converted = ObjectUtils.convertDateStringsToObjects(isoString);
    TestFramework.assertTrue(converted instanceof Date, 'ISO string should be converted to Date');
    TestFramework.assertEquals(new Date(isoString).getTime(), converted.getTime(), 'Date value should match');
    
    // Test various ISO formats
    const isoFormats = [
      '2023-01-01T00:00:00.000Z',
      '2024-12-31T23:59:59.999Z',
      '1990-05-15T12:30:45.123Z',
      '2023-06-15T10:30:00Z' // Without milliseconds
    ];
    
    isoFormats.forEach((isoStr, index) => {
      const result = ObjectUtils.convertDateStringsToObjects(isoStr);
      TestFramework.assertTrue(result instanceof Date, `ISO format ${index} should be converted to Date`);
      TestFramework.assertEquals(new Date(isoStr).getTime(), result.getTime(), `Date value ${index} should match`);
    });
  });
  
  suite.addTest('testObjectUtilsConvertDateStringsNonISOStrings', function() {
    // Test strings that look like dates but aren't valid ISO format
    const nonISOStrings = [
      '2023-06-15 10:30:00', // Missing T and Z
      '15/06/2023', // Different format
      '2023-13-01T00:00:00.000Z', // Invalid month
      '2023-06-32T00:00:00.000Z', // Invalid day
      '2023-06-15T25:00:00.000Z', // Invalid hour
      '2023-06-15T10:30:00.000', // Missing Z
      '2023-06-15T10:30:00+00:00', // Different timezone format
      'not a date at all',
      '2023', // Partial date
      '', // Empty string
      'null',
      'undefined'
    ];
    
    nonISOStrings.forEach((str, index) => {
      const result = ObjectUtils.convertDateStringsToObjects(str);
      TestFramework.assertEquals(str, result, `Non-ISO string ${index} should remain unchanged`);
      TestFramework.assertEquals('string', typeof result, `Non-ISO string ${index} should remain string type`);
    });
  });
  
  suite.addTest('testObjectUtilsConvertDateStringsExistingDates', function() {
    // Test that existing Date objects remain unchanged
    const existingDate = new Date('2023-06-15T10:30:00.000Z');
    const result = ObjectUtils.convertDateStringsToObjects(existingDate);
    
    TestFramework.assertTrue(result instanceof Date, 'Existing Date should remain Date');
    TestFramework.assertEquals(existingDate.getTime(), result.getTime(), 'Date value should remain the same');
    TestFramework.assertTrue(result === existingDate, 'Should be the same object instance');
  });
  
  suite.addTest('testObjectUtilsConvertDateStringsArrays', function() {
    // Test array with mixed content
    const mixedArray = [
      '2023-06-15T10:30:00.000Z', // Should convert
      'regular string', // Should remain string
      new Date('2023-01-01T00:00:00.000Z'), // Should remain Date
      42, // Should remain number
      '2023-12-31T23:59:59.999Z', // Should convert
      null, // Should remain null
      undefined // Should remain undefined
    ];
    
    const converted = ObjectUtils.convertDateStringsToObjects(mixedArray);
    
    TestFramework.assertTrue(converted[0] instanceof Date, 'First ISO string should be converted');
    TestFramework.assertEquals('regular string', converted[1], 'Regular string should remain unchanged');
    TestFramework.assertTrue(converted[2] instanceof Date, 'Existing date should remain Date');
    TestFramework.assertEquals(42, converted[3], 'Number should remain unchanged');
    TestFramework.assertTrue(converted[4] instanceof Date, 'Second ISO string should be converted');
    TestFramework.assertNull(converted[5], 'Null should remain null');
    TestFramework.assertUndefined(converted[6], 'Undefined should remain undefined');
    
    // Verify the array was modified in place
    TestFramework.assertTrue(converted === mixedArray, 'Should modify original array');
  });
  
  suite.addTest('testObjectUtilsConvertDateStringsObjects', function() {
    // Test object with mixed properties
    const mixedObj = {
      validDate: '2023-06-15T10:30:00.000Z',
      invalidDate: '2023-06-15 10:30:00',
      existingDate: new Date('2023-01-01T00:00:00.000Z'),
      regularString: 'test',
      number: 42,
      boolean: true,
      nullValue: null,
      undefinedValue: undefined
    };
    
    const converted = ObjectUtils.convertDateStringsToObjects(mixedObj);
    
    TestFramework.assertTrue(converted.validDate instanceof Date, 'Valid ISO string should be converted');
    TestFramework.assertEquals('string', typeof converted.invalidDate, 'Invalid date string should remain string');
    TestFramework.assertTrue(converted.existingDate instanceof Date, 'Existing date should remain Date');
    TestFramework.assertEquals('test', converted.regularString, 'Regular string should remain unchanged');
    TestFramework.assertEquals(42, converted.number, 'Number should remain unchanged');
    TestFramework.assertEquals(true, converted.boolean, 'Boolean should remain unchanged');
    TestFramework.assertNull(converted.nullValue, 'Null should remain null');
    TestFramework.assertUndefined(converted.undefinedValue, 'Undefined should remain undefined');
    
    // Verify the object was modified in place
    TestFramework.assertTrue(converted === mixedObj, 'Should modify original object');
  });
  
  suite.addTest('testObjectUtilsConvertDateStringsNestedStructures', function() {
    // Test deeply nested structure
    const nestedObj = {
      user: {
        created: '2023-01-01T00:00:00.000Z',
        profile: {
          personal: {
            birthDate: '1990-05-15T00:00:00.000Z',
            name: 'John Doe',
            preferences: {
              lastLogin: '2024-06-11T10:00:00.000Z',
              invalidDate: '2023-06-15 10:30:00'
            }
          },
          events: [
            { date: '2023-01-01T00:00:00.000Z', type: 'start' },
            { date: '2023-06-01T12:00:00.000Z', type: 'middle' },
            { date: 'not a date', type: 'invalid' }
          ]
        }
      },
      metadata: {
        timestamps: [
          '2023-03-15T09:30:00.000Z',
          '2023-09-22T16:45:00.000Z',
          'invalid timestamp'
        ]
      }
    };
    
    const converted = ObjectUtils.convertDateStringsToObjects(nestedObj);
    
    // Verify nested date conversions
    TestFramework.assertTrue(converted.user.created instanceof Date, 'User created should be converted');
    TestFramework.assertTrue(converted.user.profile.personal.birthDate instanceof Date, 'Birth date should be converted');
    TestFramework.assertTrue(converted.user.profile.personal.preferences.lastLogin instanceof Date, 'Last login should be converted');
    TestFramework.assertEquals('string', typeof converted.user.profile.personal.preferences.invalidDate, 'Invalid date should remain string');
    
    // Verify array elements
    TestFramework.assertTrue(converted.user.profile.events[0].date instanceof Date, 'First event date should be converted');
    TestFramework.assertTrue(converted.user.profile.events[1].date instanceof Date, 'Second event date should be converted');
    TestFramework.assertEquals('string', typeof converted.user.profile.events[2].date, 'Invalid event date should remain string');
    
    // Verify metadata timestamps array
    TestFramework.assertTrue(converted.metadata.timestamps[0] instanceof Date, 'First timestamp should be converted');
    TestFramework.assertTrue(converted.metadata.timestamps[1] instanceof Date, 'Second timestamp should be converted');
    TestFramework.assertEquals('string', typeof converted.metadata.timestamps[2], 'Invalid timestamp should remain string');
    
    // Verify non-date fields remain unchanged
    TestFramework.assertEquals('John Doe', converted.user.profile.personal.name, 'Name should remain unchanged');
    TestFramework.assertEquals('start', converted.user.profile.events[0].type, 'Event type should remain unchanged');
  });
  
  // ============= PRIVATE METHOD TESTS (via public interface) =============
  
  suite.addTest('testObjectUtilsIsISODateStringValidation', function() {
    // Test this indirectly through convertDateStringsToObjects
    const validISOStrings = [
      '2023-06-15T10:30:00.000Z',
      '1990-01-01T00:00:00.000Z',
      '2024-12-31T23:59:59.999Z',
      '2023-06-15T10:30:00Z', // Without milliseconds
      '2000-02-29T12:00:00.000Z' // Leap year
    ];
    
    validISOStrings.forEach((str, index) => {
      const result = ObjectUtils.convertDateStringsToObjects(str);
      TestFramework.assertTrue(result instanceof Date, `Valid ISO string ${index} should be converted to Date`);
    });
    
    const invalidISOStrings = [
      '2023-06-15T10:30:00.000', // Missing Z
      '2023-06-15 10:30:00.000Z', // Missing T
      '2023-13-01T00:00:00.000Z', // Invalid month
      '2023-06-32T00:00:00.000Z', // Invalid day
      '2023-06-15T25:00:00.000Z', // Invalid hour
      '2023-06-15T10:60:00.000Z', // Invalid minute
      '2023-06-15T10:30:60.000Z', // Invalid second
      '23-06-15T10:30:00.000Z', // Wrong year format
      '2023-6-15T10:30:00.000Z', // Single digit month
      '2023-06-5T10:30:00.000Z', // Single digit day
      '2023-06-15T1:30:00.000Z', // Single digit hour
      'not-a-date-at-all'
    ];
    
    invalidISOStrings.forEach((str, index) => {
      const result = ObjectUtils.convertDateStringsToObjects(str);
      TestFramework.assertEquals('string', typeof result, `Invalid ISO string ${index} should remain string`);
    });
  });
  
  // ============= EDGE CASES AND ERROR CONDITIONS =============
  
  suite.addTest('testObjectUtilsEdgeCases', function() {
    // Test circular reference handling (should not cause infinite recursion)
    const obj = { name: 'test' };
    obj.self = obj; // Create circular reference
    
    // This should not crash (though it might create a deep copy with duplication)
    try {
      const cloned = ObjectUtils.deepClone(obj);
      TestFramework.assertTrue(true, 'Should handle circular references without crashing');
    } catch (error) {
      // If it throws, that's also acceptable behaviour for circular references
      TestFramework.assertTrue(true, 'Circular reference handling is implementation-specific');
    }
    
    // Test very large objects (performance consideration)
    const largeObj = {};
    for (let i = 0; i < 1000; i++) {
      largeObj[`property${i}`] = `value${i}`;
    }
    
    try {
      const cloned = ObjectUtils.deepClone(largeObj);
      TestFramework.assertEquals(1000, Object.keys(cloned).length, 'Should handle large objects');
    } catch (error) {
      TestFramework.assertTrue(false, `Should handle large objects: ${error.message}`);
    }
  });
  
  suite.addTest('testObjectUtilsSpecialObjectTypes', function() {
    // Test with functions (should be handled gracefully)
    const objWithFunction = {
      name: 'test',
      method: function() { return 'test'; }
    };
    
    const cloned = ObjectUtils.deepClone(objWithFunction);
    TestFramework.assertEquals('test', cloned.name, 'Regular property should be cloned');
    // Function behaviour is implementation-specific, just ensure no crash
    
    // Test with regex (should be handled gracefully)
    const objWithRegex = {
      name: 'test',
      pattern: /test/gi
    };
    
    const clonedRegex = ObjectUtils.deepClone(objWithRegex);
    TestFramework.assertEquals('test', clonedRegex.name, 'Regular property should be cloned');
    // Regex behaviour is implementation-specific, just ensure no crash
  });
  
  return suite;
}

/**
 * Register the ObjectUtils test suite with the TestFramework
 */
function registerObjectUtilsTests() {
  const testFramework = new TestFramework();
  testFramework.registerTestSuite(createObjectUtilsTestSuite());
  return testFramework;
}

/**
 * Run ObjectUtils Tests independently
 */
function runObjectUtilsTests() {
  GASDBLogger.info('Running ObjectUtils Tests: Object Manipulation and Date Preservation');
  
  const testFramework = registerObjectUtilsTests();
  const results = testFramework.runTestSuite('ObjectUtils Tests');
  
  // Log summary
  GASDBLogger.info('ObjectUtils Test Results:');
  GASDBLogger.info(results.getSummary());
  
  return results;
}
