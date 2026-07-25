# The Deep — design exploration

*Deep-dive companion to the HORIZON section of docs/roadmap.md. Status:
exploration, pre-implementation. 2026-07-26.*

## The fantasy, stated precisely

You take the ship past the rim of charted space. The jump ends somewhere no
one — actually no one — has been. The survey instruments start painting what's
there. Usually it's dead rock and radiation, magnificent and empty. Sometimes
there's chemistry. Once in a long while the panel says something that makes
you sit forward — and because you were first, the survey that gets written is
written *because you came here*, and your callsign is on the chart forever.

## Problem one: procedural oatmeal

Kate Compton's law: a generator can output ten thousand bowls of oatmeal that
are all mathematically unique and all identical to the eye. No Man's Sky at
launch: infinite planets, one feeling. Elite Dangerous survives it because
its 400 billion systems are *mostly honest astronomy* — the emptiness is the
point — and rarity does the emotional work (players cross thousands of
light-years for one black hole).

**Our answer: a rarity pyramid with honest emptiness.**
- ~70% of systems: dead, but *specifically* dead — every system still gets
  one line of character from the geometry layer (a ringed dwarf, a pulsar's
  sweep, a comet family on a screaming ellipse).
- ~25%: chemistry — prebiotic seas, banded atmospheres, geology worth a
  probe. Survey-worthy, life-free.
- ~4.9%: microbial/simple life. A biosphere signature, one paragraph of
  wonder.
- ~0.1%: **complex ecosystems** — the Curious Archive worlds. Full survey
  entries, multiple species, a chart entry people will share.
- Once per few thousand: **anomalies** — the things that make explorers into
  evangelists. (Derelict generation ships. Impossible orbits. A silent
  artifact. Write these as authored templates with procedural parameters —
  hand-crafted wonder, procedurally placed.)

Scarcity is the feature. If every third planet sings, none of them do.

## Problem two: coherent life, not species soup

The three works Tirtha binged via Curious Archive are, read as engineering,
three different generator architectures:

1. **Serina (the premise seed).** One founder taxon (canaries) + one sealed
   world + deep time → an entire coherent radiation. Lesson: don't generate
   species — **generate a founder and a constraint, then derive.**
2. **Snaiad (the bauplan).** Kösemen invented one alien body plan (the
   two-"head" anatomy) and every species inherits and varies it. Lesson:
   each living world gets ONE invented bauplan; all its species are
   variations. That's why Snaiad feels taxonomically *real* — relatedness is
   visible. Uniform novelty reads as noise; related novelty reads as biology.
3. **All Tomorrows (the history).** Species as consequences of *events* —
   the biology is downstream of a story. Lesson: generate 2–4 major
   historical events per living world (impact winter, ocean loss, a
   radiation epoch) and make the LLM derive adaptations from them.

**So a living world is generated as: FOUNDER + CONSTRAINTS + BAUPLAN +
HISTORY → niche graph → species.** The procgen (deterministic, seeded)
decides all of it as *facts* — energy basis (photo/chemo/thermo/radio-
synthesis), medium (ocean/air/subsurface/ice-roof), gravity and pressure
envelope, the bauplan's one weird invention, the event list, and a niche
graph (producers → grazers → predators → decomposers → the one niche twist).
The LLM never invents facts; it **narrates** them in field-guide voice.
That contract — *procgen decides, LLM writes* — is what keeps ten thousand
worlds scientific, distinct, and cheap to moderate.

## What the pilot actually does (the survey loop)

The best scan mechanics in games make *reading the world* the play (Outer
Wilds' signalscope, Metroid's scan visor, Elite's FSS, Subnautica's
scanner). Ship-only version, ~90 seconds per system, no chores:

1. **Arrival ping** (automatic, our "honk"): the system chart sketches in —
   bodies as unknowns with mass/orbit only. HUD: `4 BODIES · UNSURVEYED`.
2. **Target + probe**: point at a body, launch a survey probe (a real
   projectile — it flies, it takes real seconds, gravity bends it; drive
   and RCS skills stay relevant). Probe arrival paints that body's entry.
3. **The reveal cadence is the reward**: geometry first (rings, ice, storm
   bands), then chemistry, then — if the dice were kind — `BIOSIGNATURE
   POSITIVE` and the survey entries begin to write themselves onto the
   panel, live, as the LLM's cached prose streams in. First visitor sees
   "TRANSMITTING SURVEY TO THE REGISTRY…" — because their probe is
   literally causing the science to be written.
4. **Anomalies ping on arrival** as an unresolved signal bearing — you fly
   the bearing to resolve it. (Place-told mystery; no popups.)

## Procedurally generated *stories* — a sea of small Nilaks

Life isn't the only meaning. The same grammar that gave us the Nilak
("ice hauler + route + what went wrong") generalizes: a fraction of systems
contain **wrecks, dead stations, beacons — each with a generated fate**,
three lines, painted on the hull or looped on the beacon, Belter-terse:

> MSV KESTREL — WATER RECYCLER FAILURE, 11 WEEKS OUT. THREE CREW.
> SHE MADE IT TO THE RELAY. THE RELAY WAS DARK.

Rules: fates are composed from our lore grammar (ships, routes, cargo,
failure modes, rescues-that-didn't-come); the LLM writes only the epitaph
text from procgen-chosen facts; tone stays in the story-layer laws (standing
situation, no quest hooks, no NPCs). The Deep becomes a place where the
*history of a frontier* accumulated — and the first finder of each wreck
gets the same registry credit as a first survey. Lighting a candle works at
every wreck. The vigil ritual scales to infinity.

## The meaning layer — engineering contract

- **Trigger**: first probe of a body/system by any visitor, ever.
- **Input**: the procgen fact sheet (JSON: star class, orbit, gravity,
  medium, energy basis, bauplan spec, event list, niche graph, name seeds).
- **Output**: schema-forced JSON — system tagline, per-body survey
  paragraphs, per-species entries {name, niche, one-sentence description,
  one field-note}. Length-capped.
- **Voice**: few-shot field-guide prompt (measured wonder, no purple prose,
  no "testament to"); banned-cliché list; Curious Archive cadence.
- **Cache**: KV keyed by `seed@generator-version`, written once, served
  forever. Versioning lets us regenerate a sector if the generator improves,
  without invalidating discovery credits (credits attach to the seed).
- **Fallback**: if the backend is down or budget-capped, the client renders
  template-based survey lines from the fact sheet alone ("TELEMETRY ONLY —
  FULL SURVEY PENDING RELAY"). The Deep degrades gracefully to v0.1
  behavior; it never blocks.
- **Moderation**: LLM output needs none (we authored the prompt); visitor
  free-text (naming rights, if ever) reuses the radio-hail moderation pipe.
- **Cost math**: one call per first-discovered system (~1.5k tokens out on
  a small model ≈ fractions of a cent). 10k discoveries/month ≈ single-digit
  dollars. Rate-limit discoveries per session (e.g. 20) to bound abuse; the
  probe's flight time is itself a natural rate limiter.

## The Atlas — discovery as a growth loop

Every discovered system gets a **permalink**: `/deep/KX-1189` — a real URL
that (a) opens the site *in that system*, and (b) server-renders an OG card
(system name, discoverer callsign + flag, tagline, generated art-frame) so
the link unfurls beautifully when shared. Plus `/atlas`: the public registry
of everything found so far, newest wonders first.

Consequences, in order of importance:
1. **Sharing loop**: someone finds a two-sun ocean world with sky-grazers →
   posts the link → readers land *inside the game at that exact system*.
   The portfolio acquires its own word-of-mouth engine.
2. **SEO**: today the site is one URL. The Atlas mints an ever-growing set
   of indexable, content-bearing pages — each with unique generated text —
   all under tirthajyotighosh.com. (The domain decision keeps compounding.)
3. **Liveness**: the Atlas IS a liveness surface — the universe visibly
   grows because strangers keep pushing the frontier.

## Phasing (each slice shippable, none blocks the previous)

- **v0.1 — The Rim (geometry only).** One uncharted sector past the map
  edge; seeded client-side systems; probe + fact-sheet surveys, template
  text; no backend. Proves the loop is fun. (Can ship before the liveness
  backend exists.)
- **v0.2 — First Survey.** Backend cache + LLM meaning layer + discovery
  credit (callsign/flag/date). Needs the liveness KV + a callsign prompt.
- **v0.3 — The Atlas.** Permalinks, OG cards, /atlas registry page.
- **v0.4 — Small Nilaks + anomalies.** Story grammar, wreck fates, candle
  at every wreck, anomaly templates, the wonder tier.
- **v0.5+ — Deep time.** Sector regeneration versioning, seasonal events in
  the Deep, whatever the imagination pours in next.

## How today's work feeds this (build-compatibility rules)

- Systems stay **data, not code** (`buildSystem(config)` — already true).
- One-system-at-a-time render/dispose (already true) = the streaming model.
- The liveness backend's KV + moderation pipeline are the survey cache and
  content pipeline — design their keys/shapes with `seed@version` in mind.
- Radio-hail callsigns become discovery credits — one identity primitive,
  two features.
