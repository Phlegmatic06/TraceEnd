import js from "@eslint/js";
import globals from "globals";
import ts from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";
import reactHooksPlugin from "eslint-plugin-react-hooks";

export default ts.config(
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    ignores: [".next/**", "node_modules/**", "scratch/**", "out/**", "eslint.config.mjs", "postcss.config.js", "next.config.js"],
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.mjs"],
    plugins: {
      "@next/next": nextPlugin,
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      ...reactHooksPlugin.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "preserve-caught-error": "off",
    },
  }
);
