import js from '@eslint/js';
import sonarjs from 'eslint-plugin-sonarjs';
import tseslint from 'typescript-eslint';

// Clean-code limits (CLAUDE.md, "Código limpo"). Enforced in CI.
const MAX_FILE_LINES = 200;
const MAX_TEST_FILE_LINES = 300;
const MAX_FUNCTION_LINES = 40;
const MAX_COGNITIVE_COMPLEXITY = 10;
const MAX_PARAMS = 3;
const STRING_LITERAL = String.raw`Literal[raw=/^['"]/]`;

export default tseslint.config(
  {
    ignores: [
      'docs/**',
      '**/dist/**',
      '.remember/**',
      '.playwright-mcp/**',
      '.claude/**',
      '**/generated/**',
      'apps/web/public/**',
    ],
  },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  sonarjs.configs.recommended,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      'max-lines': ['error', { max: MAX_FILE_LINES, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': [
        'error',
        { max: MAX_FUNCTION_LINES, skipBlankLines: true, skipComments: true },
      ],
      'max-params': ['error', MAX_PARAMS],
      'sonarjs/cognitive-complexity': ['error', MAX_COGNITIVE_COMPLEXITY],
      // No loose strings: repeated literals and literal comparisons go through named consts.
      'sonarjs/no-duplicate-string': ['error', { threshold: 2 }],
      'no-restricted-syntax': [
        'error',
        {
          selector: `BinaryExpression[operator=/^[!=]==?$/] > ${STRING_LITERAL}`,
          message: 'Compare against a named const or enum, not a string literal.',
        },
        {
          selector: `SwitchCase > ${STRING_LITERAL}`,
          message: 'Switch on a named const or enum, not a string literal.',
        },
      ],
      '@typescript-eslint/no-magic-numbers': [
        'error',
        {
          ignore: [-1, 0, 1],
          ignoreEnums: true,
          ignoreNumericLiteralTypes: true,
          ignoreReadonlyClassProperties: true,
          ignoreTypeIndexes: true,
        },
      ],
      'no-console': 'error',
    },
  },
  {
    // Tests and fixtures read better with literal data inline.
    files: ['**/*.test.ts', '**/seed*.ts', '**/eval/data/**', '**/fixtures/**', '**/*-fixtures.ts'],
    rules: {
      'max-lines': [
        'error',
        { max: MAX_TEST_FILE_LINES, skipBlankLines: true, skipComments: true },
      ],
      'max-lines-per-function': 'off',
      'sonarjs/no-duplicate-string': 'off',
      '@typescript-eslint/no-magic-numbers': 'off',
    },
  },
  // CLI scripts talk to the terminal.
  { files: ['**/scripts/**', '**/eval/run*.ts'], rules: { 'no-console': 'off' } },
  { files: ['**/*.js'], extends: [tseslint.configs.disableTypeChecked] },
);
