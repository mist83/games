# Chess

Opportunities expose raw move decisions using algebraic square strings: `{type:"move", from:"e2", to:"e4", promotion?}`.
Do not add SAN/PGN parsing unless validation also accepts it; long algebraic coordinate notation is the canonical action contract.
Castling, en passant, and promotion should stay ordinary legal moves generated from `_legalMoves`.
`agentView` must keep algebraic coordinates visible so moves like `e2` to `e4` are understandable.
Run checks from the games repo root: `node scripts/test-game-logic.mjs ./chess --sweep`.
