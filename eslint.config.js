// ESLint configuration for Google Apps Script (GAS) projects
import jsdoc from 'eslint-plugin-jsdoc';
import googleappsscript from 'eslint-plugin-googleappsscript';
import sonarjs from 'eslint-plugin-sonarjs';
import prettierConfig from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';

/**
 * Shared project rule set applied to every linted surface: legacy GAS sources and tests under
 * the main JavaScript block plus Node-hosted CommonJS tooling under the dedicated CJS block
 * (e.g. the benchmark harness). Both config blocks reference this single definition so the
 * rule sets cannot drift apart.
 */
const projectRules = {
  complexity: ['warn', 7], // The minimum CC has been set at 7 because there are quite a few functions and methods where reducing it below that would negatively impact readability.
  curly: ['warn', 'all'],
  eqeqeq: ['warn', 'always'],
  'jsdoc/require-description': [
    'error',
    {
      contexts: [
        'FunctionDeclaration',
        'MethodDefinition',
        'ClassDeclaration',
        'FunctionExpression',
        'ArrowFunctionExpression'
      ]
    }
  ],
  'jsdoc/require-jsdoc': [
    'error',
    {
      contexts: [
        'FunctionDeclaration',
        'MethodDefinition',
        'ClassDeclaration',
        'FunctionExpression',
        'ArrowFunctionExpression'
      ]
    }
  ],
  'jsdoc/require-param': 'error',
  'jsdoc/require-param-description': 'error',
  'jsdoc/require-param-type': 'error',
  'jsdoc/require-returns': 'error',
  'jsdoc/require-returns-description': 'error',
  'jsdoc/require-returns-type': 'error',
  'max-len': ['warn', { code: 160 }],
  'max-lines': ['warn', { max: 500, skipBlankLines: true, skipComments: true }],
  'no-console': 'off',
  'no-magic-numbers': [
    'error',
    {
      ignore: [0, 1],
      ignoreArrayIndexes: true,
      enforceConst: true
    }
  ],
  'no-unused-vars': ['warn', { args: 'none' }],
  'no-var': 'error',
  'prefer-const': 'warn',
  'require-jsdoc': 'off',
  'valid-jsdoc': 'off',
  // SonarJS rules: locally enforced equivalents of the SonarCloud scanner rules so
  // issues surface during `npm run lint` rather than only in the remote quality gate.
  // Two of the recommended rules are disabled because they are noisy false positives in
  // the GAS single-file source layout (early-exit refactors are not always clearer here).
  'sonarjs/prefer-single-boolean-return': 'off',
  'sonarjs/prefer-immediate-return': 'off'
};

/**
 * Explicit Node host globals for CommonJS tooling blocks. Declared inline because the `globals`
 * npm package is not a direct dependency of this repository.
 */
const nodeHostGlobals = {
  console: 'readonly',
  process: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
  globalThis: 'readonly'
};

export default defineConfig([
  {
    files: ['**/*.js'],
    languageOptions: {
      sourceType: 'script',
      ecmaVersion: 2021,
      globals: googleappsscript.environments.googleappsscript.globals
    },
    plugins: {
      googleappsscript,
      jsdoc,
      sonarjs
    },
    rules: { ...sonarjs.configs.recommended.rules, ...projectRules }
  },
  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      ecmaVersion: 2022,
      globals: nodeHostGlobals
    },
    plugins: {
      googleappsscript,
      jsdoc,
      sonarjs
    },
    rules: { ...sonarjs.configs.recommended.rules, ...projectRules }
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 2021
    },
    rules: {
      // Allow magic numbers in tests for clearer expectations and data fixtures.
      'no-magic-numbers': 'off',
      // SonarJS rules that are noisy or unsuitable for the test surface. They are either
      // enabled in the SonarCloud default JS profile (so the remote gate agrees) or are
      // test-fixture patterns where the rule is a false positive. Each disable is paired
      // with a one-line rationale so future audits can revisit the decision.
      'sonarjs/prefer-specific-assertions': 'off', // Tests use generic .toBe() matchers for clarity of intent.
      'sonarjs/constructor-for-side-effects': 'off', // Tests intentionally construct for side effects (e.g. expect().toThrow).
      'sonarjs/pseudo-random': 'off', // Math.random() in helpers generates test-fixture IDs, not security material.
      'sonarjs/super-linear-regex': 'off', // Test regex fixtures operate on tiny strings; no ReDoS exposure.
      'sonarjs/no-floating-point-equality': 'off', // One set-operator assertion compares a stored float round-trip; not a real defect.
      'sonarjs/assertions-in-tests': 'off', // Some specs assert via throwing helpers, leaving no direct expect().
      'sonarjs/no-nested-conditional': 'off', // Test expectations often use compact ternaries; readability is acceptable.
      'sonarjs/todo-tag': 'off' // Test files legitimately carry TODOs for follow-up coverage; not enforced here.
    }
  },
  {
    ignores: [
      'eslint.config.js',
      'node_modules/',
      'tests/data/',
      '*.log',
      '*.pid',
      // Excluded from SonarCloud via sonar.exclusions in sonar-project.properties (test
      // harness loader; executes only trusted, first-party legacy src files). Mirrored
      // here so the local ESLint SonarJS gate stays consistent with the remote gate.
      'tools/gas-mocks/legacy-boot.cjs'
    ]
  },
  prettierConfig
]);
