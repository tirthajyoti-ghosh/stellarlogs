# The Neighborhood — density, toys, and the space between (pass 1, 2026-08-09)

The density-and-toys pass, plus Tirtha's two additions from the voice
note that opened it: the stumble-upon dormant torpedoes, and the starmap
losing its tabletop flatness. Bruno's rule governs throughout: content
bunched, sport sprawls — one toy, one secret, one liveness surface
within ~20 s of every arrival.

## 1. THE SLEEPING SPREAD (Tirtha's addition — the plot closes its circle)

Every torpedo fiction in the game rests on one claim: the lanes are
seeded with sleeping ordnance. The player has seen consequences only.
Scattering ACTUAL dormant torpedoes makes the claim physical — find one
and every raid you ever survived reorganizes: they were always here.

- **Show-only, by law.** A separate module (SleepingSpread.tsx), own
  instanced pool, no brain, no code shared with combat ordnance. The
  gameplay torpedo systems are NOT touched (his explicit constraint).
- **The find**: 10–14 seeded across all systems — belt edges, off lane
  approaches, dark water. The real torpedo hull, cold, tumbling dead
  slow. No label, no marker: found with eyes or not at all.
- **The show**: rarely (proximity + long dice, minutes apart at most)
  one WAKES: launch-flash grammar, hard burn toward the Drift or lane
  traffic, shrinks to a spark, despawns. NEVER toward the player, never
  targetable, no threat marker, no banner (show-don't-tell law). Danger
  law: first motion lateral, away from the player's line — "you are not
  my errand."
- Cost: near zero. Hull, plume, flash all exist.

## 2. The toy layer — inventory

| Place | Toy | Secret | Liveness surface (sign built NOW, number wired in roadmap #4) |
|---|---|---|---|
| The Drift | spilled cargo field to plow (crates.glb exists) | cantina jukebox + "NOW PLAYING" toast | militia kill-board: TORPEDOES DOWNED |
| Nilak wreck | — (vigil stays sacred) | the bell: one deep toll | candle vigil frame (candles lit, forever) |
| Gunnery range | SLAG SKEET: mass driver hurls smelter slag | instructor's chalkboard up close | best-round tote on the tower |
| The Track | racing is the toy | wrecked racer on the far bend | daily top-10 tote at the line |
| Projects / Work / rest | — | one find each: derelict probe, graffiti rock, a sleeping torpedo (the spread double-duties as the secret layer) | — |

**Debris storm over the Drift** is the pass finale: a rock shower, the
player's PDCs flying civil defense over the colony — no enemy at all.
Clock-synced "storm hour" waits for the backend.

Painted signs with static numbers now = the liveness backend (#4) pours
live values into frames the world already owns.

## 3. THE STARMAP LIFT (spread + off-plane + inert stars)

- **Lift and spread**: redistribute existing systems with real vertical
  separation (±1500–3000 Y), total travel scale held similar. Systems
  move WHOLE with their POIs; needs a full verification sweep (warp
  align, labels, activity-local geometry).
- **Inert stars**: 4–6 minor systems between and off-plane — red dwarf,
  white dwarf, dim binary, brown dwarf. No boards, no jobs, 0–2 barren
  planets. Mass and light where the map was empty.
- **The Deep tie (the answer to "maybe used for something else")**:
  label them **UNSURVEYED**. One word, three jobs — explains their
  emptiness fiction-true, plants the Deep's central verb early, and
  pre-positions the survey frontier's first systems. Decorative today,
  load-bearing later.
- **Bench first**: permanent starmap.html — current vs proposed layout,
  orbitable 3D, judged by eye before the world moves.

## 4. Build order (pending Tirtha's sign-off)

1. starmap.html bench → judgment → the lift + inert stars.
2. THE SLEEPING SPREAD.
3. Slag skeet (proves the toy pattern).
4. Drift toys: cargo field, jukebox, sign frames.
5. Nilak bell + vigil frame.
6. Debris storm (finale; hands off to the liveness backend).


## Build log

- **2026-08-09 · THE SLEEPING SPREAD shipped** — 12 (now 17 with the inert
  stars) dormant hulls, per-session scatter, wake theater harness-verified.
- **2026-08-09 · THE STARMAP LIFT shipped** — starmap.html verdict applied:
  all systems lifted off the tabletop (Y ±3400), the Track re-seated with
  its POI and race locals riding the one SYSTEM constant, five inert stars
  live (KHIONE, SALT, EMBER, HARROW, VESTIGE — labels read UNSURVEYED,
  no boards, and their star lights are gated off: five more infinite-range
  lights would tax every fragment to illuminate nothing). Harness: label
  truth at new seats, hunt/board regression, console clean. One catch fixed
  pre-ship: the sleeper pool was hardcoded at 16 and the five new systems'
  sleepers overflowed it — pools now size from the scatter.
- **2026-08-09 · SLAG SKEET shipped** — the toy layer's test case: a
  smelter mass driver west of the range lobs still-cooling slag (rock
  variant + ember-glow material) across the line; your PDCs eat what you
  fly well for. Auto-starts on entry, yields to any real job, never harms
  the hull, coil-flash tell instead of banners, STREAK/BEST/HITS on the
  panel and a painted BEST STREAK tote on the rig (localStorage). The
  range-degraded gun solution IS the difficulty dial: distance makes the
  clays safe, closing makes them killable — parked play measured 4 hits
  in 40 s with streak resets; flying beats it. New POI label: SLAG SKEET
  · "the range's off-duty game".
- **NEXT: THE SCORE** (Tirtha, 2026-08-09: "music has been absent… we need
  thinking on that front") — exploration pass + listening bench (score.html):
  CC-sourced beds vs generative WebAudio layers, adaptive by game state
  (nav / gauntlet / lock / outcome), Sound-Law-compliant. Then slag skeet
  and the remaining toys.


## The skeet verdict — RETIRED, and the law it taught (2026-08-09)

Tirtha's read: "I don't know what a slag or a skeet is… I don't know what
that machine is supposed to be… why is it even there?" Total legibility
failure, pulled from the sky same day. The diagnosis, kept as law:

1. **Plain-language law covers NAMES.** If an activity's name needs a
   footnote (slag, skeet), it failed the five-second read.
2. **THE BORROWED-BODY LAW: a toy must borrow its body from something
   already standing.** The jukebox works because the Drift exists; the
   bell works because the wreck exists. The mass driver referenced a
   smelter that exists nowhere — fiction floating in vacuum. Never invent
   new industry to justify a diversion.
3. Primitive-built machines read as programmer art — the asset bar
   applies to toys too.
4. An unexplained thrower reads as an attack, not a sport.

Replacement options presented (his ruling pending):
- **A (recommended): OPEN GUNS at the range tower** — linger on the range
  outside a drill and the tower lobs its own practice buoys (the cert's
  existing asset). "TOWER'S THROWING — GUNS FREE." Streak/best painted on
  the tower. Zero new fiction, zero new assets.
- **B**: skip standalone shooting toys; the debris storm (civil defense)
  is the legible gun-toy.
- C (killed): build a real smelter to justify the launcher — facility-
  scale cost for a minigame.

Same session: spread tuned (content −10%, inert stars OUT to the 12–16k
rim per "the unsurveyed ones are the Deep's business"), and the Projects/
Work belts — found floating at pre-lift seats — rejoined their stars.


- **2026-08-12 · THE DRIFT BATCH shipped** — the toys-and-secrets sweep:
  - **THE SPILL FIELD**: 26 real containers (crates.glb) drifting off the
    Drift approach; plow through and they shoulder aside (real pushes,
    no damage, whisper-weak drift home so the field re-forms). POI:
    CARGO SPILL · "salvage disputed — mind your hull".
  - **THE VIGIL**: the Nilak's bell on a stanchion off her hull — G rings
    one somber toll (new bronze-partial audio), lights one candle,
    forever (localStorage; the backend will make it everyone's). Candle
    sill renders every candle ever lit. Once per approach; a vigil is
    not a toy. Bug caught by harness: G at the bell also accepted
    escorts (the board's 620u range reaches the wreck) — the vigil now
    claims G while you stand at it.
  - **THE MILITIA KILL-BOARD**: painted at the docks under the jobs
    board — TORPEDOES DOWNED, an HONEST number (wired into both real
    PDC kill sites, localStorage), backend-ready frame.
  - **SMALL SECRETS**: BLT-0925 — a burned-out Rocinante-class on the
    Track's far bend ("she dared the wells too deep"); SURVEY PROBE 7
    dead at the edge of Projects ("dead since the first charts" — the
    Deep's quietest foreshadow).
  Remaining in the pass: THE SCORE exploration, the debris storm
  (PDC-only), mobile landscape.

- **2026-08-12 · THE HEADLIGHT shipped** — one real computed spotlight on
  the bow, always burning (billboard law: light computed, never painted;
  no beam — nothing to scatter in vacuum), with a visible hot lens as
  the source. Throw tuned to reveal a dead hull at ~100m and read on
  crates at close plow range. BLT-0925 also gains her own faded
  grey-green livery — another club's boat, not the player's mirror.
  Spill-field purpose + the serious vigil redesign (held G, ducked
  world, crew manifest, hull-rings-the-toll physics) recorded in
  conversation — vigil rework awaiting Tirtha's ruling on the proposal.

- **2026-08-12 · THE VIGIL v2 shipped — the Gamarra pattern (HIS ruling).**
  Tirtha overturned my hull-and-bell proposal with the show's own idiom:
  the Augustín Gamarra memorial on Lovell Station, Luna ("in memory of
  the 516 souls lost" — researched at his ask). Built exactly to his
  sketch: a moored platform off the wreck; four projector pedestals with
  hot lenses; a hologram of the NILAK HERSELF (nilak.glb, whole again)
  standing vertical on her drive — fresnel-alpha shader, scanlines,
  flicker, translucent cyan; her 26 crew's NAMES revolving slowly around
  her; a lower ring of holographic candles, one per candle ever lit;
  plates: IN MEMORY OF THE 26 SOULS OF THE MV NILAK / SHE CARRIED WATER.
  G (once per approach) lights YOUR candle bright at the deck — it
  climbs ~5.5s and joins the revolving ring. No banner; you watch it
  join. One soft toll kept as the audio cue. The bronze bell prop and
  candle sill retired with the redesign.
  Build lesson (hard-won): Wreck.tsx re-parents the cached GLTF scene's
  hull/pod nodes via <primitive> — nilak.scene is EMPTY afterward, so
  the holo must clone off gltf.nodes, not the scene. Symptom was a
  ship-less memorial (only beams rendered) that survived five shader
  tunes before the debug-solid pass exposed it.

- **2026-08-12 · CARGO SPILLS everywhere (his call: "a working system
  drops cargo on every lane").** DriftSpill generalized to CargoSpills:
  five seeded fields — the Drift's grown to 40 crates, plus the
  Projects↔Work lane (32), the Blog approach (22), the Travel approach
  (28), Reading's quiet side (20). Same toy law everywhere: plow, no
  damage, whisper-drift re-forms. Each field sleeps beyond earshot.
  ROADMAP seed (his idea): a retrieval mission — search the containers,
  find the one that matters — explores later, on the liveness backend.

- **2026-08-12 · Headlight fixture seated.** His read: cone on target
  perfect, but the lens hovered like "a tiny sun in front of the ship".
  The lamp now sits in a cowl on a saddle buried in the bow plating at
  the nose tip (verified from three camera-orbit angles: hull-mounted,
  no gap). Spotlight params untouched — the approved throw is sacred.

- **2026-08-12 · VIGIL v2.1 — his live read, four rulings, all shipped:**
  1. **THE WRECK IS GONE.** His fiction ruling: "the ship would be
     scrapped for parts anyways" — a colony wastes nothing. Wreck.tsx
     deleted (hull, severed pod, militia buoy, colliders, REMEMBER THE
     NILAK label). WRECK_POI stays as THE NILAK SITE — where she died;
     the memorial is all that stands. Radar blip and hunt anchors
     retarget with it, untouched.
  2. **The memorial LIFTED off the traffic plane** (site now y +100,
     ~130 above the Drift's plane) — it was tangling with the station
     silhouette from the docks ("the hologram is appearing behind the
     drift station"). Verified from his vantage: she stands alone
     against dark sky.
  3. **Projector shafts removed** — his call, the billboard/headlight
     law extended to holograms: fixtures may glow, nothing scatters in
     vacuum, the hologram itself is the only projected light you see.
  4. **The names became gravestones**: each crew member now carries a
     line their people left ("DA — THE TOMATOES CAME UP", "WE STILL SET
     YOUR PLACE, ANJUSHKA", "TILL THE WATER COMES BACK ROUND, LOVE") —
     bright name, dim epitaph, revolving together.

- **2026-08-13 · VIGIL v2.2 — his second live read:**
  1. **THE DEPTH LIE fixed.** His screenshots: the hologram rendered
     "behind" the Drift rock and the Projects star — objects thousands
     of units away reading as nearer than a memorial 40m off the bow.
     Root cause was not sorting: the holo body was ~30% opaque, so any
     bright background (the star's HDR halo sprite is radius×7) punched
     straight through and won the perception fight. Fix: a DENSE
     hologram — body alpha ~0.74–1.0 (fresnel to full at the rims,
     scan-modulated) so she genuinely occludes what's behind her. Only
     the star's HDR core still blooms over her tip, which is what a
     bright light behind a mast really does.
  2. **42 souls now, drive to bow.** Manifest grew from 26 with the
     count on the plate computed from the list; new lines span serious /
     sad / funny per his ask ("BORN ON CERES · DIED CARRYING WATER",
     "HE NEVER LOST AT CARDS. WE CHECKED", "SHE WAS GOING TO SEE EARTH
     IN SPRING"). Fonts a notch smaller; orbit a smidge faster
     (0.035 → 0.05 rad/s).
  3. **THE DOCK WAVE** (his macOS-dock sketch): a cone from the ship's
     nose to the column's heart; names revolving through it swell to
     ~2.9× with smoothstep-over-angle (the spatial wave) plus per-frame
     lerp (the temporal ease), settle back as they leave. The cone ENDS
     at the hologram — the mirrored far side stays small. Active only
     inside ~280m, ramping in as you close. Verified live: two frames
     7s apart show different name-sets swollen as the ring turns.

- **2026-08-13 · VIGIL v2.3 — THE HOLOGRAM LEARNS DEPTH (his third
  read: "the depth part is not fixed at all… we need a proper fix…
  research more").** Researched how games do it; the answer is the
  Z-prepass (Unity's transparent depth prepass / DepthOnly pass). But
  implementing it exposed the REAL root cause, live all along:
  **the app renders with `logarithmicDepthBuffer: true`, and the holo's
  custom ShaderMaterial never included three's logdepth chunks — it was
  writing plain-z depth into a log-encoded depth buffer.** Garbage
  depth versus every built-in material: that was the clipping against
  the station, and why density alone could never fix perception.
  Shipped fix, now the reference for every future custom shader:
  1. logdepth chunks in both shader stages + MeshBasic's exact
     transform order (`modelViewMatrix × p`, then projection);
  2. Z-PREPASS: a colorWrite-off clone of her hull in the opaque queue
     at renderOrder 1 — interior faces culled (single clean shell),
     the star's giant additive halo depth-culled behind her, far-side
     name cards hidden by her own body;
  3. shell alpha relaxed back to glassy (0.52–1.0, fresnel-weighted) —
     translucent against opaque backgrounds, never outshone;
  4. HIS CARDS: each gravestone on a translucent dark glass pane with
     a faint holo edge — legible text, unmistakably projected.
  Verified from all three torture angles: south (hull+cards), the
  Projects star dead behind her (hull cuts a dark silhouette INTO the
  glow), the Drift rock behind her (memorial reads cleanly in front).
  The law is recorded in memory (stellarlogs-3d-architecture).

- **2026-08-13 · THE MEMORIAL BOARD — the story gets a billboard (his
  ask: "more fiction… a sub-part we haven't explored").** The floating
  plates retired; a real house billboard (lamp-lit panel, accent frame,
  station-keeping jets, slews to face the pilot) stands off the
  platform's edge at [-30, 20, 0]. NEW FICTION SEAMS opened, all
  extrapolated from standing canon:
  - **THE DRY WEEKS** — eleven days the Drift lived on dregs and
    reclaimer steam after she fell: the tragedy's aftermath, never
    told until now.
  - **THE WATER RUN** — the racing club stripped their hulls for
    tankage and ran raw ice from the outer wells until the reserve
    came back; the club's opening lap carries the name to this day.
    (Racing ↔ tragedy, joined; usable later at the Track.)
  - **YOU ARE STANDING ON HER** — where the scrap went: her plates
    deck the platform, her tanks hold the Drift's reserve. The
    memorial is literally built of her.
  - **NO SHIP LEAVES THE DRIFT DRY** — the custom the loss created.
  Board carries SHE CARRIED WATER as the masthead, the 42-souls
  dedication, and the live CANDLES LIT counter.
