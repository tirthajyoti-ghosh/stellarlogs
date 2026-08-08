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

---

# Second pass — further directions (2026-07-26, late)

## A universe that theorizes about itself
The meaning layer doesn't have to write each system in isolation. When
generating a new survey, include 2–3 *neighboring systems'* cached summaries
in the prompt. The LLM may then write connective tissue: "the same silicate
spore signature as KX-1121, two jumps rimward — a panspermia corridor?" The
registry accumulates **conjectures** that later discoveries confirm or
refute. The frontier stops being a catalog and starts doing *science about
itself* — emergent meta-narrative for the cost of a longer prompt.
Companion piece: **the Cartographer's Notes** — a weekly cron pass reads the
week's discoveries and writes a short state-of-the-frontier bulletin, posted
in-world on a painted board at the Drift and on the Atlas. The world
discusses what its visitors did.

## Deep time — the frontier has a heartbeat
- **Live celestial mechanics on real clocks**: variable stars that dim on
  multi-day periods; eclipsing binaries; a comet that only visits the inner
  system two real-world weeks a year. "Come back in March" — ephemeral
  astronomy creates return visits and shared moments (a transit *tonight*).
- **Growing surveys**: biosphere worlds get seasonal field entries (a
  quarterly LLM pass, versioned) — the Atlas shows a world's science
  *thickening over months*.
- **Propagating events**: a nova in one sector tints neighboring skies for
  real-time weeks. Everyone in the Deep shares the same sky news.

## Sound as an instrument (survey by ear)
Each system gets a procedural audio signature derived from its seed: pulsar
clicks at true rotation rate, magnetosphere hum, aurora static — and on
biosphere worlds, a faint biological channel when the antenna points at
them. Anomalies are *audible as wrongness* before instruments resolve them.
Listening to the dark is peak Expanse, costs no assets (procedural synth
from seed params), and gives the Deep its own sensory identity distinct
from the charted core.

## Rendering life without modeling creatures
We cannot model 10,000 species. We don't need to — **orbital survey sees
life at planetary scale**, which is scientifically honest and fully
procedural: bioluminescent ocean blooms (shader), reef-bands coloring
coastlines, migratory swarm-shadows crossing cloud decks, spore hazes in
the airglow. Life is texture, light, and motion on the planet shader; the
*species* live in the prose. Experiment for later: a **field-sketch
generator** — parametric line-art silhouettes derived from the bauplan spec
(survey-notebook style), procedural and consistent, explicitly NOT
image-model output (slop risk).

## The fiction of surveying: a Belter commons
Who are you out there? The **Frontier Survey Cooperative** — volunteer
pilots, pooled data, Belter-run. No claims, no ownership, no strip-mining:
orbital observation only (our engine's constraint IS the ethic — a
prime-directive flavor without preaching). "The chart belongs to the Belt
because the Belt built it." First-survey credit is honor, not property —
which is exactly why it stays warm.

## Multiplayer texture beyond credit
- **Relay buoys**: each explorer may place ONE numbered relay in the Deep
  (moderated name). The frontier slowly grows visible infrastructure the
  way real frontiers do — and a dead relay is a future small-Nilak.
- **Loose ends**: the Atlas lists systems *pinged but never fully probed* —
  open invitations to finish a stranger's survey.
- **Expeditions**: a monthly announced target sector (shared-clock synced);
  that weekend's discoveries push one chart-front together. (Elite's
  Distant Worlds, miniaturized.)

## Naming policy (law-consistent)
Procedural Belter-flavored designations for everything ("KX-1189 c").
Only the wonder tier *earns a name* — LLM-proposed from Lang Belta
name-grammar (world-signage law: Belta lives in names, HUD stays plain
English). Visitor naming rights, if ever, go through the hail-moderation
pipe and apply only to relays, not worlds.

## The danger law
**The Deep doesn't kill you; it outlasts you.** Hazards are texture, not
punishment: a flare star may whiteout instruments mid-survey (wait or
return), a pulsar forces a longer standoff (slower resolve). Combat and
dying belong to the Ice Route; the Deep is the contemplative register. Two
moods, one game.

## The Deep as the portfolio's strongest exhibit
Quietly the whole feature *is* the resume: a production LLM pipeline with
schema-forcing, caching, versioning, moderation, cost bounds, and graceful
degradation — running live in front of the recruiter. Publish the
engineering notes (blog post + a registry board at the Comms Station:
"HOW THE SURVEY WORKS"). The portfolio piece about AI engineering is made
OF AI engineering.

## Immediate spike (zero backend, zero LLM)
The founder/bauplan/history → niche-graph generator is pure TypeScript and
testable NOW with template text. A weekend spike validates the
oatmeal-defense before any infrastructure exists. If the fact sheets read
as distinct and alive in plain templates, the LLM layer only adds voice —
we'll know the bones are good.

---

# Third pass — the Registry graph, agents, travel, Bobiverse, synthesis (2026-07-26)

## The Registry is a graph and the surveyor is an agent (Tirtha's reframe)
Correcting the second pass: don't stuff neighbor summaries into a prompt —
model the Registry as what it actually is, a **growing knowledge graph**:
- **Nodes**: systems, bodies, species, wrecks, relays, conjectures,
  pilots (callsigns), bulletins.
- **Edges**: spatial adjacency; spectral/biosignature similarity; causal
  (nova → irradiated neighbors); provenance (pilot → discovery);
  **conjecture edges** (LLM-proposed links: "possible panspermia corridor",
  status: open / confirmed / refuted).
The survey writer is then an **agent that walks the graph via tools**
(`get_node`, `walk_edges`, `find_similar_surveys`, `open_conjectures_near`,
`propose_conjecture`) before writing. Our backend runs an AI agent; the
cooperative *is* the agent plus the crowd feeding it.

**Tiered execution (cost discipline):**
- Tier 1 (most systems): no agent — backend computes the neighborhood
  subgraph deterministically and hands it to a single generation call.
- Tier 2 (wonder tier + anomalies + weekly Cartographer pass): the full
  tool-walking agent, multiple turns, deeper graph reads. Depth where the
  tokens earn wonder.

**The conjecture lifecycle is an emergent quest system (no quests):** a
conjecture is a *prediction about unexplored nodes* ("if the corridor is
real, KX-1240 should show the same spores"). Open conjectures render on the
chart as marked bearings. When a later pilot's probe returns facts that
match, the agent resolves it: CONFIRMED — **credit to both pilots**: the
one whose discovery spawned the theory and the one who flew out and proved
it. Goals emerge from the science itself; nobody authored a quest.

## Law: no live multiplayer
No other ships moving around — not now. All human presence is
**asynchronous trace**: hails, credits, candles, relays, conjectures,
bulletins. (Revisit only if Tirtha reopens it.)

## Visitors
First-time vs returning + counts come free with the backend. Identity stays
privacy-light: anonymous id + optional callsign in localStorage; no
accounts, ever, unless he says otherwise.

## Travel design (the light-years problem)
Real scale is unusable; the answer is fiction-true compression:
- **The long jump reuses the flip-and-burn** — same verb, bigger gesture.
  Transit runs ~15s to a hard cap of ~40s scaling with chart distance;
  drive-dark coast in the middle where the Deep's audio layer fades in
  (the contemplative beat).
- **Transit is the generation window**: during the burn, the client builds
  the system and the backend round-trips the cache. The cinematic hides all
  latency; loading screens never exist.
- **Distance is diegetic, not experienced**: charts and surveys stamp
  fictional durations — "6 WEEKS OUT" — matching the epitaph voice ("11
  weeks out"). Deep-time flavor, zero real waiting. No fuel mechanics ever
  (friction yes, bureaucracy no).
- **Frontier-adjacency routing**: you can jump to charted space + ONE hop
  past the surveyed edge (that hop IS surveying). Deeper sectors become
  reachable as the community's chart grows — relay coverage extends with
  completed surveys. **The crowd literally opens the map.** Individual
  courage pushes the edge; collective work deepens it.

## Bobiverse minings (We Are Legion / Dennis E. Taylor)
Take:
- **Autonomous long-range probes** — the Von Neumann spirit, portfolio-
  sized: launch a probe toward a sector beyond your reach; it travels in
  REAL time (hours–days); its report is waiting on your NEXT visit ("YOUR
  PROBE REACHED KX-2001 · BIOSIGNATURE POSITIVE"). A return-visit engine
  that is pure Bobiverse: your machines working for you while you're away.
- **The Cartographer as persona** — the co-op's collator writes the weekly
  bulletins in a dry Belter voice; a voice, never a face, never a popup
  (story-layer laws hold; no AGI fiction, just an institutional pen).
- The tone: joyful engineering competence.
Leave: replication trees, industry/autofactory sim, multi-Bob personality
drift — scope bombs, and live-actor energy we've outlawed.

## Synthesis — what the passes revealed (Tirtha asked "what do you gather?")
1. **Everything is one data structure.** Port Registry boards, survey
   credits, conjectures, wreck epitaphs, relays, candles, hails, bulletins,
   the Atlas — every feature reads/writes the same shape: *places + events
   + attributions, with prose attached*. There is no pile of features;
   there is ONE Registry graph wearing different painted faces. Build it
   once, honestly, and every future feature is a new face on it.
2. **The theme has been memory all along.** The Nilak vigil (remember the
   dead), the Port Registry (remember the makers), first-survey credit
   (remember who found it), candles, epitaphs, relays as marks of passage —
   and the night this vision crystallized began with its owner unfindable
   on Google. The site's fiction and its function are the same statement:
   **being remembered in a vast indifferent space is earned by what you
   contribute to the shared record.** A portfolio is exactly that machine.
   Design tiebreaker from now on: when unsure, choose the option that
   leaves a trace with a name on it.
3. **Fiction = infrastructure (law).** Our best designs are the ones where
   the technical thing and the fictional thing are identical: co-op =
   backend, transit cinematic = loading screen, orbital-only ethic = engine
   constraint, relay coverage = routing table, drive-dark = physics flag.
   When fiction and architecture disagree, redesign until they are the same
   thing.
4. **Async is the native mode of everything here.** The web visit, the
   light-lagged frontier, the no-live-ships law, probes reporting while
   you're away, conjectures answered across weeks by strangers — medium,
   fiction, and social design all agree. We never fight our medium.

---

# Fourth pass — pacing, targeting, cold start, probes, temperature (2026-07-26)

*Supersedes the third pass's travel timings. Tirtha's critiques drove all of
this.*

## Travel: the 15–40s transit is dead
Watching the ship coast for 15+ seconds per jump, every jump, is dead time
wearing a costume — at exploration cadence it breaks Bruno's
reward-every-20-seconds law. Fix:
- **Deep jumps reuse the EXISTING brachistochrone cinematic (~8–11s)** —
  align → burn → flip → brake, already built, already loved. Generation
  needs 2–3s worst case; it hides inside comfortably.
- **"Weeks out" stays on the chart, not the clock** — distance is stamped
  on surveys and epitaphs, never experienced as waiting.
- **Drama is reserved for thresholds, not repeated**: crossing the rim the
  FIRST time gets a one-time long ceremony (the Deep's audio fading in over
  a drive-dark coast). Every jump after is snappy.
- **Pacing budget (the balance Tirtha asked for)**: pick target ~10s →
  jump ~10s → arrival reveal ~10s → probe or hop. Full loop ≈ 30–40s per
  system, faster when skimming. Hundreds of "light-years" per hour of play;
  depth comes from the survey activity, never from the wait.

## "Jump to WHERE?" — remote sensing makes the choice real
Blind bearings are meaningless choices. The real-astronomy answer: you can
*see* stars before you visit them. The chart shows unvisited nodes with
**scope data** — an information gradient:
1. Naked chart: position, color, class guess.
2. Scope sweep: star class, transiting-body count.
3. Deep scan (from an adjacent system): atmosphere hints, water lines,
   **biosignature-candidate flags** — most of which will be false positives,
   because that heartbreak is real astronomy.
Choosing a jump becomes informed betting on spectra — exactly how real
astronomers pick targets. (New HUD surface eventually: the Chart screen —
the jump interface past the rim.)

## Cold start: the Archive, and explorer zero
The site launches with no crowd; Tirtha will be the only explorer for a
while. Design consequences, embraced:
- **The rim launches pre-charted by "FSC ARCHIVE"** — institutional scope
  surveys (star class, body counts, candidate flags), zero flown surveys.
  No fake pilots, no fabricated credits — catalogued-never-visited is how
  real star charts work. The map at launch is a to-do list, not a void.
- **Everything is single-player-complete**: adjacency grows from YOUR OWN
  surveys (the crowd merely accelerates it); conjectures are
  self-confirmable (the agent credits whoever proves it, including the
  theorist's own pilot); Cartographer bulletins work at n=1 ("One pilot
  flew this week. She flew far.").
- **Explorer zero is honest**: the creator's own first-survey credits
  seeding the Atlas is true, and a good story — no seeding theater needed.

## Probes: two classes, tuned to absence, never to fake realism
Tirtha's reductio was correct — a light-crawling probe reports in decades;
useless. The mechanic's PURPOSE is making returns rewarding, so its clock
is **player-absence time**, justified by the same fictional physics as the
jump drive (torch drones + tightbeam via the co-op relay net — The Expanse
hand-waves Epstein; our bar is internal consistency, not Einstein):
- **Survey probe** (in-system, unchanged): real projectile, seconds,
  gravity bends it.
- **Ranger probe** (async): launched at a scope-charted, unsurveyed node a
  few hops out. Reports in **2–24 real hours** (scales with hops, hard cap
  ~a day — matched to next-day visit cadence). Return greeting: "PROBE 7
  REPORTED FROM KX-2001 · BIOSIGNATURE POSITIVE." Backend generates the
  survey lazily any time before pickup — async latency is free.
- **Rangers can be lost** (small chance): the probe never reports… and
  becomes a findable wreck node — "RANGER 7 — LAUNCHED BY [callsign].
  NEVER REPORTED." Your failures leave named traces too. The memory theme
  keeps paying.

## Temperature: diversity from the dice, discipline from the contract
Tirtha's instinct (high temperature for diverse stories, hard physics
constraint) refined into the working rule:
- **Diversity is the procgen's job** — the fact sheet (founder, bauplan,
  history, niche graph) is where variety is manufactured, deterministically.
  If two worlds read alike, fix the dice, not the sampler.
- **Discipline is the contract's job** — facts are inputs the LLM may not
  contradict; schema-forced output; a validator pass (banned-magic list,
  units sanity) rejects unscientific prose.
- **Temperature only seasons the prose** — moderate-high for survey voice;
  hotter allowed for Cartographer bulletins and conjecture phrasing (they
  are speculation, labeled as such); cooler for body physical descriptions.


---

# Fifth pass — the approach vector (2026-08-08)

*First pass written since the combat arc shipped. Everything below is new
context the July passes could not have had: the torpedo brain, THE SCOPE,
THE VOICE, the bench method, and a closed performance audit with real
numbers. Also records the sequencing decision: portfolio complete FIRST,
then the Deep with full focus (Tirtha, 2026-08-08 — "get everything out
of my way to focus on the Deep").*

## 5.1 The estate the Deep inherits (new since July)

The July passes designed onto a bare world. The Deep now lands on:

- **THE SCOPE** — the instrument already has the collapse grammar (one
  canvas, multiple pictures). The Deep's arrival ping is a THIRD picture
  of the same instrument: bodies as unknowns on the nav disc, filling in
  as probes report. The Chart screen (pass 4's jump interface) is not a
  new HUD organ — it is the scope's fullscreen moment, and the morph
  between them is already a solved design.
- **THE VOICE** — the tier law answers where survey prose lives: nowhere
  in it. Survey text is not banner material; it is a READING surface —
  a fifth channel, **THE LEDGER**: the survey panel where cached prose
  streams in, voluntary, never interrupting, never expiring. Alarms
  interrupt; ledgers wait. (One new law, zero conflicts.)
- **The torpedo brain's pool machinery** — the survey probe is literally
  a torpedo that photographs instead of detonating: pooled projectile,
  ballistic flight, gravity bend, arrival event. The launch-to-arrival
  skeleton is shipped code (PdcRounds/torpedo pools); the probe reuses
  the pattern, not a new system.
- **The bench method** — textures.html → shipyard.html → radar.html
  proved the judging pattern: every contested design gets a standalone
  page where options MOVE and Tirtha rules with his eyes. The Deep's
  version is the most important one yet (5.4).
- **The Sound Law + danger law compose cleanly**: the Deep is ambient
  register everywhere — nothing engages the battle HUD past the rim.
  The contemplative mood is not a new rule; it is the Sound Law's
  quiet half, which already exists.

## 5.2 The performance contract (measured, not assumed)

Pass 4 asserted "generation needs 2–3 s worst case; hides inside the
jump comfortably." The audit (2026-08-08) lets us replace assertion with
arithmetic, and the arithmetic pushes back:

- The cold start measures **7.6–8.1 s of pure compute** — dominated by
  planet BAKES and shader warmup for the charted systems. A Deep jump
  must build a fresh system in the ~8–11 s cinematic **without missing
  vsync** — and we know from the billboard-freeze war that naive
  same-frame work produces exactly the freeze the Delight Line bans.
- The standing frame runs **vsync-locked with ~2.5× pixel headroom** —
  the budget exists, but it is a PER-FRAME budget. The law from the
  warmup discipline therefore applies wholesale: **staged everything.**
  Bake render-targets across cinematic frames (n ms per frame, never
  more), compileAsync before reveal, mount one body per frame. The
  transit cinematic is 500+ frames of cover; the Deep's generator must
  be written as a per-frame incremental machine from day one, not
  retrofitted into one.
- **Deep worlds get a bake tier**: rim systems never need the charted
  core's 2048 bakes on arrival — bake at 1024 during transit, upgrade
  in place during the arrival reveal's first quiet seconds if the
  visitor closes in. (Delight guard: upgrade must land before any
  approach could resolve the difference; the PlanetBoards 3× activation
  pattern is the precedent.)
- **VRAM discipline**: charted core keeps ~400 MB of bakes alive; Deep
  systems are one-at-a-time and DISPOSED on leave (already the streaming
  law) — the Deep adds no standing memory, ever.
- Acceptance test (write it before the generator): jump → arrival with
  worst frame ≤ 20 ms on the probe harness, ten seeds in a row. The
  harness rides that verified the ladder verify this the same way.

## 5.3 Fiction = infrastructure, applied to the new estate

- The probe's flight IS the survey pacing (pass 1) — and now also the
  rate limiter for the meaning layer (pass 1) — and now ALSO the reuse
  of the ballistic pool (5.1). One mechanic, three jobs. Law holds.
- THE LEDGER's fiction: the co-op's survey terminal — which is also
  exactly the CMS shape the Atlas pages server-render from. The panel
  the pilot reads and the page the recruiter lands on are one data
  structure wearing two faces (third-pass synthesis, now concrete).
- The transit-as-generation-window survives the audit numbers ONLY via
  staging (5.2) — fiction and architecture stay the same thing, but the
  architecture must be incremental to keep the promise.

## 5.4 The generator bench — deep.html (v0.05, before everything)

The July "immediate spike" matures into the bench pattern. Before any
3D, any backend, any LLM: **a standalone page that rolls seeds and shows
the truth about the dice.**

- Roll N=1,000 seeds → the achieved rarity distribution as a histogram
  against the pyramid targets (70 / 25 / 4.9 / 0.1 / anomaly) — the
  tuning dashboard for the dice.
- Any seed inspectable: the full fact sheet (founder, constraints,
  bauplan, history, niche graph) rendered as template prose — the
  oatmeal test in its rawest form.
- **An oatmeal METER**: pairwise similarity over fact-sheet features
  across the sample (bauplan class, energy basis, event types, niche
  shapes) — a number that says "your last 50 living worlds were 80%
  ocean-chemosynthetic; fix the dice." Kate Compton's law, instrumented.
- A side-by-side seed comparator (two fact sheets, spot the sameness) —
  the judging drill Tirtha already knows from every bench.
- Committed permanently like the others. The generator does not touch
  the game until its bench survives his eyes.

## 5.5 The completion gate and the launch story (the strategic frame)

Recorded decision (2026-08-08): the roadmap runs AS WRITTEN — THE HUNT,
debris storm, slag skeet, density/toys, liveness backend, achievements
verdict — and only then the Deep build begins, with total focus.
Exploration passes (like this one) are free anytime; code waits.

The marketing shape his instinct is pointing at, made explicit:

- **The completed portfolio is the launch platform, the Deep is the
  launch.** Ship the polished charted world quietly; the announcement
  moment is **First Survey (v0.2)** — the day the universe starts
  growing because strangers visit. "A portfolio that strangers expand"
  is a story tech media and timelines actually carry.
- The Atlas (pass 1) is the built-in distribution engine: every shared
  discovery link lands a reader inside the game at that system, and
  every generated page compounds the domain's SEO.
- **The engineering notes are recruiter bait by design**: the Deep is a
  production agentic-LLM pipeline (schema-forcing, graph-walking agent,
  caching, versioning, cost bounds, graceful degradation) running live —
  the 30-agents résumé line, demonstrated instead of claimed. Write the
  "HOW THE SURVEY WORKS" notes as part of v0.2, not after.
- Personal-brand cadence during the pre-Deep stretch: each remaining
  roadmap item is itself postable material (the scope's design trail,
  the voice law, the cert ladder's measured honesty). The marketing
  can start before the Deep does — the build diary is the content.

## 5.6 Revised phasing (only where it changed)

- **v0.05 — deep.html**: the generator bench (5.4). Pure TypeScript +
  templates. THE gate for everything after; can be built the week the
  portfolio completes, judged in an evening.
- v0.1 — The Rim: unchanged, plus the performance contract (5.2) as its
  acceptance test and the LEDGER panel in its simplest form.
- v0.2 — First Survey: unchanged, plus the engineering notes and the
  announcement moment (5.5).
- v0.3+ — unchanged (Atlas, small Nilaks, deep time).
