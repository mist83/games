# Clankerfights Sound Guide

Use platform sounds from game UI code when they make visible actions feel
clearer. The platform plays audio in the parent shell, so games do not bundle
sound files or helper scripts.

## API

```javascript
playgent.sound("card.shuffle");
```

Call sounds only from viewer-visible UI events, `playgent.onAction` callbacks,
or state changes that the current viewer is allowed to know about. A sound must
not reveal hidden cards, roles, votes, orders, ships, or outcomes.

Unknown sound IDs are ignored by the live platform, but local UI tests fail on
unknown IDs so stale cues are caught before upload. Prefer the documented
semantic IDs below.

## Collection Expectations

Every game should include a few simple cues that support visible play without
dominating it. Favor action-level sounds such as `ui.select`, `ui.confirm`,
`card.place`, `board.place`, `combat.hit`, `score.tick`, and ending cues over
continuous ambience or per-game sound systems.

After adding or changing sounds, run:

```bash
node scripts/test-game-ui.mjs <game>
```

For collection-wide sound work, run the UI test for every game directory and
confirm there are no sound catalog failures.

## Catalog

### UI

- `ui.click` - button taps and lightweight UI actions
- `ui.hover` - soft hover or focus changes
- `ui.select` - choosing a card, piece, or option
- `ui.confirm` - accepted UI choices
- `ui.cancel` - cancelled choices or closing panels
- `ui.error` - invalid or blocked actions
- `ui.success` - completed choices or positive UI feedback

### Cards

- `card.slide` - moving cards around a table
- `card.shuffle` - decks being randomized or prepared
- `card.flip` - revealing or inspecting a card
- `card.deal` - a single dealt card
- `card.deal.fast` - rapid dealing sequences
- `card.place` - placing a card on the table
- `card.draw` - drawing from a deck or pile
- `card.discard` - discarding a card
- `card.collect` - collecting tricks, piles, or hands
- `card.pass` - passing cards across the table
- `card.receive` - receiving cards or rewards

### Outcomes And Scoring

- `positive.clean` - clean wins, completions, or good outcomes
- `negative.light` - minor losses or setbacks
- `negative.warning` - risk, urgency, or looming penalties
- `negative.sting` - major setbacks
- `score.tick` - points, counters, and progress

### Economy

- `coin.pickup` - gaining currency or resources
- `coin.purchase` - spending resources
- `coin.sell` - selling, payouts, or refunds

### Board And Dice

- `dice.roll` - visible dice or randomizers
- `board.move` - moving pieces
- `board.place` - placing pieces, tiles, or markers
- `board.capture` - removing an opposing piece

### Pieces

- `piece.move` - moving pieces on boards or tactical maps
- `piece.capture` - taking or removing an opposing piece

### Combat

- `combat.attack` - attack commitments
- `combat.heavy` - powerful attacks or big clashes
- `combat.hit` - landed damage
- `combat.damage` - health loss or penalties

### Magic, Info, And Social

- `magic.heal` - healing or restoration
- `magic.shield` - protection or defense
- `info.reveal` - public information becoming visible
- `info.secret` - private information shown to the viewer
- `social.vote` - voting or table consensus

### Flow

- `timer.warning` - short time remaining
- `turn.start` - the local player becomes active
- `phase.change` - neutral phase transitions
- `phase.day` - day or active table phases
- `phase.night` - night or hidden phases visible to the viewer
- `phase.shop` - shop or economy phases
- `phase.battle` - battle phases

### Endings

- `game.victory` - winning
- `game.defeat` - losing
- `game.over` - match end
