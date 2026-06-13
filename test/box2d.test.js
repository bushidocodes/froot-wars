import { describe, it, expect, vi } from "vitest";
import { loadGame } from "./helpers/loadGame.js";

describe("Box2d.step", () => {
  it("clamps a large timestep to the 2/60s ceiling", () => {
    const { box2d } = loadGame();
    box2d.init();
    box2d.step(1); // a huge frame gap
    expect(box2d.world.lastTimeStep).toBeCloseTo(2 / 60);
  });

  it("passes a small timestep through unchanged", () => {
    const { box2d } = loadGame();
    box2d.init();
    box2d.step(1 / 120);
    expect(box2d.world.lastTimeStep).toBeCloseTo(1 / 120);
  });
});

describe("collision damage (PostSolve)", () => {
  function fakeContact(entityA, entityB) {
    const body = (entity) => ({ GetBody: () => ({ GetUserData: () => entity }) });
    return {
      GetFixtureA: () => body(entityA),
      GetFixtureB: () => body(entityB),
    };
  }

  it("subtracts impulse from both bodies' health above the threshold", () => {
    const { box2d } = loadGame();
    box2d.init();
    const listener = box2d.world.contactListener;

    const a = { health: 100, bounceSound: { play: vi.fn() } };
    const b = { health: 50, bounceSound: { play: vi.fn() } };
    listener.PostSolve(fakeContact(a, b), { normalImpulses: [30] });

    expect(a.health).toBe(70);
    expect(b.health).toBe(20);
    expect(a.bounceSound.play).toHaveBeenCalled();
    expect(b.bounceSound.play).toHaveBeenCalled();
  });

  it("ignores tiny impulses below the threshold", () => {
    const { box2d } = loadGame();
    box2d.init();
    const listener = box2d.world.contactListener;

    const a = { health: 100, bounceSound: { play: vi.fn() } };
    listener.PostSolve(fakeContact(a, null), { normalImpulses: [3] });

    expect(a.health).toBe(100);
    expect(a.bounceSound.play).not.toHaveBeenCalled();
  });
});
