# THE TRACK — the rethink, exploration pass (2026-08-27, no code)

His verdict (2026-08-15): "way too hard for a newbie… rethink the
entire track thing." The exploration: full code audit (Opus explorer,
BeltRun.tsx + flight/gravity/HUD chain), the black-box trove, the
genre's lessons, and the fiction. Verdict first:

**The Track is not hard. It is impossible as taught, then rude about
it.** And nobody plays it: across 100 real sessions in the trove,
gunnery started 15 times, escort 14, the Sleet once — THE TRACK: ZERO.

## 1. THE CODE TRUTH (the impossible-as-taught math)

- The corridor coaches FULL BURN and delivers you to the start line at
  **520 u/s** — where the race kills your drive (drive-dark rule),
  leaving 33 u/s² of trim RCS. Turn radius = v²/a = **8,132 units**.
  The course's corners need **200–250 units**. You would have to enter
  at ~85 u/s — one-sixth of what the game just taught you to build.
- **A full-burn newbie cannot make gate 1 at all**: entering 21.4° off
  the first leg (the buoys aim at the START ring, not the race line),
  maximum strafe correction closes 204 of the 707-unit cross-track
  error. Residual miss ≈ 500 u against a 95 u gate. Not hard.
  Impossible.
- **Gates 1 and 3 are centered on solid rock** (they ride the moons
  Kaat/Veyu — the target is an annulus around a collidable sphere with
  its own gravity well). Because they orbit, the corner angles are not
  fixed: the G2 turn swings between **10° and 173°** depending on when
  you arrive. The course difficulty is a function of a moon's orbital
  phase.
- **Gate 2 sinks into the Jovian**: its position was baked at module
  load but the planet keeps orbiting — after ~25–30 minutes of page
  uptime the ring physically intersects the cloud tops.
- **The correct racing line can DNF you**: the abandon corridor is
  2,600 u from the next gate; the midpoint of the perfect straight
  line on the longest leg is 2,629 u out.
- A miss produces NO feedback — the gate waits silently until the
  10-second RUN ABANDONED timer. There is no restart control at all
  (desktop or touch); the only restart is re-crossing gate 0, which
  drive-dark makes impossible.
- **Phones cannot race, full stop**: the deck has no strafe input, and
  the race disables thrust — a phone's entire authority is the small
  REV button. The burn lock and speed bug keep pretending the drive
  works.
- **The slingshot fiction is physically inert**: our gravity is
  conservative and capped at surface strength — a well returns exactly
  the speed it takes. Max theoretical gain from a perfect moon assist:
  ~26 u/s. "Steal your speed from the giants" cannot be delivered by
  this physics.
- The camera looks down the NOSE — and drive-dark racing technique is
  pointing the nose away from travel, so flying correctly removes the
  next gate from your screen.
- Timing: one PAR (90s), one best time, no splits, no tiers, no board.
  Telemetry: none — no gate, DNF, or time events reach the black box.

## 2. THE TROVE TRUTH

Zero race starts in 13 days / 100 sessions. The farthest POI on the
chart (14.8K) with the least reason to go. Even if the course were
perfect, nothing pulls anyone there and nothing records what happens
to those who try.

## 3. THE GENRE'S LAWS (research)

- **TrackMania**: the retry loop IS the game — instant restart,
  checkpoints that never send you to zero, medal tiers instead of
  pass/fail. Its own community's verdict: badly placed checkpoints are
  the one thing that kills onboarding.
- **Star Wars Episode 1 Racer**: the developers cut their first track
  down when laps ran long, and rebuilt courses around what testers
  actually enjoyed. Build to the fun, not the map.
- **Superman 64 vs Pilotwings**: the ring-flying autopsy. Rings die
  when controls fight the player and a miss resets the section. Rings
  live when they are generous, misses cost time not runs, and
  difficulty layers by tier.

## 4. THE FICTION TRUTH

The Water Run — the racing club hauling raw ice, lap after lap,
through the Dry Weeks; the reason this colony has a racing club at
all — **appears nowhere in the venue.** The marquee sells "drive-dark
slingshot racing," a mechanic the physics cannot deliver, while the
one story that makes racing MEAN something sits unused in the docs.

## 5. THE PROPOSAL — THE WATER RUN

Kill the gimmick; land the fiction. The race becomes what the club
actually does: re-running the water route as sport.

1. **The drive stays lit.** Drive-dark dies. You race the ship you
   already know how to fly — the game's whole philosophy. This one
   change converts "impossible" into "learnable." (Drive-dark can
   return someday as a VETERAN class if the playtest asks.)
2. **The course rebuilt to the ship**: corners the real turn radius
   can fly at racing speed; gates on moon FLYBYS (offset rings ahead
   of the moon, never centered on rock); every gate parented to live
   positions so nothing ever sinks into a planet; the corridor and
   buoys aimed AT the first leg.
3. **The course teaches itself**: current gate world-scaled ring +
   NEXT gate ghost-marked; a faint breadcrumb line current→next (an
   honest instrument, not an arcade rail); camera keeps working
   because the nose now points where you fly.
4. **The forgiveness law**: a miss NEVER ends the run — turn back or
   eat +5s, pilot's choice; abandon radius computed per-leg so the
   racing line can't trip it; DEAD DRIFT gone; instant restart (R /
   a RESTART pill) at any moment.
5. **Three named times replace PAR**: THE KIDS' TIME (finish under
   90 — "kids from the Amnia run this in 90 flat" finally means
   something), THE CLUB TIME, THE SURVEYOR'S TIME (aspirational).
   Finishing at all writes YOU RAN THE ROUTE. The Jovian's BOARD
   shows the local bests live (backend makes it everyone's later).
6. **Gravity becomes the advanced line, honestly**: near the Jovian
   the pull is ~56 u/s² — nearly double the RCS. Flying low through
   a well BENDS your path for free: a real, physical cornering
   assist. The fast line dives the giants not for "stolen speed" but
   for stolen TURNING — which our physics actually delivers. Oso
   finally earns its "for the brave" flavor as the risk shortcut.
7. **Mobile races day one**: with the drive on, the existing deck
   (stick + hold-burn + lock) is the complete race kit. No new
   controls.
8. **Telemetry from birth**: race-start, per-gate splits, miss,
   DNF-reason, finish — all black-box events, so the next tuning
   pass reads data instead of guesses.
9. **The pull to come**: the docks board (or the chart) carries the
   posting — the reason to fly 14.8K. Cheap line, real traffic.

## 6. OPEN QUESTIONS FOR HIS RULING

1. Drive-dark: kill it outright (recommended) or keep as a veteran
   class behind the first finish?
2. The Water Run rename: the event at THE TRACK becomes "THE WATER
   RUN" with the Nilak line on the board — approved?
3. Course scale: same neighborhood (~90s laps) or shorter first lap
   (~45–60s, TrackMania-style density) with the long course as lap 2?
4. Miss penalty: turn-back-or-+5s (recommended) or pure turn-back?
5. Multi-lap: keep one lap, or 2–3 laps with per-lap splits?

---

# PASS 2 — THE COURSE, DESIGNED FROM THE PHYSICS (2026-08-27)

The drive-on cornering envelope (computed, not vibes):

| speed | R sustained burn | R under boost | R boost + Jovian dive |
|---|---|---|---|
| 200 | 286 u | 89 u | 79 u |
| 300 | 643 u | 201 u | 179 u |
| 400 | 1,143 u | 357 u | 317 u |
| 520 | 1,931 u | 604 u | 537 u |

Yaw rate never binds (worst case 1.5 rad/s vs the ship's 1.7). So:
corners of R 300–700 are honest racing corners — hard enough to
punish greed, soft enough that a newbie at 180 u/s clears everything
on the sustained burn alone.

**The tier miracle:** one loop of ~16,500–17,000 u gives 90 s at a
newbie's 180 u/s average, 65 s at a club 260, 50 s at a surveyor's
340. Three named times, one course, zero artificial handicaps —
difficulty IS average speed, which is exactly what racing is.

## The loop (8 gates, closed circuit — laps become possible)

All gates PARENTED TO LIVE BODIES (an offset in the body's frame —
nothing can ever sink into a planet again; moon gates LEAD their moon
by a fixed orbital angle so the ring is always in clean space beside
the rock, never centered on it):

1. **START/FINISH** — a straight near the staging corridor, corridor
   and buoys re-aimed AT the first leg (the 21° lie dies). Rolling
   start: the clock starts at the ring, full burn legal and correct.
2. **G1 — KAAT FLYBY**: ring offset ~150 u ahead of Kaat on its
   orbit, angled tangent — you sweep past the rock, never through
   its bullseye. Corner ≈ 70°, R ≈ 500: sustained-burn friendly.
3. **G2 — THE HIGH BOARD**: 500 u above the Jovian, the dive's entry
   gate. Long approach sweeper — the breathing leg.
4. **G3 — THE DIVE**: low over the cloud tops (~250 u alt, generous
   ring). Here the giant's 56 u/s² does free cornering: the low line
   holds boost through the turn (R 537 at full 520!) while the
   cautious high line survives at sustained speeds. THE advanced
   line, physically honest — you steal TURNING, not speed.
5. **G4 — VEYU FLYBY**: mirror of G1 on the far moon.
6. **G5 — THE OSO NEEDLE**: the ring sits close beside Oso ("hazard
   and free boost for the brave" finally cashes in): the tight line
   shaves ~600 u past the rock, the wide line is safe and slower.
   Ring 80 u — the one deliberately snug gate, still bigger than
   anything the old course honestly offered.
7. **G6 — THE RETURN SWEEP**: a wide 120° banking corner (R ~700)
   lining you back up the home straight.
8. **FINISH = START ring** — the loop closes; lap 2 is one ruling
   away.

Ring sizes: START/FINISH 120, standard gates 95 (generous at proper
approach speeds), the Needle 80. The visual ring and the hit test
stay identical (the one thing the old build got right).

## What dies with the old course
Drive-lock and its RCS-only trim; the DEAD DRIFT rule; the baked
static gates; the fixed 2,600 abandon radius (replaced per-leg:
max-midline-distance + 600 margin); the aim-wrong buoys; the
"slingshot" copy.

---

# PASS 3 — THE CEREMONY, THE BOARD, THE PULL (2026-08-27)

Racing needs a reason, a ritual, and a record. The fiction supplies
all three; the build just has to say them.

## The name and the dressing
- The venue stays **THE TRACK**; the event is **THE WATER RUN**.
- Marquee: `THE WATER RUN · THE CLUB RUNS SO SHE'S NEVER DRY`.
- Race Control board keeps its operational tone; **THE BOARD** on the
  Jovian becomes a LIVE record wall: BEST, LAST RUN, and the three
  named times — local numbers now, everyone's when the backend lands
  (the same kill-board pattern, third instance).
- The Nilak line, at last, where it belongs — on the board:
  `IN THE DRY WEEKS THE CLUB RAN ICE, LAP AFTER LAP. NOW THEY RUN
  FOR TIME. NO SHIP LEAVES THE DRIFT DRY.`

## The three named times (finish beats)
- Finish at all → `YOU RAN THE ROUTE` (and it is written: the board's
  LAST RUN line updates — every finisher marks the wall).
- Under 90 → **THE KIDS' TIME** ("kids from the Amnia run this in 90
  flat" stops being a taunt and becomes a rung).
- Under 65 → **THE CLUB TIME** (fanfare).
- Under 50 → **THE SURVEYOR'S TIME** (the record beat: full fanfare,
  the board headline). Tuned after the build against real laps —
  the tiers ship provisional and the black box calibrates them.

## The forgiveness grammar (from pass 1, made concrete)
- Miss a gate → the ring flashes amber, one line: `MISSED — CIRCLE
  BACK, OR TAKE +5S`; five seconds later it auto-yields and the +5
  lands on the clock. The run NEVER dies from a miss.
- `RESTART` — R on desktop, a pill on touch — any time, instant,
  back at staging with the clock armed. The TrackMania loop.
- DNF only by leaving (per-leg corridor) or warping out; both say so
  plainly and neither shames.

## The teaching (first visit only)
Three coach lines, once: `FOLLOW THE RINGS`, `MISSES COST TIME — NOT
RUNS`, `THE LOW LINE PAST THE GIANT IS FASTER. AND MEANER.` Then the
course teaches itself (next-gate ghost marker + breadcrumb line).

## The pull (fixing ZERO plays)
- A standing docks-board row: `THE WATER RUN · POST A TIME · THE
  TRACK`, same grammar as the Khione row.
- The chart row for The Track gains the sub-line `THE WATER RUN`.
- Post-finish, one toast: `THE BOARD REMEMBERS — RUN IT AGAIN?`

## Telemetry from birth (the black box schema)
`race-start` · `race-gate {i, split}` · `race-miss {i}` ·
`race-dnf {reason, gate}` · `race-finish {time, tier}` — the next
tuning pass reads splits, not guesses. (Also fixes the trove's
blindness: today a race leaves no trace at all.)

## Later, explicitly parked
- **THE GHOST** — record the best run's path locally, replay it as a
  faint marker to chase. The single biggest solo-racing multiplier;
  v1.5 after the playtest rules on the base loop.
- Multi-lap ruling (open question 5), backend times, the Water Run
  ice-catching tie-in from the Sleet exploration.

---

# BUILT — THE WATER RUN (2026-08-27, his GO on all recommendations)

BeltRun.tsx is dead; `src/scene/activities/WaterRun.tsx` replaces it.
Everything from the three passes, machine-verified live:

- **The drive stays lit.** driveLock/flightAssist untouched by racing.
- **Eight-gate closed loop**, every gate computed from live orbits with
  the same angle formula StarSystem uses (nothing can desync or sink):
  START → Kaat flyby (the ring LEADS the moon by 200 u along its
  motion) → the High Board → THE DIVE (low past the Jovian) → Veyu
  flyby → the Oso Needle (aperture 80) → the return sweep → FINISH at
  the start ring.
- **The corridor re-aimed down the first leg** (staging moved;
  TRACK_POI updated) — the 21° lie is dead.
- **Misses forgive**: off-aperture plane crossing → MISSED — CIRCLE
  BACK, OR TAKE +5S; clean re-cross clears it; after 5 s the penalty
  lands and the race moves on. Verified: "11.8S (+5)" with the target
  advanced. The run NEVER dies from a miss.
- **Per-leg corridor** max(2600, legLen×1.15): the racing line cannot
  DNF. DEAD DRIFT deleted.
- **Instant restart**: R on desktop, the RESTART pill on touch (pill
  label now comes from activityState.restartLabel).
- **Three named times**: KIDS 90 · CLUB 65 · SURVEYOR 50
  (provisional — the black box calibrates them from real laps).
  Every finisher writes THE BOARD — a live record wall at staging
  (BEST / LAST RUN / the tiers / the Dry Weeks line), kill-board
  pattern.
- **Guidance**: next-gate marker as before, plus a faint GHOST ring on
  the gate after next and a dashed breadcrumb line between them.
- **Telemetry from birth**: race-start / race-gate splits / race-miss /
  race-dnf / race-finish{time, tier} into the black box.
- **The pull**: a standing docks-board row — THE WATER RUN · POST A
  TIME · THE TRACK (board grew to five rows); all venue copy sheds
  drive-dark and wears the Dry Weeks fiction.
- **Coach**: three lines, once ever — FOLLOW THE RINGS / MISSES COST
  TIME, NOT RUNS / THE LOW LINE PAST THE GIANT IS FASTER. AND MEANER.

Verified end-to-end in the harness: a full programmatic lap (start →
gates 1-6 → FINISH → "THE SURVEYOR'S TIME · NEW BEST" stored), the
miss-and-yield flow, restart, the staging venue with THE BOARD.
Test-record keys cleared after verification. Real lap times are HIS
to set — the tiers await his flying.

## Post-ship fix (2026-08-31): the restart keys were flight keys

Tirtha's first real laps all died seconds in — "the timer ends and I'm
asked to restart before the first ring." Telemetry showed every DNF was
`reason: restart` at gate 1. Two key collisions:

- **R restarted the run — but R is pitch-up** (useShipControls). Racing
  pitch inputs were killing runs.
- **GunneryRange's global Space listener** fired `restartRequest` for ANY
  activity with `canRestart` — and Space is the railgun trigger.

Fix: restart is **Backspace** (TrackMania's key, collides with nothing);
the gunnery listener is scoped to `owner === 'gunnery'`; a `⌫ RESTART`
hint shows in the panel after a finished run (desktop only — touch has
the pill). Lesson recorded: any new activity keybinding must be checked
against the flight map (W/A/S/D/R/F/Q/E/X/N/G/H/Space/Shift are taken).

## Post-ship ruling (2026-08-31): a miss only moves the clock

His first flyable laps: gates come fast, misses are easy, and the +5s
auto-yield plus the corridor abandon still felt like being sent back to
the start. Ruling: **"if I miss a ring, I can come back and complete
it. Nothing changes — only the timer."**

So the punishment apparatus is gone: no +5s penalty, no miss window, no
RUN ABANDONED. A missed gate stays the target until rolled (amber ring,
one callout, wider 1400u detection); far off the leg you get THE COURSE
IS BEHIND YOU as a reminder, never an ending. A run now ends three ways
only: the finish ring, Backspace/the pill, or warping out. The clock is
the only judge.
