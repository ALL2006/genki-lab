import eslint from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const projectFiles = ['src/**/*.{ts,tsx}', 'server/**/*.ts', 'shared/**/*.ts', 'tests/**/*.ts', 'vite.config.ts']

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'tmp/**', '.agents/**', 'video/**', 'video-remotion/**'] },
  {
    files: projectFiles,
    ...eslint.configs.recommended,
    languageOptions: {
      ...eslint.configs.recommended.languageOptions,
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
  },
  ...tseslint.configs.recommended.map((config) => ({ ...config, files: projectFiles })),
  {
    files: projectFiles,
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
)
