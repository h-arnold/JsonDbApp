// ESLint configuration for Google Apps Script (GAS) projects
import googleappsscript from 'eslint-plugin-googleappsscript';
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
      globals: googleappsscript.environments.googleappsscript.globals,
    },
    plugins: {
      googleappsscript
    },
    rules: {
      // Add project-specific rules here
      'max-len': ['warn', { code: 160 }],
      'require-jsdoc': 'off',
      'valid-jsdoc': 'off',
      'no-unused-vars': ['warn', { args: 'none' }],
      'no-console': 'off'
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
