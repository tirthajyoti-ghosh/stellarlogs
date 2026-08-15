# THE SLEET — the debris storm, explored (2026-08-15)

Fiction alignment and design exploration, before any code. Plain
language on purpose.

## 1. The problem with the generic version

The roadmap's old sketch was: "a rock shower where PDCs do civil
defence — fly picket over the colony, guns eat debris, no enemy at
all." That is a fine *shape*, but as written it is a re-skinned wave:
things come, guns kill them, nothing is at stake but a number. This
world has earned better, and it turns out our own canon hands us the
missing piece.

## 2. The fiction we already wrote (and what it gives us)

Two things are already true in this game, written on the memorial
board at the vigil:

> **HER PLATES ARE THIS DECK. HER TANKS ARE OUR WATER.**

and the story of THE DRY WEEKS — eleven days the Drift lived on dregs
and reclaimer steam after the Nilak died, until the racing club ran raw
ice from the outer wells, lap after lap, until the reserve came back.
The colony's motto since: **NO SHIP LEAVES THE DRIFT DRY.**

So the Interamnia Drift's water reserve is held in the **Nilak's own
salvaged tanks**, bolted to the colony's rim. That is the stake, and it
is the most emotionally loaded object in our universe: this community
has already been dry once, and the thing that keeps them wet is the
body of the ship they mourn.

**A rock through those tanks is not a damage number. It is the Dry
Weeks happening again.**

## 3. Where the rock comes from (and why it is a civic occasion)

Not an attack. Not a raid. A **charted rubble stream** — the wreckage
of some ancient collision that crosses this lane on a schedule the
FIRST CHARTS recorded generations ago (docs/the-fiction.md). The
Surveyor's charts predicted it; the colony has known its return dates
for as long as they have been here.

That framing earns three things:

1. **It is announced, not ambushed.** The docks board posts the pass
   the way it posts escorts and manhunts. No jump-scare, no arming.
2. **It is a duty, not a mission.** Belters stand a picket because
   there are not enough hulls to cover the rim. You are not a hero
   hired to fight; you are a neighbour who showed up.
3. **The Surveyor is still protecting them.** His charts are why they
   know it is coming. The whole world is his record — this is the
   record doing work.

Name: **THE SLEET** — plain, cold, Belter. (What comes across the lane
is rock and old ice together.)

## 4. What you actually do

- The stream arrives along a **known bearing**, announced ahead.
- The tanks are fixed on the Drift's rim. You take station **between
  the stream and the tanks**.
- Your PDCs engage automatically, as always. Your job is the same job
  this whole game is about: **be in the right place.** Escort taught
  it with a moving corridor; the Sleet teaches it with a fixed one you
  cannot leave.
- **Heat finally matters.** Our PDCs already have thermal lockout, and
  it has never really bitten. With a stream instead of a salvo you
  cannot hold everything; you must let the harmless ones pass and
  spend your guns on the ones that are actually on line with the
  tanks.

## 5. Why rocks are not torpedoes (this is not a re-skin)

- **Rocks do not steer.** They are ballistic and honest: you can read
  a rock's line the instant you see it. The skill is anticipation and
  geometry, not pursuit.
- **Rocks break rather than die.** Fracture, not fireworks (a ruling
  already on the books). A big one shot late becomes a spray of
  fragments still carrying through; shot early, the fragments scatter
  wide and miss. **Range is the lesson**, and the instrument already
  draws it — that PDC ring on the scope is now a fact about survival.
- **Most rocks are nothing.** A stream is mostly harmless gravel. The
  fight is triage: which handful is actually on line with the tanks.

## 6. What failure costs (honest, no game-over)

A rock through the rim holes a tank and the reserve drops. Not a
"defeat" screen — a number on the docks board that means something,
kept the way we keep TORPEDOES DOWNED and CANDLES LIT. The Drift
refills over time. The Sleet returns.

That is the whole feedback loop, and it needs no new fiction: they
have been dry before and they will not go dry again on your watch.

## 7. What we will NOT do (from standing rulings)

- No manual gunnery or aiming minigame — the PDCs stay automatic; the
  player's job is flying.
- No health bars on rocks, no score popups, no combo counters.
- Fracture, never fireworks.
- No punishment beyond the honest number; no failure state that ejects
  the player.
- No fake urgency: it is posted, it is predictable, and you may
  ignore it entirely.

## 8. The liveness hook (later, not now)

The roadmap already imagined a clock-synced "storm hour" every visitor
shares. This fits perfectly: the pass is CHARTED, so its time is
public — a real UTC-keyed schedule when the backend lands, with the
reserve level and the rocks-stopped tally becoming everyone's numbers.

## 9. Open questions

1. **The stake — the water tanks (my recommendation) or generic dock
   damage?** The tanks tie the event to the vigil, the Dry Weeks and
   the colony's motto; generic damage ties it to nothing.
2. **How it starts.** My recommendation: the board posts the coming
   pass; the Sleet then arrives on its own clock whether or not you
   are there. You show up or you don't. (No accept-key, matching the
   playzone law.)
3. **The ice wrinkle.** Some of what crosses is old ice — water the
   colony would love to have. A Belter would not shoot ice they could
   catch. Tempting, but it is a second verb; my recommendation is to
   leave it OUT of v1 and keep one honest job.
4. **The name: THE SLEET?**

---

# PASS 2 — the plot holes closed (2026-08-15, his questions)

He accepted the water-tank stake and the "announced, not ambushed"
framing, then went straight at the weak joints: *why* does it come at
fixed times, what is the actual reason, where does it come from and go,
why only this lane, did anyone ever find out — and what did I mean by
the ice. Fair. Here is the version that holds.

## 1. Why a stream returns on a schedule (this is real physics)

Meteor showers on Earth are not random: a comet or a shattered body
leaves its debris spread along its own orbit, forming a long thin
ribbon that keeps looping the Sun. Earth's orbit CROSSES that ribbon at
one point, so every year, on the same date, Earth flies through it.
The Perseids arrive in August for exactly this reason.

Ours is the same and needs no invention:

- Something broke apart long ago. Its fragments inherited its orbit and
  spread out along it into a **long ribbon of rock, ice and wreckage**
  that still loops the Sun.
- The **Interamnia Drift orbits too**, and its path CROSSES that ribbon
  at one node.
- Every time the colony comes back around to that crossing, it flies
  through the stream. **Same period. Predictable date. Forever.**

So: it comes from a closed orbit and it is going back around the same
loop. It is not travelling *to* anywhere — it is circling, and we are
the ones who keep arriving.

## 2. Why only this lane

Because the crossing happens at ONE place along the Drift's path, and
the lane runs through it. The ribbon passes through plenty of other
space — it just meets nothing there that anyone cares about. (His own
point, and it is the right one: elsewhere, there is nothing to
protect.)

## 3. Did anyone find out? Yes — and it is the Surveyor's work

He back-tracked it. The stream's radiant — the direction it appears to
come from — lies out toward the white dwarf on our own starmap:

> **KHIONE** — *"a white dwarf logged and left. Unsurveyed."*

And Khione is the Greek goddess of **snow**. The Surveyor named that
star for what comes out of it. The name on our chart has been a clue
the whole time.

He computed the period and put the return dates in the FIRST CHARTS,
which is why the colony has known them for generations. He never
reached the source — his charts stop out that way, like they stop
everywhere past the frontier. **The Deep is where the Sleet comes
from**, and nobody has been to look.

## 4. What is actually in it (and how they know something died)

Rock, old water ice — **and worked metal.** Plate, spars, cut beams.
Whatever broke out there was not only a rock: a ship, or ships, or
something with hulls, met something hard, and the pieces have been
going round ever since.

This does design work as well as story work: the metal fragments are
the dense, dangerous ones. The rock is mostly gravel. The colony's
danger is a handful of hull plates the size of a door coming through at
speed.

## 5. The ice, properly explained (he asked what I meant)

I said "ice wrinkle" and it landed as nonsense — here is the plain
version. **Part of what crosses is water ice.** This is a colony whose
defining wound is having run dry. Shooting good ice into gravel would
be, to a Belter, close to sacrilege: that is drinking water going past
the door.

Why it stays OUT of v1 anyway: our PDCs fire automatically by law, so
"don't shoot the ice" would need a hold-fire control the player should
not have. It resolves cleanly instead — the guns only engage what is
actually on line with the tanks, so ice that is not a threat is
naturally left alone.

And the future it opens is lovely: **catching** the ice is a separate
activity, and it already has a name in our fiction. During the Dry
Weeks the racing club stripped their hulls for tankage and ran raw ice
home, lap after lap — **THE WATER RUN.** An ice harvest during the
Sleet would be that custom, mechanised. Parked deliberately, not
forgotten.

## 6. What this adds to the build list

The stake needs to physically EXIST first (his call): **the reserve
tanks must be built onto the Drift** — big salvaged cylinders on the
colony's rim, the Nilak's registry still readable on them. That is set
dressing that pays off the vigil, the memorial board and the motto in
one object, and the Sleet cannot be built until they are there.

## 7. Still open

- The name: **THE SLEET** (his ruling pending). Now with a second
  option earned by the fiction: **the KHIONE SLEET**, or plainly
  "the sleet out of Khione."

---

# PASS 3 — THE PHYSICS CORRECTION (2026-08-15, he stopped the build)

He caught it mid-build: **liquid water in a tank bolted to the outside
of a station in deep space is nonsense.** He is right, and worse, I
should have caught it — I let a phrase I wrote on the memorial board
("HER TANKS ARE OUR WATER") drive the engineering instead of asking
what was physically inside them. Recording the correction properly.

## 1. Why the tanks were wrong

- **It would freeze.** Out here a sunlit grey body sits around 170–180 K
  (about −100 °C). Water freezes at 273 K. A tank of liquid outside is
  a block of ice within hours unless you heat it forever.
- **Heating it is idiotic.** Nobody spends reactor output keeping bulk
  water liquid in vacuum. You would melt what you need, when you need
  it, inside.
- **A holed tank would not "leak".** At vacuum pressure the water
  flashes to vapour and freezes at the same time — it would not pour,
  it would *puff away* and be gone. Which is dramatic, but it is the
  drama of a design error.

## 2. What a Belter colony would actually keep out there: ICE

Water in the Belt is mined, hauled and stored **as ice**. It is stable
in vacuum, needs no pressure vessel, no heating, no boil-off
management. Our own fiction already says it: the Nilak was an **ice
hauler**; the racers ran **raw ice** home during the Dry Weeks.

So the reserve was never tanks of water. It is a **cold store of ice**.

## 3. What stands on the rim instead: THE CRIB

Not fabricated tanks — **the Nilak's own salvaged cargo holds**, cut
out and bolted into a cradle on the rim, still packed with ice. That
keeps every word of the fiction true and makes it better:

- A hauler's holds are already built to carry ice: insulated, shaded,
  structurally sound. They did not build a store, they **reused her**.
- "HER TANKS ARE OUR WATER" survives untouched — Belters would call a
  hold a tank, and the sentence is now literally accurate.
- Her last cargo went into that store when she was recovered. The
  colony has been drinking out of her holds ever since.
- Over it: a **sunshade** angled at the local star, because exposed ice
  sublimates in sunlight. Belters would shade it; so we draw it.

## 4. Why it is outside at all (the honest reason)

Because ice is BULK, and interior volume is the most expensive thing a
colony owns — pressurised, heated, lived in. Nobody wastes it on
frozen water. You keep bulk ice outside where it costs nothing, near
the docks where haulers can load without coming inside.

And an important honesty correction to the stakes: **the crib is not
the whole reserve.** The deep reserve is buried in the rock, safe. The
crib is the **working stock** — the margin. Losing it does not kill the
colony; it puts them back on rationing. After the Dry Weeks, margin is
exactly what these people cannot afford to lose, and that is a truer,
smaller, more Belter stake than "everyone dies."

## 5. What a hit actually looks like (his question: walk the scenarios)

1. **Gravel strikes the shell.** A spall, a puff of glittering crystal,
   nothing lost. This is most hits, and it should look pretty and mean
   nothing.
2. **A rock the size of a door hits a hold.** The shell splits and
   throws a **spray of ice crystals** — a bright, dry, sparkling burst,
   not a gush. The hold is now open, and the exposed ice **keeps
   sublimating**: a slow glittering plume streams off the rim for the
   rest of the pass. You lose mass at the moment of impact AND you keep
   losing while the wound is open.
3. **Worked metal hits** (dense, fast — the wreckage in the stream).
   It punches through and out the far side: two wounds, two plumes.
4. **A hit takes the sunshade instead of a hold.** No ice lost, but
   that hold now bakes in the local star and bleeds slowly — a delayed
   consequence rather than a burst. (Lovely; probably v2.)

The important design consequence: **failure is visible from the picket
for the rest of the pass.** A glittering plume off the rim is the game
telling you what you let through, without a word of text.

## 6. What this fixes elsewhere

The "ice wrinkle" question resolves itself completely. The stream
carries water ice; the colony stores water ice. They are the same
substance. **Catching stream ice and adding it to the crib is the
modern Water Run** — which makes that future activity obvious instead
of clever.

## 7. Awaiting his ruling before rebuilding

The tanks as built (four liquid cylinders) are WRONG and are not
committed. Pending: rebuild as THE CRIB — her holds in a cradle, under
a sunshade, packed with ice, with the gauge board and the painted line
kept.

---

# BUILT — first pass (2026-08-15)

**THE CRIB** (`DriftCrib.tsx`, `systems/reserve.ts`) stands on the
Drift's Khione-facing rim: four of the Nilak's salvaged holds in a
welded cradle, her registry stencilled on them, pale ice showing in the
open ends, a foil SUNSHADE over the whole rack, a WORKING STOCK gauge
and the painted line NO SHIP LEAVES THE DRIFT DRY. A holed hold shows
its wound and vents a faint glittering plume; the reserve BLEEDS while
any hold is open and refills when the crib is whole — all on wall-clock
time, so it keeps living whether or not anyone is watching.

**THE PATCH SKIFFS** — real asset: SPACESHIP EAV 2 "CRAB" (Sketchfab,
CC BY 4.0), described by its author as built for *"maintenance,
construction and handling of hazardous materials in outer space"*, with
armoured manipulator arms. Tirtha's reference was the construction
skiffs of The Expanse S6 (Tadeo's boat, and the one Filip leaves in).
Processed through the house pipeline (`scripts/build-skiff.mjs`:
merged, welded, simplified to 35%, webp, meshopt) → 1.1 MB. Two of them
muster from the docks ~14 s after a pass and close one wound every 45 s,
welding arc flickering, then the crib is whole again.

**THE PASS** (`activities/KhioneSleet.tsx`) runs on the wall clock
(every 240 s, 100 s long, announced 25 s ahead), spawns real asteroid
geometry from the true Khione bearing, flies it ballistically across
the colony, hands the on-line rocks to the PDCs and the scope, fractures
what the guns hit into smaller rocks that keep coming, and holes the
crib with whatever gets through.

## What the first live test caught (this is why we test)

1. **The docks owned the picture.** IceRoute claims the activity lock
   whenever you are near the board — which is exactly where the crib
   is — so the pass could never start. Fixed with an explicit handoff:
   standing at the board is not work, so the docks yield to a live
   pass, while a real escort/hunt contract still outranks it.
2. **The HUD called rocks "TORPEDO INBOUND ×41".** Two bugs in one:
   the warning strip had a hard-coded noun (now `threatNoun`), and ALL
   rocks were being published as threats. Gravel is scenery — only the
   handful actually on line with the crib are threats now, which is
   what the design said all along.
3. **Balance is not settled.** Sitting still through a pass cost 40% of
   the working stock and two holds. On-line share cut 30% → 16% as a
   first correction, but the honest verdict needs a human at the
   controls — this goes into the playtest (roadmap 3.7) rather than
   being tuned blind.

---

# PASS 4 — THE AUDIT (2026-08-15, at his order: independent, no code)

His ask: audit the shipped first pass across assets, colour reading,
mechanics, physics, story and player delight — as if fresh eyes.
Evidence: full re-read of KhioneSleet.tsx / DriftCrib.tsx / reserve.ts,
geometry checks, and live screenshots of the whole crib (clean and
wounded, picket range ~380 u). Verdict first: **the instrument layer
and the fiction are sound; the physics model, the failure feedback and
the crib's own asset quality are not.** Ranked findings follow.

## A. MECHANICS/PHYSICS — the barrage problem (worst finding)

The rocks are AIMED. `launch()` picks a spawn point out along the
radiant and steers every rock at the crib or at scattered points around
the colony — the stream CONVERGES on the station like artillery. A real
stream is PARALLEL: fragments on near-identical orbits sweeping through
a volume, with the colony simply standing in the lane. Consequences:

1. It feels like being shelled, not like weather crossing.
2. **"On line with the tanks" is a spawn-time coin flip (16%), not a
   measurement.** The design's core honesty claim — the guns spend
   themselves only on what is actually coming for the tanks — is
   implemented as a random label. Fracture children INHERIT the label:
   a fragment knocked physically wide still counts (and is shot at) as
   a threat; gravel fragments can never become one.

The honest model is also the simpler one: one shared stream velocity
(radiant direction ± small dispersion), spawn across a wide upstream
disc, and DERIVE on-line by intersecting each rock's straight path
with the crib sphere. Then "shot early scatters wide, shot late
carries through" becomes literally true, and the scope's threat set is
a computed fact instead of a die roll.

Also in this class:
- **Rocks ignore all solids but the crib** — they fly through the
  colony asteroid, the docks, the boards, the player. They should at
  least die against the colony body (kill + dust puff).
- **The player cannot be harmed.** No hull exposure, hull/hullMax not
  even set during the event. An event pitched as civil DEFENCE has no
  danger to the defender — standing the picket is spectating.
- **Pool saturation:** ~100 s at up to ~4 spawns/s into a pool of 90
  with 20–30 s lifetimes saturates at peak; spawns AND fractures then
  fail silently (rocks die with no fragments, density flattens).
- **The bleed is cosmetic:** 9%/hr per wound, but skiffs close wounds
  in ≤45 s — real loss ≈ 0.1%. The "she keeps bleeding while open"
  stake is numerically nothing. Bleed per-second during the pass, or
  drop the claim.
- Heat lockout enabled here is the right call — a stream is exactly
  where it should finally bite. Untested by a human (playtest 3.7).

## B. COLOUR / READING — two violations of our own rulings

1. **Fracture is FIREWORKS.** `spawnExplosion` is the orange torpedo
   fireball sprite. Rock and ice breaking in vacuum must not burn —
   and "fracture, never fireworks" is OUR OWN written ruling. Needs a
   cold variant: grey-white dust puff, brief ice glitter, no bloom.
2. **The vents are invisible.** Live shot with THREE wounds open at
   picket range: zero visible plumes (opacity 0.05/0.12 cones vanish).
   The design's central failure-feedback beat — "a glittering plume
   you can see from anywhere on the picket" — does not exist on
   screen. Needs actual particles (instanced sparkle points), not a
   translucent cone.
3. The ice end-caps still bloom white at some star angles — the lamp
   bug in a third place. Ice must never read as a light source.
4. What DOES read: ROCK INBOUND noun, on-line-only threats, scope
   stems, gauge red-when-wounded. The instrument layer is correct.
5. Gauge/painted-line text collides with cradle geometry at several
   angles; needs a backing plate or forward offset.

## C. ASSETS — the weakest dimension

1. **The crib is programmer art.** Four identical clean capped
   cylinders, even spacing, floating text — next to the textured
   colony asteroid it reads as blockout. Nothing says salvage, cut
   hull, ice or age. The fiction hands us the fix: **cut the holds
   from nilak.glb itself** — we own her model (the vigil hologram).
   Real sections of HER plating = "her tanks" made literal, and the
   vigil and the crib become the same body seen twice.
2. **The skiffs are the right idea presented wrongly.** In-world they
   read as washed-out white pills — the CRAB's manipulator-arm
   silhouette doesn't survive the distance/simplify/512px-webp, and
   nothing says "repair boat". Scale is wrong by ~2×: they render
   ~19 u long vs the militia tug's 10 u — the "small workman's boat"
   is the biggest small craft in the game.
3. Skiffs **clip through the sunshade** (screenshot), weld at the
   shade line rather than at the wound points, **pop** in and out of
   existence (visible-toggle — the no-pop law), and never fly home.
4. The sunshade is a 0.6 u slab: good colour instinct (Kapton gold),
   no structure, vanishes edge-on, gets clipped through.
5. The one honest asset: the rocks — real asteroid-pack geometry,
   instanced, tumbling, varied. Keep.

## D. STORY / FICTION — strong on paper, not delivered in-world

1. The Khione radiant is real geometry (verified: stream arrives from
   the actual star's bearing, ~39° above the plane). Genuinely good.
2. **But the player never meets the story.** No board line, no
   countdown, no First Charts reference, no "something died out
   there" — the entire pass-2 fiction lives in docs/ only. In-game it
   is a klaxon and rocks.
3. **A 240 s period is a subway schedule**, not a charted crossing
   known for generations. It should be RARE and POSTED — the docks
   board carrying "KHIONE PASS — 18:40" is both the fiction delivered
   and the cheapest anticipation mechanic we could own. (Also the
   liveness "storm hour" hook, ready-made.)
4. **Docs contradict code:** the design says the pass comes whether
   you are here or not; the implementation gates the entire event on
   the player standing within 900 u. Choose: make absence real (the
   board records passes the militia stood alone) or amend the doc.
5. **Skiffs launch mid-storm** — patch boats fly INTO falling rock
   14 s after the first wound. No dockmaster would order that. Muster
   after PASS CLEAR; let the wound bleed until then (which also fixes
   the cosmetic-bleed finding above).

## E. PLAYER DELIGHT — the honest verdict

Genuinely delightful now: the colony healing itself (the best beat in
the event — community, not UI); the real radiant; fracture-as-
consequence; the wall-clock world that lives while you're away.

Missing, in order of cheapness: anticipation (a posted countdown);
aftermath (PASS CLEAR is one toast — no ROCKS STOPPED on the militia
board, no logbook, nothing the Drift remembers you by); danger (see
A); the peak visual moment (a boulder bursting under your tracers
overhead) currently plays as a FIRE explosion — wrong material, wrong
feeling; and the exhale (watching the skiffs work) only earns its
place if the skiffs and vents actually read, which today they do not.

## The ranked fix list (awaiting his ruling — nothing built)

- **P0 — breaks our own rules:** parallel-stream physics + measured
  on-line; fire→dust/glitter fracture; visible vent particles; skiff
  scale/position/no-pop; ice never blooms.
- **P1 — the fiction reaching the player:** board countdown + rare
  period; muster after PASS CLEAR + real bleed while open; rocks die
  against the colony; ROCKS STOPPED tally on the militia board.
- **P2 — the deep asset fix:** crib rebuilt from nilak.glb hull
  sections; skiff readability pass (or better asset); sunshade with
  structure.
- **P3 — stakes:** player hull exposure during the pass; pool
  headroom scaling.

---

# PASS 5 — THE AUDIT FIXED (2026-08-15, his order: "make it perfect")

Every P0-P2 finding rebuilt, all verified live. What changed:

## The physics is now a stream, not a barrage
`KhioneSleet.tsx` rewritten. One shared stream velocity (the true
Khione bearing, ± a breath of orbital dispersion — never a turn),
spawns spread across a wide upstream disc, about a third seeded to
pass through the crib's sphere. **"On line" is MEASURED** — each
rock's straight path intersected with the crib sphere — for every
spawn AND every fracture child. Break a boulder early and the pieces
measure clean; break it late and the spray still carries in. The guns
target only what measures true; gravel and ice pass unshot.

Also: rocks now DIE against the colony body (nothing flies through the
asteroid), a rock can find YOUR hull (hull bar live during the pass,
impact + coach line — standing the picket is exposure, not
spectating), and the pool spawns keep fracture headroom so kills
always fragment.

## The clock is global truth
`sleetClock.ts` (new): pass times are pure functions of the wall
clock — every 20 minutes, 110 s long, warned 30 s out. The docks board
carries a STANDING FOURTH ROW: `KHIONE PASS · T-12:40 · FIRST CHARTS
SCHEDULE` → `OVERHEAD` — the fiction finally reaches the player, and
the liveness "storm hour" is ready-made (same schedule for every
visitor by construction). Rocks still fly only for a present picket —
the world stays kind to the absent — but the schedule itself never
lies. Dev override: localStorage `stellarlogs-sleet-period`, clamped
so the phase math cannot break.

## Fracture is cold now
`RockDust.tsx` (new): dark tumbling shards + brief ice glitter,
opacity-faded, nothing over 1.0 — no fireball anywhere in the event.
"Fracture, never fireworks" honored.

## The crib is HER
`DriftCrib.tsx` rebuilt: the four holds are **clipping-plane windows
cut from nilak.glb itself** — each hold a different stretch of her
hull, real plating, her amber strapping, torch-cut open ends, pale ice
masses packed inside. The vigil and the crib are literally the same
body seen twice. (Two hard bugs on the way: world-space clipping
planes computed before the parent chain had world matrices — fixed
with updateWorldMatrix(true), building on first frame.)

Wounds now VENT VISIBLY: per-hold Points streams of ice glitter
rising off the rim, readable from the whole picket. The reserve
BLEEDS 2.2%/min per open hold — real stakes — and repairs hold until
the pass is over (holdRepairsUntil): no boats into falling rock.

## The skiffs are honest
Scale corrected 2.4 → 0.9 (≈7 u — smaller than the 10 u tug, a
workman's boat). They EMERGE from behind the colony's rock and ease
to the actual wound points (no pop, ever), weld with a flickering
arc, close wounds one at a time (45 s each), and ease home when the
work is done. Muster ~10 s after PASS CLEAR.

## The aftermath exists
`KHIONE ROCKS STOPPED — N` on the militia kill-board (persistent
tally, backend-ready), PASS CLEAR/PASS OVER verdict lines with the
skiff muster called out.

## Verified live (fast test clock, then restored)
Storm: ROCK INBOUND ×13, guns ENGAGING ×2, board OVERHEAD, wounds
opening, reserve dropping. Aftermath: skiff ON STATION welding, one
wound already closed, vent glitter over the open hold, board T-0:19
to the next pass. An undefended triple pass cost ~70% of stock —
balance goes to THE PLAYTEST (3.7) for human judgment, not blind
tuning.

## Still open, honestly
- Skiff texture readability at range: better (2.6 MB rebuild, correct
  scale) but the manipulator arms still read only up close.
- The sunshade catches a hot specular streak edge-on to the star.
- Overlapping T-digits on the HUD when many threats cluster
  (pre-existing scope behavior) — playtest item.
- crib-bench.html kept (the pod/slab decision bench).

---

# PASS 6 — THE SKIFF, FOR HIS EYES (2026-08-15)

His verdicts: he wants to SEE the skiff and alternatives on a bench,
and the movement was wrong — "it just teleports… it has to move like a
boat in space."

He was right about the movement, and the cause was structural: the old
code eased a lerp factor between endpoints and re-picked its target
hold by INDEX every frame — so when a wound closed, the target swapped
instantly (the "teleport"), and lookAt() snapped the heading the same
frame (the "weird rotation").

## The new motion — a boat, not a marker
The skiff now carries real state: position, velocity, a nose.
- **Accelerates toward its waypoint** (9 u/s², capped 34 u/s), and
  when the remaining distance falls inside its stopping distance it
  **flips and burns against its own velocity** — the Expanse brake.
- **Arrives near-zero and station-keeps** with a whisper of RCS
  wander; the welding arc only lights ON STATION.
- **Commits to a hold** until the work is done — retasking happens by
  FLYING to the next wound from wherever she is, never by swapping.
- **The nose leads the velocity** (slerped, hull-axis corrected);
  on station she faces the work.
- Comes out from behind the colony's rock, goes home the same way,
  and is only "put away" once she is home AND stopped.

## THE SKIFF BENCH — /skiffs.html
Three candidates, orbitable, keys 1/2/3, with license captions:
1. **EAV-2 "CRAB"** (current) — Mikhail Nov, CC BY. Armoured
   manipulator arms, maintenance/construction fiction.
2. **Sci-Fi Welding Vehicle** — Berk Gedik, CC BY. A welding workboat
   with a boom arm.
3. **Mech Drone** — Willy Decarpentrie, CC BY (spec-gloss converted
   to metal-rough; its rig animates on the bench). Utility drone with
   grip arms.
Plus **F · FLIGHT DEMO** — the exact motion model that now flies in
the game, demonstrated between two mock holds: out, flip, brake,
hold-and-weld, next, home. His pick rules; the CRAB stays until then.

---

# PASS 7 — THE DRONE IN BELTER PAINT (2026-08-15, his pick)

His ruling off the bench: **the Mech Drone is the skiff**, repainted —
"expanse tv series colors and textures."

What "textureless" was: the drone's paint lives in an old Sketchfab
spec-gloss extension that three.js dropped — the raw file rendered
clay. Converted to metal-rough (gltf-transform metalRough), the
author's real hand-painted sheet came back: dark steel, yellow hazard
panels, chevron striping, a blue lens.

THE REPAINT (PIL pass over the 1024² baseColor sheet):
- hazard YELLOW → **burnt rust-orange** (the Roci/Belter accent),
  chevrons kept, now orange-on-black;
- the blue lens → **Belter teal**;
- the steel graded cooler/darker with more depth, plus a low-opacity
  rust-grime noise over the midtones.

`scripts/build-mechskiff.mjs` (new): texture swap + webp + meshopt
reorder ONLY — no bake, no weld, no simplify, no quantize, because the
drone is RIGGED and the hull pipeline collapsed it to 18 verts. The
skin and "Take 001" survive: **her arms actually work the plate while
the arc is lit** (AnimationMixer at full rate while welding, ~idle
otherwise). 717 KB.

Game wiring: SkeletonUtils.clone (plain clone breaks skins), runtime
normalization to ~5.2 u (a drone, smaller than everything), the same
boat-physics flight. Verified live: both drones on station over the
wounded holds, arms out, orange flanks in the starlight, vent glitter
around them — the colony's hull crew, exactly the Pella scene at our
scale.

Bench updated: MECH DRONE (current), EAV-2 CRAB (retired), Welding
Vehicle held as an alternate.
