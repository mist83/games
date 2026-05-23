# scripts/vendor/

## Architecture

This folder contains browser libraries that Clankerfights injects for uploaded games. Tests serve these files locally so PixiJS games can render in isolation.

Vendoring trades a little repository size for deterministic local validation and removes a hidden dependency on the main platform checkout.

## Components

`pixi-v8.17.0.min.js` is served as `/lib/pixi.min.js` by `test-game-ui.mjs` when a manifest declares `"libraries": ["pixi"]`.
