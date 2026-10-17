import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";

export default tseslint.config(
  // Global ignores
  { ignores: ["dist/**", "node_modules/**", "*.js", "*.mjs", "src/**/*.test.ts"] },

  // Base JS recommended rules
  js.configs.recommended,

  // TypeScript strict rules
  ...tseslint.configs.recommended,

  // Prettier — disables conflicting ESLint formatting rules
  prettierConfig,

  // Project-specific rules
  {
    files: ["src/**/*.ts"],
    plugins: { prettier },
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    rules: {
      // ── Prettier ──────────────────────────────────────────
      "prettier/prettier": "warn",

      // ── TypeScript strict ─────────────────────────────────
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-require-imports": "off",

      // ── General quality ───────────────────────────────────
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "error",
      "no-duplicate-imports": "error",
      "prefer-const": "error",
      eqeqeq: ["error", "always"],
      curly: ["error", "all"],

      // ── Downgraded — existing patterns in codebase ────────
      "@typescript-eslint/only-throw-error": "warn",
      "preserve-caught-error": "off",
    },
  },
);
