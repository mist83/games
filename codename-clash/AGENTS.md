# Codename Clash

The clue phase exposes one schema-backed `clue(word,count)` option; do not expand it back into multiple fixed count actions.
Guess actions should stay exact card-index decisions with labels that include index and visible word.
`agentView` is the canonical compact board: spymasters and spectators see key marks, operatives see unknown marks until reveal.
Keep clue words sanitized and counts clamped in `perform()` so schema input remains forgiving.
Run checks from the games repo root: `node scripts/test-game-logic.mjs ./codename-clash --sweep`.
