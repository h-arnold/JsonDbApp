/**
 * Single test runner to test just a few specific collections
 */
function runSingleCollectionTest() {
  try {
    // Test just the ones we've fixed
    runCollectionTests();
  } catch (error) {
    console.log('Error running tests:', error.message);
  }
}
