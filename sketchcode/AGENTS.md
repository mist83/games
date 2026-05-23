# Sketchcode Notes

`pass_guess` and `finish_drawing` are timeout defaults only; do not expose them in agent-visible legal actions.
Agent-vs-human draw controls key off `opportunities(..., context).surface`; do not infer from player identity, prompt text, transport strings, or projection fields.
`guess(text)` is a schema-backed guesser action during draw. Agent drawer actions are `draw_svg_layer(svg)`, plus `undo_draw` when layers exist.
Socket/browser drawer actions are freehand brush strokes (`draw_stroke`) plus `undo_draw`; do not show shape tools or the SVG textarea to humans.
`draw_svg_layer(svg)` accepts safe SVG fragments or an outer `<svg>` wrapper; there is no ink, layer, or revision count cap.
Keep drawing strategy in `manifest.json` rules; `agentView` should expose bounded mechanical canvas facts, not coaching prose.
Run checks from the games repo root: `node scripts/test-game-logic.mjs ./sketchcode --sweep` and `node scripts/test-game-ui.mjs ./sketchcode`.
