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

---

# PASS 2 — the four surfaces I under-specified (2026-08-15, his push)

His question: what about the jump list, battle mode, the scope/3D
radar, and the voice? Thought through properly, still no code.

## A. THE JUMP LIST → THE CHART DRAWER

Fact on the ground: desktop jumps live in the console's sectioned list
(N key) and the radar's clickable blips — BOTH hidden on phones today.
A phone literally cannot leave the neighborhood. This is the single
worst mobile gap and it earns first-class treatment:

- The top-left NAV CHIP (system name · distance) tap-opens **THE
  CHART**: a left-edge drawer, full height, thumb-column width
  (~300 px), carrying the same sectioned list the console has — AMNIA
  DOCKS / PORTFOLIO SYSTEMS / UNSURVEYED — as BIG rows (52 px, name +
  distance + the marker glyph in its category colour, straight from
  MarkerIcon).
- Tap a row → the drawer closes and the jump ARMS: the ◇ warp diamond
  appears in the right-thumb arc, amber, pulsing once.
- Tap ◇ → warp. Two taps, both thumb-sized, zero precision needed.
- The drawer greys rows while in combat (the desktop law: no jumping
  out of a fight) and shows UNSURVEYED rows ashed, unjumpable, exactly
  like the chart language everywhere else.
- In-fiction name: THE CHART. It IS the First Charts, handed to a
  thumb.

## B. BATTLE MODE, phone anatomy

The desktop battle keeps the genre law — center reticle cluster — and
the phone TIGHTENS it instead of replacing it:

- Warning strip: top-center, unchanged (it is already the loudest
  thing and already short).
- VEL and HULL become two short BARS flanking the reticle (numbers on
  the bars, no panels); PDC pips sit in a single row under the
  reticle. Nothing else within thumb reach.
- Accept chips hide during battle (no decisions mid-fight — the board
  already stops offering).
- The arc stays exactly where it is: the fight IS flying, and the
  thumbs never move house.
- Coach lines: see D — one line, top-center, under the warning strip.

## C. THE SCOPE / 3D RADAR on the phone

The scope is the most information-dense instrument we own and the
desktop version assumes hover-free reading at 200+ px. On a phone:

- **Battle: the scope disc returns, 112 px, top-right, display-only.**
  The COLLAPSE morph still runs (it is one canvas, cheap) so the
  instrument is the SAME instrument — disc to cylinder, stems, ring,
  proximity strip. No tap-jump on the disc (fat fingers, small blips
  — the CHART drawer owns jumping now).
- **Nav: the disc stays hidden.** Out of combat the scope's nav job
  (where is everything, click to jump) is fully covered by the CHART
  drawer + world markers; a second tiny map would be ink, not
  information.
- The proximity strip renders at full width under the disc (it is the
  one battle read a small screen needs MOST — one line, no reading).

## D. THE VOICE on a small screen

Inventory: tiered center banners (alarm/event/outcome via say()), the
coach line (activityState.hint), the panel readout lines
(label·value), flash text, and board/kill-board text in-world.

Phone rules:
1. **One voice at a time.** Banner OR coach line, never both: banners
   already carry tiers; while a banner is live the coach line yields.
2. **Banners stay center** but drop to 15-16 px with a darker backing
   plate (phone contrast in sunlight is real), and hold ~1 s longer
   than desktop — thumbs are busy, eyes arrive late.
3. **The coach line moves to top-center** (under the warning strip),
   NEVER bottom — the bottom belongs to thumbs and chips. 12.5 px,
   single line, ellipsis rather than wrap: a coach who cannot say it
   in one phone line should not be talking mid-flight.
4. **Panel readout lines (label·value) do not exist on phones.** Their
   load-bearing values migrate: escort range/closing lives on the
   escortee's world marker chip (already in-world); hunt gap/closing
   the same on THE REVENANT's chip. World text over panel text —
   the house billboard principle applied to the HUD.
5. **Keyboard grammar is banned from touch copy.** Everything already
   branches on IS_TOUCH; the audit item is a sweep for stragglers
   ("PRESS N", "A / D") — the deck build includes that sweep.
6. In-world text (boards, kill-board, stencils) is untouched — it is
   scenery, distance handles it.

## E. Build order for the deck (after his ruling)

1. THE CHART drawer + armed-◇ jump flow (closes the cannot-jump hole)
2. The arc rebuild with MarkerIcon-style glyph buttons
3. Floating stick + right-half camera drag
4. Battle tightening (bars, pips, strip) + mini-scope disc
5. The voice pass (one-voice rule, coach relocation, touch-copy sweep)
6. Telemetry: the black box tags every deck interaction with zone +
   orientation, so the playtest can see thumbs, not guesses.

---

# BUILT (2026-08-15) — the deck as ruled

All six build-order items shipped and verified in forced-touch
emulation (real-phone verdict is his):

1. **THE CHART** (ChartDrawer.tsx + deckState.ts): nav chip top-left →
   full-height drawer, sectioned rows with marker-colour dots and live
   distances, UNSURVEYED ashed as NO CHART, combat lock line. Tap row
   → jump ARMS → the ◇ satellite appears in the arc, pulsing → tap ◇ →
   warp. Verified live: two taps took the phone from Deep Space to the
   Projects star — the first jump a phone has ever made in this game.
2. **THE ARC** (TouchControls.tsx rewrite): icon glyphs in the house
   line style — BURN 92 px amber plume at the thumb's rest, BOOST
   double-chevron above, REV/FLIP teal inner satellites, ◇ appearing
   only when armed. No text on any flight control.
3. **THE FLOATING STICK**: materialises under the thumb anywhere in
   the left 44%, steers the nose, ghosts on release. Right-half drags
   fall through to the camera orbit (the CoD reflex, free — the
   window-level handler already ignored [data-ui]).
4. **BATTLE**: accepts hide; cluster scales 0.82; warning strip
   tightened; THE SCOPE returns as a 118 px display-only disc,
   top-right, with tap-jump gated off on touch (the chart owns
   jumping).
5. **THE VOICE**: coach line moves top-center (nowrap, ellipsis), key
   hints (N etc.) hidden on touch, nav MFD replaced by the chip.
6. **TELEMETRY**: the black box logs chart toggles/arms/jumps and the
   first use of every deck control per session.

Engineering note: the deck CSS is driven by body[data-touch] (set from
the same IS_TOUCH the components use) instead of pointer-coarse media
queries — dev-forceable via localStorage 'stellarlogs-force-touch',
and immune to hybrid devices lying to media queries. setPointerCapture
is guarded (synthetic/exotic pointers may refuse capture).

---

# PASS 3 — THE DRIVE GESTURE (2026-08-15, his ruling)

His ask: the PUBG sprint-lock grammar on the drive — hold for thrust,
swipe up to LOCK max burn (survives lifting the thumb, tap releases) —
plus a real answer for reverse, plus proper icons.

## The brainstorm's answer: ONE drive control

The whole drive is now a single gesture button, and the arc gets
SIMPLER, not busier:

- **HOLD** — plain thrust.
- **SWIPE UP while holding** — MAX BURN LOCKS: thrust + boost persist
  after the thumb leaves; the button fills amber, glows, the up-chevron
  lights, and the phone gives one short haptic tick.
- **TAP while locked** — releases the lock (holding through that tap
  still burns plain: the PUBG cancel behavior).
- **SWIPE DOWN and hold** — REVERSE while held; button tints teal,
  down-chevron lights. Release = stop. (Reverse as a LOCK was
  rejected on purpose: nobody backs a boat blind and walks away.)

BOOST and REV buttons are DELETED. The arc is now: the drive flame,
FLIP, and the ◇ when armed — two permanent buttons where four were.
Discoverability: dim chevron hints live above and below the flame
glyph on the button itself, and light when their gesture is active.

## Icons

Lucide (ISC) replaces my hand-rolled strokes: the FLAME for the drive
(the same fire the plume burns), rotate-ccw for FLIP, chevrons for the
gesture hints. The warp ◇ stays ours — it is the house marker.

## Verified (forced-touch emulation)

The full cycle, machine-checked: hold→thrust · swipe-up→lock ·
release→STILL BURNING (screenshot: plume lit, no touch down) ·
tap→released · swipe-down-hold→reverse. Every gesture logs to the
black box (max-lock / unlock / reverse events).
