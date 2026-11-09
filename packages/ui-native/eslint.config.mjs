import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  js.configs.recommended,
  tseslint.configs.recommended,
  react.configs.flat.recommended,
  react.configs.flat['jsx-runtime'],
  reactHooks.configs.flat.recommended,
  { settings: { react: { version: 'detect' } } },
  {
    // Babel and Jest load these configuration files as CommonJS in Node.
    files: ['*.config.js'],
    languageOptions: { sourceType: 'commonjs', globals: globals.node },
  },
]);
