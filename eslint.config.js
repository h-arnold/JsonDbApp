// ESLint configuration for Google Apps Script (GAS) projects
import jsdoc from 'eslint-plugin-jsdoc';
import googleappsscript from 'eslint-plugin-googleappsscript';
import { defineConfig } from 'eslint/config';

const gasGlobals = {
  ...googleappsscript.environments.googleappsscript.globals,
  CalendarApp: 'readonly',
  CardService: 'readonly',
  Charts: 'readonly',
  Classroom: 'readonly',
  DataStudioApp: 'readonly',
  DocumentApp: 'readonly',
  Drive: 'readonly',
  DriveApp: 'readonly',
  GmailApp: 'readonly',
  HtmlService: 'readonly',
  LockService: 'readonly',
  MailApp: 'readonly',
  PropertiesService: 'readonly',
  ScriptApp: 'readonly',
  Session: 'readonly',
  SlidesApp: 'readonly',
  SpreadsheetApp: 'readonly',
  UrlFetchApp: 'readonly',
  Utilities: 'readonly',
  XmlService: 'readonly'
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
      globals: gasGlobals
    },
    plugins: {
      googleappsscript,
      jsdoc
    },
    rules: {
      'complexity': ['warn', 8],
      'curly': ['warn', 'all'],
      'eqeqeq': ['warn', 'always'],
      'jsdoc/require-description': [
        'warn',
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
        'warn',
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
      'jsdoc/require-param': 'warn',
      'jsdoc/require-param-description': 'warn',
      'jsdoc/require-param-type': 'warn',
      'jsdoc/require-returns': 'warn',
      'jsdoc/require-returns-description': 'warn',
      'jsdoc/require-returns-type': 'warn',
      'max-len': ['warn', { code: 160 }],
      'no-console': 'off',
      'no-magic-numbers': [
        'warn',
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
    rules: {
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
  }
]);
