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
- **NEXT: THE SCORE** (Tirtha, 2026-08-09: "music has been absent… we need
  thinking on that front") — exploration pass + listening bench (score.html):
  CC-sourced beds vs generative WebAudio layers, adaptive by game state
  (nav / gauntlet / lock / outcome), Sound-Law-compliant. Then slag skeet
  and the remaining toys.
