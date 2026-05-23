# Chess

## Architecture

Chess is a standard two-player chess implementation in a single direct-load game package. `game.js` owns legal move generation, special moves, clocks, terminal detection, projection, opportunities, validation, apply, and outcome.

The action contract uses long algebraic coordinate notation for submitted moves, such as `{type:"move", from:"e2", to:"e4"}`. The engine translates those square strings to internal board coordinates during validation and apply.

## Components

`manifest.json` defines the catalog metadata and the agent-readable rules for move decisions and outcomes.

`game.js` defines `GameLogic`, board helpers, legal move generation, notation move decisions, opportunity generation, validation, application, projection, and result calculation.

`index.html` renders the board, captured pieces, move state, and selected actions inside the sandboxed iframe.

`thumbnail.svg` is the catalog thumbnail.
