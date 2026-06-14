// Test harness for js/game.js.
//
// game.js is a browser script: it declares everything on top-level `const`
// bindings (game, levels, loader, mouse, entities, box2d) and expects planck,
// the DOM, localStorage, Image and Audio to exist as globals. Rather than
// refactor the source to add module exports, we load it verbatim inside a
// function wrapper that captures those bindings and returns them, after
// installing a faithful-enough fake Planck.js and a DOM fixture.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const GAME_SRC = fs.readFileSync(
  path.join(dirname, "..", "..", "js", "game.js"),
  "utf8",
);

// --- Fake Planck.js -------------------------------------------------------
// Only the surface game.js actually touches is implemented. The world keeps
// a real singly-linked body list so getBodyList()/getNext() traversal — which
// the scoring and hero/villain counting code relies on — behaves correctly.

function makeBody(bodyDef) {
  return {
    _def: bodyDef,
    _next: null,
    _userData: bodyDef.userData ?? null,
    setUserData(d) {
      this._userData = d;
    },
    getUserData() {
      return this._userData;
    },
    createFixture() {},
    getPosition() {
      return { x: bodyDef.position.x, y: bodyDef.position.y };
    },
    getAngle() {
      return bodyDef.angle || 0;
    },
    getNext() {
      return this._next;
    },
    setPosition(p) {
      bodyDef.position = { x: p.x, y: p.y };
    },
    setLinearVelocity() {},
    setAngularVelocity() {},
    setAwake() {},
    isAwake() {
      return false;
    },
    getWorldCenter() {
      return { x: bodyDef.position.x, y: bodyDef.position.y };
    },
    applyLinearImpulse() {},
  };
}

class MockWorld {
  constructor(gravity) {
    this.gravity = gravity;
    this.bodies = [];
    this.listeners = {};
  }
  _relink() {
    for (let i = 0; i < this.bodies.length; i++) {
      this.bodies[i]._next = this.bodies[i + 1] || null;
    }
  }
  createBody(bodyDef) {
    const body = makeBody(bodyDef);
    this.bodies.push(body);
    this._relink();
    return body;
  }
  getBodyList() {
    return this.bodies[0] || null;
  }
  destroyBody(target) {
    const i = this.bodies.indexOf(target);
    if (i !== -1) {
      this.bodies.splice(i, 1);
      this._relink();
    }
  }
  on(event, fn) {
    this.listeners[event] = fn;
  }
  off(event) {
    delete this.listeners[event];
  }
  step(timeStep) {
    this.stepped = (this.stepped || 0) + 1;
    this.lastTimeStep = timeStep;
  }
}

function makePlanck() {
  return {
    World: MockWorld,
    Vec2: (x, y) => ({ x, y }),
    Box: class {
      constructor(halfWidth, halfHeight) {
        this.halfWidth = halfWidth;
        this.halfHeight = halfHeight;
      }
    },
    Circle: class {
      constructor(radius) {
        this.radius = radius;
      }
    },
  };
}

// --- Fake async asset constructors ---------------------------------------
// Keep jsdom from trying to fetch real image/audio resources (which floods the
// test output with "resource loading" errors and never resolves anyway).

class FakeImage {
  constructor() {
    this.width = 0;
    this.height = 0;
    this.onload = null;
  }
  set src(value) {
    this._src = value;
  }
  get src() {
    return this._src;
  }
}

class FakeAudio {
  constructor() {
    this.paused = true;
    this.currentTime = 0;
  }
  set src(value) {
    this._src = value;
  }
  get src() {
    return this._src;
  }
  addEventListener() {}
  play() {
    this.paused = false;
  }
  pause() {
    this.paused = true;
  }
}

// --- DOM fixture ----------------------------------------------------------

const ELEMENT_IDS = [
  "score",
  "scorescreen",
  "loadingscreen",
  "loadingmessage",
  "endingmessage",
  "endingscreen",
  "playnextlevel",
  "playcurrentlevel",
  "togglemusic",
  "restartlevel",
  "startGameButton",
  "showLevelScreen",
  "levelselectscreen",
  "gamestartscreen",
];

function fakeContext() {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        // Properties that get read back (e.g. strokeStyle) return undefined;
        // everything else is a no-op method.
        return typeof prop === "string" ? () => {} : undefined;
      },
      set() {
        return true;
      },
    },
  );
}

function installFixture() {
  const layers = ELEMENT_IDS.map(
    (id) => `<div id="${id}" class="gamelayer"></div>`,
  ).join("");
  document.body.innerHTML =
    layers +
    '<canvas id="gamecanvas" class="gamelayer" width="640" height="480"></canvas>' +
    '<canvas id="debugcanvas" width="640" height="480"></canvas>';

  for (const id of ["gamecanvas", "debugcanvas"]) {
    document.getElementById(id).getContext = () => fakeContext();
  }
}

/**
 * Load a fresh, isolated instance of game.js with all browser dependencies
 * faked. Returns the module-pattern objects declared at the top level.
 */
export function loadGame() {
  installFixture();

  globalThis.planck = makePlanck();
  globalThis.Image = FakeImage;
  globalThis.Audio = FakeAudio;
  window.requestAnimationFrame = () => 0;
  window.cancelAnimationFrame = () => {};
  localStorage.clear();

  const factory = new Function(
    GAME_SRC +
      "\nreturn { game, levels, loader, mouse, entities, box2d, Box2d };",
  );
  const modules = factory();

  // Run the game's own init so sound effects, canvas/context and the
  // hero/villain break sounds are wired up exactly as in the browser. This is
  // what DOMContentLoaded normally triggers; new Function() doesn't fire it.
  modules.game.init();

  return modules;
}
