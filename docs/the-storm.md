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
