// @ts-check
import { Box, Circle, Vec2, World } from "./planck.esm.js";

/** @typedef {import("./planck.esm.js").Body} Body */
/** @typedef {import("./planck.esm.js").Contact} Contact */
/** @typedef {import("./planck.esm.js").ContactImpulse} ContactImpulse */
/** @typedef {import("./planck.esm.js").Shape} Shape */

/**
 * A physics-backed game object: a fruit hero, a junk-food villain, a wood/glass
 * block, or static ground. Level data supplies the first few fields by hand;
 * entities.create() fills in the rest from the matching entity definition.
 * @typedef {Object} Entity
 * @property {"ground" | "block" | "hero" | "villain"} type
 * @property {string} name
 * @property {number} x
 * @property {number} y
 * @property {number} [width]
 * @property {number} [height]
 * @property {number} [radius]
 * @property {number} [angle]
 * @property {boolean} [isStatic]
 * @property {number} [calories] score awarded when a villain is destroyed
 * @property {number} [health] remaining health; drops via collision damage
 * @property {number} [fullHealth]
 * @property {"circle" | "rectangle"} [shape]
 * @property {HTMLImageElement} [sprite]
 * @property {HTMLAudioElement} [breakSound]
 * @property {HTMLAudioElement} [bounceSound]
 */

/**
 * The physics and shape parameters shared by every entity of a given name.
 * @typedef {Object} EntityDefinition
 * @property {"circle" | "rectangle"} [shape]
 * @property {number} [fullHealth]
 * @property {number} [radius]
 * @property {number} [width]
 * @property {number} [height]
 * @property {number} density
 * @property {number} friction
 * @property {number} restitution
 */

/**
 * @typedef {Object} Level
 * @property {string} foreground
 * @property {string} background
 * @property {Entity[]} entities
 */

/**
 * The level currently loaded, plus its lazily-loaded background/foreground art.
 * @typedef {Object} CurrentLevel
 * @property {number} number
 * @property {HTMLImageElement} [backgroundImage]
 * @property {HTMLImageElement} [foregroundImage]
 */

// Debug flag used to control logging
const DEBUG = false;
/** @param {...unknown} args */
const debugLog = (...args) => {
  if (DEBUG) console.log(...args);
};

// Dimensions of the game board
const BOARD_WIDTH = 640;
const BOARD_HEIGHT = 480;

// Slingshot prong attachment points (pixel offsets from slingshotX/slingshotY)
const SLINGSHOT_LEFT_PRONG_X = 50;
const SLINGSHOT_LEFT_PRONG_Y = 25;
const SLINGSHOT_RIGHT_PRONG_X = 10;
const SLINGSHOT_RIGHT_PRONG_Y = 30;
const SLINGSHOT_CENTER_X = 35; // midpoint used for impulse direction

document.addEventListener("DOMContentLoaded", () => {
  debugLog("init");
  game.init();

  // Attach UI event handlers
  document
    .getElementById("togglemusic")
    .addEventListener("click", game.toggleBackgroundMusic);
  document
    .getElementById("restartlevel")
    .addEventListener("click", game.restartLevel);
  document
    .getElementById("startGameButton")
    .addEventListener("click", game.showLevelScreen);
  document
    .getElementById("playcurrentlevel")
    .addEventListener("click", game.restartLevel);
  document
    .getElementById("playnextlevel")
    .addEventListener("click", game.startNextLevel);
  document
    .getElementById("showLevelScreen")
    .addEventListener("click", game.showLevelScreen);
});

const game = {
  mode: "intro",
  // Coordinates of the slingshot
  slingshotX: 140,
  slingshotY: 280,

  // Max panning speed per frame in pixels
  maxSpeed: 3,
  // Max and min panning offset
  minOffset: 0,
  maxOffset: 300,
  // Current panning offset
  offsetLeft: 0,
  // The game score
  score: 0,
  // Fire Timer to prevent weird friction stuff from making game unplayable
  fireTimer: 0,

  // Properties below are populated during init()/load()/play and declared here
  // so the type checker knows their shapes. They are not read before assignment.
  /** @type {HTMLCanvasElement} */
  canvas: null,
  /** @type {CanvasRenderingContext2D} */
  context: null,
  /** @type {CurrentLevel} */
  currentLevel: null,
  /** @type {Body[]} */
  heroes: [],
  /** @type {Body[]} */
  villains: [],
  /** @type {Body | undefined} */
  currentHero: undefined,
  /** @type {Body | undefined} */
  hero: undefined,
  ended: false,
  animationFrame: 0,
  /** @type {number | undefined} */
  lastUpdateTime: undefined,
  /** @type {HTMLImageElement} */
  slingshotImage: null,
  /** @type {HTMLImageElement} */
  slingshotFrontImage: null,
  /** @type {HTMLAudioElement} */
  backgroundMusic: null,
  /** @type {HTMLAudioElement} */
  bounceSound: null,
  /** @type {HTMLAudioElement} */
  slingshotReleasedSound: null,
  /** @type {Record<string, HTMLAudioElement>} */
  breakSound: null,

  init() {
    //Initialize objects
    levels.init();
    mouse.init();

    // Load sound effects and music
    game.backgroundMusic = loader.loadSound("audio/fruit-fling-symphony");
    game.bounceSound = loader.loadSound("audio/bounce");
    game.slingshotReleasedSound = loader.loadSound("audio/released");
    game.breakSound = {
      glass: loader.loadSound("audio/glassbreak"),
      wood: loader.loadSound("audio/woodbreak"),
    };

    // Hide the game and show the start screen
    /** @type {NodeListOf<HTMLElement>} */ (
      document.querySelectorAll(".gamelayer")
    ).forEach((el) => {
      el.style.display = "none";
    });
    document.getElementById("gamestartscreen").style.display = "block";

    // Save canvas and context to game object
    game.canvas = /** @type {HTMLCanvasElement} */ (
      document.getElementById("gamecanvas")
    );
    game.context = game.canvas.getContext("2d");
  },
  showLevelScreen() {
    /** @type {NodeListOf<HTMLElement>} */ (
      document.querySelectorAll(".gamelayer")
    ).forEach((el) => {
      el.style.display = "none";
    });
    document.getElementById("levelselectscreen").style.display = "block";
  },

  start() {
    /** @type {NodeListOf<HTMLElement>} */ (
      document.querySelectorAll(".gamelayer")
    ).forEach((el) => {
      el.style.display = "none";
    });
    document.getElementById("gamecanvas").style.display = "block";
    document.getElementById("scorescreen").style.display = "block";

    game.startBackgroundMusic();
    game.mode = "intro";
    game.offsetLeft = 0; // offset value for how far our screen has panned right
    game.ended = false;
    game.hero = undefined;
    game.animationFrame = window.requestAnimationFrame(game.animate);
  },

  /**
   * Pan the screen to center on newCenter.
   * @param {number} newCenter
   * @returns {boolean} true once the camera has settled on the target or a bound
   */
  panTo(newCenter) {
    if (
      // Check to see if the newCenter is within a quarter of the game screen in either direction and if the offset is within min and max bounds
      Math.abs(newCenter - game.offsetLeft - game.canvas.width / 4) > 0 && //
      game.offsetLeft <= game.maxOffset &&
      game.offsetLeft >= game.minOffset
    ) {
      let deltaX = Math.round(
        (newCenter - game.offsetLeft - game.canvas.width / 4) / 2
      );
      if (deltaX && Math.abs(deltaX) > game.maxSpeed) {
        deltaX = (game.maxSpeed * Math.abs(deltaX)) / deltaX;
      }
      game.offsetLeft += deltaX;
    } else {
      return true;
    }
    if (game.offsetLeft < game.minOffset) {
      game.offsetLeft = game.minOffset;
      return true;
    } else if (game.offsetLeft > game.maxOffset) {
      game.offsetLeft = game.maxOffset;
      return true;
    }
    return false;
  },

  countHeroesAndVillains() {
    const bodiesWithEntity = Iterator.from(iterBodies())
      .filter((b) => b.getUserData() != null)
      .toArray();
    const { hero = [], villain = [] } = Object.groupBy(
      bodiesWithEntity,
      (b) => b.getUserData().type
    );
    game.heroes = hero;
    game.villains = villain;
  },

  // if the distance between the mouse pointer and the center of the hero is smaller than the radius, the mouse is hovering on the hero
  // This solution only works for circular shaped heroes
  mouseOnCurrentHero() {
    if (!game.currentHero) {
      return false;
    }
    const position = game.currentHero.getPosition();
    const distanceSquared =
      (position.x * box2d.scale - mouse.x - game.offsetLeft) ** 2 +
      (position.y * box2d.scale - mouse.y) ** 2;
    const radiusSquared = game.currentHero.getUserData().radius ** 2;
    return distanceSquared <= radiusSquared;
  },

  // Park the current hero in the slingshot pouch, holding it still each frame.
  // This replaces the old approach of resting it on a physics post, which a
  // steeply-launched hero would graze on the way up.
  holdHeroInSlingshot() {
    if (!game.currentHero) {
      return;
    }
    game.currentHero.setPosition({
      x: (game.slingshotX + SLINGSHOT_CENTER_X) / box2d.scale,
      y: (game.slingshotY + SLINGSHOT_LEFT_PRONG_Y) / box2d.scale,
    });
    game.currentHero.setLinearVelocity({ x: 0, y: 0 });
    game.currentHero.setAngularVelocity(0);
  },

  handlePanning() {
    debugLog("Game mode is ", game.mode);
    if (game.mode === "intro") {
      if (game.panTo(700)) {
        game.mode = "load-next-hero";
      }
    }

    if (game.mode === "load-next-hero") {
      game.countHeroesAndVillains();
      if (game.villains.length === 0) {
        game.mode = "level-success";
        return;
      }
      if (game.heroes.length === 0) {
        game.mode = "level-failure";
        return;
      }
      if (!game.currentHero) {
        game.currentHero = game.heroes[game.heroes.length - 1];
      }
      // Hold the hero in the slingshot pouch. There is no physics body under
      // the slingshot, so a launched hero can never catch or ricochet on it.
      game.holdHeroInSlingshot();
      // Once the camera has settled back on the slingshot, the hero is ready.
      if (game.panTo(game.slingshotX)) {
        game.mode = "wait-for-firing";
      }
    }

    if (game.mode === "wait-for-firing") {
      if (mouse.dragging) {
        // pan right when player drags mouse right
        if (game.mouseOnCurrentHero()) {
          game.mode = "firing";
        } else {
          game.panTo(mouse.x + game.offsetLeft);
        }
      } else {
        // auto pan back to slingshot when player is not dragging mouse to pan right
        game.panTo(game.slingshotX);
        // Keep the hero parked in the pouch until the player grabs it.
        game.holdHeroInSlingshot();
      }
    }

    if (game.mode === "firing") {
      if (mouse.down) {
        game.panTo(game.slingshotX);
        game.currentHero.setPosition({
          x: (mouse.x + game.offsetLeft) / box2d.scale,
          y: mouse.y / box2d.scale,
        });
      } else {
        game.mode = "fired";
        game.slingshotReleasedSound.play();
        const impulseScaleFactor = 0.75;
        const impulse = Vec2(
          (game.slingshotX + SLINGSHOT_CENTER_X - mouse.x - game.offsetLeft) *
            impulseScaleFactor,
          (game.slingshotY + SLINGSHOT_LEFT_PRONG_Y - mouse.y) *
            impulseScaleFactor
        );
        game.fireTimer = performance.now();
        // Discard the velocity accumulated while aiming: gravity tugs the
        // dragged hero downward every frame, and without this the launch loses
        // a chunk of its upward kick (the longer the aim, the more is lost).
        // The shot should be exactly the pull impulse.
        game.currentHero.setLinearVelocity({ x: 0, y: 0 });
        game.currentHero.setAngularVelocity(0);
        game.currentHero.applyLinearImpulse(
          impulse,
          game.currentHero.getWorldCenter(),
          true
        );
      }
    }

    if (game.mode === "fired") {
      // Pan to where hero is
      const heroX = game.currentHero.getPosition().x * box2d.scale;
      game.panTo(heroX);
      // And when the hero falls asleep or leaves the gameboard, delete him and load the next hero
      const elapsedTime = (performance.now() - game.fireTimer) / 1000;
      debugLog("Time: ", elapsedTime);
      if (
        !game.currentHero.isAwake() ||
        heroX < 0 ||
        heroX > game.currentLevel.foregroundImage.width ||
        elapsedTime > 10
      ) {
        game.fireTimer = 0;
        box2d.world.destroyBody(game.currentHero);
        game.currentHero = undefined;
        game.mode = "load-next-hero";
      }
    }
    // Be sure to pan back to the left before ending the game
    if (game.mode === "level-success" || game.mode === "level-failure") {
      debugLog("end of game detected... panning");
      if (game.panTo(0)) {
        debugLog("panning complete");
        game.ended = true;
        game.showEndingScreen();
      }
    }
  },

  /** @param {number} timestamp */
  animate(timestamp) {
    // Animate the background
    game.handlePanning();

    // Animate the characters using a variable step rate derived from the framerate of requestAnimationFrame
    let timeStep;
    if (game.lastUpdateTime) {
      timeStep = (timestamp - game.lastUpdateTime) / 1000;
      box2d.step(timeStep);
    }

    game.lastUpdateTime = timestamp;

    // Draw the background with parallax
    game.context.drawImage(
      game.currentLevel.backgroundImage,
      game.offsetLeft / 4,
      0,
      BOARD_WIDTH,
      BOARD_HEIGHT,
      0,
      0,
      BOARD_WIDTH,
      BOARD_HEIGHT
    );
    game.context.drawImage(
      game.currentLevel.foregroundImage,
      game.offsetLeft,
      0,
      BOARD_WIDTH,
      BOARD_HEIGHT,
      0,
      0,
      BOARD_WIDTH,
      BOARD_HEIGHT
    );

    // Draw the back of the slingshot (comes before draw bodies... order matters so that things are layered right)
    game.context.drawImage(
      game.slingshotImage,
      game.slingshotX - game.offsetLeft,
      game.slingshotY
    );

    // Draw bodies
    game.drawAllBodies();

    // Draw the band when firing a hero
    if (game.mode === "firing") {
      game.drawSlingshotBand();
    }

    // Draw the front of the slingshot (comes after draw bodies... order matters so that things are layered right)
    game.context.drawImage(
      game.slingshotFrontImage,
      game.slingshotX - game.offsetLeft,
      game.slingshotY
    );

    if (!game.ended) {
      game.animationFrame = window.requestAnimationFrame(game.animate);
    }
  },
  drawAllBodies() {
    // Snapshot the list before any destroyBody call — destroying a body unlinks
    // it from the list, making getNext() on the destroyed node undefined behavior.
    for (const body of Iterator.from(iterBodies()).toArray()) {
      /** @type {Entity | null} */
      const entity = body.getUserData();
      if (entity) {
        const entityX = body.getPosition().x * box2d.scale;
        if (
          // The current hero's lifecycle is owned by the "fired" state, which
          // clears game.currentHero when it destroys the body. Destroying it
          // here too would leave game.currentHero pointing at a dead body,
          // which crashes the next setPosition (e.g. holdHeroInSlingshot).
          body !== game.currentHero &&
          (entityX < 0 ||
            entityX > game.currentLevel.foregroundImage.width ||
            (entity.health !== undefined && entity.health <= 0))
        ) {
          box2d.world.destroyBody(body);
          if (entity.type === "villain") {
            game.score += entity.calories;
            document.getElementById("score").innerHTML = `Score: ${game.score}`;
          }
          if (entity.breakSound) entity.breakSound.play();
        } else {
          entities.draw(entity, body.getPosition(), body.getAngle());
        }
      }
    }
  },
  showEndingScreen() {
    debugLog("showing ending screen");
    game.stopBackgroundMusic();
    if (game.mode === "level-success") {
      const key = `highscore-level-${game.currentLevel.number}`;
      const previous = parseInt(localStorage.getItem(key) || "0", 10);
      const isNewRecord = game.score > previous;
      if (isNewRecord) {
        localStorage.setItem(key, String(game.score));
      }
      const recordNote = isNewRecord ? " New best!" : ` Best: ${previous}`;
      if (game.currentLevel.number < levels.data.length - 1) {
        document.getElementById("endingmessage").innerHTML =
          `Level Complete. Well Done!!!${recordNote}`;
        document.getElementById("playnextlevel").style.display = "block";
      } else {
        document.getElementById("endingmessage").innerHTML =
          `All Levels Complete. Well Done!${recordNote}`;
        document.getElementById("playnextlevel").style.display = "none";
      }
    } else if (game.mode === "level-failure") {
      document.getElementById("endingmessage").innerHTML =
        "Failed. Play Again?";
      document.getElementById("playnextlevel").style.display = "none";
    }

    document.getElementById("endingscreen").style.display = "block";
  },
  restartLevel() {
    window.cancelAnimationFrame(game.animationFrame);
    game.currentHero = undefined;
    game.lastUpdateTime = undefined;
    levels.load(game.currentLevel.number);
  },
  startNextLevel() {
    window.cancelAnimationFrame(game.animationFrame);
    game.currentHero = undefined;
    game.lastUpdateTime = undefined;
    levels.load(game.currentLevel.number + 1);
  },
  drawSlingshotBand() {
    game.context.strokeStyle = "rgb(68,31,11)";
    game.context.lineWidth = 6;

    const radius = game.currentHero.getUserData().radius;
    const heroX = game.currentHero.getPosition().x * box2d.scale;
    const heroY = game.currentHero.getPosition().y * box2d.scale;
    const angle = Math.atan2(
      game.slingshotY + SLINGSHOT_LEFT_PRONG_Y - heroY,
      game.slingshotX + SLINGSHOT_LEFT_PRONG_X - heroX
    );
    const heroFarEdgeX = heroX - radius * Math.cos(angle);
    const heroFarEdgeY = heroY - radius * Math.sin(angle);

    game.context.beginPath();
    // Draw from rear top of slingshot
    game.context.moveTo(
      game.slingshotX + SLINGSHOT_LEFT_PRONG_X - game.offsetLeft,
      game.slingshotY + SLINGSHOT_LEFT_PRONG_Y
    );
    // to the center of the hero
    game.context.lineTo(heroX - game.offsetLeft, heroY);
    game.context.stroke();
    // Draw the hero on the band
    entities.draw(
      game.currentHero.getUserData(),
      game.currentHero.getPosition(),
      game.currentHero.getAngle()
    );
    game.context.beginPath();
    // Move to the edge of the hero
    game.context.moveTo(heroFarEdgeX - game.offsetLeft, heroFarEdgeY);
    // Draw line from the edge of the hero to the front top of slingshot
    game.context.lineTo(
      game.slingshotX - game.offsetLeft + SLINGSHOT_RIGHT_PRONG_X,
      game.slingshotY + SLINGSHOT_RIGHT_PRONG_Y
    );
    game.context.stroke();

    game.context.moveTo(
      game.slingshotX + SLINGSHOT_LEFT_PRONG_X - game.offsetLeft,
      game.slingshotY + SLINGSHOT_LEFT_PRONG_Y
    );
  },

  startBackgroundMusic() {
    const toggleImage = /** @type {HTMLImageElement} */ (
      document.getElementById("togglemusic")
    );
    game.backgroundMusic.play();
    toggleImage.src = "images/icons/sound.png";
  },
  stopBackgroundMusic() {
    const toggleImage = /** @type {HTMLImageElement} */ (
      document.getElementById("togglemusic")
    );
    toggleImage.src = "images/icons/nosound.png";
    game.backgroundMusic.pause();
    game.backgroundMusic.currentTime = 0; // make sure to start at beginning of song
  },
  toggleBackgroundMusic() {
    const toggleImage = /** @type {HTMLImageElement} */ (
      document.getElementById("togglemusic")
    );
    if (game.backgroundMusic.paused) {
      game.backgroundMusic.play();
      toggleImage.src = "images/icons/sound.png";
    } else {
      game.backgroundMusic.pause();
      toggleImage.src = "images/icons/nosound.png";
    }
  },
};

const levels = {
  /** @type {Level[]} */
  data: [
    // Level One
    {
      foreground: "desert-foreground",
      background: "clouds-background",
      entities: [
        {
          type: "ground",
          name: "dirt",
          x: 500,
          y: 440,
          width: 1000,
          height: 20,
          isStatic: true,
        },
        {
          type: "block",
          name: "wood",
          x: 520,
          y: 375,
          angle: 90,
          width: 100,
          height: 25,
        },
        {
          type: "block",
          name: "glass",
          x: 520,
          y: 275,
          angle: 90,
          width: 100,
          height: 25,
        },
        {
          type: "villain",
          name: "burger",
          x: 520,
          y: 200,
          calories: 590,
        },
        {
          type: "block",
          name: "wood",
          x: 620,
          y: 375,
          angle: 90,
          width: 100,
          height: 25,
        },
        {
          type: "block",
          name: "glass",
          x: 620,
          y: 275,
          angle: 90,
          width: 100,
          height: 25,
        },
        {
          type: "villain",
          name: "fries",
          x: 620,
          y: 200,
          calories: 420,
        },
        {
          type: "villain",
          name: "watermelon",
          x: 720,
          y: 410,
          calories: 300,
        },
        {
          type: "hero",
          name: "orange",
          x: 90,
          y: 410,
        },
        {
          type: "hero",
          name: "apple",
          x: 150,
          y: 410,
        },
      ],
    },
    // Level Two
    {
      foreground: "jungle-foreground",
      background: "jungle-background",
      entities: [
        {
          type: "ground",
          name: "dirt",
          x: 500,
          y: 440,
          width: 1000,
          height: 20,
          isStatic: true,
        },
        {
          type: "block",
          name: "wood",
          x: 820,
          y: 375,
          angle: 90,
          width: 100,
          height: 25,
        },
        {
          type: "block",
          name: "wood",
          x: 720,
          y: 375,
          angle: 90,
          width: 100,
          height: 25,
        },
        {
          type: "block",
          name: "wood",
          x: 620,
          y: 375,
          angle: 90,
          width: 100,
          height: 25,
        },
        {
          type: "block",
          name: "glass",
          x: 670,
          y: 310,
          width: 100,
          height: 25,
        },
        {
          type: "block",
          name: "glass",
          x: 770,
          y: 310,
          width: 100,
          height: 25,
        },
        {
          type: "block",
          name: "glass",
          x: 670,
          y: 248,
          angle: 90,
          width: 100,
          height: 25,
        },
        {
          type: "block",
          name: "glass",
          x: 770,
          y: 248,
          angle: 90,
          width: 100,
          height: 25,
        },
        {
          type: "block",
          name: "wood",
          x: 720,
          y: 180,
          width: 100,
          height: 25,
        },
        {
          type: "villain",
          name: "burger",
          x: 715,
          y: 140,
          calories: 590,
        },
        {
          type: "villain",
          name: "fries",
          x: 670,
          y: 400,
          calories: 420,
        },
        {
          type: "villain",
          name: "sodacan",
          x: 765,
          y: 395,
          calories: 150,
        },
        {
          type: "villain",
          name: "pizza",
          x: 870,
          y: 410,
          calories: 285,
        },
        {
          type: "hero",
          name: "strawberry",
          x: 40,
          y: 420,
        },
        {
          type: "hero",
          name: "orange",
          x: 90,
          y: 410,
        },
        {
          type: "hero",
          name: "apple",
          x: 150,
          y: 410,
        },
      ],
    },
    // Level Three
    {
      foreground: "city-foreground",
      background: "night-background",
      entities: [
        {
          type: "ground",
          name: "dirt",
          x: 500,
          y: 440,
          width: 1000,
          height: 20,
          isStatic: true,
        },
        // Left tower structure
        {
          type: "block",
          name: "wood",
          x: 400,
          y: 375,
          angle: 90,
          width: 100,
          height: 25,
        },
        {
          type: "block",
          name: "wood",
          x: 500,
          y: 375,
          angle: 90,
          width: 100,
          height: 25,
        },
        {
          type: "block",
          name: "glass",
          x: 450,
          y: 310,
          width: 100,
          height: 25,
        },
        {
          type: "villain",
          name: "mountaindew",
          x: 450,
          y: 260,
          calories: 180,
        },
        // Right tower structure
        {
          type: "block",
          name: "glass",
          x: 650,
          y: 375,
          angle: 90,
          width: 100,
          height: 25,
        },
        {
          type: "block",
          name: "glass",
          x: 750,
          y: 375,
          angle: 90,
          width: 100,
          height: 25,
        },
        {
          type: "block",
          name: "wood",
          x: 700,
          y: 310,
          width: 100,
          height: 25,
        },
        {
          type: "villain",
          name: "burger",
          x: 700,
          y: 270,
          calories: 590,
        },
        // Center elevated platform
        {
          type: "block",
          name: "wood",
          x: 575,
          y: 350,
          width: 80,
          height: 25,
        },
        {
          type: "villain",
          name: "fries",
          x: 575,
          y: 320,
          calories: 420,
        },
        {
          type: "villain",
          name: "sodaglass",
          x: 850,
          y: 390,
          calories: 120,
        },
        // Heroes (fruits for slingshot)
        {
          type: "hero",
          name: "pineapple",
          x: 40,
          y: 420,
        },
        {
          type: "hero",
          name: "orange",
          x: 90,
          y: 410,
        },
        {
          type: "hero",
          name: "apple",
          x: 150,
          y: 410,
        },
        {
          type: "hero",
          name: "strawberry",
          x: 200,
          y: 425,
        },
      ],
    },
  ],
  init() {
    const html = levels.data
      .map((_, index) => `<input type='button' value=${index + 1}>`)
      .join("");
    const levelScreen = document.getElementById("levelselectscreen");
    levelScreen.innerHTML = html;
    levelScreen.querySelectorAll("input").forEach((input) => {
      input.addEventListener("click", () => {
        levels.load(Number(input.value) - 1);
        levelScreen.style.display = "none";
      });
    });
  },

  /**
   * Load data and images for a selected level.
   * @param {number} number
   */
  load(number) {
    debugLog("load called for ", number);
    box2d.init();
    // Reset asset counters so load-complete detection works correctly on restart
    loader.loadedCount = 0;
    loader.totalCount = 0;
    loader.loaded = true;
    game.currentLevel = {
      number: number,
    };
    game.score = 0;
    document.getElementById("score").innerHTML = `Score: ${game.score}`;
    const level = levels.data[number];
    game.currentLevel.backgroundImage = loader.loadImage(
      "images/backgrounds/" + level.background + ".png"
    );
    game.currentLevel.foregroundImage = loader.loadImage(
      "images/backgrounds/" + level.foreground + ".png"
    );
    game.slingshotImage = loader.loadImage("images/slingshot.png");
    game.slingshotFrontImage = loader.loadImage("images/slingshot-front.png");

    // load the entities
    for (const entity of level.entities) {
      entities.create(entity);
    }

    // Start the game immedately if everything is loaded. Otherwise, call loaders and set the gamestart to loader.loaded
    if (loader.loaded) {
      game.start();
    } else {
      loader.onload = game.start;
    }
  },
};

const loader = {
  // variables to track the status of loading game assets
  loaded: true,
  loadedCount: 0,
  totalCount: 0,
  soundFileExtn: ".mp3",
  /** @type {(() => void) | undefined} called once every queued asset has loaded */
  onload: undefined,

  /**
   * @param {string} url
   * @returns {HTMLImageElement}
   */
  loadImage(url) {
    this.totalCount++;
    this.loaded = false;
    document.getElementById("loadingscreen").style.display = "block";
    const image = new Image();
    image.src = url;
    image.onload = loader.itemLoaded;
    return image;
  },

  /**
   * @param {string} url
   * @returns {HTMLAudioElement}
   */
  loadSound(url) {
    this.totalCount++;
    this.loaded = false;
    document.getElementById("loadingscreen").style.display = "block";
    const audio = new Audio();
    audio.src = url + loader.soundFileExtn;
    audio.addEventListener("canplaythrough", loader.itemLoaded, false);
    return audio;
  },

  // itemLoader is called each time loadImage or loadSound completes for a particular asset
  //   It iterates the loadedCount, adjusts the message on the loadingscreen, and checks
  //   for if all items have been loaded. When all have loaded, it hides the loading screen,
  //   and triggers loader.onload(), which starts the game.
  itemLoaded() {
    loader.loadedCount++;
    document.getElementById("loadingmessage").innerHTML =
      `loaded ${loader.loadedCount} of ${loader.totalCount}`;
    if (loader.loadedCount === loader.totalCount) {
      //Done loading
      loader.loaded = true;
      document.getElementById("loadingscreen").style.display = "none";
      if (loader.onload) {
        loader.onload();
        loader.onload = undefined;
      }
    }
  },
};

const mouse = {
  x: 0,
  y: 0,
  down: false,
  dragging: false,
  downX: 0,
  downY: 0,
  init() {
    // Register mouse events with our mouse event handlers
    const canvas = document.getElementById("gamecanvas");
    canvas.addEventListener("mousemove", mouse.mousemovehandler);
    canvas.addEventListener("mousedown", mouse.mousedownhandler);
    canvas.addEventListener("mouseup", mouse.mouseuphandler);
    canvas.addEventListener("mouseout", mouse.mouseuphandler);
    // Touch events for mobile devices
    canvas.addEventListener("touchmove", mouse.touchmovehandler, {
      passive: false,
    });
    canvas.addEventListener("touchstart", mouse.touchstarthandler, {
      passive: false,
    });
    canvas.addEventListener("touchend", mouse.mouseuphandler);
  },
  // Handles general mouse movement on the canvas
  /** @param {MouseEvent} ev */
  mousemovehandler(ev) {
    // Translate window coordinates to canvas coordinates
    const rect = document.getElementById("gamecanvas").getBoundingClientRect();
    mouse.x = ev.clientX - rect.left;
    mouse.y = ev.clientY - rect.top;
    if (mouse.down) {
      mouse.dragging = true;
    }
  },
  // Handles mouse clicks and drags
  /** @param {MouseEvent} ev */
  mousedownhandler(ev) {
    mouse.down = true;
    mouse.downX = mouse.x;
    mouse.downY = mouse.y;
    ev.preventDefault();
  },
  // Makes sure that clicks and drags are cut off when the mouse cursor leaves the canvas
  /** @param {Event} ev */
  mouseuphandler(ev) {
    mouse.down = false;
    mouse.dragging = false;
  },
  /** @param {TouchEvent} ev */
  touchmovehandler(ev) {
    ev.preventDefault();
    const touch = ev.touches[0];
    const rect = document.getElementById("gamecanvas").getBoundingClientRect();
    mouse.x = touch.clientX - rect.left;
    mouse.y = touch.clientY - rect.top;
    if (mouse.down) {
      mouse.dragging = true;
    }
  },
  /** @param {TouchEvent} ev */
  touchstarthandler(ev) {
    ev.preventDefault();
    mouse.down = true;
    const touch = ev.touches[0];
    const rect = document.getElementById("gamecanvas").getBoundingClientRect();
    mouse.x = touch.clientX - rect.left;
    mouse.y = touch.clientY - rect.top;
  },
};

const entities = {
  /** @type {Record<string, EntityDefinition>} */
  definitions: {
    glass: {
      fullHealth: 100,
      density: 2.4,
      friction: 0.4,
      restitution: 0.15,
    },
    wood: {
      fullHealth: 500,
      density: 0.7,
      friction: 0.4,
      restitution: 0.4,
    },
    dirt: {
      density: 3.0,
      friction: 1.5,
      restitution: 0.2,
    },
    burger: {
      shape: "circle",
      fullHealth: 40,
      radius: 25,
      density: 1,
      friction: 0.5,
      restitution: 0.4,
    },
    sodacan: {
      shape: "rectangle",
      fullHealth: 80,
      width: 40,
      height: 60,
      density: 1,
      friction: 0.5,
      restitution: 0.7,
    },
    fries: {
      shape: "rectangle",
      fullHealth: 50,
      width: 40,
      height: 50,
      density: 1,
      friction: 0.5,
      restitution: 0.6,
    },
    mountaindew: {
      shape: "rectangle",
      fullHealth: 70,
      width: 35,
      height: 55,
      density: 1.2,
      friction: 0.4,
      restitution: 0.8,
    },
    apple: {
      shape: "circle",
      radius: 20,
      density: 1.5,
      friction: 1,
      restitution: 0.4,
    },
    orange: {
      shape: "circle",
      radius: 20,
      density: 1.5,
      friction: 1,
      restitution: 0.4,
    },
    strawberry: {
      shape: "circle",
      radius: 10,
      density: 2.0,
      friction: 1,
      restitution: 0.4,
    },
    pineapple: {
      shape: "circle",
      radius: 35,
      density: 1.3,
      friction: 1,
      restitution: 0.5,
    },
    watermelon: {
      shape: "circle",
      fullHealth: 80,
      radius: 30,
      density: 1.8,
      friction: 0.6,
      restitution: 0.2,
    },
    pizza: {
      shape: "circle",
      fullHealth: 60,
      radius: 28,
      density: 1.1,
      friction: 0.5,
      restitution: 0.3,
    },
    sodaglass: {
      shape: "rectangle",
      fullHealth: 60,
      width: 35,
      height: 50,
      density: 0.9,
      friction: 0.4,
      restitution: 0.5,
    },
  },
  // Turn an entity definition into a Planck.js body and add to game world
  /** @param {Entity} entity */
  create(entity) {
    const definition = entities.definitions[entity.name];
    debugLog("Definition is ", definition);
    if (!definition) {
      debugLog(entity.name, " is undefined");
      return;
    }
    switch (entity.type) {
      case "block":
        entity.health = definition.fullHealth;
        entity.fullHealth = definition.fullHealth;
        entity.shape = "rectangle";
        entity.sprite = loader.loadImage(
          "images/entities/" + entity.name + ".png"
        );
        entity.breakSound = game.breakSound[entity.name];
        entity.bounceSound = game.bounceSound;
        box2d.createRectangle(entity, definition);
        break;
      case "ground":
        debugLog("Creating ground with ", entity, definition);
        entity.shape = "rectangle";
        box2d.createRectangle(entity, definition);
        break;
      case "hero":
      case "villain":
        entity.health = definition.fullHealth;
        entity.fullHealth = definition.fullHealth;
        entity.shape = definition.shape;
        entity.sprite = loader.loadImage(
          "images/entities/" + entity.name + ".png"
        );
        entity.bounceSound = game.bounceSound;
        if (definition.shape === "circle") {
          entity.radius = definition.radius;
          box2d.createCircle(entity, definition);
        } else if (definition.shape === "rectangle") {
          entity.width = definition.width;
          entity.height = definition.height;
          box2d.createRectangle(entity, definition);
        }
        break;
      default:
        debugLog(entity.type + "is undefined");
        break;
    }
  },
  // Draw the entity on the canvas
  // The images are stretched to cover the 1px skin that Planck.js adds to all entities
  /**
   * @param {Entity} entity
   * @param {Vec2} position
   * @param {number} angle
   */
  draw(entity, position, angle) {
    game.context.save();
    game.context.translate(
      position.x * box2d.scale - game.offsetLeft,
      position.y * box2d.scale
    );
    game.context.rotate(angle);
    switch (entity.type) {
      case "block":
        game.context.drawImage(
          entity.sprite,
          0,
          0,
          entity.sprite.width,
          entity.sprite.height,
          -entity.width / 2 - 1,
          -entity.height / 2 - 1,
          entity.width + 2,
          entity.height + 2
        );
        break;
      case "villain":
      case "hero":
        if (entity.shape === "circle") {
          game.context.drawImage(
            entity.sprite,
            0,
            0,
            entity.sprite.width,
            entity.sprite.height,
            -entity.radius - 1,
            -entity.radius - 1,
            entity.radius * 2 + 2,
            entity.radius * 2 + 2
          );
        } else if (entity.shape === "rectangle") {
          game.context.drawImage(
            entity.sprite,
            0,
            0,
            entity.sprite.width,
            entity.sprite.height,
            -entity.width / 2 - 1,
            -entity.height / 2 - 1,
            entity.width + 2,
            entity.height + 2
          );
        }
        break;
      case "ground":
        // ground is an invisible entity
        break;
    }
    game.context.restore();
  },
};

class Box2d {
  constructor() {
    this.scale = 30;
    this.velocityIterations = 8;
    this.positionIterations = 3;
    /** @type {World} */
    this.world = null;
  }

  init() {
    this.world = new World(Vec2(0, 9.8));
    // Collision damage: subtract the impact impulse from each body's health.
    this.world.on("post-solve", this.handlePostSolve);
  }

  // post-solve handler. Kept as a method so it can be unit-tested directly.
  /**
   * @param {Contact} contact
   * @param {ContactImpulse} impulse
   */
  handlePostSolve(contact, impulse) {
    /** @type {Entity | null} */
    const entity1 = contact.getFixtureA().getBody().getUserData();
    /** @type {Entity | null} */
    const entity2 = contact.getFixtureB().getBody().getUserData();

    const impulseAlongNormal = Math.abs(impulse.normalImpulses[0]);
    // Filter out tiny impulses
    if (impulseAlongNormal > 5) {
      if (entity1) {
        if (entity1.health !== undefined) entity1.health -= impulseAlongNormal;
        if (entity1.bounceSound) entity1.bounceSound.play();
      }
      if (entity2) {
        if (entity2.health !== undefined) entity2.health -= impulseAlongNormal;
        if (entity2.bounceSound) entity2.bounceSound.play();
      }
    }
  }

  /**
   * @param {Entity} entity
   * @param {Shape} shape
   * @param {EntityDefinition} definition
   * @returns {Body}
   */
  createBody(entity, shape, definition) {
    const body = this.world.createBody({
      type: entity.isStatic ? "static" : "dynamic",
      position: Vec2(entity.x / this.scale, entity.y / this.scale),
      angle: entity.angle ? (Math.PI * entity.angle) / 180 : 0,
    });
    body.setUserData(entity);
    body.createFixture({
      shape,
      density: definition.density,
      friction: definition.friction,
      restitution: definition.restitution,
    });
    return body;
  }

  /**
   * @param {Entity} entity
   * @param {EntityDefinition} definition
   * @returns {Body}
   */
  createRectangle(entity, definition) {
    const shape = new Box(
      entity.width / 2 / this.scale,
      entity.height / 2 / this.scale
    );
    return this.createBody(entity, shape, definition);
  }

  /**
   * @param {Entity} entity
   * @param {EntityDefinition} definition
   * @returns {Body}
   */
  createCircle(entity, definition) {
    const shape = new Circle(entity.radius / this.scale);
    return this.createBody(entity, shape, definition);
  }

  /** @param {number} timeStep */
  step(timeStep) {
    timeStep = timeStep <= 2 / 60 ? timeStep : 2 / 60;
    this.world.step(timeStep, this.velocityIterations, this.positionIterations);
  }
}

const box2d = new Box2d();

/** @yields {Body} */
function* iterBodies() {
  for (let body = box2d.world.getBodyList(); body; body = body.getNext()) {
    yield body;
  }
}

// Exported only for the test harness; the browser entry point self-wires via
// the DOMContentLoaded listener above and needs nothing from these.
export { Box2d, box2d, entities, game, levels, loader, mouse };
