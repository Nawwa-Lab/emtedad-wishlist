import eslint from '@eslint/js'
import prettier from 'eslint-plugin-prettier/recommended'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['coverage/**', 'dist/**'] },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  prettier,
)
