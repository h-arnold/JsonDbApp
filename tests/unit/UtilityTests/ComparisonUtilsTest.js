/**
 * ComparisonUtilsTest.js - Tests for the planned ComparisonUtils utility.
 *
 * These tests are authored BEFORE the implementation (TDD Red phase) and will fail
 * until `src/01_utils/ComparisonUtils.js` is created. They codify the agreed API:
 *  - equals(a,b,{ arrayContainsScalar })
 *  - compareOrdering(a,b)
 *  - applyOperators(actual, operatorObj)
 *  - isOperatorObject(obj)
 *  - subsetMatch(candidate, predicate, { operatorSupport })
 */
function createComparisonUtilsTestSuite() {
  const suite = new TestSuite('ComparisonUtils Tests');

  // ===== equals tests =====
  suite.addTest('testEqualsPrimitivesAndStrict', function() {
    TestFramework.assertTrue(ComparisonUtils.equals(5, 5), 'Same numbers should be equal');
    TestFramework.assertFalse(ComparisonUtils.equals(5, '5'), 'Different types not equal');
    TestFramework.assertTrue(ComparisonUtils.equals(null, null), 'Null equals null');
    TestFramework.assertTrue(ComparisonUtils.equals(undefined, undefined), 'Undefined equals undefined');
    TestFramework.assertFalse(ComparisonUtils.equals(null, undefined), 'Null !== undefined');
  });

  suite.addTest('testEqualsDates', function() {
    const d1 = new Date('2024-01-01T00:00:00.000Z');
    const d2 = new Date('2024-01-01T00:00:00.000Z');
    const d3 = new Date('2024-01-02T00:00:00.000Z');
    TestFramework.assertTrue(ComparisonUtils.equals(d1, d2), 'Identical time values should be equal');
    TestFramework.assertFalse(ComparisonUtils.equals(d1, d3), 'Different date values not equal');
  });

  suite.addTest('testEqualsDeepObjectsAndArrays', function() {
    const objA = { a: 1, b: { c: 2 }, arr: [1,2,3] };
    const objB = { a: 1, b: { c: 2 }, arr: [1,2,3] };
    const objC = { a: 1, b: { c: 2 }, arr: [1,2,4] };
    TestFramework.assertTrue(ComparisonUtils.equals(objA, objB), 'Deep equal objects should match');
    TestFramework.assertFalse(ComparisonUtils.equals(objA, objC), 'Different nested value should fail');
  });

  suite.addTest('testEqualsArrayContainsScalarToggle', function() {
    const arr = [1,2,3];
    TestFramework.assertFalse(ComparisonUtils.equals(arr, 2), 'Default: no membership semantics');
    TestFramework.assertTrue(ComparisonUtils.equals(arr, 2, { arrayContainsScalar: true }), 'Membership semantics when enabled');
    TestFramework.assertFalse(ComparisonUtils.equals([1,'2',3], 2, { arrayContainsScalar: true }), 'Type strict membership');
  });

  // ===== compareOrdering tests =====
  suite.addTest('testCompareOrderingNumbers', function() {
    TestFramework.assertTrue(ComparisonUtils.compareOrdering(5, 3) > 0, '5 > 3');
    TestFramework.assertTrue(ComparisonUtils.compareOrdering(3, 5) < 0, '3 < 5');
    TestFramework.assertEquals(0, ComparisonUtils.compareOrdering(4, 4), '4 == 4');
  });

  suite.addTest('testCompareOrderingStrings', function() {
    TestFramework.assertTrue(ComparisonUtils.compareOrdering('b','a') > 0, 'b>a');
    TestFramework.assertTrue(ComparisonUtils.compareOrdering('a','b') < 0, 'a<b');
    TestFramework.assertEquals(0, ComparisonUtils.compareOrdering('abc','abc'), 'equal strings');
  });

  suite.addTest('testCompareOrderingDates', function() {
    const d1 = new Date('2024-01-01T00:00:00.000Z');
    const d2 = new Date('2024-01-02T00:00:00.000Z');
    TestFramework.assertTrue(ComparisonUtils.compareOrdering(d2, d1) > 0, 'd2>d1');
    TestFramework.assertTrue(ComparisonUtils.compareOrdering(d1, d2) < 0, 'd1<d2');
    TestFramework.assertEquals(0, ComparisonUtils.compareOrdering(d1, new Date(d1.getTime())), 'equal dates');
  });

  suite.addTest('testCompareOrderingNonComparable', function() {
    TestFramework.assertEquals(0, ComparisonUtils.compareOrdering({}, {}), 'Objects not comparable -> 0');
    TestFramework.assertEquals(0, ComparisonUtils.compareOrdering(5, '5'), 'Different primitive types -> 0');
  });

  // ===== operator application tests =====
  suite.addTest('testApplyOperatorsSingle', function() {
    TestFramework.assertTrue(ComparisonUtils.applyOperators(5, { $gt: 3 }), '5 > 3');
    TestFramework.assertTrue(ComparisonUtils.applyOperators(5, { $eq: 5 }), '5 == 5');
    TestFramework.assertTrue(ComparisonUtils.applyOperators(5, { $lt: 10 }), '5 < 10');
    TestFramework.assertFalse(ComparisonUtils.applyOperators(5, { $gt: 5 }), '5 !> 5');
  });

  suite.addTest('testApplyOperatorsMultipleAndUnsupported', function() {
    TestFramework.assertTrue(ComparisonUtils.applyOperators(5, { $gt: 1, $lt: 10 }), '5 between 1 and 10');
    TestFramework.assertFalse(ComparisonUtils.applyOperators(5, { $gt: 1, $lt: 4 }), '5 not < 4');
    TestFramework.assertThrows(function() { ComparisonUtils.applyOperators(5, { $ne: 3 }); }, InvalidQueryError, 'Unsupported operator should throw');
  });

  // ===== isOperatorObject tests =====
  suite.addTest('testIsOperatorObject', function() {
    TestFramework.assertTrue(ComparisonUtils.isOperatorObject({ $gt: 5 }), 'All $ keys');
    TestFramework.assertFalse(ComparisonUtils.isOperatorObject({ $gt: 5, normal: 1 }), 'Mixed keys not operator object');
    TestFramework.assertFalse(ComparisonUtils.isOperatorObject({}), 'Empty object not operator object');
    TestFramework.assertFalse(ComparisonUtils.isOperatorObject(null), 'Null not operator object');
  });

  // ===== subsetMatch tests =====
  suite.addTest('testSubsetMatchPlainFields', function() {
    const candidate = { a:1, b:2, extra: true };
    TestFramework.assertTrue(ComparisonUtils.subsetMatch(candidate, { a:1, b:2 }), 'Subset fields match');
    TestFramework.assertFalse(ComparisonUtils.subsetMatch(candidate, { a:1, c:3 }), 'Missing field c');
  });

  suite.addTest('testSubsetMatchWithOperators', function() {
    const candidate = { a:5, b:10 };
    TestFramework.assertTrue(ComparisonUtils.subsetMatch(candidate, { a: { $gt: 3 }, b: { $lt: 20 } }), 'Operators match');
    TestFramework.assertFalse(ComparisonUtils.subsetMatch(candidate, { a: { $gt: 5 } }), 'Strict greater fails');
  });

  suite.addTest('testSubsetMatchMixed', function() {
    const candidate = { sku: 'prod2', price: 24, stock: 50 };
    TestFramework.assertTrue(ComparisonUtils.subsetMatch(candidate, { sku: 'prod2', price: { $lt: 25 } }), 'Mixed field + operator passes');
    TestFramework.assertFalse(ComparisonUtils.subsetMatch(candidate, { sku: 'prod2', price: { $lt: 10 } }), 'Operator branch fails');
  });

  suite.addTest('testSubsetMatchOperatorObjectDirect', function() {
    // Candidate is primitive: direct operator object application allowed by subsetMatch via applyOperators
    TestFramework.assertTrue(ComparisonUtils.subsetMatch(5, { $gt: 3 }), 'Primitive candidate with operator object');
    // Candidate object with direct operator object should fail (mongo semantics differ; we keep documented simplification)
    TestFramework.assertFalse(ComparisonUtils.subsetMatch({ a:1 }, { $gt: 0 }), 'Operator object against object candidate returns false');
  });

  return suite;
}

// Convenience runner wrappers mirroring other utility test patterns
function runComparisonUtilsTests() {
  const framework = new TestFramework();
  framework.registerTestSuite(createComparisonUtilsTestSuite());
  return framework.runAllTests();
}

function runComparisonUtilsSingleTest(testName) {
  const framework = new TestFramework();
  framework.registerTestSuite(createComparisonUtilsTestSuite());
  return framework.runSingleTest('ComparisonUtils Tests', testName);
}