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

## PLAYTEST FEEDBACK — 2026-08-04 (live site)

Verdict on what shipped: *"things are looking much better… the Drift
station traffic is live, it is dynamic, so that's good."* The corrections
below are all from that session and take priority over new features.

### 1. Billboard reveal freezes the frame — FIXED 2026-08-04 (1618 ms -> 229 ms)
*Also settled 2026-08-04: board lighting is real per-pixel lamp math; the
plate texture is the procedural v2 (chosen over six ambientCG candidates in
textures.html, which stays as a permanent judging bench).*
Flying near a planet or the Comms Station, **the whole game freezes for
one to two seconds** just before the boards appear; afterwards everything
is fine. `PlanetBoards` flips `activated` once and mounts the entire board
subtree in a single frame — every troika `<Text>` builds its SDF, every
image decodes and uploads, and every new material compiles its shader,
all on the main thread at once. Suspects to be measured *before* fixing,
in this order: shader compile on first draw, troika SDF generation,
texture decode/upload. Directions: async texture decode
(`createImageBitmap`), `renderer.compileAsync()` before reveal, and
staggering the mount across frames instead of one big commit. This is a
no-pop-contract violation as much as a perf bug — the freeze *is* the pop.

### THE SOUND LAW — ENFORCED 2026-08-04
**Space is silent until it is yours.** You hear only what your own hull and
your own radio carry: your PDCs (structure-borne), impacts on or near you,
comms addressed to you, your ship's systems. Ambient battles — torpedoes
streaking at other freighters, station guns firing, detonations on the lane —
are *visible fireworks with no audio and no HUD engagement*. Accepting a
contract is what arms the sound layer and the threat HUD, and only for events
belonging to that contract. This is simultaneously the correction he asked
for and the physically true answer: vacuum carries nothing.

### 2. PDC tracers — DESIGN (explored 2026-08-04, BUILD NEXT)
The hose metaphor, taken literally: every round is a real object that left
the muzzle with the velocity the barrel had *at that instant* — gun direction
× muzzle speed **plus the shooter's own velocity**. Nothing is retargeted
after launch. The wavy stream is then not an effect, it is a consequence:
when the turret slews to follow a jinking torpedo, rounds already in flight
keep their old headings, and the stream hanging in space is a physical
recording of where the gun used to point. Misses continue ballistically into
the black until lifetime ends.

- **Rendering:** one shared InstancedMesh pool (~2048 short emissive streaks
  — SHORT, per the feedback: they must read as bullets, not beams). Each
  instance stores spawn position, velocity, spawn time; a vertex shader
  computes position = p0 + v·(t−t0), so the per-frame CPU cost is spawns
  only. One draw call for every round in the world.
- **Tracer discipline:** only every 3rd–5th round is a visible tracer (the
  real-world convention) — the stream reads as dashed fire, and the pool
  stretches 3–5× further.
- **Truth alignment:** gameplay hits stay with the existing fire-control
  math (range-degraded convergence, already balanced in three passes). The
  visible stream samples the SAME aim-error state, so what you see walking
  onto the torpedo is the same solution that decides the kill. When the kill
  rolls, the nearest tracers terminate in the impact sparks.
- **Sound:** per the Sound Law — your guns are loud, everyone else's are
  mute.

### 3. Torpedoes paired to chosen ships — BUILT 2026-08-04
*Canon added (Tirtha): the Draugr seeds the dark with DORMANT torpedoes and
wakes them by tightbeam — which is why salvos come from any bearing, why no
launch is ever seen, and why the origins still plot back to one drifting
track. Retuned same day for playability: traffic spawns at 6.2k and arrives
AT CRUISE (no more bubble where the world begins), the board job is the
farthest hull, first contract salvo waits up to ~24 s after the handshake
and is always small, later waves ramp, launches start 1.7k out.*
The attacker chooses; the world does not shoot at everything.
- **The mark:** each traffic ship rolls once at spawn — roughly a third are
  *marked* (weightable by cargo: volatiles and fuel worth more than ice —
  pirate economics as flavor). Unmarked ships cross in peace, every time.
  Some sessions the lane just works; that silence is worldbuilding too.
- **Salvo schedule:** a marked ship gets 1–3 attack events at random times
  inside its transit window. Each salvo: 1–2 torpedoes from one bearing.
- **The hunter implied:** within a salvo, all torpedoes share one origin
  bearing (shots fired seconds apart come from one place — a ship). Between
  salvos the bearing drifts a few degrees — the attacker is repositioning.
  An attentive pilot could plot those bearings and infer the Draugr's track:
  free foreshadowing of F.3 THE HUNT, cost zero.
- **Outcomes stay random:** station arcs intercept some, freighter
  self-defense some, some leak through and hit — visible venting/damage on
  the ambient ship. (Optional drama, flagged for later decision: a rare
  ambient loss that becomes a wreck + a board notice. Liveness hook.)
- **Contract overlap:** if the player has accepted the escort of a marked
  ship, that ship's schedule IS the mission — same machinery, now with
  sound, threat HUD, and the player's guns in the fight.

### 4. Escort begins at the board — BUILT 2026-08-04
To scrap (Tirtha, explicit): the drift-lane proximity offer ("close on her
if you want the job"), and all ambient combat SFX/HUD noise from being in
the region. Ambient traffic and ambient attacks remain fully visible.
The flow:
1. **At the AMNIA DOCKS board:** at least one escort job always posted —
   ship name, cargo, inbound bearing, ETA, a line of flavor. Accept
   deliberately (G / tap).
2. **Intercept leg:** HUD mission strip with a heading marker to a live
   computed rendezvous point (lead her track, not her position), distance
   and closing rate. Her blip highlighted on radar. This leg is navigation
   gameplay — flying out along a bearing to meet something moving.
3. **Rendezvous:** inside ~250 u with relative speed low → she hails
   ("glad for the company, bosmang") → ESCORT ACTIVE: formation envelope,
   escort HUD, sound layer arms. The contract's salvos (see #3) are now
   audible, threatening, and the player's to stop.
4. **Missed intercept:** she reaches the Drift without you — the job
   expires without ceremony and the board posts the next. No punishment;
   the lane keeps its own schedule.

### 5. Cylindrical combat radar — DISCUSSION AGENDA (needs Tirtha)
Confirmed shape: in combat, the minimap becomes a cylinder — bearing around
the rim, elevation as stem height above/below the reference disc, range
radial; torpedo tracks visibly corkscrew. New requirement from feedback:
show **PDC coverage** — which bearings/elevations your guns can currently
answer — so "is that inbound covered?" is a glance, not a guess.
Decisions to settle together before build:
- **Reference frame:** own-ship-centred always (how pilots think) vs
  hauler-centred while escorting vs own-ship + drawn threat-axis lines from
  each torpedo to its target (recommended: stationing reads as "put my dot
  on those lines" without changing the pilot's frame).
- **Coverage drawing:** shaded wedge volumes on the cylinder vs arcs on the
  base disc vs tinting the threat stems (covered = teal, uncovered = red).
  Recommendation: tint the stems — zero extra geometry, answers the actual
  question directly.
- **When:** combat-only transform, or always cylindrical with the disc
  degenerating when nothing is above/below? Recommendation: combat-only,
  with a quick morph animation so the mode change is legible.
- **Up-reference:** ship-relative (rolls with you) vs lane-plane-stable.
  Recommendation: lane-plane-stable; rolling radar induces nausea and
  torpedo elevation loses meaning if "up" keeps changing.


## NOW — The Ice Route (the combat layer becomes one situation)

**The situation.** The Amnia needs ice — that's what keeps a rock colony
alive. The **Nilak** was an ice hauler, lost with all hands — *on this
route*. The **Imiq** still flies it. The **Draugr** preys on it. The militia
runs PDC certification *because of all of the above*. One standing
situation; every activity below recurs naturally (convoys run, raiders
return, drills repeat). The wreck stops being scenery and becomes the
route's history — you pass the memorial on the working route that killed
her.

### F.4 — THE ICE ROUTE (escort) — SHIPPED 2026-07-26
**A scripted escort felt "mechanical and artificial" (Tirtha's verdict on
the first build). It was rebuilt as a route that lives whether you fly it
or not** — the law this produced: *the world runs its jobs; the player
joins them.* No staging point, no set-piece, no memorisable pattern.

- **Traffic (multi-ship).** Up to FOUR ships work the lanes at once, on
  three different hull classes (ice hauler, heavy container freighter, mid
  container freighter) carrying ice, water, ore, fuel, parts, volatiles,
  grain or steel. Each arrives from a **different random bearing** (bearings that would cut close to the Nilak
  are rejected — the lane always gives the grave its room). The fleet are
  the Nilak's sisters, named for kinds of ice: IMIQ, SIKU, QINU, AUNIQ,
  MASAK; freight hulls carry BREKKA, TALVI, KOSMO, SAMAK, VANAJA, OYADEH.
  Each flies accel→cruise→flip→brake, docks, offloads, then **boosts away
  under a swelling plume to 1100 m/s** — the player tops out at 520, so a
  departing ship simply cannot be caught, which is how she leaves the
  frame. Nothing is ever scripted: bearings, classes, cargo, names, arrival
  gaps, dock holds, salvo counts and timings are all rolled at runtime.
- **The board is never empty.** If no escortable ship is in the lanes, one
  spawns immediately — finish a job and the next is already inbound.
- **The job is picked up at the colony.** The **AMNIA DOCKS board** at the
  Drift lists live traffic (three rows: name · cargo · status) and the HUD
  points at whichever ship is currently escortable. Closing on an inbound hauler while she is
  still out in the dark IS accepting the escort (auto-start law holds).
- **Ambient defence — you can just watch.** An unescorted convoy on final
  gets attacked anyway, and either the **colony's batteries** or **the
  hauler's own gunner** (alternating per run) puts streams of rounds up and
  kills the ordnance. The route defends itself; you are allowed to be a
  spectator.
- **The raid is not a script.** While escorting, salvos come at **random
  times on random bearings**, launched from beyond visual range — you get
  trails and a direction, never a shooter.
- **The reveal.** At her flip — drive cold, no dodge left in her — the
  **DRAUGR** finally shows herself at knife range, fires the last salvo
  from where you can SEE it, holds, and burns away. HUD brackets her:
  "RAIDER · NO TRANSPONDER · WEAPONS FREE".
- **You do not chase her.** The hauler is the job. When the ice is in, the
  dockmaster posts the follow-up on the same board: *INTERDICTION POSTED ·
  DRAUGR · LAST BEARING nnn°* — which is F.3.
- Core mechanic unchanged and verified: **you are not the gun, you are the
  shield's position** (PDCs reach 300u). Measured: on station → delivered
  hurt but alive; in the convoy but 690u back → **0 intercepts, hauler
  dead**.
*Assets: NekoKuroHB Cargo Hauler (the Imiq, sister of the Nilak, 72u);
"Stealth Ship - Vehicle Design" (the Draugr, 14u, runs dark), both CC-BY.*

### F.3 — THE HUNT (interdiction) — build next; already posted in-world
*The dock board posts this job with the Draugr's last bearing the moment an
escort succeeds, so the hand-off exists before the mission does.*
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

### 3D radar (combat-support) — now a cylinder, with PDC coverage
*See PLAYTEST FEEDBACK #5: confirmed as a cylindrical volume display that
also shows which bearings the PDCs cover. Design discussion owed before
build.*
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

### PDC tracer spray with visible misses (combat-support) — NOT YET RIGHT
*See PLAYTEST FEEDBACK #2: shipped behaviour still reads as straight lines
to the target, with streaks too long. The design below stands; the build
has to be brought to it.*
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

0. **Performance passes** (all of them) + the **billboard freeze** —
   agreed 2026-08-04 as the thing to do next, before any new feature.
1. **The 2026-08-04 corrections**: escort-from-the-board with an intercept
   heading, torpedo/ship pairing, PDC tracer rework, cylindrical radar
   (after the design conversation).
2. **F.3 THE HUNT**
3. Debris storm + slag skeet + density/toys pass
4. Liveness backend (hails, counters, daily boards) — procgen-compatible
5. Achievements verdict → implement chosen shape
6. The Deep (HORIZON)
