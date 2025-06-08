// Ghetto Import Box2D
const b2Vec2 = Box2D.Common.Math.b2Vec2;
const b2BodyDef = Box2D.Dynamics.b2BodyDef;
const b2Body = Box2D.Dynamics.b2Body;
const b2FixtureDef = Box2D.Dynamics.b2FixtureDef;
const b2Fixture = Box2D.Dynamics.b2Fixture;
const b2World = Box2D.Dynamics.b2World;
const b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape;
const b2CircleShape = Box2D.Collision.Shapes.b2CircleShape;
const b2DebugDraw = Box2D.Dynamics.b2DebugDraw;
const b2RevoluteJointDef = Box2D.Dynamics.Joints.b2RevoluteJointDef;

// Debug flag used to control logging
const DEBUG = false;
const debugLog = (...args) => { if (DEBUG) console.log(...args); };

// Dimensions of the game board
const BOARD_WIDTH = 640;
const BOARD_HEIGHT = 480;

document.addEventListener('DOMContentLoaded', () => {
  debugLog('init');
  game.init();

  // Attach UI event handlers
  document.getElementById('togglemusic').addEventListener('click', game.toggleBackgroundMusic);
  document.getElementById('restartlevel').addEventListener('click', game.restartLevel);
  document.getElementById('startGameButton').addEventListener('click', game.showLevelScreen);
  document.getElementById('playcurrentlevel').addEventListener('click', game.restartLevel);
  document.getElementById('playnextlevel').addEventListener('click', game.startNextLevel);
  document.getElementById('showLevelScreen').addEventListener('click', game.showLevelScreen);
});

const game = {
  mode: 'intro',
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

  init() {
    //Initialize objects
    levels.init();
    loader.init();
    mouse.init();

    // Load sound effects and music
    // kindergarten by gurdonark is licensed under Creative Commons
    game.backgroundMusic = loader.loadSound('audio/gurdonark-kindergarten');
    game.slingshotReleasedSound = loader.loadSound('audio/bounce');
    game.breakSound = {
      'glass': loader.loadSound('audio/glassbreak'),
      'wood': loader.loadSound('audio/woodbreak')
    };



    // Hide the game and show the start screen
    document.querySelectorAll('.gamelayer').forEach(el => {
      el.style.display = 'none';
    });
    document.getElementById('gamestartscreen').style.display = 'block';

    // Save canvas and context to game object
    game.canvas = document.getElementById('gamecanvas');
    game.context = game.canvas.getContext('2d');
  },
  showLevelScreen() {
    document.querySelectorAll('.gamelayer').forEach(el => {
      el.style.display = 'none';
    });
    document.getElementById('levelselectscreen').style.display = 'block';
  },

  start() {
    document.querySelectorAll('.gamelayer').forEach(el => {
      el.style.display = 'none';
    });
    document.getElementById('gamecanvas').style.display = 'block';
    document.getElementById('scorescreen').style.display = 'block';

    game.startBackgroundMusic();
    game.mode = 'intro';
    game.offsetLeft = 0; // offset value for how far our screen has panned right
    game.ended = false;
    game.hero = undefined;
    game.animationFrame = window.requestAnimationFrame(game.animate, game.canvas);
  },

  // Pan the screen to center on newCenter
  panTo(newCenter) {
    if ( // Check to see if the newCenter is within a quarter of the game screen in either direction and if the offset is within min and max bounds
      Math.abs(newCenter - game.offsetLeft - game.canvas.width / 4) > 0 //
      && game.offsetLeft <= game.maxOffset
      && game.offsetLeft >= game.minOffset
    ) {
      // Set deltaX to the mininum distance needed to get the newCenter within the center 50% of the screen.
      // Why divide by 2 though????
      let deltaX = Math.round((newCenter - game.offsetLeft - game.canvas.width / 4) / 2);
      // Here maxSpeed seems to speed up panning, now slow it down???
      if (deltaX && Math.abs(deltaX) > game.maxSpeed) {
        deltaX = game.maxSpeed * Math.abs(deltaX) / (deltaX);
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
    game.heroes = [];
    game.villains = [];
    for (let body = box2d.world.GetBodyList(); body; body = body.GetNext()) {
      const entity = body.GetUserData();
      if (entity) {
        if (entity.type === 'hero') {
          game.heroes.push(body);
        } else if (entity.type === 'villain') {
          game.villains.push(body);
        }
      }
    }
  },

  // if the distance between the mouse pointer and the center of the hero is smaller than the radius, the mouse is hovering on the hero
  // This solution only works for circular shaped heroes
  mouseOnCurrentHero() {
    if (!game.currentHero) {
      return false;
    }
    const position = game.currentHero.GetPosition();
    const distanceSquared = Math.pow(position.x * box2d.scale - mouse.x - game.offsetLeft, 2) + Math.pow(position.y * box2d.scale - mouse.y, 2);
    const radiusSquared = Math.pow(game.currentHero.GetUserData().radius, 2);
    return (distanceSquared <= radiusSquared);
  },

  handlePanning() {
    debugLog("Game mode is ", game.mode);
    if (game.mode === 'intro') { //why coerce?
      if (game.panTo(700)) {
        game.mode = 'load-next-hero';
      }
    }

    if (game.mode === 'load-next-hero') {
      game.countHeroesAndVillains();
      if (game.villains.length === 0) {
        game.mode = 'level-success';
        return;
      }
      if (game.heroes.length === 0) {
        game.mode = 'level-failure';
        return;
      }
      if (!game.currentHero) {
        game.currentHero = game.heroes[game.heroes.length - 1];
        game.currentHero.SetPosition({ x: 180 / box2d.scale, y: 200 / box2d.scale });
        game.currentHero.SetLinearVelocity({ x: 0, y: 0 });
        game.currentHero.SetAngularVelocity(0);
        game.currentHero.SetAwake(true);
      } else {
        game.panTo(game.slingshotX);
        if (!game.currentHero.IsAwake()) {
          game.mode = 'wait-for-firing';
        }
      }
    }

    if (game.mode === 'wait-for-firing') {
      if (mouse.dragging) { // pan right when player drags mouse right
        if (game.mouseOnCurrentHero()) {
          game.mode = 'firing';
        } else {
          game.panTo(mouse.x + game.offsetLeft);
        }
      } else { // auto pan back to slingshot when player is not dragging mouse to pan right
        game.panTo(game.slingshotX);
      }
    }

    if (game.mode === 'firing') {
      if (mouse.down) {
        game.panTo(game.slingshotX);
        game.currentHero.SetPosition({ x: (mouse.x + game.offsetLeft) / box2d.scale, y: mouse.y / box2d.scale });
      } else {
        game.mode = 'fired';
        game.slingshotReleasedSound.play();
        const impulseScaleFactor = 0.75;
        const impulse = new b2Vec2(
          (game.slingshotX + 35 - mouse.x - game.offsetLeft) * impulseScaleFactor,
          (game.slingshotY + 25 - mouse.y) * impulseScaleFactor
        );
        game.fireTimer = new Date().getTime();
        game.currentHero.ApplyImpulse(impulse, game.currentHero.GetWorldCenter());
      }
    }

    if (game.mode === 'fired') {
      // Pan to where hero is
      const heroX = game.currentHero.GetPosition().x * box2d.scale;
      //console.log("HERO :", game.currentHero);
      game.panTo(heroX);
      // And when the hero falls asleep or leaves the gameboard, delete him and load the next hero
      const elapsedTime = (new Date().getTime() - game.fireTimer) / 1000;
      debugLog("Time: ", elapsedTime);
      if (!game.currentHero.IsAwake() || heroX < 0 || heroX > game.currentLevel.foregroundImage.width || elapsedTime > 10) {
        game.fireTimer = 0;
        box2d.world.DestroyBody(game.currentHero);
        game.currentHero = undefined;
        game.mode = 'load-next-hero';
      }
    }
    // Be sure to pan back to the left before ending the game
    if (game.mode === 'level-success' || game.mode === 'level-failure') {
      debugLog("end of game detected... panning");
      if (game.panTo(0)) {
        debugLog('panning complete');
        game.ended = true;
        game.showEndingScreen();
      }
    }
  },

  animate() {
    // Animate the background
    game.handlePanning();

    // Animate the characters using a variable step rate derived from the framerate of requestAnimationFrame
    const currentTime = new Date().getTime();
    let timeStep;
    if (game.lastUpdateTime) {
      timeStep = (currentTime - game.lastUpdateTime) / 1000;
      box2d.step(timeStep);
    }

    game.lastUpdateTime = currentTime;

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
    game.context.drawImage(game.slingshotImage, game.slingshotX - game.offsetLeft, game.slingshotY);

    // Draw bodies
    game.drawAllBodies();

    // Draw the band when firing a hero
    if (game.mode === 'firing') {
      game.drawSlingshotBand();
    }

    // Draw the front of the slingshot (comes after draw bodies... order matters so that things are layered right)
    game.context.drawImage(game.slingshotFrontImage, game.slingshotX - game.offsetLeft, game.slingshotY);

    if (!game.ended) {
      game.animationFrame = window.requestAnimationFrame(game.animate, game.canvas);
    }
  },
  drawAllBodies() {
    box2d.world.DrawDebugData();

    //Iterate through all of the bodies and draw them on the canvas.
    //strange loop that uses Box2D's GetBodyList and GetNext() methods
    for (let body = box2d.world.GetBodyList(); body; body = body.GetNext()) {
      const entity = body.GetUserData();
      // if (body.IsAwake()) console.log(body);
      if (entity) {
        const entityX = body.GetPosition().x * box2d.scale;
        if (entityX < 0 || entityX > game.currentLevel.foregroundImage.width || (entity.health && entity.health <= 0)) {
          box2d.world.DestroyBody(body);
          if (entity.type === 'villain') {
            game.score += entity.calories;
            document.getElementById('score').innerHTML = 'Score: ' + game.score;
          }
          if (entity.breakSound) entity.breakSound.play();
        } else {
          entities.draw(entity, body.GetPosition(), body.GetAngle());
        }
      }
    }
  },
  showEndingScreen() {
    debugLog("showing ending screen");
    game.stopBackgroundMusic();
    if (game.mode === 'level-success') {
      if (game.currentLevel.number < levels.data.length - 1) {
        document.getElementById('endingmessage').innerHTML = 'Level Complete. Well Done!!!';
        document.getElementById('playnextlevel').style.display = 'block';
      } else {
        document.getElementById('endingmessage').innerHTML = 'All Levels Complete. Well Done!';
        document.getElementById('playnextlevel').style.display = 'none';
      }
    } else if (game.mode === 'level-failure') {
      document.getElementById('endingmessage').innerHTML = 'Failed. Play Again?';
      document.getElementById('playnextlevel').style.display = 'none';
    }

    document.getElementById('endingscreen').style.display = 'block';
  },
  restartLevel() {
    window.cancelAnimationFrame(game.animationFrame);
    game.currentHero = undefined;
    game.lastUpdateTime = undefined;
    levels.load(game.currentLevel.number);
  },
  startNextLevel() {
    window.cancelAnimationFrame(game.animationFrame);
    game.lastUpdateTime = undefined;
    levels.load(game.currentLevel.number + 1);
  },
  drawSlingshotBand() {
    game.context.strokeStyle = 'rgb(68,31,11)';
    game.context.lineWidth = 6;

    const radius = game.currentHero.GetUserData().radius;
    const heroX = game.currentHero.GetPosition().x * box2d.scale;
    const heroY = game.currentHero.GetPosition().y * box2d.scale;
    const angle = Math.atan2(game.slingshotY + 25 - heroY, game.slingshotX + 50 - heroX);
    const heroFarEdgeX = heroX - radius * Math.cos(angle);
    const heroFarEdgeY = heroY - radius * Math.sin(angle);

    game.context.beginPath();
    // Draw from rear top of slingshot
    game.context.moveTo(game.slingshotX + 50 - game.offsetLeft, game.slingshotY + 25);
    // to the center of the hero
    game.context.lineTo(heroX - game.offsetLeft, heroY);
    game.context.stroke();
    // Draw the hero on the band
    entities.draw(game.currentHero.GetUserData(), game.currentHero.GetPosition(), game.currentHero.GetAngle());
    game.context.beginPath();
    // Move to the edge of the hero
    game.context.moveTo(heroFarEdgeX - game.offsetLeft, heroFarEdgeY);
    // Draw line from the edge of the hero to the front top of slingshot
    game.context.lineTo(game.slingshotX - game.offsetLeft + 10, game.slingshotY + 30);
    game.context.stroke();

    game.context.moveTo(game.slingshotX + 50 - game.offsetLeft, game.slingshotY + 25);

  },

  startBackgroundMusic() {
    const toggleImage = document.getElementById('togglemusic');
    game.backgroundMusic.play();
    toggleImage.src = 'images/icons/sound.png';
  },
  stopBackgroundMusic() {
    const toggleImage = document.getElementById('togglemusic');
    toggleImage.src = 'images/icons/nosound.png';
    game.backgroundMusic.pause();
    game.backgroundMusic.currentTime = 0; // make sure to start at beginning of song
  },
  toggleBackgroundMusic() {
    const toggleImage = document.getElementById('togglemusic');
    if (game.backgroundMusic.paused) {
      game.backgroundMusic.play();
      toggleImage.src = 'images/icons/sounds.png';
    } else {
      game.backgroundMusic.pause();
      toggleImage.src = 'images/icons/nosound.png';
    }
  }

}

const levels = {
  data: [
    // Level One
    {
      foreground: 'desert-foreground',
      background: 'clouds-background',
      entities: [
        {
          type: 'ground',
          name: 'dirt',
          x: 500,
          y: 440,
          width: 1000,
          height: 20,
          isStatic: true
        },
        {
          type: 'ground',
          name: 'wood',
          x: 180,
          y: 390,
          width: 40,
          height: 80,
          isStatic: true
        },
        {
          type: 'block',
          name: 'wood',
          x: 520,
          y: 375,
          angle: 90,
          width: 100,
          height: 25
        },
        {
          type: 'block',
          name: 'glass',
          x: 520,
          y: 275,
          angle: 90,
          width: 100,
          height: 25
        },
        {
          type: 'villain',
          name: 'burger',
          x: 520,
          y: 200,
          calories: 590
        },
        {
          type: 'block',
          name: 'wood',
          x: 620,
          y: 375,
          angle: 90,
          width: 100,
          height: 25
        },
        {
          type: 'block',
          name: 'glass',
          x: 620,
          y: 275,
          angle: 90,
          width: 100,
          height: 25
        },
        {
          type: 'villain',
          name: 'fries',
          x: 620,
          y: 200,
          calories: 420
        },
        {
          type: 'hero',
          name: 'orange',
          x: 90,
          y: 410
        },
        {
          type: 'hero',
          name: 'apple',
          x: 150,
          y: 410
        }
      ]
    },
    // Level Two
    {
      foreground: 'desert-foreground',
      background: 'clouds-background',
      entities: [
        {
          type: 'ground',
          name: 'dirt',
          x: 500,
          y: 440,
          width: 1000,
          height: 20,
          isStatic: true
        },
        {
          type: 'ground',
          name: 'wood',
          x: 180,
          y: 390,
          width: 40,
          height: 80,
          isStatic: true
        },
        {
          type: 'block',
          name: 'wood',
          x: 820,
          y: 375,
          angle: 90,
          width: 100,
          height: 25
        },
        {
          type: 'block',
          name: 'wood',
          x: 720,
          y: 375,
          angle: 90,
          width: 100,
          height: 25
        },
        {
          type: 'block',
          name: 'wood',
          x: 620,
          y: 375,
          angle: 90,
          width: 100,
          height: 25
        },
        {
          type: 'block',
          name: 'glass',
          x: 670,
          y: 310,
          width: 100,
          height: 25
        },
        {
          type: 'block',
          name: 'glass',
          x: 770,
          y: 310,
          width: 100,
          height: 25
        },
        {
          type: 'block',
          name: 'glass',
          x: 670,
          y: 248,
          angle: 90,
          width: 100,
          height: 25
        },
        {
          type: 'block',
          name: 'glass',
          x: 770,
          y: 248,
          angle: 90,
          width: 100,
          height: 25
        },
        {
          type: 'block',
          name: 'wood',
          x: 720,
          y: 180,
          width: 100,
          height: 25
        },
        {
          type: 'villain',
          name: 'burger',
          x: 715,
          y: 140,
          calories: 590
        },
        {
          type: 'villain',
          name: 'fries',
          x: 670,
          y: 400,
          calories: 420
        },
        {
          type: 'villain',
          name: 'sodacan',
          x: 765,
          y: 395,
          calories: 150
        },
        {
          type: 'hero',
          name: 'strawberry',
          x: 40,
          y: 420
        },
        {
          type: 'hero',
          name: 'orange',
          x: 90,
          y: 410
        },
        {
          type: 'hero',
          name: 'apple',
          x: 150,
          y: 410
        }
      ]
    }
  ],
  init() {
    let html = '';
    // Dynamically create level buttons for all level objects in levels.data
    //seem like a silly use of forEach since we only use the index
    levels.data.forEach((level, index) => {
      html += `<input type='button' value=${index + 1}>`
    })
    const levelScreen = document.getElementById('levelselectscreen');
    levelScreen.innerHTML = html;
    levelScreen.querySelectorAll('input').forEach(input => {
      input.addEventListener('click', function () {
        levels.load(this.value - 1);
        levelScreen.style.display = 'none';
      });
    });
  },

  // Load data and images for a selected level
  load(number) {
    debugLog("load called for ", number);
    box2d.init();
    game.currentLevel = {
      number: number,
      hero: []
    };
    game.score = 0;
    document.getElementById('score').innerHTML = 'Score: ' + game.score;
    const level = levels.data[number];
    game.currentLevel.backgroundImage = loader.loadImage('images/backgrounds/' + level.background + '.png')
    game.currentLevel.foregroundImage = loader.loadImage('images/backgrounds/' + level.foreground + '.png')
    game.slingshotImage = loader.loadImage('images/slingshot.png')
    game.slingshotFrontImage = loader.loadImage('images/slingshot-front.png')

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
  }
}

const loader = {
  // variables to track the status of loading game assets
  loaded: true,
  loadedCount: 0,
  totalCount: 0,
  soundFileExtn: '.ogg',

  init() {
    // determine compatible game music for browser.
    // audio.canPlayType returns strings like 'maybe' or 'probably' to guess if audio will play
    // I suspect that mp3 now plays on all browsers????
    let mp3Support, oggSupport;
    const audio = document.createElement('audio');
    if (audio.canPlayType) {
      // Check to see if canPlayType returns truthy
      mp3Support = '' != audio.canPlayType('audio/mpeg');
      oggSupport = '' != audio.canPlayType('audio/ogg; codecs="vorbis"');
    } else {
      mp3Support = false;
      oggSupport = false;
    }

    // Instruct the loader to load the supported filetype
    // Using nested ternaries. sort of strange
    loader.soundFileExtn = oggSupport ? '.ogg' : mp3Support ? '.mp3' : undefined
  },

  loadImage(url) {
    this.totalCount++;
    this.loaded = false;
    document.getElementById('loadingscreen').style.display = 'block';
    const image = new Image();
    image.src = url;
    image.onload = loader.itemLoaded;
    return image;
  },

  loadSound(url) {
    this.totalCount++;
    this.loaded = false;
    document.getElementById('loadingscreen').style.display = 'block';
    const audio = new Audio();
    audio.src = url + loader.soundFileExtn;
    audio.addEventListener('canplaythrough', loader.itemLoaded, false);
    return audio;
  },

  // itemLoader is called each time loadImage or loadSound completes for a particular asset
  //   It iterates the loadedCount, adjusts the message on the loadingscreen, and checks
  //   for if all items have been loaded. When all have loaded, it hides the loading screen,
  //   and triggers loader.onload(), which starts the game.
  itemLoaded() {
    loader.loadedCount++;
    document.getElementById('loadingmessage').innerHTML = 'loaded ' + loader.loadedCount + ' of ' + loader.totalCount;
    if (loader.loadedCount === loader.totalCount) {
      //Done loading
      loader.loaded = true;
      document.getElementById('loadingscreen').style.display = 'none';
      if (loader.onload) {
        loader.onload();
        loader.onload = undefined;
      }
    }
  }
}

const mouse = {
  x: 0,
  y: 0,
  down: false,
  init() {
    // Register mouse events with our mouse event handlers
    const canvas = document.getElementById('gamecanvas');
    canvas.addEventListener('mousemove', mouse.mousemovehandler);
    canvas.addEventListener('mousedown', mouse.mousedownhandler);
    canvas.addEventListener('mouseup', mouse.mouseuphandler);
    canvas.addEventListener('mouseout', mouse.mouseuphandler);
  },
  // Handles general mouse movement on the canvas
  mousemovehandler(ev) {
    // Translate window coordinates to canvas coordinates
    const rect = document.getElementById('gamecanvas').getBoundingClientRect();
    mouse.x = ev.clientX - rect.left;
    mouse.y = ev.clientY - rect.top;
    if (mouse.down) {
      mouse.dragging = true;
    }
  },
  // Handles mouse clicks and drags
  mousedownhandler(ev) {
    mouse.down = true;
    mouse.downX = mouse.x;
    mouse.downY = mouse.y;
    ev.originalEvent.preventDefault();
  },
  // Makes sure that clicks and drags are cut off when the mouse cursor leaves the canvas
  mouseuphandler(ev) {
    mouse.down = false;
    mouse.dragging = false;
  }
}

const entities = {
  definitions: {
    'glass': {
      fullHealth: 100,
      density: 2.4,
      friction: 0.4,
      restitution: 0.15
    },
    'wood': {
      fullHealth: 500,
      density: 0.7,
      friction: 0.4,
      restitution: 0.4
    },
    'dirt': {
      density: 3.0,
      friction: 1.5,
      restitution: 0.2
    },
    'burger': {
      shape: 'circle',
      fullHealth: 40,
      radius: 25,
      density: 1,
      friction: 0.5,
      restitution: 0.4
    },
    'sodacan': {
      shape: 'rectangle',
      fullHealth: 80,
      width: 40,
      height: 60,
      density: 1,
      friction: 0.5,
      restitution: 0.7
    },
    'fries': {
      shape: 'rectangle',
      fullHealth: 50,
      width: 40,
      height: 50,
      density: 1,
      friction: 0.5,
      restitution: 0.6
    },
    'apple': {
      shape: 'circle',
      radius: 25,
      density: 1.5,
      // friction: 0.5,
      friction: 1,
      restitution: 0.4
    },
    'orange': {
      shape: 'circle',
      radius: 25,
      density: 1.5,
      // friction: 0.5,
      friction: 1,
      restitution: 0.4
    },
    'strawberry': {
      shape: 'circle',
      radius: 15,
      density: 2.0,
      // friction: 0.5,
      friction: 1,
      restitution: 0.4
    }
  },
  // Turn an entity definition into a Box2D object and add to game world
  create(entity) {
    const definition = entities.definitions[entity.name];
    debugLog('Definition is ', definition);
    if (!definition) {
      debugLog(entity.name, " is undefined");
      return;
    }
    switch (entity.type) {
      case "block":
        entity.health = definition.fullHealth;
        entity.fullHealth = definition.fullHealth;
        entity.shape = 'rectangle'
        entity.sprite = loader.loadImage('images/entities/' + entity.name + '.png');
        entity.breakSound = game.breakSound[entity.name];
        box2d.createRectangle(entity, definition);
        break;
      case "ground":
        debugLog("Creating ground with ", entity, definition);
        entity.shape = 'rectangle';
        box2d.createRectangle(entity, definition);
        break;
      case "hero":
      case "villain":
        entity.health = definition.fullHealth;
        entity.fullHealth = definition.fullHealth;
        entity.shape = definition.shape;
        entity.sprite = loader.loadImage('images/entities/' + entity.name + '.png');
        entity.bounceSound = game.bounceSound;
        if (definition.shape === 'circle') {
          entity.radius = definition.radius;
          box2d.createCircle(entity, definition);
        } else if (definition.shape === 'rectangle') {
          entity.width = definition.width;
          entity.height = definition.height;
          box2d.createRectangle(entity, definition);
        }
        break;
      default:
        debugLog(entity.type + 'is undefined');
        break;
    }
  },
  // Draw the entity on the canvas
  // The images are stretched to cover the 1px skin that Box2D adds to all entities
  draw(entity, position, angle) {
    game.context.translate(position.x * box2d.scale - game.offsetLeft, position.y * box2d.scale);
    game.context.rotate(angle);
    switch (entity.type) {
      case 'block':
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
      case 'villain':
      case 'hero':
        if (entity.shape === 'circle') {
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
        }
        else if (entity.shape === 'rectangle') {
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
      case 'ground':
        // ground is an invisible entity
        break;
    }
    game.context.rotate(-angle);
    game.context.translate(-position.x * box2d.scale + game.offsetLeft, -position.y * box2d.scale);
  }
}

class Box2d {
  constructor() {
    this.scale = 30;
    this.velocityIterations = 8;
    this.positionIterations = 3;
    this.world = null;
  }

  init() {
    const gravity = new b2Vec2(0, 9.8);
    const allowSleep = true;
    this.world = new b2World(gravity, allowSleep);
    // Setup Debug draw
    const debugContext = document.getElementById('debugcanvas').getContext('2d');
    const debugDraw = new b2DebugDraw();
    debugDraw.SetSprite(debugContext);
    debugDraw.SetDrawScale(this.scale);
    debugDraw.SetFillAlpha(0.3);
    debugDraw.SetLineThickness(1.0);
    debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);
    this.world.SetDebugDraw(debugDraw);
    // Add collision detection listeners
    const listener = new Box2D.Dynamics.b2ContactListener();

    // listener.PreSolve = function (contact, impulse) {
    //   var body1 = contact.GetFixtureA().GetBody();
    //   var body2 = contact.GetFixtureB().GetBody();
    //   var entity1 = body1.GetUserData();
    //   var entity2 = body2.GetUserData();

    //   // if contact.
    //   if (entity1.name === 'dirt' || entity2.name === 'dirt') {
    //     console.log("Collision ", contact, " between ", entity1, entity2);
    //     contact.SetFriction(2.0);
    //   }
    // }
    listener.PostSolve = function (contact, impulse) {
      // console.log(contact, impulse);
      const body1 = contact.GetFixtureA().GetBody();
      const body2 = contact.GetFixtureB().GetBody();
      const entity1 = body1.GetUserData();
      const entity2 = body2.GetUserData();

      const impulseAlongNormal = Math.abs(impulse.normalImpulses[0]);
      // Filter out tiny impulses
      if (impulseAlongNormal > 5) {
        // Reduce object health by impulse value if they have health
        if (entity1.health) {
          entity1.health -= impulseAlongNormal;
        }
        if (entity2.health) {
          entity2.health -= impulseAlongNormal;
        }
        // Play bounce sounds
        if (entity1.bounceSound) entity1.bounceSound.play();
        if (entity2.bounceSound) entity2.bounceSound.play();
      }
    };
    this.world.SetContactListener(listener);
  }

  createRectangle(entity, definition) {
    const bodyDef = new b2BodyDef();
    if (entity.isStatic) {
      bodyDef.type = b2Body.b2_staticBody;
    } else {
      bodyDef.type = b2Body.b2_dynamicBody;
    }
    bodyDef.position.x = entity.x / this.scale;
    bodyDef.position.y = entity.y / this.scale;
    if (entity.angle) {
      bodyDef.angle = Math.PI * entity.angle / 180;
    }
    const fixtureDef = new b2FixtureDef();
    fixtureDef.density = definition.density;
    fixtureDef.friction = definition.friction;
    fixtureDef.restitution = definition.restitution;
    fixtureDef.shape = new b2PolygonShape;
    fixtureDef.shape.SetAsBox(entity.width / 2 / this.scale, entity.height / 2 / this.scale);
    const body = this.world.CreateBody(bodyDef);
    body.SetUserData(entity);
    const fixture = body.CreateFixture(fixtureDef);
    return body;
  }

  createCircle(entity, definition) {
    debugLog('Creating Circle with ', entity, definition);
    const bodyDef = new b2BodyDef();
    if (entity.isStatic) {
      bodyDef.type = b2Body.b2_staticBody;
    } else {
      bodyDef.type = b2Body.b2_dynamicBody;
    }

    bodyDef.position.x = entity.x / this.scale;
    bodyDef.position.y = entity.y / this.scale;

    if (entity.angle) {
      bodyDef.angle = Math.PI * entity.angle / 180;
    }
    const fixtureDef = new b2FixtureDef();
    fixtureDef.density = definition.density;
    fixtureDef.friction = definition.friction;
    fixtureDef.restitution = definition.restitution;
    fixtureDef.shape = new b2CircleShape(entity.radius / this.scale);
    debugLog("Circle fixture is ", fixtureDef);
    const body = this.world.CreateBody(bodyDef);
    body.SetUserData(entity);
    const fixture = body.CreateFixture(fixtureDef);
    debugLog("Final Circle body is now ", body);
    return body;
  }

  step(timeStep) {
    timeStep = (timeStep <= 2 / 60) ? timeStep : 2 / 60;
    this.world.Step(timeStep, this.velocityIterations, this.positionIterations);
  }
}

const box2d = new Box2d();

