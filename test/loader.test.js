import { describe, it, expect, vi } from "vitest";
import { loadGame } from "./helpers/loadGame.js";

describe("asset loader", () => {
  it("counts assets as they are requested", () => {
    const { loader } = loadGame();
    loader.totalCount = 0;
    loader.loadImage("images/entities/apple.png");
    loader.loadImage("images/entities/orange.png");
    expect(loader.totalCount).toBe(2);
    expect(loader.loaded).toBe(false);
  });

  it("fires onload exactly once when the final asset finishes", () => {
    const { loader } = loadGame();
    loader.loaded = false;
    loader.loadedCount = 0;
    loader.totalCount = 2;
    const onload = vi.fn();
    loader.onload = onload;

    loader.itemLoaded(); // 1 of 2 — not done yet
    expect(onload).not.toHaveBeenCalled();
    expect(loader.loaded).toBe(false);

    loader.itemLoaded(); // 2 of 2 — done
    expect(onload).toHaveBeenCalledTimes(1);
    expect(loader.loaded).toBe(true);

    // onload is cleared so a later stray completion can't re-trigger start.
    expect(loader.onload).toBeUndefined();
  });
});
