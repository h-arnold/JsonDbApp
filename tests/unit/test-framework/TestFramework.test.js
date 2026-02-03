/**
 * TestFramework Core Tests
 *
 * Refactored from old_tests/unit/TestFrameworkTest.js to validate
 * assertion helpers and TestSuite integration.
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import '../../setup/gas-mocks.setup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../..');

const legacyFrameworkScripts = [
  'old_tests/framework/01_AssertionUtilities.js',
  'old_tests/framework/02_TestResult.js',
  'old_tests/framework/03_TestRunner.js',
  'old_tests/framework/04_TestSuite.js',
  'old_tests/framework/05_TestFramework.js'
];

/**
 * Load a legacy test framework script into the current VM context.
 * @param {string} relativePath - Path from repository root to the script file.
 */
const loadLegacyScript = relativePath => {
  const absolutePath = path.join(repoRoot, relativePath);
  const source = fs.readFileSync(absolutePath, 'utf8');
  vm.runInThisContext(source, { filename: absolutePath });
};

beforeAll(() => {
  if (!globalThis.__legacyTestFrameworkLoaded) {
    legacyFrameworkScripts.forEach(loadLegacyScript);
    globalThis.__legacyTestFrameworkLoaded = true;
  }
});

describe('TestFramework Assertions', () => {
  it('should expose core assertion utilities', () => {
    expect(() => TestFramework.assertEquals(1, 1)).not.toThrow();
    expect(() => TestFramework.assertNotEquals(1, 2)).not.toThrow();
    expect(() => TestFramework.assertTrue(true)).not.toThrow();
    expect(() => TestFramework.assertFalse(false)).not.toThrow();
    expect(() => TestFramework.assertNull(null)).not.toThrow();
    expect(() => TestFramework.assertNotNull('value')).not.toThrow();
    expect(() => TestFramework.assertDefined('value')).not.toThrow();
    expect(() => TestFramework.assertUndefined(undefined)).not.toThrow();
    expect(() => TestFramework.assertArrayEquals([1, 2], [1, 2])).not.toThrow();
    expect(() => TestFramework.assertMatches('abc', /a.c/)).not.toThrow();
  });

  it('should detect missing throws via assertThrows', () => {
    expect(() => TestFramework.assertThrows(() => {})).toThrow(/Expected function to throw/);
    expect(() => TestFramework.assertThrows(() => { throw new TypeError('boom'); }, TypeError)).not.toThrow();
  });
});

describe('TestSuite Integration', () => {
  it('should register and execute tests within TestFramework', () => {
    const framework = new TestFramework();
    const suite = new TestSuite('Framework Behaviour Suite');
    let executed = false;

    suite.addTest('dummyTest', () => {
      executed = true;
    });

    framework.registerTestSuite(suite);

    const availableTests = framework.listTests();
    expect(availableTests['Framework Behaviour Suite']).toContain('dummyTest');

    const results = framework.runTestSuite('Framework Behaviour Suite');
    expect(executed).toBe(true);
    expect(results).toBeInstanceOf(TestResults);
    expect(results.getPassed().length).toBe(1);
    expect(results.getFailed().length).toBe(0);
  });
});
