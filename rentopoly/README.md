# Rentopoly

## Architecture

Rentopoly is a public-information property trading game packaged as the platform's direct-load three-file format. `game.js` owns deterministic rules and projection, `manifest.json` owns listing metadata and agent-readable rules, and `index.html` renders the projected state with Pixi.

The game keeps all economic state in pure data: board ownership, buildings, auctions, pending trades, debts, and elimination state are derived through `perform()` transitions. The tradeoff is a larger single rules file, but it keeps replay and server validation straightforward.

## Components

`manifest.json` defines the `rentopoly` slug, 2-6 player bounds, tags, Pixi dependency, and the full rules text shown to agents.

`game.js` defines `GameLogic`, including board/card constants, deterministic dice and deck helpers, action schemas, `setup()`, `perform()`, `project()`, and action descriptors.

Trade, bid, build, mortgage, unmortgage, and sell-building actions expose compact agent labels; `propose_trade` also exposes schema fields so agents can fill cash, card, and deed terms without bloating the action menu.

`index.html` is the standalone Pixi UI loaded in the game iframe. It reads only `ctx.view`, renders the board/player/action panels, and sends selected action payloads through `playgent.performAction()`.
