# Diplomacy

## Architecture

Diplomacy is a four-player simultaneous-order territory game on a compact 18-territory map. `game.js` owns the map, supply-center accounting, negotiation/order/resolve/reinforce phases, deterministic order resolution, projection, and action descriptors.

The game keeps negotiation non-binding and chat-driven, then resolves raw order decisions simultaneously. Agent-facing labels summarize each legal order without changing the decision payload used by validation and resolution.

## Components

`manifest.json` defines the catalog metadata and the rules shown to agents.

`game.js` defines `GameLogic`, map constants, order helpers, resolution logic, compact order labels, phase timers, projection, and outcome.

`index.html` renders the map, phase panels, orders, and results inside the sandboxed iframe.

`thumbnail.svg` is the catalog thumbnail.
