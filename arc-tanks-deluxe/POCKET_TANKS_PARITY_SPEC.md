# Pocket Tanks Parity Specification

## Purpose

This document turns the latest Pocket Tanks reference review into an actionable parity backlog for `arc-tanks-deluxe`. The target is not to copy Pocket Tanks assets, sounds, icons, source code, or branding. The target is to match the observable game feel, control layout, terrain behavior, shot timing, and score-first artillery loop as closely as possible with original Arc Tanks visuals and implementation. Current Arc Tanks tuning intentionally uses a 24-weapon draft with 12 picked weapons and 12 shots per side.

## Research Inputs

- YouTube video reviewed: [Pocket Tanks Gameplay](https://www.youtube.com/watch?v=zguf7ZeBpA4)
- Gameplay rules reference: [StrategyWiki Pocket Tanks Gameplay](https://strategywiki.org/wiki/Pocket_Tanks/Gameplay)
- Weapon behavior reference: [StrategyWiki Pocket Tanks Weapons](https://strategywiki.org/wiki/Pocket_Tanks/Weapons)
- Screenshot/description reference: [MobyGames Pocket Tanks](https://www.mobygames.com/game/9812/pocket-tanks/)
- Local reference frames captured from the YouTube video:
  - `screenshots/arc-tanks-deluxe/pocket-tanks-reference/0000-title-controls.png`
  - `screenshots/arc-tanks-deluxe/pocket-tanks-reference/0062-weapon-select-or-start.png`
  - `screenshots/arc-tanks-deluxe/pocket-tanks-reference/0136-battle-shot.png`
  - `screenshots/arc-tanks-deluxe/pocket-tanks-reference/0245-terrain-craters.png`
  - `screenshots/arc-tanks-deluxe/pocket-tanks-reference/0366-special-weapon.png`
  - `screenshots/arc-tanks-deluxe/pocket-tanks-reference/0520-late-match.png`
- Current Arc Tanks comparison frames:
  - `screenshots/arc-tanks-deluxe/desktop-01-phase-battle.png`
  - `screenshots/arc-tanks-deluxe/mobile-01-phase-battle.png`
  - `screenshots/arc-tanks-deluxe/manual/pocket-style-damage-ticker.png`

## Reference Observations

The Pocket Tanks video shows a compact, old-school artillery screen with almost no decorative HUD above the playfield. Scores live in the upper corners, the volley counter sits at top center, and the entire bottom edge is a fixed gray control console. Tanks are small, sloped, sprite-like vehicles placed on a very large hilly terrain mass. The terrain reads as smooth layered green strata rather than a block grid. Shots are small bright shells that leave the barrel, arc through the sky, and only produce weapon effects on impact. Damage appears as many small point numbers near the tank or impact, with long-lasting effects ticking points above the target for a short period.

The weapon shop screen is a major identity piece. It uses a centered "Weapon Shop" title, a center pool of random weapon choices, blue and red player loadout boxes on the sides, weapon icons next to names, an active pick arrow, and a Random button. StrategyWiki confirms the real flow: 20 random weapons are shown, players alternate picks until each side has 10, or Random can assign them. Arc Tanks now extends that structure to 24 random weapons so each side drafts 12.

## High-Level Gaps

Arc Tanks has improved mechanically, but it still diverges in several important ways:

- The battle screen still looks like a modern web game instead of the Pocket Tanks battle console.
- The bottom controls are functional but not shaped like the reference controls.
- The weapon select screen is a random assignment grid, not a weapon shop/draft screen.
- Terrain destruction exists, but the terrain does not yet look or behave like the smooth, layered, crater-heavy reference terrain.
- Tanks are too visually generic and do not fully read as small sloped Pocket Tanks-style sprites.
- Projectile, impact, fire, and point scoring animations are getting closer, but need stricter phase timing and more faithful point-number presentation.
- Weapon-specific terrain operations need more dramatic, recognizable results: walls, columns, tunnels, dirt piles, craters, burials, mowers, lasers, rollers, and lasting fire.

## Parity Changes

### P0-001 Battle Layout: Remove Modern Header

Gap: The current battle view has a centered `ARC TANKS DELUXE` title and modern top HUD grouping. Pocket Tanks uses the playfield itself as the screen, with player names and scores in upper corners and volley text centered.

Target:
- Remove the large centered battle title from active gameplay.
- Put Player 1 name and score at top left in blue.
- Put Player 2 name and score at top right in red.
- Put `1st Volley`, `2nd Volley`, etc. at top center.
- Use compact, pixel/bitmap-like text styling with strong outlines or shadows.

Acceptance:
- Desktop screenshot visually matches `0062-weapon-select-or-start.png` top layout proportions.
- Mobile screenshot keeps scores visible without covering the tanks or controls.
- No battle state relies on the removed title for turn clarity.

### P0-002 Bottom Console: Replace Web Controls With Pocket Tanks-Style Chrome

Gap: Current controls are HTML-like form controls and buttons. Pocket Tanks uses a fixed gray/black instrument panel with a logo area, weapon selector, Move arrows, Fire button, Angle meter, Power meter, and tank illustration.

Target:
- Build one fixed bottom console band rendered/styled as game chrome, not generic form UI.
- Use bevels, dark wells, gray paneling, thin highlights, and compact numeric displays.
- Left side: Arc Tanks logo or original emblem in the same spatial role as the Pocket Tanks logo.
- Center: Move, Weapon, Fire, Angle, Power controls.
- Right side: original grayscale/tinted tank schematic or status art.
- Keep the controls visible after every shot and during the opponent turn if the local player still needs state context; disable only actions that are not legal.

Acceptance:
- No bottom control element overlaps the tanks on mobile.
- Controls remain visible after firing.
- Fire button has a distinct classic arcade treatment, not a plain rectangular web button.

### P0-003 Angle And Power Controls: Meter Bars With Step Arrows

Gap: Current angle/power controls are readable, but not reference-like. Pocket Tanks uses arrow steppers and horizontal meters with numeric values.

Target:
- Replace generic sliders with compact left/right arrow buttons around a horizontal meter.
- Show numeric angle and power beside or inside the meter.
- Angle and power persist across turns unless the player changes them.
- Turret rotation updates immediately while angle changes.

Acceptance:
- Drag/press/keyboard changes update the turret before firing.
- Values persist across turn changes.
- No dotted trajectory, no impact preview, no blast preview.

### P0-004 Movement Controls: Tank Moves When Move Buttons Are Pressed

Gap: The current move action can be submitted as part of firing, but Pocket Tanks-style movement should visibly reposition the tank through the control panel before firing.

Target:
- Move left/right buttons apply visible pre-shot movement immediately, consuming finite move fuel.
- Tank slides/rolls along the terrain surface and updates slope/settling.
- Movement is clamped by remaining move fuel, map bounds, and terrain collisions.
- Movement can be undone only if the game rules explicitly support it; otherwise it becomes committed pre-shot movement.

Acceptance:
- Pressing left/right visibly moves the active tank before Fire.
- Move counter decreases and clamps at zero.
- The firing origin moves with the tank.

### P0-005 Projectile Origin: Fire From Barrel Tip

Gap: Shells must originate from the actual turret tip, not from the tank center or an offset that visually misses the barrel.

Target:
- Derive shot start from tank position, tank facing, body slope, turret angle, and barrel length.
- Renderer and game logic should agree on the muzzle point.
- Add a small muzzle flash at the tip before the shell starts moving.

Acceptance:
- Screenshots at launch show the shell attached to the barrel tip.
- No projectile appears from inside the tank body.

### P0-006 Shot Animation: True Parabolic Flight, No Shot Lines

Gap: The game previously showed lines or flat-feeling shot motion. Pocket Tanks shows a small shell traveling in an arc with no persistent path guide.

Target:
- Animate projectile position from sampled physics trajectory with a smooth parabolic arc.
- Do not draw persistent green/path lines, tracer lines, or impact previews.
- Show only a tiny shell sprite/shape in flight, with optional very short glow or smoke that dissipates immediately and does not imply aim assistance.

Acceptance:
- A mid-flight screenshot shows the shell in the sky on a curved trajectory.
- A before-impact screenshot shows no fire/explosion/damage effects yet.
- No path line remains after the shot resolves.

### P0-007 Terrain Rendering: Smooth Layered Green Strata

Gap: Arc Tanks terrain still reads too blocky/blurry in places. Pocket Tanks terrain is smooth, layered, and green, with darker contour bands following the surface.

Target:
- Keep the destructible 2D grid internally, but render terrain through a higher-resolution canvas texture.
- Smooth the visible terrain silhouette with marching squares, contour tracing, or column interpolation.
- Draw multiple horizontal/contour strata bands inside the terrain mass.
- Use crisp nearest-neighbor or high-resolution texture rules so the terrain is not blurry on mobile.
- Preserve sharp circular crater edges where weapons remove terrain.

Acceptance:
- Terrain no longer looks like individual square cells at normal zoom.
- Craters are visibly circular or tunnel-shaped.
- Mobile terrain is crisp, not blurry, and tanks remain visible.

### P0-008 Terrain Scale: Larger Battlefield, Smaller Tanks

Gap: Pocket Tanks has a larger terrain mass and smaller tanks relative to the world. Arc Tanks has sometimes felt cramped or oversized.

Target:
- Use a visual composition where terrain occupies most of the lower battlefield and tanks are small tactical pieces.
- Hills should rise high enough to materially affect shots, with steep slopes and valleys.
- Tanks should be around Pocket Tanks proportions relative to map width and bottom console height.

Acceptance:
- Two tanks can be far apart with meaningful hills between them.
- Desktop and mobile both show the whole battlefield without the control console covering tanks.

### P0-009 Tank Sprites: Sloped, Small, Readable Vehicles

Gap: Current tanks are functional but not close enough to the small angled sprite feel of Pocket Tanks.

Target:
- Replace the current tank drawing with original sprite-like Pixi/Canvas art: treads, angled body, turret, outline, colored accent.
- Tank body rotates or visually conforms to the terrain slope.
- Turret rotates independently from the body.
- Add compact hit/active highlights but avoid modern neon styling.

Acceptance:
- A screenshot at rest clearly shows a barrel direction and tank slope.
- Tank scale matches reference framing.

### P0-010 Weapon Shop: Recreate The Draft Screen

Gap: Current random weapon assignment satisfies the shortcut requirement, but it does not look like Pocket Tanks' weapon shop identity.

Target:
- Build a Weapon Shop screen with:
  - centered title,
  - central random pool of 20 weapons,
  - blue Player 1 loadout box on the left,
  - red Player 2 loadout box on the right,
  - weapon icons next to names,
  - active selection arrow,
  - Random button.
- Preserve a Random button as a quick-pick shortcut, while keeping manual alternating picks as the primary flow.
- Keep the bottom console chrome visible but inactive/empty, matching the reference.

Acceptance:
- Initial screen resembles `0245-terrain-craters.png` and `0520-late-match.png`.
- The state assigns exactly 12 weapons per player.
- A random-all path can complete without manual picks.

### P0-011 Scoring UI: Corner Scores And Point Ticks

Gap: Current score/damage numbers are improved but not yet fully Pocket Tanks-like. Pocket Tanks shows score totals in corners and small point increments near impacts/tanks.

Target:
- Keep score totals in the top corners throughout battle.
- On direct hits, show small floating point numbers near the tank/impact.
- On fire/lava/napalm, tick multiple smaller point numbers over a short duration above the affected tank.
- Use color and size close to reference: readable, compact, and clustered rather than huge arcade numbers.
- Update the corner score in sync with point tick timing, not all at once if the shot is visibly still scoring.

Acceptance:
- Fire weapon screenshot shows repeated point increments above the enemy tank.
- Corner score visibly changes during or immediately after the point tick sequence.
- Damage numbers never appear before impact.

### P0-012 Turn Pacing: Fast Resolution With Clear Volley Flow

Gap: Lasting damage has previously made the player wait too long or blocked the next turn.

Target:
- Shot sequence phases: aim commit, muzzle flash, projectile flight, impact event, terrain mutation reveal, point ticks, short settle, next turn.
- Long-lasting weapons should feel punchy: usually 1.0-2.5 seconds of scoring animation, not an indefinite wait.
- The UI must indicate whose turn is next and re-enable controls deterministically.

Acceptance:
- Every weapon resolves to a legal next turn within a fixed max duration.
- Tests cover fire/lava/flamethrower turn advancement.
- No shot can leave controls disabled forever.

### P1-013 Circular Craters: Weapon-Specific Diameters

Gap: Pocket Tanks terrain removal is strongly visual: many weapons cut obvious circular chunks of different diameters.

Target:
- Single Shot: small clean crater.
- Big Shot: medium crater.
- Crater Maker: very large crater.
- Earth/Mountain Mover: huge terrain removal with low or zero score.
- Chain Reaction/Mega Reaction: multiple overlapping circular craters.
- Firecracker: horizontal chain of small craters.

Acceptance:
- Forced screenshots show clearly different crater diameters for the listed weapons.
- Crater borders remove the green surface outline as fully as interior terrain.

### P1-014 Dirt Creation: Mounds, Walls, Burial, And Blocking

Gap: Pocket Tanks has many weapons that add terrain, bury tanks, create walls, or change later shot strategy.

Target:
- Dirtball/Big Dirtball create circular solid dirt piles.
- Dirt Slinger creates a triangular or fan-shaped pile.
- Wall/Elevator/Pile Driver-style weapons create vertical columns or walls.
- Cruball/Burial-style weapons can cover part of a tank and alter future line of fire.
- Bouncy Dirt, Glue, Concrete should visually read as different material overlays.

Acceptance:
- Dirt-adding weapons visibly add solid terrain, not particles-only decoration.
- Tanks settle on or inside newly added terrain according to rules.

### P1-015 Tunnels And Diggers

Gap: Digger/tunnel weapons should carve paths through terrain, not just make small dents.

Target:
- Digger removes a short tunnel near the shooter or impact.
- Drillers carve multiple tunneling projectiles toward the opponent.
- Bouncy Tunnel cuts a continuous tunnel and paints bounce material on its inner edge.
- Bunker Buster/Torpedo-style weapons travel through terrain before exploding.

Acceptance:
- Forced screenshots show continuous tunnel geometry.
- Later projectiles can interact with bouncy material when relevant.

### P1-016 Rolling, Skipping, And Ground-Hugging Weapons

Gap: Pocket Tanks has weapons that roll, cruise, bounce, or skip along terrain before activating.

Target:
- Cruiser rolls along the terrain surface for a fixed distance/time before exploding.
- Cannon Ball bounces off dirt before direct-hit activation.
- Skipper-style weapons bounce or skip over terrain.
- Boomerang reverses after landing and travels back before exploding.

Acceptance:
- Shot timeline includes visible ground-following or bouncing phases.
- Terrain and tank collisions determine the endpoint, not a generic impact-only blast.

### P1-017 Direct Beams And Lasers

Gap: Beam weapons should have clear terrain behavior: some pass through, some cut, some score direct hits.

Target:
- Laser/Phaser-style weapons fire instantly/directly from barrel.
- Some beams cut thin terrain channels.
- Some beams score without major terrain removal.
- Visual effect should be brief and crisp, not a lingering aim line.

Acceptance:
- Beam frame appears only during firing.
- No beam remains as a persistent targeting guide.

### P1-018 Fire, Lava, Napalm, And Burning Hazards

Gap: Fire is one of the clearest remaining feel differences. Pocket Tanks-like fire should land, burn briefly, and tick points above the tank.

Target:
- Fire effects do not begin until impact.
- Flame/lava pools cling to terrain pits or the tank contact area.
- More overlapping exposure means more point ticks.
- Burn duration is short and deterministic.
- Fire visuals use layered small flames/sparks/smoke, not a single jerky burst.

Acceptance:
- Fire in a trench scores more than fire beside a tank.
- Damage floats above the affected tank while burning.
- Controls return promptly after the burn sequence.

### P1-019 Weapon Icons And Catalog Presentation

Gap: Pocket Tanks uses small icons next to weapon names in the shop and selector.

Target:
- Give every curated weapon an original simple icon or icon color class.
- Use icons in weapon shop, weapon dropdown, and current weapon display.
- Keep names visible and readable; icons support quick recognition but do not replace text.

Acceptance:
- Weapon shop and battle selector visually resemble the reference density.
- Long weapon names fit without pushing layout.

### P1-020 Wind And Aim Readout

Gap: Pocket Tanks' challenge is about judging angle/power with wind and terrain. Arc Tanks must present these constraints in the same compact way.

Target:
- Show wind with a small direction/speed indicator in the battle chrome or top area.
- Keep angle/power numeric values visible.
- Do not add perfect prediction.

Acceptance:
- Player can infer current wind, angle, and power without a trajectory preview.

### P1-021 Audio And Hit Feedback

Gap: The reference has strong old-school UI and shot feedback. Arc Tanks should use documented platform sound IDs without custom sound helpers.

Target:
- Add `playgent.sound("<id>")` calls using documented IDs from `SOUND_GUIDE.md`.
- Trigger distinct feedback for button press, fire, impact, dirt build, score tick, and game over if suitable IDs exist.
- Keep audio optional and non-blocking.

Acceptance:
- Sound calls do not break tests or platform load.
- No undocumented per-game sound shim is added.

### P2-022 Main Menu And Mode Screen Polish

Gap: Pocket Tanks has a recognizable title/control screen. Arc Tanks currently focuses on match payload.

Target:
- If the platform entry supports a pregame screen, add a compact original title/options presentation inspired by the reference control density.
- Do not add a marketing landing page.
- Keep direct match start fast for the platform.

Acceptance:
- The first viewport is playable and not a static promo page.

### P2-023 Mobile Console Adaptation

Gap: Earlier mobile versions covered the tanks or terrain with controls.

Target:
- Bottom console has a fixed maximum height relative to viewport.
- Controls compress into two rows only when needed.
- Terrain viewport reserves enough visible height above the console for tanks, hills, projectile arcs, and damage ticks.
- Text never overflows buttons/meters.

Acceptance:
- Mobile screenshots show both tanks at match start.
- Damage ticks and projectile flight remain visible above the console.

### P2-024 Endgame Presentation

Gap: Pocket Tanks ends after weapon volleys with score comparison, not HP elimination.

Target:
- Ensure game end is based on score after all weapons are used or max turns reached.
- Show final score comparison in the same compact battle style.
- Keep winner overlay compatible with platform expectations.

Acceptance:
- A full game with 12 weapons each ends after 24 total shots.
- Ties remain possible and clearly displayed.

## Implementation Plan

Phase 1: Visual Shell Parity

- Implement P0-001 through P0-009.
- Focus on battle screen screenshot matching before deeper weapon tuning.
- Required screenshots: desktop start, mobile start, angle changed, tank moved, launch frame, mid-flight frame, impact frame.

Phase 2: Weapon Shop Parity

- Implement P0-010 and P1-019.
- Preserve random-all assignment while presenting it inside the shop layout.
- Required screenshots: weapon shop desktop/mobile, picked loadouts visible, transition to battle.

Phase 3: Terrain And Core Weapon Ops

- Implement P1-013 through P1-015.
- Tune grid-to-renderer conversion so operations produce visible, crisp terrain changes.
- Required forced scenarios: Single Shot, Big Shot, Crater Maker, Earth Mover, Dirtball, Big Dirtball, Wall, Digger, Bouncy Tunnel.

Phase 4: Motion And Special Weapons

- Implement P1-016 through P1-018 and P1-020.
- Build explicit shot timeline phases for rolling, bouncing, direct, beam, fire, and burn weapons.
- Required forced scenarios: Cruiser, Cannon Ball, Boomerang, Laser, Torpedo, Fire in the Hole, Lava, Flamethrower.

Phase 5: Polish, Audio, And Endgame

- Implement P1-021 through P2-024.
- Tune point ticks, pacing, game-over screen, and mobile constraints.
- Run final adversarial screenshot comparison against the saved YouTube reference frames.

## QA Requirements

Every parity phase must include deterministic visual QA, not just live play.

Required commands from repo root:

```powershell
node scripts/test-game.mjs ./arc-tanks-deluxe --all --seeds 42,1337
node scripts/test-game-logic.mjs ./arc-tanks-deluxe --sweep
node scripts/test-game-ui.mjs ./arc-tanks-deluxe
git diff --check
```

Required screenshot sets:

- Desktop battle start, mobile battle start.
- Weapon shop desktop and mobile.
- Active turn with changed angle and moved tank.
- Projectile launch from barrel tip.
- Projectile mid-arc.
- Before impact, proving no premature fire/explosion/damage.
- Impact frame for crater, dirt build, tunnel, laser, and fire.
- Damage tick frame for direct hit and lasting fire.
- Post-settle next-turn frame, proving controls return.

Adversarial cases:

- Fire/lava/flamethrower cannot soft-lock turn advancement.
- Terrain rim/green outline must be removed with crater interiors.
- Mobile controls cannot cover either tank at spawn.
- Weapon names cannot overflow selector or shop boxes.
- Angle/power values persist after both players fire.
- Movement cannot move tanks outside map or through solid terrain.
- No renderer code may decide score, legality, hit outcome, or terrain mutation; those remain in `game.js`.

## Definition Of Done

The rebuild is parity-ready when:

- A side-by-side screenshot review of the saved YouTube frames and Arc Tanks frames shows matching screen hierarchy, tank scale, terrain scale, bottom console density, score placement, and shot timing.
- The weapon shop reads as a faithful original reinterpretation of Pocket Tanks' draft screen.
- The 50 curated weapons all have concrete terrain, movement, direct-fire, or scoring behavior, not generic name-only behavior.
- All long-lasting damage weapons resolve quickly, score visibly, and return controls deterministically.
- All required validation commands pass.
- No copyrighted Pocket Tanks assets, sounds, icons, source, or exact branding are included.
