# Froot Wars

This repository contains the static assets for the Froot Wars game. To play the game locally you need to serve these files through a web server.

## Running the site locally

All modern operating systems provide simple ways to run a basic web server. Use the commands below for your platform and then open `http://localhost:8000` in your browser.

### Linux

```bash
cd /path/to/froot-wars
python3 -m http.server 8000
```

### macOS

```bash
cd /path/to/froot-wars
python3 -m http.server 8000
```

### Windows

Open Command Prompt or PowerShell and run:

```cmd
cd path\to\froot-wars
py -m http.server 8000
```

Once the server is running you can access the game at `http://localhost:8000`.

## Development

The game itself ships with no build step — the files served above are exactly
what runs in the browser. The tooling below is only for development and CI; it
is never required to play the game.

Install the dev dependencies once:

```bash
npm install
```

Then:

```bash
npm run lint   # ESLint over js/ and the tests
npm test       # Vitest unit tests (jsdom)
```

The tests load `js/game.js` unmodified inside a faked Planck.js + DOM environment
(see `test/helpers/loadGame.js`) and cover level-data integrity, level
loading, scoring/high-score persistence, the asset loader, camera panning, and
collision damage. Both commands run automatically on every push and pull
request via [GitHub Actions](.github/workflows/ci.yml).
