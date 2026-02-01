// ESLint configuration for Google Apps Script (GAS) projects
import googleappsscript from "eslint-plugin-googleappsscript";

export default [
  {
    files: ["eslint.config.mjs"],
    languageOptions: {
      sourceType: "module",
      ecmaVersion: 2021,
    },
  },
  {
    files: ["tests/**/*.js"],
    languageOptions: {
      sourceType: "module",
      ecmaVersion: 2021,
      globals: {
        ...googleappsscript.environments.googleappsscript.globals,
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
      },
    },
    rules: {
      "max-len": ["warn", { code: 1000 }],
      "require-jsdoc": "off",
      "valid-jsdoc": "off",
      "no-unused-vars": ["warn", { args: "none" }],
      "no-console": "off",
    },
  },
  {
    files: ["src/**/*.js"],
    languageOptions: {
      sourceType: "script",
      ecmaVersion: 2021,
      globals: googleappsscript.environments.googleappsscript.globals,
    },
    plugins: {
      googleappsscript,
    },
    rules: {
      // Add project-specific rules here
      "max-len": ["warn", { code: 1000 }],
      "no-unused-vars": ["warn", { args: "none" }],
      "no-console": "off",
    },
  },
  {
    ignores: ["node_modules/"],
  },
];
