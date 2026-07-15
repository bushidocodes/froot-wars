import { describe, expect, it } from "vitest";
import { loadGame } from "./helpers/loadGame.js";

// game.showEndingScreen() is where a finished level is scored against the
// per-level high score persisted in localStorage.
function endLevel({ number, score, mode = "level-success", best }) {
  const g = loadGame();
  const { game } = g;
  game.backgroundMusic = new Audio();
  game.currentLevel = { number };
  game.score = score;
  game.mode = mode;
  if (best !== undefined) {
    localStorage.setItem(`highscore-level-${number}`, String(best));
  }
  game.showEndingScreen();
  return g;
}

describe("high-score persistence", () => {
  it("records a new high score when the score beats the stored best", () => {
    endLevel({ number: 0, score: 500 });
    expect(localStorage.getItem("highscore-level-0")).toBe("500");
    expect(document.getElementById("endingmessage").innerHTML).toContain(
      "New best!"
    );
  });

  it("does not overwrite a higher stored best", () => {
    endLevel({ number: 0, score: 500, best: 800 });
    expect(localStorage.getItem("highscore-level-0")).toBe("800");
    expect(document.getElementById("endingmessage").innerHTML).toContain(
      "Best: 800"
    );
  });

  it("treats an exactly-equal score as not a new record", () => {
    endLevel({ number: 0, score: 800, best: 800 });
    expect(localStorage.getItem("highscore-level-0")).toBe("800");
    expect(document.getElementById("endingmessage").innerHTML).not.toContain(
      "New best!"
    );
  });

  it("keeps high scores separate per level", () => {
    endLevel({ number: 1, score: 250 });
    expect(localStorage.getItem("highscore-level-1")).toBe("250");
    expect(localStorage.getItem("highscore-level-0")).toBeNull();
  });
});

describe("end-of-level messaging", () => {
  it("offers the next level when one remains", () => {
    const { levels } = endLevel({ number: 0, score: 100 });
    // Only meaningful if more than one level exists.
    if (levels.data.length > 1) {
      expect(document.getElementById("playnextlevel").style.display).toBe(
        "block"
      );
    }
  });

  it("hides 'next level' after the final level", () => {
    const { levels } = loadGame();
    const last = levels.data.length - 1;
    endLevel({ number: last, score: 100 });
    expect(document.getElementById("playnextlevel").style.display).toBe("none");
  });

  it("shows a failure message when the level is lost", () => {
    endLevel({ number: 0, score: 100, mode: "level-failure" });
    expect(document.getElementById("endingmessage").innerHTML).toContain(
      "Failed"
    );
    expect(document.getElementById("playnextlevel").style.display).toBe("none");
  });
});
