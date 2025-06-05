/**
 * Test execution entry point for Google Apps Script
 * 
 * This file provides functions that use the unified test execution system.
 * Configuration-driven execution enables consistent test handling.
 */

/**
 * Run all Section 1 tests
 * This function can be called from the Google Apps Script editor
 */
function testSection1() {
  return UnifiedTestExecution.runSection(1);
}

/**
 * Run all Section 2 tests  
 * This function can be called from the Google Apps Script editor
 */
function testSection2() {
  return UnifiedTestExecution.runSection(2);
}

/**
 * Run all Section 3 tests
 * This function can be called from the Google Apps Script editor  
 */
function testSection3() {
  return UnifiedTestExecution.runSection(3);
}

/**
 * Run all Section 4 tests
 * This function can be called from the Google Apps Script editor  
 */
function testSection4() {
  return UnifiedTestExecution.runSection(4);
}

/**
 * Run specific test suite from any section
 * @param {number} sectionNumber - Section number (1, 2, 3, or 4)
 * @param {string} suiteName - Name of the test suite to run
 */
function testSuite(sectionNumber, suiteName) {
  return UnifiedTestExecution.runSuite(sectionNumber, suiteName);
}

/**
 * Run an individual test for debugging purposes
 * @param {number} sectionNumber - The section number (1-4)
 * @param {string} suiteName - The name of the test suite
 * @param {string} testName - The name of the specific test
 * @returns {Object} Test execution result
 */
function runIndividualTest(sectionNumber, suiteName, testName) {
  return UnifiedTestExecution.runIndividualTest(sectionNumber, suiteName, testName);
}

/**
 * List all available tests in a section for easy reference
 * @param {number} sectionNumber - The section number (1-4)
 * @returns {Object} Available tests organised by suite
 */
function listAvailableTests(sectionNumber) {
  return UnifiedTestExecution.listSectionTests(sectionNumber);
}

/**
 * Quick validation function to check if all basic components are working
 * This can be used as a smoke test
 */
function validateSection1Setup() {
  return UnifiedTestExecution.validateSetup(1);
}

/**
 * Quick validation function to check if Section 2 components are working
 * This can be used as a smoke test for Section 2
 */
function validateSection2Setup() {
  return UnifiedTestExecution.validateSetup(2);
}

/**
 * Quick validation function to check if Section 3 components are working
 * This can be used as a smoke test for Section 3
 */
function validateSection3Setup() {
  return UnifiedTestExecution.validateSetup(3);
}

/**
 * Quick validation function to check if Section 4 components are working
 * This can be used as a smoke test for Section 4
 */
function validateSection4Setup() {
  return UnifiedTestExecution.validateSetup(4);
}

/**
 * Initialize and test the basic environment
 * This function should be run first to ensure everything is set up correctly
 */
function initializeTestEnvironment() {
  return UnifiedTestExecution.initializeEnvironment();
}

/**
 * Get information about available tests
 * @returns {Object} Available test sections and suites
 */
function getAvailableTests() {
  return UnifiedTestExecution.getAvailableTests();
}