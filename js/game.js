
var game = {
  init: function () {
    //Initialize objects
    levels.init();

    // Hide the game and show the start screen
    $('.gamelayer').hide();
    $('#gamestartscreen').show();

    // Save canvas and context to game object
    game.canvas = $('#gamecanvas')[0];
    game.context = game.canvas.getContext('2d');
  },
  showLevelScreen: function(){
    $('.gamelayer').hide();
    $('#levelselectscreen').show('slow');
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
  load: function(){}
}

$(window).on('load', function () {
  game.init();
});