// @ts-check

import eslint from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from "eslint-config-prettier/flat";

export default defineConfig([
  eslint.configs.recommended,
  tseslint.configs.recommended,
  eslintConfigPrettier,
  tseslint.configs.stylistic,

  // on ignore la génération des types api car on a une erreur sur les headers des réponses
  globalIgnores(["src/types/api.d.ts"])
]);
