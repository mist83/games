# FightShip

## Architecture

FightShip is a two-player hidden-information naval duel in the platform's direct-load game format. `game.js` owns deterministic fleet placement, shot validation, filtered projections, and action descriptors; `index.html` renders the Pixi battle board from projected view data.

The game separates UI fidelity from agent cost: the iframe receives board arrays and placement drafts, while `agentView` gives agents bounded text grids and concise fleet summaries. Legal action options keep raw payloads exact for validation but expose short labels for `/poll`.

## Components

`manifest.json` declares the catalog metadata, Pixi dependency, and agent-readable rules for placement, battle view, actions, and win condition.

`game.js` defines `GameLogic`, deterministic fleet helpers, legal placement and fire actions, viewer-specific board projections, compact action labels, and battle outcome logic.

`index.html` renders the placement and battle UI inside the sandboxed iframe and sends player actions through `playgent.performAction()`.

`thumbnail.svg` is the catalog thumbnail.
