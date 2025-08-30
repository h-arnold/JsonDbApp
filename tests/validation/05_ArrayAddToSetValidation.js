/**
 * 05_ArrayAddToSetValidation.js - End-to-end validation tests for the $addToSet array update operator.
 *
 * This file contains tests for the MongoDB-compatible $addToSet operator, ensuring it correctly
 * adds unique elements to arrays within documents. The tests use the full database functionality,
 * including the Collection, MasterIndex, and file persistence, against the ValidationMockData.
 */

/**
 * Creates a test suite for the $addToSet operator.
 * This suite validates the behavior of adding unique elements to arrays, including primitives and objects,
 * the use of the $each modifier, and handling of various edge cases and type validations.
 *
 * @returns {TestSuite} A new test suite for the $addToSet operator.
 */
function createAddToSetOperatorTestSuite() {
    const suite = new TestSuite('$addToSet Operator Tests');

    // Test case for adding a unique value to an array that does not already contain it.
    suite.addTest('should add a value to a set if it is not already present', function() {
        const collection = VALIDATION_TEST_ENV.collections.persons;
        const result = collection.updateOne(
            { _id: 'person1' },
            { $addToSet: { 'preferences.tags': 'new-unique-tag' } }
        );
        TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
        const updated = collection.findOne({ _id: 'person1' });
    TestFramework.assertTrue(updated.preferences.tags.includes('new-unique-tag'), 'Tag "new-unique-tag" should be in the array');
    });

    // Test case to ensure that a duplicate value is not added to an array of primitives.
    suite.addTest('should not add a value to a set if it is already present', function() {
        const collection = VALIDATION_TEST_ENV.collections.persons;
        const result = collection.updateOne(
            { _id: 'person1' },
            { $addToSet: { 'preferences.tags': 'sports' } }
        );
        TestFramework.assertEquals(0, result.modifiedCount, 'Should not modify the document');
        const updated = collection.findOne({ _id: 'person1' });
        const tagCount = updated.preferences.tags.filter(tag => tag === 'sports').length;
        TestFramework.assertEquals(1, tagCount, 'Tag "sports" should appear only once');
    });

    // Test case for adding a unique object to an array of objects.
    suite.addTest('should add a unique object to an array of objects', function() {
        const collection = VALIDATION_TEST_ENV.collections.inventory;
        const newAlert = { type: 'security-alert', level: 'high' };
        const result = collection.updateOne(
            { _id: 'inv1' },
            { $addToSet: { alerts: newAlert } }
        );
        TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
        const updated = collection.findOne({ _id: 'inv1' });
    TestFramework.assertTrue(updated.alerts.some(alert => alert.type === 'security-alert'), 'New security alert should be present');
    });

    // Test case to ensure that a duplicate object is not added to an array of objects.
    suite.addTest('should not add a duplicate object to an array of objects', function() {
            const collection = VALIDATION_TEST_ENV.collections.inventory;
            const existingAlert = { type: 'low-stock', product: 'prod3', threshold: 10 };

            // Precondition: ensure the existing alert is present (guards against prior test mutations)
            const beforeDoc = collection.findOne({ _id: 'inv1' });
            const hasExisting = beforeDoc && Array.isArray(beforeDoc.alerts)
              && beforeDoc.alerts.some(a => a && a.type === 'low-stock' && a.product === 'prod3' && a.threshold === 10);
            if (!hasExisting) {
                const seedRes = collection.updateOne(
                    { _id: 'inv1' },
                    { $addToSet: { alerts: existingAlert } }
                );
                // Seeding either adds (1) or is a no-op (0) depending on state
                TestFramework.assertTrue(seedRes.modifiedCount === 0 || seedRes.modifiedCount === 1, 'Seeding precondition should not fail');
            }

            // Now attempt to add the same object; should be a no-op
            const result = collection.updateOne(
                { _id: 'inv1' },
                { $addToSet: { alerts: existingAlert } }
            );
            TestFramework.assertEquals(0, result.modifiedCount, 'Should not modify the document');
    });

    // Test case for using the $each modifier to add multiple unique values.
    suite.addTest('should add multiple unique values with $each', function() {
        const collection = VALIDATION_TEST_ENV.collections.persons;
        const result = collection.updateOne(
            { _id: 'person3' },
            { $addToSet: { 'preferences.tags': { $each: ['new-tag1', 'new-tag2', 'sports'] } } }
        );
        TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
        const updated = collection.findOne({ _id: 'person3' });
    TestFramework.assertTrue(updated.preferences.tags.includes('new-tag1'), 'Should contain new-tag1');
    TestFramework.assertTrue(updated.preferences.tags.includes('new-tag2'), 'Should contain new-tag2');
        const sportTagCount = updated.preferences.tags.filter(tag => tag === 'sports').length;
        TestFramework.assertEquals(1, sportTagCount, 'Tag "sports" should still be unique');
    });

    // Test case for creating a new array field when it does not exist.
    suite.addTest('should create an array field if it does not exist', function() {
        const collection = VALIDATION_TEST_ENV.collections.persons;
        const result = collection.updateOne(
            { _id: 'person5' },
            { $addToSet: { 'newly.created.field': 'initial-value' } }
        );
        TestFramework.assertEquals(1, result.modifiedCount, 'Should modify 1 document');
        const updated = collection.findOne({ _id: 'person5' });
        TestFramework.assertDeepEquals(['initial-value'], updated.newly.created.field, 'Should create a new array with the value');
    });

    // Test case to ensure that an error is thrown when $addToSet is used on a non-array field.
    suite.addTest('should throw an error when used on a non-array field', function() {
        const collection = VALIDATION_TEST_ENV.collections.persons;
        TestFramework.assertThrows(function() {
            collection.updateOne(
                { _id: 'person1' },
                { $addToSet: { 'name.first': 'a-value' } }
            );
        }, null, 'Should throw an error when targeting a non-array field');
    });

    return suite;
}

/**
 * Convenience function to run all $addToSet operator test suites.
 * This function sets up the test environment, initializes the test framework,
 * runs the tests, and then cleans up the environment.
 *
 * @returns {TestResults} The combined results from all $addToSet operator test suites.
 */
function runAddToSetOperatorTests() {
    const logger = JDbLogger.createComponentLogger('ValidationTests-AddToSet');
    logger.info('Running all $addToSet operator tests...');

    let combinedResults = new TestResults();

    try {
        setupValidationTestEnvironmentForTests();
        const framework = initialiseValidationTests();
        framework.addSuite(createAddToSetOperatorTestSuite());
        framework.validateEnvironment();

        const suiteResult = framework.runTestSuite('$addToSet Operator Tests');
        suiteResult.results.forEach(result => {
            combinedResults.addResult(result);
        });

        logger.info('Completed $addToSet Operator Tests', {
            passed: suiteResult.getPassed().length,
            failed: suiteResult.getFailed().length
        });

        combinedResults.finish();
    } catch (error) {
        logger.error('$addToSet operator tests failed', { error: error.message });
        throw error;
    } finally {
        try {
            cleanupValidationTestEnvironment();
        } catch (cleanupError) {
            logger.error('Cleanup failed', { error: cleanupError.message });
        }
    }

    return combinedResults;
}

/* exported createAddToSetOperatorTestSuite, runAddToSetOperatorTests */