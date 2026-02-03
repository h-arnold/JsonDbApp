// ESLint configuration for Google Apps Script (GAS) projects
import jsdoc from 'eslint-plugin-jsdoc';
import googleappsscript from 'eslint-plugin-googleappsscript';
import prettierConfig from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';

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
    rules: {
      'complexity': ['warn', 6],
      'curly': ['warn', 'all'],
      'eqeqeq': ['warn', 'always'],
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
    }
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
      '*.pid'
    ]
  },
  prettierConfig
]);
