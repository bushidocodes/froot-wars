import { describe, expect, it } from "vitest";
import { loadGame } from "./helpers/loadGame.js";

describe("entities.create", () => {
  it("gives a destructible villain its full health from the definition", () => {
    const { entities, box2d } = loadGame();
    box2d.init();
    const burger = { type: "villain", name: "burger", x: 100, y: 100 };
    entities.create(burger);

    const def = entities.definitions.burger;
    expect(burger.health).toBe(def.fullHealth);
    expect(burger.fullHealth).toBe(def.fullHealth);
    expect(burger.shape).toBe("circle");
    expect(burger.radius).toBe(def.radius);
    expect(box2d.world.bodies.length).toBe(1);
  });

  it("builds rectangular block bodies with their material's health", () => {
    const { entities, box2d } = loadGame();
    box2d.init();
    const plank = {
      type: "block",
      name: "wood",
      x: 100,
      y: 100,
      width: 40,
      height: 100,
    };
    entities.create(plank);

    expect(plank.shape).toBe("rectangle");
    expect(plank.health).toBe(entities.definitions.wood.fullHealth);
    expect(box2d.world.bodies.length).toBe(1);
  });

  it("ignores entities whose name has no definition", () => {
    const { entities, box2d } = loadGame();
    box2d.init();
    entities.create({ type: "villain", name: "does-not-exist", x: 0, y: 0 });
    expect(box2d.world.bodies.length).toBe(0);
  });

  it("attaches the created entity to its physics body as user data", () => {
    const { entities, box2d } = loadGame();
    box2d.init();
    const apple = { type: "hero", name: "apple", x: 50, y: 50 };
    entities.create(apple);
    expect(box2d.world.bodies[0].getUserData()).toBe(apple);
  });
});
