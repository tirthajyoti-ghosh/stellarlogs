# Experience Redesign — the playable portfolio (July 2026)

Drawing-board output, agreed with Tirtha 2026-07-21. Supersedes the playground
sections of `roadmap-2026-07.md` / `phase-f-playground.md` where they conflict.

## Design law (memorize before touching anything)

1. **See → play → win → move on.** No badges, no completion meters, no
   leaderboards, no meta-progression. Accomplishment lives in the moment.
   Some activities keep a simple in-place best ("BEST 0:48") — nothing more.
2. **Finite wins.** Every activity can be COMPLETED in 60–90s and ends in
   triumph, not death. Retry is optional (harder variant / beat-your-time).
3. **Friction is the fun (the Bruno-bowling law).** Challenge comes from
   wrestling the drifty Newtonian ship toward a goal — imperfect, earned
   outcomes. Never from aiming menus or assists. Auto-systems are fine only
   when FLYING remains the skill under pressure.
4. **Instant read.** One glance + one line = you know what to do. Zero Expanse
   knowledge assumed. Arenas warn before cancelling ("RETURN TO RANGE 10s").
5. **Visible invitations.** Every activity is a lit landmark seen from
   kilometers away. If a visitor never notices it, it doesn't exist.

## The map — one dense, glanceable neighborhood

Systems pulled in to **3.5–6.5k** from spawn (was 10–25k). Cruise between
neighbors ≈ 30–60s of boost; warp remains for cross-map hops. In-system
science-accurate spacing unchanged. Spawn faces a composed opening shot:
station near (~800u), defense-drill beacon column to one side (~1.2k),
Projects' blue star burning ahead (~3.5k).

Approximate placements (final positions tuned in build):

| Thing | Position vs spawn | Notes |
|---|---|---|
| Station | ~800u ahead-right | contact boards; horn + floodlights on escort win |
| PDC Defense drill | ~1.2k, spawn→Projects lane | beacon column landmark |
| Projects | ~3.5k ahead | showcase system |
| Work | ~4.5k left-forward | race belt between Work and Projects |
| Blog | ~5.5k right | |
| TV Shows | ~5k behind-right | ship-hunt lurks nearby |
| Reading | ~6k right-back | escort lane Station→Reading |
| Recommendations / Travel | ~6k left / left-back | |

Activities sit in the SEAMS between systems so play routes past content.
Exploration reward = you keep finding things, not earning things.

## Activities — finite wins with physics friction

| Activity | One-line read | Win | Friction source (the fun) |
|---|---|---|---|
| PDC Defense | "Torpedoes inbound — guns fire on their own. Survive 3 waves. FLY." | 3 fixed waves → DRILL COMPLETE + detonation spectacle; best clean time in place | Turret ARCS: waves probe blind bearings so the pilot must rotate the deliberate RCS ship under pressure; dodging leakers = drift + counter-burn timing |
| Race | "Fly the rings. Beat the clock." | finish gate → COURSE COMPLETE 0:48; best time in place | Newtonian drift vs curved course; boost = wider slides; no rails possible |
| Ship hunt | "A smuggler's running. Chase it down." | disable → it vents and drifts; done | velocity-matching a jinking target; catch = sustained proximity (~5s inside ~100u), pure station-keeping skill |
| Escort | "Get the freighter home. Keep it alive." | freighter docks → horn + floodlights | position-keeping between threat axis and a moving ward while drifting |

Defense v3 specifics: **auto-fire while armed** (fixes the "PDCs not shooting"
bug — hold-to-fire is deleted), arena ≥2500u with grace timer at the edge,
3-wave standard drill (wave compositions deliberately exploit turret blind
spots), optional harder re-run after the win.

## Battle-mode HUD — video-game simple, not flashy

Armed activity ⇒ ship goes to battle stations; drill end ⇒ HUD exhales back.

- **Theme**: accent shift teal → amber/red (`body[data-battle]`), nav MFD
  content dims/collapses. No decoration, no reticles.
- **Threat markers** (reuse the label projection/edge-clamp machinery):
  on-screen red diamond + range per threat; off-screen → edge arrow. Nearest
  threat highlighted with "IMPACT ~6s" countdown.
- **Radar swaps modes** (the minimap MUST differ from cruise):
  - Cruise: strategic — systems/planets (as today).
  - Battle: short-range tactical scope (~600u): red blips with short motion
    trails, faint wedges showing which turret arcs currently bear (so
    attitude decisions are readable at a glance), engaged blips brighter.
- **Status strip** on the activity panel: WAVE 2/3 · INCOMING 4 · GUNS AUTO.

## Build order

1. **Map re-layout** (`config/universe.ts` + `systems.ts` placements) +
   reusable **landmark kit** (beacon column / lit signage components).
   Everything else references positions — this goes first.
2. **Battle-mode HUD** (theme swap, threat marker layer, tactical radar mode)
   — testable against the existing drill.
3. **Defense drill v3** (finite 3 waves, auto-fire, arena 2500u + grace,
   blind-spot wave design, win spectacle).
4. **Race course** (landmark kit + rings + timer).
5. **Asset sourcing pass** (hunter ship, freighter — CC candidates already in
   `phase-f-playground.md`), then **Ship hunt** and **Escort**.
6. Sprinkle toys / easter eggs (bowling pods, wrecks) once the spine works.
