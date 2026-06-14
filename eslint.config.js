import js from "@eslint/js";
import globals from "globals";

export default [
  // Vendored Planck.js is not ours to lint.
  {
    ignores: ["js/planck.min.js", "node_modules/**", "coverage/**"],
  },

  // Game source: browser environment, planck provided as a global by index.html.
  {
    files: ["js/**/*.js"],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        ...globals.browser,
        planck: "readonly",
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": [
        "error",
        {
          // Event handlers keep their `ev` parameter for signature clarity.
          args: "none",
        },
      ],
    },
  },

  // Test + config files: Node + Vitest in a jsdom (browser) environment.
  {
    files: ["test/**/*.js", "*.config.js", "eslint.config.js"],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },
];
