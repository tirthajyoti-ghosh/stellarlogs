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

### 2. PDC tracers — BUILT 2026-08-05
*Streaks 2.6 → 1.2 (bullets, not bars); misses sail 2.4 s (~1,900 u) but are
LETHAL only for the original 1.7 s — extending life "visually" turned out to
extend kill RANGE and let a parked ship ace the cert, so lethality and
visibility are separate budgets now. The fake ambient defense dashes are
gone: the colony's mount and each hull's own gunner fire the same ballistic
pool (ember tracers, longer/hotter for viewing distance; yours are gold and
short), with no kill authority — outcomes stay with the lane. DISCOVERED in
verification: the parked-ship-dies-by-wave-3 cert law had ALREADY drifted
before this work (baseline also completes with 0 hits) — re-tune belongs to
the Certification-trim item.*
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
- **The hunter implied — SUPERSEDED 2026-08-05:** the drifting-bearing
  track was replaced at Tirtha's direction by a MIX of directions: each
  salvo wakes a different part of the dormant spread, i.e. a fresh random
  bearing per wave (within a salvo, one shared origin still). The only live
  launch anyone ever sees is the Draugr's own finale, fired from ~1 km off
  as the freighter commits to final — moved there from 240 units, where it
  was a 2.3-second execution nobody could fight. Torpedo speed 105 → 165
  (the "lazily watching it come by" complaint).
- **Outcomes stay random:** station arcs intercept some, freighter
  self-defense some, some leak through and hit — visible venting/damage on
  the ambient ship. (Optional drama, flagged for later decision: a rare
  ambient loss that becomes a wreck + a board notice. Liveness hook.)
- **Contract overlap:** if the player has accepted the escort of a marked
  ship, that ship's schedule IS the mission — same machinery, now with
  sound, threat HUD, and the player's guns in the fight.

### 4. Escort begins at the board — BUILT 2026-08-04
*Second pass, same day: lane traffic arrives TAIL-FIRST decelerating (the
flip happened at midpoint, days off-screen — newcomers meet the flip via
their own jump drive, not as station theater); the Draugr reveals at the
BRAKING BURN; accepted contracts guarantee the raid (mark forced, 2-3 waves
restocked, sizes ramp 2→3→4, first wave 6-11 s after handshake, finale at
the burn); spawns pushed to 9.2k so the offer stands ~8k out; escort HUD
counts down TO DOCK. And the gunnery range now starts on consent like every
job: the ring wakes the panel, G / tap-ACCEPT runs the drill.*
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

### 5. Cylindrical combat radar — BUILT 2026-08-05 (THE SCOPE, docs/the-scope.md)
*Settled through three exploration passes + a live judging bench
(radar.html, permanent): edge-lit vessel (cap rims only, walls fading at
mid-height, NO drawn plane — implied by stem feet + ring), plane-anchored
stems, outer-weighted range with the PDC ring as master status light and
crossing-flash beat, corridor read (threat axis × ring), TEWA stem tint
read live from fire control, one soonest-impact digit, combat grows the
panel 132→200 px, picture-cut morph, nose-up + lane-stable, ambient as
anchorless dots, ghost tracks reserved for DARK RUNNER. Research pass:
B-scopes, Wickens' line-of-sight ambiguity, Elite's stems, the show's
reference-structure law. Shipped same night: Radar.tsx battle picture replaced wholesale; coverage truth via shipTurrets.assessThreat (75-degree cones + range + heat, per frame); THE COLLAPSE morphs disc-to-cylinder in one continuous fold; combat grows the panel 132 to 200 px. Ghost tracks still reserved for THE HUNT.*
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

### F.3 — THE HUNT (interdiction) — BUILT 2026-08-08 (docs/the-hunt.md, two passes + same-night build)
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

### THE TORPEDO BRAIN — BUILT 2026-08-05 (shared guidance, every activity)
One module (`systems/torpedoBrain.ts`) replaced every activity's pure-
pursuit-plus-wobble: BOOST off the rail → lead-pursuit MIDCOURSE with
continuous burn (far launches arrive hot) and optional DOGLEG waypoints
(one launch origin, many terminal bearings — the dormant-spread canon
made kinetic) → TERMINAL corkscrew, a helix around the intercept line
that spirals in (the show's anti-PDC maneuver; the anti-PDC math is
real) → near-miss JUKES with finite fuel (3), fed by the player's own
rounds passing inside 9 u — you watch your stream converge, the torpedo
flinch, the stream walk back on. Classes, not code, make difficulty:
JUNK (the old tail-chase, demoted to the bottom rung on purpose),
SURPLUS (leads + weaves), MIL-SPEC (everything + salvo choreography),
DARK RUNNER reserved for THE HUNT. The lanes fly lane-tuned SURPLUS
(ambient + first contract probe) and MIL-SPEC (later waves + finale);
verified end-to-end: escort accepted, 3 waves fought, Draugr finale at
the reveal, DELIVERED with her hull 5/8 — hurt but alive.

### Certification trim (rides along with F.4)
**+ 2026-08-05 (same night, second pass): the ladder is BEHAVIOR now.**
Speed/count tuning kept plateauing ("I can still almost sit and still
win") because more-of-the-same scales linearly and converged guns eat it.
Waves are torpedo CLASSES from the brain: W1 CIVILIAN JUNK from astern
(sit and learn — parked took 0 hits in every harness run), W2 NAVAL
SURPLUS leads (parked: 0–3 hits, once killed outright), W3 MIL-SPEC
SALVO — two synchronized flights of six (one per turret; flights of four
measured ZERO leaks — saturation must match the mount count) on dogleg
fans, corkscrews holding until 0.55 s to go (at 1.4 s every torpedo flew
straight for its last 370 u and converged guns never missed), jukes with
finite fuel. Wave banners name the class. MEASURED on the parked/flown
harness: parked dies 4/7 runs and bleeds 7/7; crude random burns
coin-flip; a sustained orbit completes at 33% hull; vmax 330 was a WALL
(even the orbit died — motion must matter, so 310). Wave-clear now counts
QUEUED torpedoes (a 5 s flight gap let the drill declare victory with six
still on the rail).
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

### PDC tracer spray with visible misses (combat-support) — SHIPPED 2026-08-05 (shutter streaks)
*Root cause found by arithmetic: at 800 u/s and 30 rounds/s the fixed
dashes sat 27 u apart (98% empty stream) and each round jumped 24
body-lengths per frame — no tuning could ever read as a hose; the show's
ribbon IS camera motion blur. v2 renders each round as the path it swept
during a fixed 1/60 s shutter (13–33 u, framerate-independent), head at
the true bullet, tail fading via gradient, birth-clamped at the muzzle,
HDR colors past the bloom threshold. 50% duty-cycle dashed ribbon; the
ember battery hacks died (speed IS the length). Same pool, one draw.*
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

**SPILL RETRIEVAL mission (Tirtha 2026-08-12, exploration owed).** His
seed: "you search different cargo containers and you retrieve something."
Five spill fields now live across the neighborhood (CargoSpills.tsx) —
the mission would make one container in a field MATTER (a manifest lead,
a militia bounty item, a family's effects for the vigil?). Needs a real
exploration pass before any build: what you're searching for, how a
container reads as searched, what retrieval physically looks like
(no magic pickup — the toy law and asset bar apply). Naturally pairs
with the liveness backend (#4): contested salvage, claims, honest
scarcity. DO NOT build from this stub — exploration first, his ruling.

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

*Sequencing reaffirmed 2026-08-08: the roadmap runs as written and the
portfolio COMPLETES before the Deep build begins — full focus, nothing in
the way (Tirtha). Deep exploration passes continue between builds
(the-deep.md pass 5 = the approach vector); Deep code waits for the gate.*

## Build order

0. **Performance passes** (all of them) + the **billboard freeze** —
   agreed 2026-08-04 as the thing to do next, before any new feature.
1. **The 2026-08-04 corrections**: escort-from-the-board with an intercept
   heading, torpedo/ship pairing, PDC tracer rework, cylindrical radar
   (after the design conversation).
2. **F.3 THE HUNT** — trail build SHIPPED 2026-08-08; hunt v3 SHIPPED
   2026-08-09 (the-hunt.md pass 4 BUILT): real evidence assets, G/H keys,
   THE REVENANT, hunt focus, scope sphere read, Azure Dragon chase,
   fast-finite torpedoes, pursuit assist v2. Awaiting Tirtha's live ride.
3. Density/toys pass — NEARLY DONE (docs/the-neighborhood.md). SHIPPED:
   sleeping spread; starmap lift + five UNSURVEYED inert stars; cargo
   spills (5 fields across the neighborhood); the militia kill-board;
   small secrets; THE HEADLIGHT; THE VIGIL v1→v3 (the Gamarra-pattern
   hologram, 42 gravestones, the quiet sphere, the memorial board).
   RETIRED: slag skeet (borrowed-body law). STILL UNBUILT: **the debris
   storm** (PDC-only civil defense) — the last piece of this pass.
3.1. **THE SPINE — the railgun** — TABLED 2026-08-12 as a recorded
   failure (docs/the-spine.md): the HUD element never earned approval
   after many rounds; removed from the game, revisit later. The debris
   storm reverts to PDC-only civil defense. Player torpedoes stay
   REJECTED.
3.2. **THE SOUNDS** — the adaptive score was OVERRULED (2026-08-14: "we
   are not doing all these things"). What shipped instead, from the
   /sounds.html bench: the real drive (NASA shuttle close-mic loop, his
   40–45 s pick, with max burn as a staged swell — the detonation was
   tried and TABLED), the PDC unit shot (OGA chaingun round repeated at
   ~20/s), and RADIO CHATTER (faint, mostly indistinct comm murmur near
   the Drift and docks). THE JUKEBOX was built and TABLED on his read —
   code and tracks stay on disk. Nothing owed here unless he reopens it.

3.3. **THE DRIVE PLUME — SHIPPED 2026-08-14** (docs/the-plume.md): after
   a rejected sprite build, rebuilt as a genuinely 3D raymarched
   volumetric flame (bench: /plume2.html, orbitable). Fills the bell,
   ~3× at max burn, 4× flow speed at burn.

3.4. **THE HUD MARKER GRAMMAR — SHIPPED 2026-08-13/14**
   (docs/the-hud-markers.md): colour = category (portfolio amber,
   infrastructure teal, POI grey-blue, contacts, hostile, memorial
   candle, unsurveyed ash), designed SVG marks on backing discs, the
   SPHERE OF NAMES (text only inside ~2600 u; outside it, marks only),
   planet names held until arrival, and the jump chart sectioned to
   match.

3.45. **THE SCOPE pass 4 — SHIPPED 2026-08-14** (docs/the-scope.md): THE
   ARREST (she yields → custody-teal, held ring, YIELDED · IN CUSTODY),
   THE ONE NAME in white, and the PROXIMITY STRIP on the scope's own
   two-zone scale. Coverage-as-volume from the Expanse references was
   considered and DECLINED by him (ours answers the question better in
   a small box); threat-grouping and the torpedo board REJECTED as not
   fitting our auto-PDC, no-player-torpedo design; faction skinning
   PARKED for the Deep.
3.5. **MOBILE — DONE, his sign-off 2026-08-27** ("the mobile version is
   shipped, it's working, I'm happy"). History: SHIPPED 2026-08-15.
   THE LANDSCAPE GATE (LandscapeGate.tsx): portrait touch gets one
   full-screen card above everything including the preflight — animated
   rotating-phone glyph, "THIS BRIDGE FLIES LANDSCAPE", tap =
   fullscreen + orientation.lock where the platform allows (Android);
   iOS holds the card until the phone rotates (the YouTube pattern).
   THE THUMB DECK: stick under the left thumb (148 px in landscape),
   drive cluster under the right — BURN large at the resting spot,
   BOOST above, REV/FLIP on the inner column — and job accepts
   (ESCORT/MANHUNT/RE-RUN) bottom-center where either thumb reaches.
   Safe-area insets respected. PWA: manifest.webmanifest (fullscreen,
   orientation landscape, amber-diamond icons 192/512), viewport-fit
   cover. The black box logs gate shows/taps and orientation changes.
   Dev override for desktop testing: localStorage
   'stellarlogs-force-touch' = '1'.
   POLISH PASS SHIPPED 2026-08-18 (docs/the-mobile-controls.md): black-box
   shader fix, closer camera, pitch flip, no-bloom/high-dpr phone trade,
   RCS gate, ghost stick, throttle-as-lever, map chip + scrim, context
   pills, first-flight tutorial. THE CHARTER SHIPPED 2026-08-26
   (docs/the-mobile-hud.md): desktop chrome banned from touch, throttle
   three (hold/lock/REV), speed bug, mobile battle strip, stick clamp,
   anchors v1, exposure 1.55, perf phase 1 (jank telemetry + ?perf kit +
   light gating + 16-step phone plume). DECK V2 (same doc): the CHART
   drawer (phones can finally jump), the icon arc, the floating stick,
   right-half camera drag, the battle mini-scope (gap closed), the
   voice rules, and full deck telemetry.
3.7. **THE PLAYTEST — a usability pass on the missions we HAVE**
   (MOVED 2026-08-15 at Tirtha's call: runs JUST BEFORE THE DEEP, as the
   final quality gate on everything built. The flight recorder is
   ALREADY BUILT and armed — every battle logs a 1 Hz black box and
   prints a console debrief; window.__debriefs keeps the last ten.)
   (Tirtha, 2026-08-15, full protocol in docs/the-playtest.md). Not new
   content: a hard QA/usability look at whether escort, the range and
   the hunt actually deliver delight — where the player's eyes go while
   missiles hunt him, what he feels, whether it is challenging without
   being unfair, whether the scope is genuinely read and useful, and
   whether there is enough new to bring him back. He is the test
   subject; four scripted runs, six fixed questions each. The facts are
   already logged: the RANGE has ZERO randomness (identical waves every
   run — W3 is 12 torpedoes on fixed bearings plus one fast runner),
   while ESCORT randomises only timing and bearing of 1–3 salvos with a
   single torpedo class. Findings first, fixes after — likely
   candidates: rotating/randomised range waves, escort attacks that
   respond to the player instead of a timer, a second escort torpedo
   class, and scope readability under pressure. Optional session
   recorder available on request.

3.8. **THE TRACK RETHINK** (Tirtha, 2026-08-15): "way too hard for a
   newbie who comes to our site… rethink the entire track thing, the
   whole race thing." Full exploration pass owed BEFORE any build —
   what a first-time visitor can actually fly, what the race is FOR
   (the Water Run heritage), difficulty ramp, forgiveness, and whether
   the current gates/checkpoints survive at all. Think first.

3.9. **THE BLACK BOX — SHIPPED 2026-08-15** (his order: "any and every
   data must be collected… a treasure trove by the playtest"). The
   prelude to the liveness backend, riding the same Vercel deploy:
   - client (src/systems/blackbox.ts): anonymous pilot id + session
     id, device/GPU/touch/orientation metadata, FPS sampling, activity
     transitions watched off activityState, flight-recorder debriefs,
     tally bumps, errors, session lifecycle (sendBeacon on pagehide);
   - STORE-AND-FORWARD: batches buffer in localStorage and only clear
     when the backend confirms storage — nothing is lost even with no
     database attached; backlogs upload whenever storage appears;
   - server (api/blackbox.ts, Vercel function): accepts batches,
     writes to Upstash/KV when env vars exist, structured-logs a
     summary always. Attaching storage is ONE dashboard click
     (Vercel Marketplace → Upstash Redis) and needs no code change.
   - mobile-ready by design: touch/orientation/viewport recorded now,
     so 3.5's landscape build lands pre-instrumented.

4. Liveness backend (hails, counters, daily boards) — procgen-compatible
   — the Black Box's endpoint pattern and pilot identity carry over
5. Achievements verdict → implement chosen shape
5.9. **THE PLAYTEST runs here** (see 3.7) — the last gate before the Deep.
6. The Deep (HORIZON)
