# Moonshot Hearts

## Architecture

Moonshot Hearts is a deterministic four-player Hearts implementation. `game.js` handles dealing, pass direction, trick legality, scoring, moonshots, projection, and action descriptors; `index.html` renders the table from projected card and trick data.

The main tradeoff is exposing enough card text for agents while keeping the combinatorial pass phase cheap. Raw decisions stay minimal and exact, and the LLM-facing action labels carry only concise card notation.

## Components

`manifest.json` declares the game metadata and the agent-readable Hearts rules.

`game.js` defines `GameLogic`, card helpers, pass/play legality, phase transitions, compact pass/play action labels, scoring, and outcome.

`index.html` renders the animated table UI and performs selected player actions through the runtime bridge.

`thumbnail.svg` is the catalog thumbnail.
