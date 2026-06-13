import { describe, it, expect } from "vitest";
import { loadGame } from "./helpers/loadGame.js";

describe("harness", () => {
  it("loads game.js and exposes its module objects", () => {
    const g = loadGame();
    expect(g.game).toBeTypeOf("object");
    expect(g.levels).toBeTypeOf("object");
    expect(g.loader).toBeTypeOf("object");
    expect(g.entities).toBeTypeOf("object");
    expect(g.box2d).toBeTypeOf("object");
    expect(g.box2d.scale).toBe(30);
  });
});
