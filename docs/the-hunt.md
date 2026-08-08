# THE HUNT — the standing chase, the script, and the third lesson

*Exploration pass 1, 2026-08-08. Method as the-deep.md / the-scope.md:
fiction first, then the script, then a consistency audit against every
law the game runs on. No code this pass. Companion to roadmap F.3.*

## 1. The standing situation — who the Draugr is

One boat. Always the same boat. The lane's chronic ghost.

The Draugr is not a faction or a spawner of "pirate encounters" — she is
a single named hull with a history this world accumulates, exactly like
the Nilak has a history. Nobody ever sees her crew, hears her voice, or
learns her story beyond what her behavior tells (no NPCs, no dialogue —
the story-layer laws hold). She IS her conduct: she seeds the dark with
dormant torpedoes, marks the fat cargoes, takes what the lane doesn't
defend, and runs the moment anything armed turns toward her.

**Why she is never gone for good — the disarmament sentence.** A rock
that can barely feed itself keeps no prisons. Belter justice on the
Amnia is practical: when a raider strikes her transponder, the militia
tug tows her to a cold berth, strips her ordnance and her charts, and
turns her loose — because holding her costs water and air, and because
out here everyone is two bad months from her side of the ledger. The
sentence is disarmament and the long humiliation of the record. So she
comes back — rearmed from somewhere, patient as vacuum — and the lane's
war stays what our fiction needs it to be: a STANDING situation, never
a solved one. Suppression, not victory. The militia certifies gunners
BECAUSE she returns; every hunt makes the world's premise truer.

**The record is the reward.** No bounty, no economy — the game has
none and needs none. What an interdiction earns is a LINE: the militia
board's tally climbs (`DRAUGR — INTERDICTED ×4 · LAST: <callsign>`),
and later the pilot's logbook stamps it. The memory theme pays again:
being remembered is earned by what you contribute to the shared record.
Her escapes are counted too. The lane remembers both directions.

## 2. The third lesson — why the Hunt exists in the arc

The game teaches flying in three movements, each one activity:

1. **The cert taught the guns** — sit, watch, learn that flying is
   your job (W1's instructor says it out loud).
2. **The escort taught position** — you are the shield's position;
   keep the red dashes at zero.
3. **The hunt teaches CLOSURE** — the hardest Newtonian idea: matching
   velocity with something that doesn't want you to. Every newcomer
   who screams past her at +300 relative and watches her break away
   learns the flip-and-burn in their bones — not as station theater,
   but as the thing you must do to CATCH SOMETHING. The jump drive
   demonstrated it; the hunt makes you fly it.

That is the design's spine: **the win condition is a solved rendezvous
problem, against an adversary.** Everything else decorates it.

## 3. The script — beats and machine

The escort's script is simple because the freighter cooperates. The
hunt's script is her BEHAVIOR STATE MACHINE plus yours. Written as the
job machine it will be:

**POSTED** *(exists today)* — a successful escort posts `INTERDICTION
POSTED · DRAUGR · LAST BEARING nnn°` on the AMNIA DOCKS board for a
~5-minute window. Consent law: accepted at the board, G / tap, nowhere
else.

**THE COLD TRAIL** — on accept, she is seeded from truth: her finale
reveal position, fleeing along her escape bearing, with a head start
that grew while you dawdled at the board (a real cost, gently taught:
`SHE HAS n KM ON YOU`). HUD gives a bearing and a closure readout in
plain words: `CLOSING 84 M/S` / `FALLING BEHIND`. The scope shows her
as a hostile ship glyph — the game's only one.

**THE CHASE (her: FLEE)** — she runs at hard burn, slower than your
ceiling (catchable by physics, not by rubber-banding — her 420 to your
520), but she does not run straight: evasive doglegs on a 15–25 s
cadence, flown by the torpedo brain's steering with a flee-target
(the brain generalizes: she is a big torpedo whose target is AWAY).
Overshoot is the teacher: pass her with too much relative velocity and
she breaks perpendicular during your flip — you trade hundreds of units
back. Closure discipline, not top speed, closes the gap.

**HER TEETH (her: FLEE, armed)** — she fires DARK RUNNERS back down
her wake: the torpedo class reserved since the brain shipped — drive
cuts midcourse, the scope's stem fades to the hollow ×, silence, then
terminal relight closer than comfort. The ghost-track glyph, designed
in the scope's first pass, wires in HERE. Cadence ramps as you close
(a cornered boat spends her magazine). Sound Law: this is your
contract — her birds are loud, the ambient lane behind you stays
silent fireworks.

**THE CORNER (her: DESPERATE, inside ~800 u)** — harder jinks, tighter
salvos, her drive flaring irregular. Your guns hold their fire solution
on her hull the moment she is inside your ring — and never fire. The
PDC ring completes its fiction here: it was defense reach on the
escort; on the hunt it is BOARDING-THREAT reach. The gun to the head
is the win condition; the shot never comes. (You-are-not-the-gun,
preserved at the climax.)

**THE SQUAWK (her: COWED)** — hold her inside the ring with matched
velocity for a cumulative lock (order of 8 s). Her salvos stop — a
held breath, two, three — then: `TARGET SQUAWKING SURRENDER — MILITIA
TUG INBOUND`. The lock is the scope's job: her glyph rings with a
closing arc as the hold accumulates, breaks if she slips the ring.

**THE TOW (resolution)** — a militia tug (lane-ship machinery reused:
one more hull class on one more track) burns out from the Drift,
latches, and takes her dark-engined toward the cold berth. Fully
diegetic, no camera theft; you can watch or leave. The board updates
the tally; the job ends where you float. The lane resumes around you.

**FAILURE MODES** (lane law: no punishment, the world just continues)
- **She opens the gap**: fall behind beyond ~4 km for a sustained
  window and she goes dark for good — `SHE'S GONE DARK — THE LANE
  REMEMBERS`. Board tallies an escape.
- **Your hull fails**: the standard death, her birds earned it.
- **Abandon**: turn for home; the same grace-countdown pattern as the
  convoy (hysteresis and hold-band included by construction now).

## 4. Consistency audit — every law, checked

- **Standing situation, no quests**: she recurs by sentence-fiction;
  the interdiction is a repeating JOB the world posts, not a campaign
  chapter. ✓
- **Consent everywhere**: board-accepted, G to take. ✓
- **Sound Law**: your contract is loud; ambient stays silent; the tug
  procedure is visible-quiet like all militia work. ✓
- **You are not the gun**: the guns threaten, defend, and never decide
  the outcome — position and persistence do. The climax is a held
  solution, not a kill. ✓
- **Combat situational, not drill-shaped**: no arena, no waves — a
  pursuit across open dark that starts from the last raid's real
  geometry. ✓
- **Physics, not theater**: she is catchable by delta-v arithmetic;
  overshoot punishes by momentum, not by script. Her jinks are brain
  steering, not canned animation. ✓
- **Plain HUD**: closing/falling-behind in words, bearings in degrees,
  nothing nautical. ✓
- **The memory theme**: tallies with callsigns on the militia board;
  her escapes counted; later, logbook stamps. ✓
- **No NPCs/voices**: she never speaks. The squawk is a transponder
  state, the tug is a hull doing a job. ✓

## 5. The estate it reuses (why this is 2–3 sessions, not 6)

- **Her flight** = torpedoBrain steering with a flee-target + dogleg
  scheduler (the dogleg machinery exists).
- **DARK RUNNERS** = the reserved class: the brain needs one new state
  (drive-cut window), the scope's ghost glyph is already drawn.
- **The tug** = lane-ship machinery (spawn, track, dock-at-target).
- **The lock** = ring test (scope already computes it) + a hold timer.
- **Banners/coach** = THE VOICE tiers; chase coach lines are T-hint
  material ("TOO FAST — YOU'LL OVERSHOOT", plain-language law).
- **The board posting** already ships; the 5-minute window exists.

## 6. Tuning sketch (build-session numbers, to be measured like the ladder)

Her cruise 420 · dogleg cadence 15–25 s · dark-runner salvos: 1–2 birds
per 20–30 s, ramping ×2 inside 800 u · head start 1.2 km + 15 u/s of
board-dawdle · lock: cumulative 8 s inside the ring at relative speed
< 60 · escape: >4 km behind for 12 s · target chase length 2–4 minutes
from a clean accept. All of it verified on the harness the way the
ladder was: scripted pursuit runs, measured outcomes, acceptance law
("a pilot who never learns to brake cannot take her; one clean
flip-and-burn intercept does").

## 7. Open decisions for Tirtha

1. **The disarmament sentence** as her recurrence fiction — approve?
2. **Does SHE run dark in v1?** (Drive-dark coasts that break your
   track — the deepest version of the chase, and the scope's ship-glyph
   uncertainty. Recommend: v2. Her torpedoes ghost in v1; she stays
   trackable.)
3. **Lock feel**: cumulative 8 s inside the ring — or continuous 5 s
   (harsher, breaks on any slip)?
4. **The tally surface for v1**: militia board line only, or also a
   painted kill-board at the range? (Logbook waits for achievements.)
5. **Chase length target**: 2–4 minutes right? (Longer = more epic,
   more dead time; the Bruno 20-second law watches us.)
6. Her name history: does the board show her full record (`INTERDICTED
   ×4 · ESCAPED ×2`) — the lane's memory made public — or just the
   posting? (Recommend: full record. It IS the fiction.)
