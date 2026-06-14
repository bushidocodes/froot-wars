# CLAUDE.md

Guidance for Claude Code (and other coding agents) working in this repo.

## What this is

Froot Wars is a browser game in the spirit of Angry Birds: a slingshot launches
fruit at junk-food villains stacked on wood and glass blocks. It's a static
site — plain HTML, CSS, and JavaScript, no build step, no package manager, no
framework. All gameplay runs client-side using the
[Planck.js](https://piqnt.com/planck.js/) physics engine (a JavaScript rewrite
of Box2D).

## Running the game

The page must be served over HTTP. Opening `index.html` via `file://` breaks
audio loading and some asset paths.

```sh
python3 -m http.server 8000   # macOS / Linux
py -m http.server 8000        # Windows
```

Then open `http://localhost:8000`. The server starts instantly and runs until
you Ctrl+C it — that's expected, don't cancel it thinking it's hung.

There is no build step — refresh the browser to see changes. After any code
change, manually walk through: main menu → level select → play one level →
fire a hero → confirm score updates → restart. Check the browser console for
errors.

## Tests and linting

There is a Vitest unit-test suite and ESLint config (dev-only; the game still
ships with no build step and runs straight from the static files). Install dev
dependencies once with `npm install`, then:

```sh
npm test    # Vitest, jsdom environment
npm run lint
```

The tests load [js/game.js](js/game.js) verbatim inside a faked Planck.js + DOM
harness ([test/helpers/loadGame.js](test/helpers/loadGame.js)) and cover
level-data integrity, level loading, scoring/high-score persistence, the asset
loader, camera panning, and collision damage. Both run in CI
([.github/workflows/ci.yml](.github/workflows/ci.yml)) on every push and PR.
The harness loads the source through `new Function(...)` so each test gets an
isolated instance; if you add a new top-level `const` module object to
game.js, add it to the harness's return list to test it. Manual browser
walkthrough is still the way to verify rendering and input.

## Code layout

```
index.html                 entry point — loads Planck.js, then game.js
css/styles.css             all styling (~100 lines)
js/game.js                 ALL game code lives here (~1,300 lines)
js/planck.min.js           Planck.js physics engine (vendored, do not edit)
images/entities/           sprite per entity name (apple.png, burger.png, ...)
images/backgrounds/        level backgrounds and foregrounds
images/icons/              UI buttons (play, settings, sound, prev, next, ...)
audio/                     sound effects + music, each as paired .mp3/.ogg
```

Everything in [js/game.js](js/game.js) is organized as module-pattern objects
on top-level `const` bindings — no ES modules, no classes except `Box2d`.
The objects are loaded in this order at the bottom of the file:

- `game` — top-level state machine, rendering loop, score, music ([js/game.js:47](js/game.js#L47))
- `levels` — level data (inline array) and loader ([js/game.js:476](js/game.js#L476))
- `loader` — image/audio asset loader with `.ogg`/`.mp3` fallback ([js/game.js:903](js/game.js#L903))
- `mouse` — mouse + touch input, exposes `mouse.x`, `mouse.y`, `mouse.down`, `mouse.dragging` ([js/game.js:971](js/game.js#L971))
- `entities` — entity definitions (physics + shape) and draw routines ([js/game.js:1029](js/game.js#L1029))
- `Box2d` class instantiated as `box2d` — wraps the Planck.js world, body factories, and the `post-solve` collision handler ([js/game.js:1218](js/game.js#L1218))

`document.addEventListener("DOMContentLoaded", ...)` at the top wires up DOM
buttons and calls `game.init()`, which in turn initializes `levels`, `loader`,
and `mouse`.

## The state machine

Gameplay is a state machine driven each frame by `game.handlePanning()`
([js/game.js:172](js/game.js#L172)). `game.mode` cycles through:

```
intro            → camera pans right to show the level
load-next-hero   → places the next fruit on the slingshot
wait-for-firing  → idle; player can drag the camera or grab the fruit
firing           → player is dragging the fruit back
fired            → impulse applied; camera follows the projectile
level-success    → all villains destroyed; pan back to slingshot
level-failure    → out of heroes but villains remain
```

A villain is destroyed when its `health` (from collision damage in the world's
`post-solve` handler, `Box2d.handlePostSolve`) drops to 0, or when it leaves the
world bounds. Heroes that fall asleep, leave the world, or time out after 10
seconds trigger `load-next-hero`.

## Coordinates and scale

Planck.js works in meters; the canvas is in pixels. `box2d.scale = 30` converts
between them — multiply physics positions by `box2d.scale` to get pixel
coordinates, divide pixel coordinates by `box2d.scale` to feed the physics. The
canvas is 640×480; level foregrounds are wider (~1000px) and the camera pans
horizontally via `game.offsetLeft`.

## Adding content

**New level**: append an object to `levels.data` in
[js/game.js:477](js/game.js#L477). Each entry has `foreground`, `background`,
and an `entities` array of `{ type, name, x, y, ... }`. Valid `type`s:
`ground`, `block`, `hero`, `villain`. The level-select buttons regenerate
from `levels.data.length`, so no UI change is needed.

**New entity (fruit, food, block material)**:

1. Add a sprite at `images/entities/<name>.png`. The name must match exactly.
2. Add a definition to `entities.definitions` in
   [js/game.js:1030](js/game.js#L1030) with `shape` (`"circle"` or
   `"rectangle"`), dimensions (`radius` or `width`/`height`), `density`,
   `friction`, `restitution`, and `fullHealth` for destructible entities.
3. Reference it from a level by `name`.

Current entities: heroes `apple`, `orange`, `strawberry`, `pineapple`;
villains `burger`, `fries`, `sodacan`, `mountaindew`, `pizza`, `watermelon`,
`sodaglass`; block materials `wood`, `glass`; static ground `dirt`/`wood`.

**New sound**: drop matching `.mp3` and `.ogg` files in `audio/` and load
via `loader.loadSound("audio/<name>")` (no extension; the loader picks one
based on browser support).

## Things that have caught people out

- The `DEBUG` flag at [js/game.js:4](js/game.js#L4) gates `debugLog`. Leave
  it `false` in commits — flipping it on floods the console.
- `mousedownhandler` calls `ev.preventDefault()` directly on the event (not
  `ev.originalEvent.preventDefault()` — that was an old bug, see commit
  0581091).
- Touch handlers are registered with `{ passive: false }` because they call
  `preventDefault()` to stop the page from scrolling while you aim.
- Both block and entity collisions play `bounceSound`. If you add a new
  destructible type, set `entity.bounceSound = game.bounceSound` in
  `entities.create` ([js/game.js:1138](js/game.js#L1138)) or cascading
  collisions go silent.
- High scores are persisted per level in `localStorage` under
  `highscore-level-<index>`. To reset while testing, clear site data or run
  `localStorage.clear()` in the devtools console.
- Planck.js is exposed as the global `planck` by the vendored
  `js/planck.min.js`; game.js pulls `World`, `Vec2`, `Box`, and `Circle` off it
  at the top of the file. Its API is camelCase (`world.createBody`,
  `body.getPosition`, `world.on("post-solve", ...)`) — unlike the old
  PascalCase Box2dWeb API.

## Conventions

- 2-space indentation, double-quoted strings, semicolons.
- Comments explain *why*, not *what*. Keep them short. Recent commits
  ("Remove stale comments and commented-out code") have been actively pruning
  comment cruft — don't reintroduce it.
- No build means no transpiling: stick to syntax the target browsers run
  natively. The code uses `const`/`let`, arrow functions, classes, and
  template literals freely.
