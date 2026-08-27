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
