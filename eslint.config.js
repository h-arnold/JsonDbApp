// ESLint configuration for Google Apps Script (GAS) projects
import googleappsscript from 'eslint-plugin-googleappsscript';

export default [
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
      globals: googleappsscript.environments.googleappsscript.globals,
    },
    plugins: {
      googleappsscript
    },
    rules: {
      // Add project-specific rules here
      'max-len': ['warn', { code: 120 }],
      'require-jsdoc': 'off',
      'valid-jsdoc': 'off',
      'no-unused-vars': ['warn', { args: 'none' }],
      'no-console': 'off'
    }
  },
  {
    ignores: [
      'node_modules/',
      'tests/data/',
      '*.log',
      '*.pid'
    ]
  }
];
