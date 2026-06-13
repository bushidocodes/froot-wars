import js from "@eslint/js";
import globals from "globals";

export default [
  // Vendored Box2D and dependencies are not ours to lint.
  {
    ignores: [
      "js/Box2dWeb-2.1.a.3.min.js",
      "js/box2d.js",
      "node_modules/**",
      "coverage/**",
    ],
  },

  // Game source: browser environment, Box2D provided as a global by index.html.
  {
    files: ["js/**/*.js"],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        ...globals.browser,
        Box2D: "readonly",
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": [
        "error",
        {
          // Box2D type aliases at the top of game.js are kept as a complete
          // set even when a build doesn't reference every one.
          varsIgnorePattern: "^b2",
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
