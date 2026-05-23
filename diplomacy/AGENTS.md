# Diplomacy

Orders are submitted one army at a time; keep `autoCompleteOrders` available as the timeout/default finish action.
Agent-facing order labels are presentation only; validation and resolution consume the raw order decision payloads.
Negotiation is chat-only; do not add game actions during `negotiate` unless the phase model changes.
`agentView` map text is intentionally compact but must keep army ownership, supply centers, pending orders, and next unordered army.
Run checks from the games repo root: `node scripts/test-game-logic.mjs ./diplomacy --sweep`.
