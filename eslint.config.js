// eslint.config.js — ESLint v9 flat config for the Oikos cartridge.
//
// A cartridge is a public artifact: it is read by people deciding whether to
// trust Mnemosyne OS with their memory. The rules below are the ones that
// caught real bugs in this codebase, not a style opinion:
//
//  • no-floating-promises  — an un-awaited fetch is how a scan silently half-runs
//  • no-empty              — a silent catch is the project's cardinal sin (CLAUDE rule 7)
//  • exhaustive-deps       — a stale closure is how a dashboard keeps showing
//                            readings from a box the user has since changed
//  • no-explicit-any       — untyped bridge payloads are how a contract drifts
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'eslint.config.js', 'vite.config.ts'],
  },

  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      ...tseslint.configs.recommendedTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        // tsconfig.json excludes the tests so the app build does not depend
        // on the test runner. tsconfig.eslint.json includes them, which types
        // them for linting without a per-file allowlist that stops working
        // past a handful of files.
        project: ['./tsconfig.eslint.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // ── Correctness ────────────────────────────────────────────────────────
      '@typescript-eslint/no-floating-promises': 'error',
      // An async JSX handler is idiomatic React and safe here: every one of
      // them owns its try/catch and reports into the surface's error state.
      // The dangerous case — a promise nobody holds, in ordinary code — stays
      // caught by no-floating-promises above, which is where the real hazard
      // lives (a scan that half-runs because nothing awaited the fetch).
      '@typescript-eslint/no-misused-promises': ['error', {
        checksVoidReturn: { attributes: false },
      }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // A catch that does nothing must SAY it does nothing on purpose — an
      // empty block with a comment inside is allowed, a bare `{}` is not.
      'no-empty': ['error', { allowEmptyCatch: false }],

      // ── Honesty about async ────────────────────────────────────────────────
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/await-thenable': 'error',

      // ── Noise this codebase deliberately allows ────────────────────────────
      // Template literals over unions/numbers are how every label is built.
      '@typescript-eslint/restrict-template-expressions': 'off',
      // The bridge returns `unknown` by contract; callers narrow it.
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },

  // Tests reach into shapes on purpose to reproduce real bad data.
  {
    files: ['src/**/*.test.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
