import { describe, expect, it } from "vitest";
import { loadGame } from "./helpers/loadGame.js";

const VALID_TYPES = ["ground", "block", "hero", "villain"];

describe("level data integrity", () => {
  const { levels, entities } = loadGame();

  it("defines at least one level", () => {
    expect(Array.isArray(levels.data)).toBe(true);
    expect(levels.data.length).toBeGreaterThan(0);
  });

  levels.data.forEach((level, index) => {
    describe(`level ${index}`, () => {
      it("names a foreground and background", () => {
        expect(typeof level.foreground).toBe("string");
        expect(typeof level.background).toBe("string");
      });

      it("is playable: has ground, at least one hero and one villain", () => {
        const types = level.entities.map((e) => e.type);
        expect(types).toContain("ground");
        expect(types).toContain("hero");
        expect(types).toContain("villain");
      });

      it("only uses known entity types", () => {
        for (const entity of level.entities) {
          expect(VALID_TYPES).toContain(entity.type);
        }
      });

      it("references only entities that have a definition", () => {
        for (const entity of level.entities) {
          expect(
            entities.definitions[entity.name],
            `level ${index} entity "${entity.name}" has no definition`
          ).toBeDefined();
        }
      });

      it("gives every villain a numeric calorie (score) value", () => {
        for (const entity of level.entities) {
          if (entity.type === "villain") {
            expect(typeof entity.calories).toBe("number");
            expect(entity.calories).toBeGreaterThan(0);
          }
        }
      });

      it("places every entity at numeric coordinates", () => {
        for (const entity of level.entities) {
          expect(typeof entity.x).toBe("number");
          expect(typeof entity.y).toBe("number");
        }
      });
    });
  });
});

describe("levels.load", () => {
  it("resets the score to zero and records the level number", () => {
    const { levels, game } = loadGame();
    game.score = 999;
    levels.load(0);
    expect(game.score).toBe(0);
    expect(game.currentLevel.number).toBe(0);
  });

  it("creates one physics body per entity in the level", () => {
    const { levels, box2d } = loadGame();
    levels.load(0);
    expect(box2d.world.bodies.length).toBe(levels.data[0].entities.length);
  });

  it("resets the asset loader counters", () => {
    const { levels, loader } = loadGame();
    loader.loadedCount = 42;
    levels.load(0);
    // load() zeroes loadedCount, then loadImage() bumps totalCount per asset.
    expect(loader.loadedCount).toBe(0);
    expect(loader.totalCount).toBeGreaterThan(0);
  });
});
