# LiarLiar

## Architecture

LiarLiar is a trivia bluffing game with writing, voting, results, and game-over phases. `game.js` owns question selection, deterministic fallback lies, hidden-information projection, scoring, and action descriptors.

The writing phase uses a schema-backed action so agents can submit original lies while the timeout path still has a deterministic safe default. Voting uses exact numbered options, with the answer text carried in `agentView` rather than duplicated in action labels.

## Components

`manifest.json` declares catalog metadata and the rules shown to agents.

`game.js` defines `GameLogic`, question data, lie validation, write schema, vote options, phase transitions, scoring, projection, and outcome.

`index.html` renders the prompt, writing/voting/results panels, and sends actions through the runtime bridge.

`thumbnail.svg` is the catalog thumbnail.
