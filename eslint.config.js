import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'server/dist.*',
      'scripts/test-agent.mjs',
      'scripts/test-emoji-picker-screenshot.mjs',
      'scripts/test-scopae-screenshot.mjs',
      'scripts/test-abandon.mjs',
      'scripts/test-incognito.mjs',
      'scripts/test-mobile.mjs',
      'scripts/test-logic.mjs',
      '**/*.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      // Blocca o segnala console.log consentendo console.warn e console.error
      'no-console': ['error', { allow: ['warn', 'error'] }],

      // Vieta esplicitamente l'uso del tipo any in TypeScript
      '@typescript-eslint/no-explicit-any': 'error',

      // Segnala variabili non utilizzate (ignora variabili con prefisso _)
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-unused-vars': 'off',
    },
  }
);
