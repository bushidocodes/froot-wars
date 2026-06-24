import js from "@eslint/js";
import globals from "globals";

export default [
  // Vendored Planck.js is not ours to lint.
  {
    ignores: ["js/planck.esm.js", "node_modules/**", "coverage/**"],
  },

  // Game source: an ES module running in the browser; Planck is imported.
  {
    files: ["js/**/*.js"],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2025,
      sourceType: "module",
      globals: {
        ...globals.browser,
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
      ecmaVersion: 2025,
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },
];
