import js from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default [
  {
    ignores: [
      "node_modules",
      "dist",
      "build",
      "coverage",
      "backend/node_modules",
      "frontend/node_modules",
      "scripts",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "no-console": "error",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "consistent-return": "error",
      "prefer-const": "error",
      "no-duplicate-imports": "error",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "warn",
    },
  },
  {
    files: ["backend/tests/**/*.js", "frontend/src/__tests__/**/*.jsx"],
    rules: {
      "no-console": "off",
    },
  },
  prettier,
];
