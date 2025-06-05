/**
 * UnifiedTestExecution - Configuration-driven test execution system for GAS DB
 * 
 * This system provides a consistent approach to test execution through
 * configuration-based test management.
 */

/**
 * Test section configurations
 * Each section defines its test suites and validation requirements
 */
const TEST_SECTIONS = {
  1: {
    name: 'Section 1',
    description: 'Project Setup and Basic Infrastructure',
    runFunction: 'runSection1Tests',
    suites: {
      'Environment Tests': 'runEnvironmentTests',
      'Utility Class Tests': 'runUtilityClassTests', 
      'Test Framework Tests': 'runTestFrameworkTests'
    },
    validations: [
      {
        component: 'GASDBLogger',
        test: () => {
          GASDBLogger.info('Testing GASDBLogger functionality');
          return { status: 'PASS', message: 'GASDBLogger working correctly' };
        }
      },
      {
        component: 'ErrorHandler',
        test: () => {
          ErrorHandler.validateRequired('test', 'testParam');
          const error = ErrorHandler.createError('DOCUMENT_NOT_FOUND', { id: 'test' });
          return { status: 'PASS', message: 'ErrorHandler working correctly' };
        }
      },
      {
        component: 'IdGenerator',
        test: () => {
          const id1 = IdGenerator.generateUUID();
          const id2 = IdGenerator.generateTimestampId();
          if (id1 && id2 && id1 !== id2) {
            return { status: 'PASS', message: 'IdGenerator working correctly' };
          } else {
            throw new Error('ID generation failed');
          }
        }
      },
      {
        component: 'TestRunner',
        test: () => {
          const testRunner = new TestRunner();
          const testSuite = new TestSuite('ValidationSuite');
          testSuite.addTest('dummyTest', () => AssertionUtilities.assertTrue(true));
          testRunner.addTestSuite(testSuite);
          const results = testRunner.runAllTests();
          
          if (results.getPassed().length === 1) {
            return { status: 'PASS', message: 'TestRunner working correctly' };
          } else {
            throw new Error('Test execution failed');
          }
        }
      },
      {
        component: 'Drive API',
        test: () => {
          DriveApp.getRootFolder();
          return { status: 'PASS', message: 'Drive API access working' };
        }
      }
    ]
  },
  
  2: {
    name: 'Section 2',
    description: 'ScriptProperties Master Index',
    runFunction: 'runSection2Tests',
    suites: {
      'MasterIndex Functionality': 'testMasterIndexFunctionality',
      'Virtual Locking Mechanism': 'testVirtualLockingMechanism',
      'Conflict Detection and Resolution': 'testConflictDetectionResolution',
      'MasterIndex Integration': 'testMasterIndexIntegration'
    },
    validations: [
      {
        component: 'MasterIndex Class',
        test: () => {
          try {
            const masterIndex = new MasterIndex();
            return { status: 'FAIL', message: 'Class exists but methods not implemented (expected for TDD)' };
          } catch (error) {
            if (error.message.includes('not implemented')) {
              return { status: 'PASS', message: 'Class exists with placeholder methods (TDD Red phase)' };
            } else {
              throw error;
            }
          }
        }
      },
      {
        component: 'Section 2 Test Functions',
        test: () => {
          const requiredFunctions = ['testMasterIndexFunctionality', 'testVirtualLockingMechanism', 
                                   'testConflictDetectionResolution', 'testMasterIndexIntegration'];
          const missingFunctions = requiredFunctions.filter(fn => typeof globalThis[fn] !== 'function');
          
          if (missingFunctions.length === 0) {
            return { status: 'PASS', message: 'All test functions available' };
          } else {
            throw new Error(`Missing test functions: ${missingFunctions.join(', ')}`);
          }
        }
      },
      {
        component: 'ScriptProperties Access',
        test: () => {
          PropertiesService.getScriptProperties().getProperty('test');
          return { status: 'PASS', message: 'ScriptProperties API accessible' };
        }
      }
    ]
  },
  
  3: {
    name: 'Section 3',
    description: 'File Service and Drive Integration',
    runFunction: 'runSection3Tests',
    suites: {
      'Section 3 Setup': 'testSection3Setup',
      'FileOperations Functionality': 'testFileOperationsFunctionality',
      'FileOperations Error Handling': 'testFileOperationsErrorHandling',
      'FileService Functionality': 'testFileServiceFunctionality',
      'FileService Optimisation': 'testFileServiceOptimisation',
      'FileService Error Recovery': 'testFileServiceErrorRecovery',
      'File Integration': 'testFileIntegration',
      'Drive API Edge Cases': 'testDriveApiEdgeCases',
      'Section 3 Cleanup': 'testSection3Cleanup'
    },
    validations: [
      {
        component: 'FileOperations Class',
        test: () => {
          try {
            const fileOps = new FileOperations(new GASDBLogger('Test', 'INFO'));
            return { status: 'FAIL', message: 'Class exists but methods not implemented (expected for TDD)' };
          } catch (error) {
            if (error.message.includes('not implemented') || error.message.includes('FileOperations is not defined')) {
              return { status: 'PASS', message: 'Class not yet implemented (TDD Red phase)' };
            } else {
              throw error;
            }
          }
        }
      },
      {
        component: 'FileService Class',
        test: () => {
          try {
            const fileService = new FileService(null, new GASDBLogger('Test', 'INFO'));
            return { status: 'FAIL', message: 'Class exists but methods not implemented (expected for TDD)' };
          } catch (error) {
            if (error.message.includes('not implemented') || error.message.includes('FileService is not defined')) {
              return { status: 'PASS', message: 'Class not yet implemented (TDD Red phase)' };
            } else {
              throw error;
            }
          }
        }
      },
      {
        component: 'Section 3 Test Functions',
        test: () => {
          const requiredFunctions = ['testFileOperationsFunctionality', 'testFileOperationsErrorHandling',
                                   'testFileServiceFunctionality', 'testFileServiceOptimisation',
                                   'testFileServiceErrorRecovery', 'testFileIntegration', 'testDriveApiEdgeCases'];
          const missingFunctions = requiredFunctions.filter(fn => typeof globalThis[fn] !== 'function');
          
          if (missingFunctions.length === 0) {
            return { status: 'PASS', message: 'All test functions available' };
          } else {
            throw new Error(`Missing test functions: ${missingFunctions.join(', ')}`);
          }
        }
      },
      {
        component: 'Drive API Access',
        test: () => {
          DriveApp.getRootFolder();
          return { status: 'PASS', message: 'Drive API accessible for file operations' };
        }
      }
    ]
  },
  
  4: {
    name: 'Section 4',
    description: 'Database and Collection Management',
    runFunction: 'runSection4Tests',
    suites: {
      'Section 4 Setup': 'testSection4Setup',
      'DatabaseConfig Functionality': 'testDatabaseConfigFunctionality',
      'Database Initialization': 'testDatabaseInitialization',
      'Collection Management': 'testCollectionManagement',
      'Index File Structure': 'testIndexFileStructure',
      'Database Master Index Integration': 'testDatabaseMasterIndexIntegration',
      'Section 4 Cleanup': 'testSection4Cleanup'
    },
    validations: [
      {
        component: 'Database Class',
        test: () => {
          try {
            const database = new Database();
            return { status: 'FAIL', message: 'Class exists but methods not implemented (expected for TDD)' };
          } catch (error) {
            if (error.message.includes('not implemented') || error.message.includes('Database is not defined')) {
              return { status: 'PASS', message: 'Class not yet implemented (TDD Red phase)' };
            } else {
              throw error;
            }
          }
        }
      },
      {
        component: 'DatabaseConfig Class',
        test: () => {
          try {
            const config = new DatabaseConfig();
            return { status: 'FAIL', message: 'Class exists but methods not implemented (expected for TDD)' };
          } catch (error) {
            if (error.message.includes('not implemented') || error.message.includes('DatabaseConfig is not defined')) {
              return { status: 'PASS', message: 'Class not yet implemented (TDD Red phase)' };
            } else {
              throw error;
            }
          }
        }
      },
      {
        component: 'Section 4 Test Functions',
        test: () => {
          const requiredFunctions = ['testDatabaseConfigFunctionality', 'testDatabaseInitialization',
                                   'testCollectionManagement', 'testIndexFileStructure',
                                   'testDatabaseMasterIndexIntegration'];
          const missingFunctions = requiredFunctions.filter(fn => typeof globalThis[fn] !== 'function');
          
          if (missingFunctions.length === 0) {
            return { status: 'PASS', message: 'All test functions available' };
          } else {
            throw new Error(`Missing test functions: ${missingFunctions.join(', ')}`);
          }
        }
      },
      {
        component: 'MasterIndex Integration',
        test: () => {
          try {
            // Test that MasterIndex is available for database integration
            const masterIndex = new MasterIndex();
            return { status: 'PASS', message: 'MasterIndex available for database integration' };
          } catch (error) {
            throw new Error('MasterIndex not available for database integration');
          }
        }
      },
      {
        component: 'FileService Integration',
        test: () => {
          try {
            // Test that FileService is available for database operations
            const fileService = new FileService();
            return { status: 'PASS', message: 'FileService available for database operations' };
          } catch (error) {
            throw new Error('FileService not available for database operations');
          }
        }
      }
    ]
  }
};

/**
 * Unified test execution class
 */
class UnifiedTestExecution {
  /**
   * Run all tests for a specific section
   * @param {number} sectionNumber - The section number (1, 2, or 3)
   * @returns {Object} Test results
   */
  static runSection(sectionNumber) {
    const section = TEST_SECTIONS[sectionNumber];
    if (!section) {
      throw new Error(`Invalid section number: ${sectionNumber}`);
    }
    
    try {
      GASDBLogger.info('='.repeat(50));
      GASDBLogger.info(`Starting ${section.name} Test Execution`);
      GASDBLogger.info(`${section.description}`);
      GASDBLogger.info('='.repeat(50));
      
      // Get the run function and execute it
      const runFunction = globalThis[section.runFunction];
      if (typeof runFunction !== 'function') {
        throw new Error(`Run function ${section.runFunction} not found`);
      }
      
      const results = runFunction();
      
      GASDBLogger.info('='.repeat(50));
      GASDBLogger.info(`${section.name} Test Execution Complete`);
      GASDBLogger.info('='.repeat(50));
      
      return {
        success: results.getFailed().length === 0,
        summary: results.getSummary(),
        details: results.getDetailedReport(),
        passRate: results.getPassRate(),
        totalTests: results.results.length,
        passedTests: results.getPassed().length,
        failedTests: results.getFailed().length
      };
      
    } catch (error) {
      GASDBLogger.error(`Failed to execute ${section.name} tests`, { 
        error: error.message, 
        stack: error.stack 
      });
      throw error;
    }
  }
  
  /**
   * Run a specific test suite from any section
   * @param {number} sectionNumber - The section number
   * @param {string} suiteName - The name of the test suite
   * @returns {Object} Test results
   */
  static runSuite(sectionNumber, suiteName) {
    const section = TEST_SECTIONS[sectionNumber];
    if (!section) {
      throw new Error(`Invalid section number: ${sectionNumber}`);
    }
    
    const suiteFunction = section.suites[suiteName];
    if (!suiteFunction) {
      const availableSuites = Object.keys(section.suites).join(', ');
      throw new Error(`Unknown test suite: ${suiteName}. Available: ${availableSuites}`);
    }
    
    try {
      GASDBLogger.info(`Running ${section.name} test suite: ${suiteName}`);
      
      const testRunner = new TestRunner();
      const runFunction = globalThis[suiteFunction];
      
      if (typeof runFunction !== 'function') {
        throw new Error(`Suite function ${suiteFunction} not found`);
      }
      
      testRunner.addTestSuite(runFunction());
      const results = testRunner.runAllTests();
      
      return {
        success: results.getFailed().length === 0,
        summary: results.getSummary(),
        details: results.getDetailedReport()
      };
      
    } catch (error) {
      GASDBLogger.error(`Failed to execute test suite ${suiteName}`, { error: error.message });
      throw error;
    }
  }
  
  /**
   * Validate setup for a specific section
   * @param {number} sectionNumber - The section number
   * @returns {Object} Validation results
   */
  static validateSetup(sectionNumber) {
    const section = TEST_SECTIONS[sectionNumber];
    if (!section) {
      throw new Error(`Invalid section number: ${sectionNumber}`);
    }
    
    try {
      GASDBLogger.info(`Running ${section.name} setup validation...`);
      
      const validations = [];
      
      for (const validation of section.validations) {
        try {
          const result = validation.test();
          validations.push({ 
            component: validation.component, 
            status: result.status, 
            message: result.message 
          });
        } catch (error) {
          validations.push({ 
            component: validation.component, 
            status: 'FAIL', 
            message: error.message 
          });
        }
      }
      
      // Log results
      GASDBLogger.info(`${section.name} Validation Results:`);
      validations.forEach(validation => {
        GASDBLogger.info(`${validation.component}: ${validation.status} - ${validation.message}`);
      });
      
      const allPassed = validations.every(v => v.status === 'PASS');
      const summary = `${validations.filter(v => v.status === 'PASS').length}/${validations.length} components validated successfully`;
      
      GASDBLogger.info(`Overall ${section.name} validation: ${allPassed ? 'PASS' : 'PARTIAL'} - ${summary}`);
      
      return {
        success: allPassed,
        summary: summary,
        validations: validations
      };
      
    } catch (error) {
      GASDBLogger.error(`${section.name} validation failed`, { error: error.message });
      throw error;
    }
  }
  
  /**
   * Get available sections and their test suites
   * @returns {Object} Available test sections and suites
   */
  static getAvailableTests() {
    const result = {};
    
    for (const [sectionNum, section] of Object.entries(TEST_SECTIONS)) {
      result[sectionNum] = {
        name: section.name,
        description: section.description,
        suites: Object.keys(section.suites)
      };
    }
    
    return result;
  }
  
  /**
   * initialise test environment with basic checks
   * @returns {Object} Initialization results
   */
  static initialiseEnvironment() {
    try {
      GASDBLogger.info('Initializing GAS DB test environment...');
      
      const checks = [];
      
      // Check basic GAS environment
      try {
        Logger.log('Testing Logger access');
        checks.push({ component: 'GAS Logger', status: 'PASS', message: 'Logger accessible' });
      } catch (error) {
        checks.push({ component: 'GAS Logger', status: 'FAIL', message: error.message });
      }
      
      // Check Drive API permissions
      try {
        DriveApp.getRootFolder().getName();
        checks.push({ component: 'Drive API', status: 'PASS', message: 'Drive API accessible' });
      } catch (error) {
        checks.push({ component: 'Drive API', status: 'FAIL', message: error.message });
      }
      
      // Check ScriptProperties access
      try {
        PropertiesService.getScriptProperties().getProperty('test_init');
        checks.push({ component: 'ScriptProperties', status: 'PASS', message: 'ScriptProperties accessible' });
      } catch (error) {
        checks.push({ component: 'ScriptProperties', status: 'FAIL', message: error.message });
      }
      
      // Check test framework components
      try {
        if (typeof TestRunner === 'function' && typeof TestSuite === 'function' && typeof AssertionUtilities === 'object') {
          checks.push({ component: 'Test Framework', status: 'PASS', message: 'Test framework components available' });
        } else {
          checks.push({ component: 'Test Framework', status: 'FAIL', message: 'Missing test framework components' });
        }
      } catch (error) {
        checks.push({ component: 'Test Framework', status: 'FAIL', message: error.message });
      }
      
      const allPassed = checks.every(check => check.status === 'PASS');
      const summary = `${checks.filter(c => c.status === 'PASS').length}/${checks.length} environment checks passed`;
      
      GASDBLogger.info('Environment initialization results:');
      checks.forEach(check => {
        GASDBLogger.info(`${check.component}: ${check.status} - ${check.message}`);
      });
      
      GASDBLogger.info(`Environment initialization: ${allPassed ? 'SUCCESS' : 'PARTIAL'} - ${summary}`);
      
      return {
        success: allPassed,
        summary: summary,
        checks: checks
      };
      
    } catch (error) {
      GASDBLogger.error('Environment initialization failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Run an individual test for debugging purposes
   * @param {number} sectionNumber - The section number
   * @param {string} suiteName - The name of the test suite
   * @param {string} testName - The name of the specific test
   * @returns {Object} Test execution result
   */
  static runIndividualTest(sectionNumber, suiteName, testName) {
    try {
      const section = TEST_SECTIONS[sectionNumber];
      if (!section) {
        return {
          success: false,
          error: `Section ${sectionNumber} not found`,
          summary: `Invalid section number: ${sectionNumber}`
        };
      }

      const suiteFunction = section.suites[suiteName];
      if (!suiteFunction) {
        const availableSuites = Object.keys(section.suites).join(', ');
        return {
          success: false,
          error: `Test suite '${suiteName}' not found in section ${sectionNumber}`,
          summary: `Available suites: ${availableSuites}`
        };
      }

      const testRunner = new TestRunner();
      const runFunction = globalThis[suiteFunction];
      
      if (typeof runFunction !== 'function') {
        return {
          success: false,
          error: `Suite function ${suiteFunction} not found`,
          summary: `Test suite function '${suiteFunction}' is not available`
        };
      }

      // Execute the suite function to get the TestSuite instance
      const suite = runFunction();
      
      // Check if the test exists before running
      if (!suite.tests.has(testName)) {
        const availableTests = this._getTestsInSuite(suite);
        return {
          success: false,
          error: `Test '${testName}' not found in suite '${suiteName}'`,
          summary: `Available tests: ${availableTests.join(', ')}`
        };
      }

      // Create a temporary suite with only the specific test for proper lifecycle execution
      const tempSuite = new TestSuite(suiteName);
      tempSuite.addTest(testName, suite.tests.get(testName));
      
      // Copy lifecycle hooks to ensure proper setup/teardown
      tempSuite.setBeforeAll(suite.beforeAll);
      tempSuite.setAfterAll(suite.afterAll);
      tempSuite.setBeforeEach(suite.beforeEach);
      tempSuite.setAfterEach(suite.afterEach);
      
      testRunner.addTestSuite(tempSuite);

      // Run the test suite (which now contains only the specific test)
      const result = testRunner.runAllTests();
      
      if (!result) {
        return {
          success: false,
          error: `Failed to execute test '${testName}' in suite '${suiteName}'`,
          summary: `Test execution failed`
        };
      }

      return {
        success: true,
        result: result,
        summary: `Individual test completed: ${suiteName} -> ${testName}`,
        details: result
      };

    } catch (error) {
      return {
        success: false,
        error: error.toString(),
        summary: `Error running individual test: ${error.message}`
      };
    }
  }

  /**
   * List all available tests in a section
   * @param {number} sectionNumber - The section number
   * @returns {Object} Available tests organised by suite
   */
  static listSectionTests(sectionNumber) {
    try {
      const section = TEST_SECTIONS[sectionNumber];
      if (!section) {
        return {
          success: false,
          error: `Section ${sectionNumber} not found`
        };
      }

      const testsBySuite = {};
      
      Object.keys(section.suites).forEach(suiteName => {
        try {
          const suiteFunctionName = section.suites[suiteName];
          const suiteFunction = globalThis[suiteFunctionName];
          
          if (typeof suiteFunction === 'function') {
            const suite = suiteFunction();
            const tests = this._getTestsInSuite(suite);
            testsBySuite[suiteName] = tests;
          } else {
            testsBySuite[suiteName] = [`Function ${suiteFunctionName} not found`];
          }
        } catch (error) {
          testsBySuite[suiteName] = [`Error loading suite: ${error.message}`];
        }
      });

      return {
        success: true,
        section: sectionNumber,
        suites: testsBySuite,
        summary: `Found ${Object.keys(testsBySuite).length} test suites in section ${sectionNumber}`
      };

    } catch (error) {
      return {
        success: false,
        error: error.toString()
      };
    }
  }

  /**
   * Extract test names from a TestSuite instance
   * @param {TestSuite} suite - The test suite
   * @returns {Array<string>} Array of test names
   * @private
   */
  static _getTestsInSuite(suite) {
    if (!suite || !suite.tests) {
      return [];
    }
    
    // TestSuite.tests is a Map, so we need to get the keys
    return Array.from(suite.tests.keys());
  }
}
