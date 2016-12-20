
var game = {
  mode: 'intro',
  // Coordinates of the slingshot
  slingshotX: 140,
  slingshotY: 280,
  init: function () {
    //Initialize objects
    levels.init();
    loader.init();

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
    game.offsetLeft = 0;
    game.ended = false;
    game.animationFrame = window.requestAnimationFrame(game.animate, game.canvas);
  },

  handlePanning: function () {
    game.offsetLeft++; // Arbitrarily pans right. TODO: Enhance this
  },

  animate: function () {
    // Animate the background
    game.handlePanning();

    // Draw the background with parallax
    // TODO: Use constants to be able to adjust size of gameboard.
    game.context.drawImage(game.currentLevel.backgroundImage, game.offsetLeft / 4, 0, 640, 480, 0, 0, 640, 480)
    game.context.drawImage(game.currentLevel.foregroundImage, game.offsetLeft, 0, 640, 480, 0, 0, 640, 480);

    // Draw the slingshot
    game.context.drawImage(game.slingshotImage, game.slingshotX-game.offsetLeft, game.slingshotY);
    game.context.drawImage(game.slingshotFrontImage, game.slingshotX-game.offsetLeft, game.slingshotY);

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
      entities: []
    },
    // Level Two
    {
      foreground: 'desert-foreground',
      background: 'clouds-background',
      entities: []
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

$(window).on('load', function () {
  game.init();
});