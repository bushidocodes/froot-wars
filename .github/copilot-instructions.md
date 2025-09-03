# Froot Wars

Froot Wars is an HTML5/JavaScript physics-based game similar to Angry Birds, where players use a slingshot to launch fruit characters at targets. The game uses the Box2D physics engine and runs entirely in the browser as a static website.

**Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.**

## Working Effectively

### Quick Start (Validated Commands)
Run these commands in sequence to get the game running:

1. **Navigate to repository**: `cd /home/runner/work/froot-wars/froot-wars`
2. **Start web server**: `python3 -m http.server 8000`
   - Server starts instantly (< 5 seconds)
   - **NEVER CANCEL**: Server runs continuously - this is expected behavior
   - Server output: "Serving HTTP on 0.0.0.0 port 8000..."
3. **Access game**: Open `http://localhost:8000` in browser
4. **Stop server**: Use Ctrl+C or stop the bash session

### Alternative Server Commands (All Validated)
- **Linux/macOS**: `python3 -m http.server 8000`
- **Windows**: `py -m http.server 8000`
- **Alternative port**: `python3 -m http.server 9000` (or any available port)

## Validation Scenarios

**ALWAYS run through these complete user scenarios after making any changes:**

### End-to-End Game Testing
1. **Start server** and navigate to `http://localhost:8000`
2. **Verify main menu loads** - Should see "PLAY" and "SETTINGS" buttons with forest background
3. **Test level selection** - Click "PLAY", should see level buttons (1, 2, etc.)
4. **Test gameplay** - Click level 1, should see:
   - Slingshot on left side with fruit character
   - Target structures (burger, fries, etc.) on right side
   - Score display showing "Score: 0"
   - Music toggle and restart buttons
5. **Test game interactions** - Click music toggle, restart button
6. **Verify no console errors** - Check browser developer tools

### Required Validation After Changes
- **Always test the complete user flow** from main menu → level selection → gameplay
- **Always check browser console** for JavaScript errors
- **Always verify game physics work** by testing slingshot interactions
- **Always test on localhost:8000** - do not skip this step

## Repository Structure

### Key Directories and Files
```
/home/runner/work/froot-wars/froot-wars/
├── index.html              # Main game entry point
├── README.md               # Basic setup instructions
├── css/
│   └── styles.css         # Game styling
├── js/
│   ├── game.js            # Main game logic (1,146 lines)
│   ├── Box2dWeb-2.1.a.3.min.js  # Box2D physics engine
│   └── box2d.js           # Alternative Box2D version
├── images/
│   ├── icons/             # UI icons (play, settings, etc.)
│   ├── entities/          # Game characters and objects
│   └── backgrounds/       # Game backgrounds
└── audio/                 # Game sound effects (.mp3/.ogg)
```

### Important File Details
- **No package.json**: This is a static website with no build process
- **No dependencies to install**: All libraries are included as static files
- **Main game logic**: All in `js/game.js` - start here for game mechanics
- **Physics engine**: Uses Box2D for realistic physics simulation
- **Cross-browser audio**: Includes both .mp3 and .ogg formats

## Development Guidelines

### Making Changes
- **No build process required** - changes to HTML, CSS, JS are immediately visible
- **Refresh browser** after making changes to see updates
- **Check browser console** for JavaScript errors after changes
- **Test game functionality** after any JavaScript modifications

### Key Code Areas
- **Game initialization**: Look in `js/game.js` starting at line 23 (DOMContentLoaded)
- **Physics setup**: Box2D constants and world setup at top of `js/game.js`
- **Level data**: Defined within `js/game.js` as level configurations
- **Asset loading**: Images and audio loaded dynamically by game.js
- **UI interactions**: Event handlers attached to DOM elements

### Common Tasks

#### Adding New Levels
1. **Edit** `js/game.js` 
2. **Find** level data structures in the file
3. **Add** new level configuration following existing pattern
4. **Test** by refreshing browser and navigating to level

#### Modifying Game Physics
1. **Edit** Box2D parameters in `js/game.js`
2. **Look for** b2World, b2Body, b2Fixture configurations
3. **Test** slingshot and collision behaviors after changes

#### Adding New Graphics
1. **Add** image files to appropriate `images/` subdirectory
2. **Update** `js/game.js` to reference new images
3. **Test** that images load and display correctly

## Troubleshooting

### Common Issues and Solutions

**Game won't load**:
- Check browser console for JavaScript errors
- Verify server is running on correct port
- Ensure all file paths are correct (case-sensitive)

**Physics not working**:
- Verify Box2D library loaded (check console)
- Check for JavaScript errors in game.js
- Ensure canvas element is properly initialized

**Audio not playing**:
- Check browser audio permissions
- Verify audio files exist in /audio directory
- Test with both .mp3 and .ogg formats

**Images not displaying**:
- Check file paths in HTML and JavaScript
- Verify images exist in /images directory
- Check browser network tab for 404 errors

### Performance Notes
- **Server startup**: Instant (< 5 seconds)
- **Game loading**: 2-5 seconds depending on browser
- **Asset loading**: Images and audio load progressively
- **No build time**: Changes are immediate

## File Reference

### Quick Directory Listings
```bash
# Root directory
$ ls -la
README.md index.html css/ js/ images/ audio/ .git/ .gitignore

# JavaScript files  
$ ls -la js/
Box2dWeb-2.1.a.3.min.js  box2d.js  game.js

# CSS files
$ ls -la css/
styles.css

# Image icons
$ ls -la images/icons/
level.png play.png settings.png sound.png nosound.png
next.png prev.png return.png pause.png
```

### Key File Sizes
- `js/game.js`: 32KB (main game logic)
- `js/Box2dWeb-2.1.a.3.min.js`: 225KB (physics engine)
- `css/styles.css`: 1.7KB (styling)
- `index.html`: 1.6KB (main page)

## Testing Strategy

### Browser Compatibility
- **Primary**: Modern browsers with HTML5 Canvas support
- **Audio**: Supports both MP3 and OGG formats for compatibility
- **Physics**: Box2D works in all modern JavaScript engines

### Manual Testing Checklist
After any changes, verify:
- [ ] Server starts without errors
- [ ] Game loads at http://localhost:8000
- [ ] Main menu displays correctly
- [ ] Level selection works
- [ ] Gameplay screen loads
- [ ] Slingshot interaction responds
- [ ] Music toggle functions
- [ ] No browser console errors
- [ ] Game physics behave normally

### Debugging Tools
- **Browser Developer Tools**: Essential for JavaScript debugging
- **Console logging**: Game includes debug logging (controlled by DEBUG flag)
- **Network tab**: Check for failed asset loads
- **Canvas inspection**: Use browser tools to inspect canvas rendering

Remember: This is a static website game with no build process. Changes are immediate, testing is straightforward, and the Python HTTP server is all you need to run it locally.