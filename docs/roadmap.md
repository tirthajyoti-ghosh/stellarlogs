# Stellarlogs Roadmap

*Locked with Tirtha 2026-07-26. The design laws live in the auto-memory
(game-design-philosophy) and docs/story-layer-2026-07.md; the Bruno lessons in
docs/bruno-folio-2025-ux-study.md. Standing laws that shape everything below:
story = standing situation told by place/names/painted signage; playzones
auto-start; HUD plain English; **toys must be lore-native** (playability yes,
Bruno copies no — the toy's INTENT must belong to our world); **combat must be
situational, not drill-shaped**.*

---

## Done (context)

- 3D rebuild shipped: 7 content systems + Comms Station, Newtonian flight,
  brachistochrone jump (flip-and-burn), Flight Assist system, battle HUD,
  TEWA PDCs + heat, THE TRACK v2 (drive-dark slingshot racing), Nilak wreck
  memorial, Interamnia Drift colony, Port Registry attributions, map spread.
- Domain migration: **tirthajyotighosh.com** canonical; stellarlogs.dev +
  www + vercel.app + old Netlify portfolio all 301/308 into it; full-name
  title, Person/WebSite JSON-LD, crawlable content mirror, robots + sitemap,
  og preview image. Pending user-side: Search Console TXT, profile links.

---

## NOW — The Ice Route (the combat layer becomes one situation)

**The situation.** The Amnia needs ice — that's what keeps a rock colony
alive. The **Nilak** was an ice hauler, lost with all hands — *on this
route*. The **Imiq** still flies it. The **Draugr** preys on it. The militia
runs PDC certification *because of all of the above*. One standing
situation; every activity below recurs naturally (convoys run, raiders
return, drills repeat). The wreck stops being scenery and becomes the
route's history — you pass the memorial on the working route that killed
her.

### F.4 — THE ICE RUN (escort) — build first
The Imiq departs a staging point and flies the route toward the Drift, past
the Nilak. Mid-route — right as she flips to brake — the strike comes:
torpedoes targeting *her*, not you. Core mechanic: **you are not the gun,
you are the shield's position.** Turret arcs only protect what's behind
them — the skill is stationing: reading torpedo bearings and physically
flying your ship between the threat axis and the hauler's hull, holding the
screen while she burns. Her hull bar is the mission; yours is your problem
too. Win: the Imiq docks at the Amnia. Lose: you watch a second ice hauler
die in the same black as the first.
*Asset ready: NekoKuroHB Cargo Hauler (same model as the Nilak, intact,
72u — sister ships is the point).*

### F.3 — THE HUNT (interdiction) — build second
The inverse geometry: the Draugr runs, you chase. She fires torpedoes back
down her wake; your PDCs defend *you* while you fly the intercept, managing
closure (overshoot and she breaks away). Win without a kill: **close inside
weapons range and hold lock until she strikes her transponder** — "TARGET
SQUAWKING SURRENDER — MILITIA TUG INBOUND." Piracy suppressed, nobody
vaporized, very Belter.
*Asset locked in drawer: "Stealth Ship - Vehicle Design"
(7e2d1b5b9f0249cfb3111a00bf48237b, CC-BY); fallback SACHSEN CLASS FRIGATE.*

### Certification trim (rides along with F.4)
The existing gunnery range stays but shrinks (~3 waves) and gets honest
signage: "PDC CERTIFICATION — ESCORT DUTY STANDARD." No gating (free order
is law); the fiction now explains the drill, and it remains the
teach-the-systems space.

### 3D radar (combat-support, wanted for F.4)
Today's radar is a 2D plane; we fly in 3D and torpedoes corkscrew. Replace
the battle scope with a **3D volume display** (Expanse CIC / Elite-scanner
family): a reference disc + per-contact vertical stems showing elevation
above/below the plane, so corkscrewing ordnance visibly climbs and dives.
**Open design question — the display's reference frame during escort:**
 (a) own-ship-centered always (how pilots and real CICs think);
 (b) hauler-centered "guard display" during escorts;
 (c) **recommended:** own-ship-centered PLUS drawn **threat-axis lines from
 each torpedo to its target** — stationing then reads as "put my dot on
 those lines." Positioning info without changing the pilot's frame.
Decide in playtest.

### PDC tracer spray with visible misses (combat-support, wanted for F.4)
Reference: the show — streams of rounds that persist in space, most rounds
*missing*, the gun visibly walking onto the target. Tirtha's image: a water
hose being swept — the stream leaves in curves that lag the motion. Design:
- Rounds are real projectiles from the muzzle (instanced streak pool,
  ~1.5–3s lifetime), not hit-beams; misses continue ballistically into the
  black.
- Per-burst aim error that **converges** as the firing solution improves —
  the visible "spray walking onto the torpedo" IS the fire-control story.
- Hose-lag when the target jinks (aim-point history forms the wavy curve).
- Tracer-every-Nth-round look; spatialized PDC audio already exists.
Perf: one instanced mesh pool, thousands of rounds are cheap.

### Debris storm over the Drift (event)
A rock shower where PDCs do **civil defense**: fly picket over the colony,
guns eat incoming debris, no enemy at all. Later becomes a liveness hook —
a clock-synced "storm hour" every visitor experiences together.

### Slag skeet (toy, lore-native test case)
The range's toy layer: a mass driver hurls smelter slag; you fly to keep the
clays inside your turret arcs. Belter clay pigeons — a toy that only makes
sense at *this* militia range.

---

## NEXT — Liveness, density, toys

**Liveness levers** (Bruno's four, space-translated; needs our first backend
— build it procgen-compatible, see HORIZON):
1. Shared world clock — lighting/nebula events keyed to real UTC (zero
   backend).
2. **Radio hails** — visitors leave ≤30-char transmissions pinned as
   blinking beacon buoys with country flags; AI-moderated; capped. First
   backend piece (edge function + KV).
3. **Global counters painted on zone signage** — torpedoes downed
   (militia kill-board), runs flown (Track tote board), **candles lit at
   the Nilak vigil** (interact → a candle appears, forever).
4. **Daily-reset Track top-10** painted at the start line.

**Density pass per system** — Bruno's real rule: content bunched, sport
sprawls. Keep the majestic map and the jump spectacle; give every system one
toy, one secret, one liveness surface within ~20s of arrival.

**Toy candidates (lore-native filter applied):** spilled cargo-container
field to plow near the Drift (with painted RES(E)T); the Nilak's bell (ring
once, ties to the candle counter — keep the vigil quiet and sacred);
Drift-cantina jukebox with Belter tracks + "Now playing" toast; ore-herding
at the smelter intake (nudge rocks into the ring).

**Rescue** — diegetic: jump/brachistochrone to nearest POI standoff, not
teleportation.

**Achievements — verdict pending (rethink is open).** Options on the table:
(a) full Bruno: objectives + unlockable ship paints (localStorage);
(b) ephemeral only: daily boards, no unlocks;
(c) **pilot's logbook with port-authority stamps** — diegetic stamps for
real feats, no completion %, paint unlocks at stamp thresholds. Current
lean: (c). Tirtha decides.

---

## HORIZON — The Deep (exploration)

*Long-term, explicitly after the immediate work. Vision memory:
exploration-vision. "This is my portfolio — I want to pour any and every
imagination I had into it."*

Infinite procedurally generated star systems beyond the charted core, with
**LLM-generated speculative science** (Curious Archive flavor: scientific
but speculative). Pilot-explorer fantasy: jump past the rim, survey unknown
worlds, learn what lives there — or what doesn't.

Architecture sketch (the two-layer split that makes it feasible):
- **Geometry layer — seeded, pure client.** Every system is a deterministic
  function of its seed (Elite's trick): layout, star class, planets, orbits,
  palette computed on jump, identical for every visitor, disposed on leave.
  No backend needed to *generate*; streaming = our existing
  one-system-at-a-time rendering. `buildSystem()` is already
  parameterized — keep systems as data, never as code.
- **Meaning layer — LLM-written once, cached forever.** On a system's
  first-ever survey by ANY visitor, one LLM call (schema-forced JSON,
  grounded in the procgen numbers: tidally-locked → twilight-band ecology;
  high-G waterworld → pressure-adapted filter feeders) writes the survey
  entries. Stored keyed by seed; every later visitor reads the cache. The
  first visitor literally causes the science to be written — **first-survey
  credit** (callsign + flag + date on the system's chart) becomes a
  liveness feature and makes discovery *real*.
- **The Charted Belt vs The Deep**: handcrafted portfolio systems stay the
  fixed center; the frontier is infinite around them. Portfolio remains the
  destination; exploration is the endless dessert.
- Survey gameplay is lore-native: drop a probe, results paint onto the
  ship's survey panel / system chart. Moderated naming rights for first
  discoverers, maybe.
- Costs bounded: one LLM call per first-discovered system, cached forever.

---

## Build order

1. **F.4 THE ICE RUN** + cert trim (+ 3D radar and tracer spray as its
   support work — they're what make escort combat readable and gorgeous)
2. **F.3 THE HUNT**
3. Debris storm + slag skeet + density/toys pass
4. Liveness backend (hails, counters, daily boards) — procgen-compatible
5. Achievements verdict → implement chosen shape
6. The Deep (HORIZON)
