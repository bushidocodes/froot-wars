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

  init: function () {
    //Initialize objects
    levels.init();
    loader.init();
    mouse.init();

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
    game.mode = 'intro';
    game.offsetLeft = 0; // offset value for how far our screen has panned right
    game.ended = false;
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

  handlePanning: function () {
    if (game.mode === 'intro') { //why coerce?
      if (game.panTo(700)) {
        game.mode = 'load-next-hero';
      }
    }

    if (game.mode === 'load-next-hero') {
      //TODO: Implement checking if out of heroes or if all villains are destroyed
      //load hero and set mode to wait-for-firing
      game.mode = 'wait-for-firing';
    }

    if (game.mode === 'wait-for-firing') {
      if (mouse.dragging) { // pan right when player drags mouse right
        game.panTo(mouse.x + game.offsetLeft);
      } else { // auto pan back to slingshot when player is not dragging mouse to pan right
        game.panTo(game.slingshotX);
      }
    }


    if (game.mode === 'firing') {
      //TODO Pan to hero to follow them in-flight
    }
  },

  animate: function () {
    // Animate the background
    game.handlePanning();

    // Draw the background with parallax
    // TODO: Use constants to be able to adjust size of gameboard.
    game.context.drawImage(game.currentLevel.backgroundImage, game.offsetLeft / 4, 0, 640, 480, 0, 0, 640, 480)
    game.context.drawImage(game.currentLevel.foregroundImage, game.offsetLeft, 0, 640, 480, 0, 0, 640, 480);

    // Draw the slingshot
    game.context.drawImage(game.slingshotImage, game.slingshotX - game.offsetLeft, game.slingshotY);
    game.context.drawImage(game.slingshotFrontImage, game.slingshotX - game.offsetLeft, game.slingshotY);

    if (!game.ended) {
      game.animationFrame = window.requestAnimationFrame(game.animate, game.canvas);
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
          y: 160,
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
  load: function (number) {
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

$(window).on('load', function () {
  game.init();
});

var entities = {
  definitions: {
    glass: {
      fullHealth: 100,
      density: 2.4,
      friction: 0.4,
      restitution: 0.15
    },
    wood: {
      fullHealth: 500,
      density: 0.7,
      friction: 0.4,
      restitution: 0.4
    },
    dirt: {
      density: 3.0,
      friction: 1.5,
      restitution: 0.2
    },
    burger: {
      shape: 'circle',
      fullHealth: 40,
      radius: 25,
      density: 1,
      friction: 0.5,
      restitution: 0.4
    },
    sodacan: {
      shape: 'rectangle',
      fullHealth: 80,
      width: 80,
      height: 60,
      density: 1,
      friction: 0.5,
      restitution: 0.7
    },
    fries: {
      shape: 'rectangle',
      fullHealth: 50,
      width: 40,
      height: 50,
      density: 1,
      friction: 0.5,
      restitution: 0.6
    },
    apple: {
      shape: 'circle',
      radius: 25,
      density: 1.5,
      friction: 0.5,
      restitution: 0.4
    },
    orange: {
      shape: 'circle',
      radius: 25,
      density: 1.5,
      friction: 0.5,
      restitution: 0.4
    },
    strawberry: {
      shape: 'circle',
      radius: 15,
      density: 2.0,
      friction: 0.5,
      restitution: 0.4
    }
  },
  // Turn an entity definition into a Box2D object and add to game world
  create: function (entity) {
    var definition = entities.definitions[entity.name];
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
        box2d.createRectange(entity, definition);
        break;
      case "ground":
        entity.shape = 'rectangle';
        box2d.createRectange(entity, definition);
        break;
      case "hero":
      case "villain":
        entity.health = definition.fullHealth;
        entity.fullHealth = definition.fullHealth;
        entity.shape = definition.shape;
        entity.sprite = loader.loadImage('images/entities/' + entity.name + '.png');
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
  draw: function (entity, position, angle) { }
}

var Box2d = {
  scale: 30,
  init: function () {
    var gravity = new b2Vec2(0, 9.8);
    var allowSleep = true;
    box2d.world = new b2World(gravity, allowSleep);
  },
  createRectange(entity, definition) {
    var bodyDef = new b2BodyDef;
    if (entity.static) {
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
    body.CreateFixture(fixtureDef);
    return body;
  },
  createCircle(entity, definition) {
    var bodyDef = new b2BodyDef;
    if (entity.isStatic) {
      bodyDef.type = b2Body.b2_staticBody;
    } else {
      bodyDef.type = b2Body.b2_staticBody;
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
    fixtureDef.shape = new b2CircleShape(entity.radius / Box2d.scale);
    var body = box2d.world.CreateBody(bodyDef);
    body.SetUserData(entity);
    body.CreateFixture(fixtureDef);
    return body;
  }


}