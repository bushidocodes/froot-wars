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

$(function () {
  console.log("init");
  game.init();
});

var game = {
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

  init: function () {
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
    $('.gamelayer').hide();
    $('#gamestartscreen').show();

    // Save canvas and context to game object
    game.canvas = $('#gamecanvas')[0];
    game.context = game.canvas.getContext('2d');
  },
  showLevelScreen: function () {
    $('.gamelayer').hide();
    $('#levelselectscreen').show('slow');
  },

  start: function () {
    $('.gamelayer').hide();
    $('#gamecanvas').show();
    $('#scorescreen').show();

    game.startBackgroundMusic();
    game.mode = 'intro';
    game.offsetLeft = 0; // offset value for how far our screen has panned right
    game.ended = false;
    game.hero = undefined;
    game.animationFrame = window.requestAnimationFrame(game.animate, game.canvas);
  },

  // Pan the screen to center on newCenter
  panTo: function (newCenter) {
    if ( // Check to see if the newCenter is within a quarter of the game screen in either direction and if the offset is within min and max bounds
      Math.abs(newCenter - game.offsetLeft - game.canvas.width / 4) > 0 //
      && game.offsetLeft <= game.maxOffset
      && game.offsetLeft >= game.minOffset
    ) {
      // Set deltaX to the mininum distance needed to get the newCenter within the center 50% of the screen.
      // Why divide by 2 though????
      var deltaX = Math.round((newCenter - game.offsetLeft - game.canvas.width / 4) / 2);
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

  countHeroesAndVillains: function () {
    game.heroes = [];
    game.villains = [];
    for (var body = box2d.world.GetBodyList(); body; body = body.GetNext()) {
      var entity = body.GetUserData();
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
  mouseOnCurrentHero: function () {
    if (!game.currentHero) {
      return false;
    }
    var position = game.currentHero.GetPosition();
    var distanceSquared = Math.pow(position.x * box2d.scale - mouse.x - game.offsetLeft, 2) + Math.pow(position.y * box2d.scale - mouse.y, 2);
    var radiusSquared = Math.pow(game.currentHero.GetUserData().radius, 2);
    return (distanceSquared <= radiusSquared);
  },

  handlePanning: function () {
    console.log("Game mode is ", game.mode);
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
        var impulseScaleFactor = 0.75;
        var impulse = new b2Vec2(
          (game.slingshotX + 35 - mouse.x - game.offsetLeft) * impulseScaleFactor,
          (game.slingshotY + 25 - mouse.y) * impulseScaleFactor
        );
        game.fireTimer = new Date().getTime();
        game.currentHero.ApplyImpulse(impulse, game.currentHero.GetWorldCenter());
      }
    }

    if (game.mode === 'fired') {
      // Pan to where hero is
      var heroX = game.currentHero.GetPosition().x * box2d.scale;
      //console.log("HERO :", game.currentHero);
      game.panTo(heroX);
      // And when the hero falls asleep or leaves the gameboard, delete him and load the next hero
      var elapsedTime = (new Date().getTime() - game.fireTimer) / 1000;
      console.log("Time: ", elapsedTime);
      if (!game.currentHero.IsAwake() || heroX < 0 || heroX > game.currentLevel.foregroundImage.width || elapsedTime > 10) {
        game.fireTimer = 0;
        box2d.world.DestroyBody(game.currentHero);
        game.currentHero = undefined;
        game.mode = 'load-next-hero';
      }
    }
    // Be sure to pan back to the left before ending the game
    if (game.mode === 'level-success' || game.mode === 'level-failure') {
      console.log("end of game detected... panning");
      if (game.panTo(0)) {
        console.log('panning complete');
        game.ended = true;
        game.showEndingScreen();
      }
    }
  },

  animate: function () {
    // Animate the background
    game.handlePanning();

    // Animate the characters using a variable step rate derived from the framerate of requestAnimationFrame
    var currentTime = new Date().getTime();
    var timeStep;
    if (game.lastUpdateTime) {
      timeStep = (currentTime - game.lastUpdateTime) / 1000;
      box2d.step(timeStep);
    }

    game.lastUpdateTime = currentTime;

    // Draw the background with parallax
    // TODO: Use constants to be able to adjust size of gameboard.
    game.context.drawImage(game.currentLevel.backgroundImage, game.offsetLeft / 4, 0, 640, 480, 0, 0, 640, 480)
    game.context.drawImage(game.currentLevel.foregroundImage, game.offsetLeft, 0, 640, 480, 0, 0, 640, 480);

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
  drawAllBodies: function () {
    box2d.world.DrawDebugData();

    //Iterate through all of the bodies and draw them on the canvas.
    //strange loop that uses Box2D's GetBodyList and GetNext() methods
    for (var body = box2d.world.GetBodyList(); body; body = body.GetNext()) {
      var entity = body.GetUserData();
      // if (body.IsAwake()) console.log(body);
      if (entity) {
        var entityX = body.GetPosition().x * box2d.scale;
        if (entityX < 0 || entityX > game.currentLevel.foregroundImage.width || (entity.health && entity.health <= 0)) {
          box2d.world.DestroyBody(body);
          if (entity.type === 'villain') {
            game.score += entity.calories;
            $('#score').html('Score: ' + game.score);
          }
          if (entity.breakSound) entity.breakSound.play();
        } else {
          entities.draw(entity, body.GetPosition(), body.GetAngle());
        }
      }
    }
  },
  showEndingScreen: function () {
    console.log("showing ending screen");
    game.stopBackgroundMusic();
    if (game.mode === 'level-success') {
      if (game.currentLevel.number < levels.data.length - 1) {
        $('#endingmessage').html('Level Complete. Well Done!!!');
        $('#playnextlevel').show();
      } else {
        $('#endingmessage').html('All Levels Complete. Well Done!');
        $('#playnextlevel').hide();
      }
    } else if (game.mode === 'level-failure') {
      $('#endingmessage').html('Failed. Play Again?');
      $('#playnextlevel').hide();
    }

    $('#endingscreen').show();
  },
  restartLevel: function () {
    window.cancelAnimationFrame(game.animationFrame);
    game.currentHero = undefined;
    game.lastUpdateTime = undefined;
    levels.load(game.currentLevel.number);
  },
  startNextLevel: function () {
    window.cancelAnimationFrame(game.animationFrame);
    game.lastUpdateTime = undefined;
    levels.load(game.currentLevel.number + 1);
  },
  drawSlingshotBand: function () {
    game.context.strokeStyle = 'rgb(68,31,11)';
    game.context.lineWidth = 6;

    var radius = game.currentHero.GetUserData().radius;
    var heroX = game.currentHero.GetPosition().x * box2d.scale;
    var heroY = game.currentHero.GetPosition().y * box2d.scale;
    var angle = Math.atan2(game.slingshotY + 25 - heroY, game.slingshotX + 50 - heroX);
    var heroFarEdgeX = heroX - radius * Math.cos(angle);
    var heroFarEdgeY = heroY - radius * Math.sin(angle);

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

  startBackgroundMusic: function () {
    var toggleImage = $('#togglemusic')[0];
    game.backgroundMusic.play();
    toggleImage.src = 'images/icons/sound.png';
  },
  stopBackgroundMusic: function () {
    var toggleImage = $('#togglemusic')[0];
    toggleImage.src = 'images/icons/nosound.png';
    game.backgroundMusic.pause();
    game.backgroundMusic.currentTime = 0; // make sure to start at beginning of song
  },
  toggleBackgroundMusic: function () {
    var toggleImage = $('#togglemusic')[0];
    if (game.backgroundMusic.paused) {
      game.backgroundMusic.play();
      toggleImage.src = 'images/icons/sounds.png';
    } else {
      game.backgroundMusic.pause();
      toggleImage.src = 'images/icons/nosound.png';
    }
  }

}

var levels = {
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
  init: function () {
    var html = '';
    // Dynamically create level buttons for all level objects in levels.data
    //seem like a silly use of forEach since we only use the index
    levels.data.forEach((level, index) => {
      html += `<input type='button' value=${index + 1}>`
    })
    $('#levelselectscreen').html(html);
    //Add click handlers to all level buttons
    $('#levelselectscreen input').click(function () {
      levels.load(this.value - 1);
      $('#levelselectscreen').hide();
    });
  },

  // Load data and images for a selected level
  load: function (number) {
    console.log("load called for ", number);
    box2d.init();
    game.currentLevel = {
      number: number,
      hero: []
    };
    game.score = 0;
    $('#score').html('Score: ' + game.score);
    var level = levels.data[number];
    game.currentLevel.backgroundImage = loader.loadImage('images/backgrounds/' + level.background + '.png')
    game.currentLevel.foregroundImage = loader.loadImage('images/backgrounds/' + level.foreground + '.png')
    game.slingshotImage = loader.loadImage('images/slingshot.png')
    game.slingshotFrontImage = loader.loadImage('images/slingshot-front.png')

    // load the entities
    for (var i = 0; i < level.entities.length; i++) {
      var entity = level.entities[i];
      entities.create(entity);
    };

    // Start the game immedately if everything is loaded. Otherwise, call loaders and set the gamestart to loader.loaded
    if (loader.loaded) {
      game.start();
    } else {
      loader.onload = game.start;
    }
  }
}

var loader = {
  // variables to track the status of loading game assets
  loaded: true,
  loadedCount: 0,
  totalCount: 0,
  soundFileExtn: '.ogg',

  init: function () {
    // determine compatible game music for browser.
    // audio.canPlayType returns strings like 'maybe' or 'probably' to guess if audio will play
    // I suspect that mp3 now plays on all browsers????
    var mp3Support, oggSupport;
    var audio = document.createElement('audio');
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

  loadImage: function (url) {
    this.totalCount++;
    this.loaded = false;
    $('#loadingscreen').show();
    var image = new Image();
    image.src = url;
    image.onload = loader.itemLoaded;
    return image;
  },

  loadSound: function (url) {
    this.totalCount++;
    this.loaded = false;
    $('#loadingscreen').show();
    var audio = new Audio();
    audio.src = url + loader.soundFileExtn;
    audio.addEventListener('canplaythrough', loader.itemLoaded, false);
    return audio;
  },

  // itemLoader is called each time loadImage or loadSound completes for a particular asset
  //   It iterates the loadedCount, adjusts the message on the loadingscreen, and checks
  //   for if all items have been loaded. When all have loaded, it hides the loading screen,
  //   and triggers loader.onload(), which starts the game.
  itemLoaded: function () {
    loader.loadedCount++;
    $('#loadingmessage').html('loaded ' + loader.loadedCount + ' of ' + loader.totalCount);
    if (loader.loadedCount === loader.totalCount) {
      //Done loading
      loader.loaded = true;
      $('#loadingscreen').hide();
      if (loader.onload) {
        loader.onload();
        loader.onload = undefined;
      }
    }
  }
}

var mouse = {
  x: 0,
  y: 0,
  down: false,
  init: function () {
    // Register jQuery Mouse Events with our mouse event handlers
    // https://api.jquery.com/category/events/mouse-events/
    $('#gamecanvas').mousemove(mouse.mousemovehandler);
    $('#gamecanvas').mousedown(mouse.mousedownhandler);
    $('#gamecanvas').mouseup(mouse.mouseuphandler);
    $('#gamecanvas').mouseout(mouse.mouseuphandler);
  },
  // Handles general mouse movement on the canvas
  mousemovehandler: function (ev) {
    // Use jQuery offset() to be able to relate window coordinates to canvas coordiates
    // https://api.jquery.com/offset/
    var offset = $('#gamecanvas').offset();
    mouse.x = ev.pageX - offset.left;
    mouse.y = ev.pageY - offset.top;
    if (mouse.down) {
      mouse.dragging = true;
    }
  },
  // Handles mouse clicks and drags
  mousedownhandler: function (ev) {
    mouse.down = true;
    mouse.downX = mouse.x;
    mouse.downY = mouse.y;
    ev.originalEvent.preventDefault();
  },
  // Makes sure that clicks and drags are cut off when the mouse cursor leaves the canvas
  mouseuphandler: function (ev) {
    mouse.down = false;
    mouse.dragging = false;
  }
}

var entities = {
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
  create: function (entity) {
    var definition = entities.definitions[entity.name];
    console.log('Definition is ', definition);
    if (!definition) {
      console.log(entity.name, " is undefined");
      return;
    }
    switch (entity.type) {
      case "block":
        entity.health = definition.fullHealth;
        entity.fullHealth = definition.fullHealth;
        entity.shape = 'rectangle'
        entity.sprite = loader.loadImage('images/entities/' + entity.name + '.png');
        entity.breakSound = game.breakSound[entity.name];
        box2d.createRectange(entity, definition);
        break;
      case "ground":
        console.log("Creating ground with ", entity, definition);
        entity.shape = 'rectangle';
        box2d.createRectange(entity, definition);
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
          box2d.createRectange(entity, definition);
        }
        break;
      default:
        console.log(entity.type + 'is undefined');
        break;
    }
  },
  // Draw the entity on the canvas
  // The images are stretched to cover the 1px skin that Box2D adds to all entities
  draw: function (entity, position, angle) {
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

var box2d = {
  scale: 30,
  velocityIterations: 8,
  positionIterations: 3,
  init: function () {
    var gravity = new b2Vec2(0, 9.8);
    var allowSleep = true;
    box2d.world = new b2World(gravity, allowSleep);
    // Setup Debug draw
    var debugContext = document.getElementById('debugcanvas').getContext('2d');
    var debugDraw = new b2DebugDraw();
    debugDraw.SetSprite(debugContext);
    debugDraw.SetDrawScale(box2d.scale);
    debugDraw.SetFillAlpha(0.3);
    debugDraw.SetLineThickness(1.0);
    debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);
    box2d.world.SetDebugDraw(debugDraw);
    // Add collision detection listeners
    var listener = new Box2D.Dynamics.b2ContactListener;

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
      var body1 = contact.GetFixtureA().GetBody();
      var body2 = contact.GetFixtureB().GetBody();
      var entity1 = body1.GetUserData();
      var entity2 = body2.GetUserData();

      var impulseAlongNormal = Math.abs(impulse.normalImpulses[0]);
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
    box2d.world.SetContactListener(listener);
  },
  createRectange(entity, definition) {
    var bodyDef = new b2BodyDef;
    if (entity.isStatic) {
      bodyDef.type = b2Body.b2_staticBody;
    } else {
      bodyDef.type = b2Body.b2_dynamicBody;
    }
    bodyDef.position.x = entity.x / box2d.scale;
    bodyDef.position.y = entity.y / box2d.scale;
    if (entity.angle) {
      bodyDef.angle = Math.PI * entity.angle / 180;
    }
    var fixtureDef = new b2FixtureDef;
    fixtureDef.density = definition.density;
    fixtureDef.friction = definition.friction;
    fixtureDef.restitution = definition.restitution;
    fixtureDef.shape = new b2PolygonShape;
    fixtureDef.shape.SetAsBox(entity.width / 2 / box2d.scale, entity.height / 2 / box2d.scale);
    var body = box2d.world.CreateBody(bodyDef);
    body.SetUserData(entity);
    var fixture = body.CreateFixture(fixtureDef);
    return body;
  },
  createCircle(entity, definition) {
    console.log("Creating Circle with ", entity, definition);
    var bodyDef = new b2BodyDef;
    if (entity.isStatic) {
      bodyDef.type = b2Body.b2_staticBody;
    } else {
      bodyDef.type = b2Body.b2_dynamicBody;
    }

    bodyDef.position.x = entity.x / box2d.scale;
    bodyDef.position.y = entity.y / box2d.scale;

    if (entity.angle) {
      bodyDef.angle = Math.PI * entity.angle / 180;
    }
    var fixtureDef = new b2FixtureDef;
    fixtureDef.density = definition.density;
    fixtureDef.friction = definition.friction;
    fixtureDef.restitution = definition.restitution;
    fixtureDef.shape = new b2CircleShape(entity.radius / box2d.scale);
    console.log("Circle fixture is ", fixtureDef);
    var body = box2d.world.CreateBody(bodyDef);
    body.SetUserData(entity);

    var fixture = body.CreateFixture(fixtureDef);
    console.log("Final Circle body is now ", body);
    return body;
  },
  step: function (timeStep) {
    var timeStep = (timeStep <= 2 / 60) ? timeStep : 2 / 60;
    box2d.world.Step(timeStep, box2d.velocityIterations, box2d.positionIterations);
  }
}

