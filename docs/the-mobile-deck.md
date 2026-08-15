# THE MOBILE DECK — research + thinking (2026-08-15, no code)

His correction, on the money: v1 squeezed desktop furniture onto a
phone. Text buttons, desktop HUD panels, desktop assumptions. The order:
research how mobile flight/space games actually lay their decks, then
merge THEIR conventions with OUR language.

## 1. What the genre actually does (research)

Sources: MDN's mobile-touch control patterns, Pocket Gamer's Subdivision
Infinity coverage, Galaxy on Fire 2 (the classic mobile space sim),
pixune/appnality mobile-UI guides, the Game UI Database + Interface In
Game screenshot libraries (CoD Mobile, Genshin Impact), a York U
tilt+touch input study, and the Unity/Godot virtual-joystick
literature.

The conventions, boiled down:

1. **Left thumb = movement, right thumb = actions.** Universal, in
   landscape. Space sims put STEERING on the left stick (Galaxy on
   Fire, Subdivision Infinity) — aim the nose, not strafe.
2. **The stick FLOATS.** Modern shooters (CoD Mobile, PUBG) spawn the
   stick wherever the thumb lands in its zone and it fades when idle.
   Measured usability slightly favours floating over fixed
   (learnability 4.36 vs 4.07 in the one controlled study found).
3. **The right-thumb ARC.** One BIG primary action sits at the thumb's
   natural resting arc; smaller satellites curve around it. Nobody
   stacks four same-size rectangles in a column (which is what we
   shipped).
4. **Icons, not words.** Text labels are a desktop habit; the genre
   uses glyphs with weight ≥ 80–120 px @1080p (≈ 48–64 CSS px min
   target), generous spacing, translucent fills so the world shows
   through, and pressed/cooldown states drawn ON the button.
5. **Empty right-half drag = camera.** The other universal (every
   mobile shooter): the right half of the screen, outside buttons, is
   a look-around surface.
6. **Throttle is either a right-edge slider (sim end: Infinite
   Flight) or AUTO with a boost button (arcade end: most).**
   Subdivision Infinity does vertical drag-to-throttle.
7. **HUD minimalism is survival, not taste.** Corners only, tiny,
   collapsible; PUBG-class games let players move/resize everything —
   the info that matters mid-fight lives around the CENTER RETICLE,
   everything else shrinks to chips.

## 2. Our control surface (what must fit)

Flight: yaw+pitch (couple), thrust, reverse, boost, flip, lateral
strafe (Q/E), camera orbit. Systems: jump drive (N, contextual),
accepts (G/H, contextual), radar tap-jump, mute. HUD: nav MFD, scope,
drive console, battle cluster (VEL/PDC/HULL), warning strip, labels,
coach lines.

## 3. THE PROPOSAL — the deck, redrawn in the genre's grammar

```
┌──────────────────────────────────────────────────────────────┐
│ [SYS chip·jump]                        [warning strip]  [◉]  │  ← top: nav chip L, mute R
│                                                              │
│                                                   ┌────────┐ │
│                        ✛ reticle                  │ scope  │ │  ← battle-only mini-scope
│        (battle: VEL·PDC·HULL tight around it)     └────────┘ │
│                                                              │
│   ╭╌╌╌╌╌╌╮                                        (↻)        │
│   ╎ stick╎        [ESCORT] [MANHUNT]           (⇤)   (⚡)    │  ← contextual accepts, center
│   ╰╌╌╌╌╌╌╯                                        ╭────╮     │
│    floats in                                  (▽) │ ▲  │     │  ← the ARC: BURN big at rest,
│    left zone                                      ╰────╯     │     BOOST above, REV inner,
└──────────────────────────────────────────────────────────────┘     FLIP outer satellite
```

- **LEFT ZONE (0–45% width): the floating stick.** Appears under the
  thumb, steers the nose (yaw/pitch), ghost-fades after ~3 s idle.
  Strafe does NOT come to mobile (a desktop nicety; the flight model
  never requires it).
- **RIGHT ZONE: camera drag** anywhere that isn't a button — the CoD
  reflex, and we already have the orbit code.
- **THE ARC (right corner):** BURN is the one big button (~92 px) at
  the thumb's rest; BOOST (⚡ double-chevron) arcs above it; REV (▽)
  sits inner; FLIP (↻) is the far satellite. ICONS ONLY, drawn in our
  own line style (the MarkerIcon grammar: thin strokes, backing
  discs), amber for drive, teal for utility — colour says WHAT, as
  everywhere else in this game.
- **JUMP (◇ the warp diamond)** appears as a satellite ONLY when a
  destination is armed — contextual, like N on desktop.
- **ACCEPTS stay words** (ESCORT / MANHUNT / RE-RUN) as centre-bottom
  chips: they are rare, they are decisions, and a decision deserves a
  word. Either thumb reaches them.
- **HUD diet:**
  - Nav MFD collapses to a TOP-LEFT CHIP: system name + distance +
    jump state. Tap = the old panel slides out (progressive
    disclosure), tap again = away.
  - **The scope returns to phones** as a battle-only 112 px disc,
    top-right, display-only (no tap-jump). Fixes the "phones fight
    blind" gap the honest way: the instrument present, the
    interaction desktop-only.
  - The battle cluster keeps the genre law (center reticle anatomy)
    but tightens: VEL and HULL as two short bars flanking the
    reticle, PDC pips beneath it, warning strip unchanged.
  - Buttons at 0.35 fill opacity (down from 0.6): the world owns the
    screen.

## 4. What we do NOT do

- No tilt controls (the study's synergy gains don't survive a bridge
  you also READ; nobody flies a portfolio holding it like a wheel).
- No settings/customisation screen (PUBG-scale config is for
  200-hour games; we ship ONE good deck).
- No auto-fire changes — guns were always automatic; the mobile deck
  changes nothing about combat truth.
- No second stick. One nose, one stick.

## 5. Open questions for his ruling

1. The arc as drawn (BURN big, BOOST/REV/FLIP satellites) — yes/no?
2. Mini-scope top-right during battle — yes, or keep phones scope-less
   until the playtest rules?
3. Nav chip with tap-to-expand — or keep the always-open small MFD?
4. Throttle model stays BURN-hold (arcade grammar) — or does anyone
   actually want the sim-style right-edge slider?
