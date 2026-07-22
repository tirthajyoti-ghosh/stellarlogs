# The Story Layer — "A Working Belt" (July 2026)

## Why

The activities work, but they are arcade machines floating in the void. Nobody
owns them. Nothing explains a live-fire range sitting in open space, or who
strung eleven holographic gates through an asteroid belt. The fix is not more
mechanics — it is **purpose**: every playable thing in this world should exist
because someone here needs it. That someone is a Belter drift-colony, and the
inspiration is The Expanse's storyline — *inspired*, never copied: our own
names, our own tiny arc, the show's texture (Belters, ice haulers, raiders,
slingshot racing, Lang Belta seasoning).

## The premise, in one breath

This corner of space is a working Belt neighborhood. The seven bright systems
are the ports — that's where the "official" content lives. In the seams
between them, Belters live and work on a drift-colony dug into a rock in the
Projects belt. You fly the neighborhood's odd jobs. **Everything playable is a
job somebody posted.**

## Canon anchors (researched)

- **Slingshot racing is real Expanse canon**: an illegal, dangerous Belter
  sport — homemade one-person craft, one burn, a plotted course, "vying for
  the fast time across an established circuit." Manéo Jung-Espinoza of Ceres
  and his salvage-built *Y Que* (S3 "Delta-V") are the archetype. Our Belt Run
  IS this sport, licensed by nobody, run by the colony's racing club.
- **Ice haulers** are the Belt's lifeline (the *Canterbury* archetype): slow,
  fat, precious targets. The wreck of one is the saddest object in the genre.
- **Lang Belta** (Nick Farmer's creole): oye (hey/hello), beratna (brother),
  sasa ke? (you know?), beltalowda (us Belters), sabaka (damn), welwala
  (inner-planets loyalist, mildly rude), kopeng (friend), na (not). Rule
  below on usage.

## The micro-arc: four beats, told ambiently

One small cause-and-effect story connects everything. **No quest log, no
chained unlocks, no required order** — every beat is a standalone activity per
the design law (see → play → win → move on). Explorers who visit everything
will ASSEMBLE the story themselves; that moment of connection is the reward.

1. **THE WRECK** *(environmental, build step S2)* — Months ago, raiders hit
   the ice hauler **Sirocco** on approach to the colony. Her broken hull still
   drifts near the belt with a beacon plaque: `REMEMBER THE SIROCCO`. Nothing
   to win here — it is the reason everything else exists. (This also fulfills
   the old README's derelict-wreck promise.)
2. **THE DRILL** *(exists today — Gunnery Range, reframed)* — After the
   Sirocco, the colony stood up a militia and built a live-fire range. The
   torpedo-defense drill is their **PDC certification**. Chief Ruiz runs it.
3. **THE HUNT** *(planned F.3 — ship hunt)* — The raider skiff that took the
   Sirocco still works this corridor. The militia posts an interdiction
   bounty: run it down before it runs dark.
4. **THE ICE RUN** *(planned F.4 — freighter escort)* — With the raider dealt
   with, the next hauler makes the approach — and you fly escort. The loop
   closes: what happened to the Sirocco does not happen again.

Plus the culture beat, outside the arc:

- **THE CIRCUIT** *(exists today — Belt Run, reframed)* — The colony's
  slingshot-racing tradition. The drift kids strung the gates; the racing
  club keeps "the board" (best times). Naia runs it and is not impressed
  by inner-world pilots. Yet.

## The place: the drift-colony

- **Name**: use a real minor planet the show never spotlighted, exactly how
  the show named Ceres/Eros/Pallas. Recommendation: **511 Davida** →
  "**Davida Drift**". (Alternates: Sylvia Rock, Interamnia Dock.)
- **Where**: inside the Projects belt arc, ~500u off the Belt Run course —
  the race visibly belongs to the colony, and the range/wreck sit in its
  neighborhood.
- **What it looks like** (assets-first; candidates verified downloadable,
  CC-BY, on Sketchfab): a hollowed-rock core ("Asteroid with Internal Tunnel
  System", 7.8k faces) docked with industrial structure ("Space Station
  Asteroid Mining Facility" / "Space Colony Modular Kit Bash", optimized
  through our offline pipeline like the Gateway 45.8→6.6MB), our nav buoys,
  floodlights, window-light emissives, slow spin (spin-gravity nod). Belter
  aesthetic: welded, patched, working — not shiny.
- **Signage**: bilingual, Lang Belta first, English beneath (the show's
  visual convention): `OYE — DAVIDA DRIFT / ALL TRAFFIC HAIL DOCKMASTER`,
  hand-painted `REMEMBER THE SIROCCO`, the racing club's crooked board.
- **Not a content system**: no resume boards here. The Drift is the world's
  home. The Comms Station remains the professional front door.

## Voices: how the story is delivered

**INCOMING HAIL** — a small toast card (new lightweight DOM layer, same
imperative pattern as banners): speaker name + role, two lines max,
auto-dismisses, never blocks flight, frequency-capped per session so repeat
visits stay quiet. Text only — no portraits, no voice acting, no cutscenes.

- **Naia Okonkwo** — race marshal, drift kid. Circuit entry: *"Oye, pilot!
  Kids run this in 75 flat. Show us something, sasa ke?"* Win: *"Sasa,
  beratna! Your time's on the board."* Abandon: *"Course still hot, ke."*
- **Chief Ruiz** — militia gunnery chief, ex-navy. Range entry: *"Raiders hit
  two haulers last quarter. Guns are automatic — FLYING keeps you alive.
  Survive my pattern."* Win: *"Certified. Colony sleeps easier, kopeng."*
- **Captain Odele** — hauler skipper (F.4): *"Walking ice to port. Raiders
  like slow fat targets. Don't let me be one."*
- **The raider** (F.3) — one taunt hail on intercept, nothing more.

**Language law**: Lang Belta is seasoning, never a gate. Every hail must be
fully understandable from its English content alone; creole words carry tone,
not instructions. (Existing law: comprehensible in seconds to someone who
never watched the show.)

## Light diegetic renames

- Gunnery marquee sub-line → `DRIFT MILITIA · PDC CERTIFICATION · AUTO-ENGAGE`
- Belt Run marquee sub-line → `DRIFT RACING CLUB · SLINGSHOT CIRCUIT`
- POI details/tactical lines pick up the same flavor.
- Best time is "the board" in Naia's mouth; mechanically unchanged
  (localStorage, no leaderboards — the law stands).

## What stays sacred

- **No meta-progression**: no quest log, reputation, badges, or unlock
  chains. The arc is ambient; each beat standalone.
- **Friction is the fun**: story never adds mechanics — it explains the ones
  the flying already earns.
- **Realism bar**: settlement and wreck from real acquired assets through the
  offline pipeline; text-only voices; functional UI (hail cards carry
  instruction + flavor in the same two lines).
- **Finite wins**: each job ends, cleanly, with its win state.

## Build order (each step ships alone)

- **S1 — Voice & flavor pass** *(no new assets)*: hail-card system, the four
  written voices for existing activities, marquee/POI/signage renames.
- **S2 — The Sirocco wreck**: acquire a freighter-class model, break it
  offline (hull sections, scorch, dark), place with beacon + plaque. Seeds
  the arc and the old README promise.
- **S3 — Davida Drift**: acquire + optimize the settlement assets, place in
  the belt, signage/lights/dockmaster hail.
- **S4 — F.3 THE HUNT**: raider skiff interdiction, written into the arc
  (prey-ship asset hunt already shortlisted).
- **S5 — F.4 THE ICE RUN**: escort closing the loop (double-duty: the hauler
  model can be the same class as the Sirocco — one asset, both beats).
- *(Future: the railgun as a militia armory upgrade for late beats.)*

## Open calls for Tirtha

1. Settlement name: **Davida Drift** / Sylvia Rock / Interamnia Dock / other?
2. Creole thickness: as-specified (seasoning) or even lighter?
3. The wreck name **Sirocco** (wind names suit haulers) — keep or rename?
4. Start with S1 (pure writing/flavor, ships today) or S2/S3 (asset-led)?
