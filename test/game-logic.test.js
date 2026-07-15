import { describe, expect, it } from "vitest";
import { loadGame } from "./helpers/loadGame.js";

describe("game.panTo (camera)", () => {
  function setup() {
    const { game } = loadGame();
    game.canvas = { width: 640 };
    game.offsetLeft = 0;
    return game;
  }

  it("moves the camera toward the target, capped at maxSpeed", () => {
    const game = setup();
    const settled = game.panTo(700);
    // Target is far, so it should step by exactly maxSpeed and not be settled.
    expect(game.offsetLeft).toBe(game.maxSpeed);
    expect(settled).toBe(false);
  });

  it("clamps to maxOffset and reports settled when it overshoots the bound", () => {
    const game = setup();
    game.offsetLeft = game.maxOffset;
    const settled = game.panTo(700);
    expect(game.offsetLeft).toBe(game.maxOffset);
    expect(settled).toBe(true);
  });

  it("never pans past minOffset", () => {
    const game = setup();
    game.offsetLeft = game.minOffset;
    game.panTo(-500);
    expect(game.offsetLeft).toBeGreaterThanOrEqual(game.minOffset);
  });
});

describe("game.countHeroesAndVillains", () => {
  it("counts heroes and villains present in the world", () => {
    const { levels, game } = loadGame();
    levels.load(0);
    game.countHeroesAndVillains();

    const expectedHeroes = levels.data[0].entities.filter(
      (e) => e.type === "hero"
    ).length;
    const expectedVillains = levels.data[0].entities.filter(
      (e) => e.type === "villain"
    ).length;

    expect(game.heroes.length).toBe(expectedHeroes);
    expect(game.villains.length).toBe(expectedVillains);
  });
});

describe("game.mouseOnCurrentHero", () => {
  // Pointer hit-testing reads the live `mouse` module object, so place the
  // hero at a known pixel center and move `mouse` relative to it.
  function withHero(game, box2d) {
    game.offsetLeft = 0;
    game.currentHero = {
      getPosition: () => ({ x: 100 / box2d.scale, y: 200 / box2d.scale }),
      getUserData: () => ({ radius: 20 }),
    };
  }

  it("is false when there is no current hero", () => {
    const { game } = loadGame();
    game.currentHero = undefined;
    expect(game.mouseOnCurrentHero()).toBe(false);
  });

  it("is true when the pointer sits on the hero", () => {
    const { game, box2d, mouse } = loadGame();
    withHero(game, box2d);
    mouse.x = 100; // hero's pixel center
    mouse.y = 200;
    expect(game.mouseOnCurrentHero()).toBe(true);
  });

  it("is false when the pointer is well outside the radius", () => {
    const { game, box2d, mouse } = loadGame();
    withHero(game, box2d);
    mouse.x = 100 + 50; // 50px away, radius is 20
    mouse.y = 200;
    expect(game.mouseOnCurrentHero()).toBe(false);
  });
});
