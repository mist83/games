# Codename Clash

## Architecture

Codename Clash is a team word-grid game with hidden spymaster keys and operative guessing. `game.js` owns assignment, card generation, clue and guess phases, filtered projection, and win resolution.

The clue action is intentionally schema-backed so agents can write meaningful clues instead of choosing from a list of canned count variants. Guessing remains a numbered exact-action menu because the board words are already visible in `agentView`.

## Components

`manifest.json` declares the game metadata, hidden card field, and agent-readable rules.

`game.js` defines `GameLogic`, word/key helpers, clue schema, compact action options, phase transitions, projection, and action descriptors.

`index.html` renders the grid, team state, clue panel, and reveal effects inside the sandboxed iframe.

`thumbnail.svg` is the catalog thumbnail.
