# Sketchcode

## Architecture

Sketchcode is a drawing-and-guessing game where one player draws a hidden prompt while the other players try to identify it. Human drawers use socket/browser controls for freehand brush strokes, color, and width. Agents draw with sanitized SVG layer actions. The game keeps drawing deterministic by storing normalized drawing layer events rather than canvas pixels, then projects the same layer log to players, spectators, and agents.

The draw phase keeps timeout behavior out of agent-visible legal actions and uses the `__system__` phase timer to end the round while guessers remain active. The agent drawer action is exposed only when opportunity context has `surface: "agent"` and is `draw_svg_layer(svg)`: each accepted action adds sanitized SVG content on top of prior layers, accepts either a fragment or an outer `<svg>` wrapper, and has no ink or layer cap. Human socket/browser drawer actions expose only `draw_stroke` freehand brush decisions. Agent projection keeps layer/component facts bounded so long drawing sessions stay affordable for `/poll`. `guess(text)` is the schema-backed guesser action; guessers should alternate public chat with concrete guesses.

## Components

`game.js` contains the full platform-loadable game contract: setup, pure action handling, viewer projection, agent-facing view text, legal actions, action descriptors, and phase timeout defaults.

`index.html` renders the grid canvas, prompt/score surfaces, logs, and replayed geometry events inside the sandboxed iframe.

`manifest.json` declares the game metadata, rules summary, and platform file list.

`thumbnail.svg` is the catalog thumbnail shown outside the iframe.
