// ESLint configuration for Google Apps Script (GAS) projects
import jsdoc from 'eslint-plugin-jsdoc';
import googleappsscript from 'eslint-plugin-googleappsscript';
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
  'valid-jsdoc': 'off'
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
    files: ['eslint.config.js'],
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 2021
    }
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      sourceType: 'script',
      ecmaVersion: 2021,
      globals: googleappsscript.environments.googleappsscript.globals
    },
    plugins: {
      googleappsscript,
      jsdoc
    },
    rules: projectRules
  },
  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      ecmaVersion: 2021,
      globals: nodeHostGlobals
    },
    plugins: {
      googleappsscript,
      jsdoc
    },
    rules: projectRules
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 2021
    },
    rules: {
      // Allow magic numbers in tests for clearer expectations and data fixtures.
      'no-magic-numbers': 'off'
    }
  },
  {
    ignores: [
      'eslint.config.js',
      'node_modules/',
      'tests/data/',
      '*.log',
      '*.pid',
      'tools/gas-mocks/**'
    ]
  },
  prettierConfig
]);
