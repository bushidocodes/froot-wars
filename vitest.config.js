import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // game.js is browser code that touches document, localStorage, Image, Audio.
    environment: "jsdom",
    include: ["test/**/*.test.js"],
  },
});
