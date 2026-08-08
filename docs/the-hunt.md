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


---

# Second pass — the revenant, the dice, and the harpoon (2026-08-08)

*After Tirtha's read of pass 1: he wants the recurrence fiction to carry
more weight ("how is that ship out there hunting again?"), real
per-run life ("some randomness… something the user can come back and
still enjoy"), and the tow made concrete — a tug that fires a harpoon
and drags her away, with an asset bench to judge (tugs.html).*

## P2.1 The recurrence fiction — you can't impound a name

Pass 1's disarmament sentence explains a release. It doesn't explain a
LEGEND — and "Draugr" was always the right word waiting to be used:
in the old stories a draugr is a REVENANT. The dead thing that walks
again.

**The fiction, full strength:** what the lane calls "the Draugr" is not
a registered hull — it is a stealth profile with no transponder, no
registry entry, no name the Belt's thin law can attach to anything.
When one is caught, the militia tows in *a* black hull, strips *a*
magazine, releases *a* crew nobody can charge with anything — and six
days later the same dark silhouette is working the lane again. Same
boat with new plates? A sister hull run by the same crew? The syndicate
behind it fielding another? **Nobody knows, and that unknowing IS the
fiction.** The board doesn't tally a ship; it tallies a phenomenon:

    DRAUGR — INTERDICTED ×4 · ESCAPED ×2 · LAST: <callsign>

The militia's dry joke, painted small under the tally, is the whole
thesis: **"YOU CAN IMPOUND A SHIP. YOU CAN'T IMPOUND A NAME."**

This does three jobs at once:
1. **Repeatability is justified forever** — the hunt never claims to end
   piracy, only this week's instance of it. The standing situation
   deepens instead of resetting.
2. **It LICENSES the randomness Tirtha asked for** — if each Draugr may
   or may not be the last one, then each behaving a little differently
   is not a gameplay convenience, it is *evidence for the mystery*.
   The dice become lore.
3. **The disarmament sentence (pass 1) survives underneath** — it is
   why caught crews walk; the name-fiction is why the hunts continue.

## P2.2 The dice — temperaments, seeds, and the lane learning you

Same mission spine every time (chase → corner → gun to the head →
squawk), living differences each run:

- **Temperament roll** (the big one — which Draugr showed up this
  time?):
  - **CAGEY** — flees early and far: longer head start, wide doglegs,
    spends dark-runners sparingly but from ambush angles. The long
    patient chase.
  - **BRAZEN** — lets you close, then breaks violently late; tight
    jinks, aggressive salvo cadence; punishes sloppy closure hardest.
    The knife fight.
  - **SPENDTHRIFT** — burns her whole magazine early in dense volleys,
    then runs clean and fast on an empty boat. Survive the storm, then
    win a pure race.
  Temperament is rolled per hunt, readable only through behavior —
  never labeled on the HUD (the scope shows what she does, not what
  she is).
- **Seeded geometry**: her start position and escape bearing come from
  the actual last raid (already designed), so every hunt begins from
  real, different geometry.
- **Variance dials**: head start, dogleg cadence, dark-runner budget,
  escape-bearing drift — all rolled within temperament bands.
- **The lane learns you (escalation, capped)**: after each successful
  interdiction on your record, the next Draugr rolls with slightly
  hotter bands (head start +, magazine +) — capped at +3 so it plateaus
  as "veteran lane" difficulty, mirroring the cert's veteran drill.
  Fictionally airtight: whoever they are, they know YOUR callsign now.
- **Failure stays cheap**: she escapes, the board tallies it, the next
  posting comes after the next raid. Retry is a lane rhythm, not a
  menu.

## P2.3 The tow, concrete — the harpoon procedure

The militia tug is a working boat with one weapon: a magnetic grapple
harpoon. The sequence, all diegetic, all physics:

1. **THE CALL** — at the squawk, the tug undocks from the Drift and
   burns out (visible plume on the lane; the world doing its job).
   Your contract is complete at the squawk — HUD stands down; the
   procedure that follows is silent-visible per the Sound Law. You can
   stay and watch from any angle, or leave.
2. **THE MATCH** — the tug flips, brakes, and station-keeps ~80 u off
   her beam (the same tail-first honesty as every lane arrival).
3. **THE SHOT** — the harpoon fires: a real projectile on a rendered
   cable (slight catenary sag, drawn as a segmented line), crossing in
   ~1.5 s. Impact: a hard spark, a small attitude kick through her hull
   (physics, not theater), the cable snapping taut.
4. **THE TURN** — over ~4 s the two hulls align as the cable tensions,
   her attitude dragged to match the tug's.
5. **THE LONG HAUL** — combined burn toward the Drift's cold berth,
   her drive dark, the tug's plume doing all the work. They shrink
   into the lane traffic and are gone. The board updates as they dock.
6. **Wreck-law texture (cheap, optional)**: for a few minutes the
   berth-side board line reads DRAUGR — IMPOUNDED · ORDNANCE STRIPPED,
   then reverts to the standing tally.

**The asset**: candidates gathered in **tugs.html** (bench committed,
same judging drill as the shipyard) — brief: a workhorse silhouette, a
credible harpoon mount point, kinship with the lane fleet. Tirtha
picks; the harpoon launcher itself is a small authored attachment (a
box + rail + cable drum) we fit to whichever hull wins, so the choice
is about the BOAT, not the gun.

## P2.4 Decisions carried + new

From pass 1 (still open): lock feel (cumulative 8 s vs continuous 5 s);
she-runs-dark in v1 or v2 (recommend v2); chase length target (2–4
min); tally surface v1.
New from this pass:
1. **The revenant fiction** ("you can't impound a name") — approve as
   the standing lore, board joke included?
2. **The three temperaments** — approve the set (names internal only)?
3. **Escalation capped at +3** on your interdiction record — yes/no?
4. **The tug hull** — pick from tugs.html (or send me hunting again).
5. **Watchability**: after the squawk the player is free but the tow
   takes ~40 s to play out fully — is that the right length for the
   ones who stay to watch?


---

## BUILT — 2026-08-08, the same night as pass 2

Shipped end-to-end and verified on the harness: staged posting → board
accept (the interdiction outranks escort offers while posted) → BRAZEN
temperament rolled → chase with dark-runner salvos (drive-cut ghosts on
the scope, guns dropping the track, terminal relight) → the ring lock
accumulated 8 s → TARGET SQUAWKING SURRENDER → the tug flew out from
the Drift → harpoon crossed → tow-haul on the cable → DRAUGR IMPOUNDED,
tally persisted (1 HELD · 0 FLED, localStorage), board cycling again.
Baseline regression ride after: the cert ladder unchanged (parked died
at W3 on schedule).

Build notes and honest debts for Tirtha's first flight:
- **LOCK_RELSPEED went 60 → 110 during verification**: thrust is a
  binary key and flight assist brakes hard on release, so a real pilot
  FEATHERS around her speed, oscillating ±80–100. Sixty was
  script-only. The matching FEEL is the first thing his live flight
  should judge.
- The tug (Titan, 10 u — half the Draugr, real-tug proportion) and the
  harpoon cable shipped verified-in-code but barely glimpsed by eye;
  the tow procedure plays out over ~40 s and is his to watch.
- Escalation (+3 cap) and the CAGEY/SPENDTHRIFT temperaments are
  built but only BRAZEN has flown.
- The revenant board line ("YOU CAN IMPOUND A SHIP…") arrives as the
  impound flavor; the standing painted tally on the militia board
  waits for the toys/boards pass.

# Pass 3 + build — THE TRAIL (2026-08-08, same night)

Tirtha's redesign, replacing the announce-it-louder fix: **the manhunt is a
standing posting, and a cold case is solved with evidence, not coordinates.**
"The joy of chasing down a lead is also pretty good fiction, pretty good
gameplay." Locked and built:

- **Standing case** — the board's top row is always `MANHUNT · DRAUGR ·
  CASE XXXX · TRAIL HOT/COLD`. A newcomer at the board on day one sees the
  story; the five-minute guillotine is gone. Case numbers are drawn from
  `crypto.getRandomValues` — the first in-world rehearsal of the Deep's
  seed-ledger idiom (the-deep.md, pass six).
- **Hot/cold gradient** — a delivery (witnessed raid) makes the trail HOT
  for five minutes: accept and the militia hands you a live vector,
  straight to the chase, dawdle still buying her head start. Cold: one or
  two evidence hops (65% two), legs 2.3–3.4k, seeded from her recorded
  escape line, each dogleg a burn she "actually flew."
- **Evidence you can see** — one prop at the working mark, oriented along
  the line it points: vented cargo tumbling in a string, exhaust-scorched
  dust dispersing behind her, a militia relay buoy with a patient lamp
  replaying a tightbeam fragment. Each clue speaks a plain-language T2
  line; the HUD mark does the pointing (LAST CONTACT → HER TRAIL). Props
  linger until you burn away — you found it, you get to look at it.
- **She is always at the end** — the dice decide trail LENGTH, never
  whether the hunt pays. The final site seeds the chase off the last leg
  (~1.1–1.8k gap): "DRIVE FLARE ON HER LINE — THERE SHE IS."
- **The trail is nav, not battle** — scope stays in nav mode, the drive
  console stays up (its new law: the console clears only for battle);
  battle begins at contact.
- **Shelving** — wander 9k off the working mark for 12 s (trail phase, or a
  chase you never joined) and the case shelves: no tally, same case number,
  the posting stands. The escape clock arms only on first contact, so a far
  hot seed can't expire before you reach her — and an accepted-then-ignored
  hunt can no longer softlock the job machine (harness catch).
- **The revenant law** — a closed case (caught or escaped) reposts under a
  NEW number with a synthesized last contact off the lane. The board is
  never empty.
- **One key, two jobs** — when a live escort and the manhunt are both on
  offer, the board scrolls between them every 6 s (hot outranks); the hint
  always names what G takes. Escort accept verified unchanged.

Harness (probe build, Playwright): cold end-to-end — standing offer →
accept → two hops read (dust, cargo) → chase seeded at gap 1502 with
contact armed; hot accept → immediate chase; post-contact escape → tally +
repost under new case; both shelve paths keep the case and skip the tally;
offer alternation observed (-2 ↔ escort) and escort accept still lands
`intercept`. Open on Tirtha's live read: alternation cadence feel, clue
prop staging, trail length against Bruno's law.

# Pass 4 — the chase earns its physics (2026-08-08, after the first live ride)

Tirtha flew the trail build and handed back a design batch. His framing is
the law for this pass: *"it's a lot of balancing act… put a lot of thought
into it… challenged enough, but not so much that they don't feel the
delight. We do the thinking now; implementation is easy."* Ground truth
pulled from code before thinking: player cruise 210, boost 520; Draugr 420
(the chase is a Shift-feathering game); HUNT_RUNNER vmax 200 — slower than
everyone, which is exactly why her torpedoes felt like nothing; controls
are binary keys (W/S thrust, A/D yaw 1.7 rad/s, R/F pitch 1.15, Q/E
strafe, Shift boost, X flip), drag = camera look only.

## 4.1 The accept key: G escorts, H hunts

The 6-second scrolling offer dies. Two standing jobs get two keys — G
keeps the convoy ("take her"), **H takes the hunt** — unclaimed, mnemonic,
and physically next to G so "the board keys" cluster. The HUD shows both
offers at once when both stand; the hint reads `G ESCORT · H MANHUNT`.
Touch gets two stacked accept pills. Internally the -2 sentinel dies too:
`escortOffer` and `huntOffer` become separate fields. No scroll, no
wrong-moment accept.

## 4.2 Clues built from real matter (clues.html bench first)

His verdict on the dust: "a semi-transparent pipe — we can't afford that."
Correct. The fix is the house rule applied to props: **evidence is made of
things that exist in this world.**

- **THE SCORCH replaces the dust cylinder.** She burned through a gravel
  pocket: a ~400-unit string of REAL rocks — instanced from the same ten
  photoreal variants the belts use (asteroids.glb), scaled to rubble
  (0.3–2u) with a few fist-of-god pieces — plus a particle shimmer: fines
  her exhaust cooked, still glinting (additive points, per-point twinkle
  phase). Other rocks drift inside the smear, exactly as he described.
  The string's axis is her line; density thins toward the fresh end.
- **The tightbeam intercept gets the real buoy.** public/models/buoy.glb
  already flies elsewhere in the system; the militia relay is that
  hardware in militia trim (teal lamp, patient blink), not a primitive
  octahedron. Candidate extra: a short ranged audio chirp loop — the
  intercept replaying — legal under the Sound Law (comms addressed to
  anyone on the case).
- **The cargo string stays** but graduates from flat-color boxes to
  container-grade material (borrow the freighter fleet's palette).
- **Bench before game**: clues.html, permanent like the others — all three
  clues on black, spin/judge, THEN they enter the world.

## 4.3 The lock is a SPHERE — and the scope must say so

The code already checks 3D distance (it was always a sphere); the
instrument lies by drawing a flat ring, so players think in the plane.
The fix is an honest projection, not new mechanics: during the chase THE
SCOPE draws the lock sphere's **cross-section at HER height** — a circle
of radius sqrt(300² − dy²) centered on the vessel, drawn at her stem's
height in the cylinder. Read it and the whole state is legible:

- She's high above you → the circle is small: "close height first."
- |dy| ≥ 300 → no circle exists: lock is impossible at this offset.
- Circle wide and she's inside it → hold, and the existing lock arc fills.

One drawn element teaches the sphere without a word of tutorial. (An
in-world sphere shell was considered and rejected: we look outward FROM
its center; it could only ever read as fog.)

## 4.4 Torpedo doctrine: insanely fast, honestly finite

The show's truth he invoked: a torpedo carries no crew — it can burn at
Gs that would kill, sustain them, and it only has to arrive once. A 200
vmax chaser in a 420/520 stern chase is fiction-false and gameplay-dead.
The redesign is speed + finitude + doctrine:

- **HUNT RUNNER v2 (bench numbers, to be measured)**: v0 150, accel 260,
  vmax ~720, **burn budget ~5 s then ballistic coast** — the real shape
  of the weapon. Full steering authority only under burn; terminal
  corkscrew spends burn. Dark-runner behavior stays (drive cut = ghost)
  and now reads even better: a dark coast at 700 is genuinely scary.
- **She fires on GEOMETRY, not on a timer.** Launch only when a solution
  exists: player in her stern cone, closing, and estimateFlightTime
  inside the burn+coast envelope (the brain already computes this).
  Head-on closure at ~900 combined is the terror moment — short PDC
  window, dodge-or-shoot. No more birds thrown into a wake they can
  never catch. Magazines (temperaments) finally mean something: every
  launch is a real spend.
- **Counter-play fits the keyboard**: a lateral pulse (Q/E/R/F) plus the
  PDCs. Near-miss jukes already exist; the dodge is a beat, not a
  joystick flourish.
- **Acceptance is measured, cert-ladder style**: parked / straight-boost /
  weaving harness arms; leak rates and time-to-intercept recorded; the
  envelope tuned until motion saves you and sitting does not. The wall
  rule stands: if motion doesn't save you, there is no skill.

## 4.5 The Azure Dragon rule: the chase runs THROUGH the world

His reference: the Roci hunting the spotter ship — hard, violent vector
changes, terrain in the frame. Today she flees into empty black; empty
space reads static at any speed. The redesign:

- **Anchor running.** She flies legs between NAV ANCHORS — real scenery:
  the belt's inner rim, the wreck, the gateway, lane space, moons —
  chosen so each leg (a) stays inside the ARENA (~12k around the Drift),
  (b) turns hard (60–120°), (c) puts visual mass in the frame. At each
  anchor: the Azure Dragon move — slam the nose over, burn on the new
  vector. Doglegs become geography.
- **Parallax is the delight engine**: threading scenery is what makes 420
  FEEL like 420. And pursuit curves become skill: she flies the longer
  arc around an anchor; the player who cuts the corner closes. Catch-up
  drama from geometry, not rubber-banding.
- **The fiction of the bound**: she never leaves the cluster — the lane
  is her larder and militia pickets hem the dark ("SHE WON'T LEAVE HER
  HUNTING GROUND — CUT THE CORNER"). Mechanically: any leg that would
  exit the arena re-vectors inward.
- **Danger law honored**: her corridors are picked with clearance; the
  world never cheap-kills the player. The corner-cut is the player's
  choice of risk.

## 4.6 Controls — food for thought, benched separately

The chase's REAL skill was always meant to be the throttle (feathering
Shift around her 420), not pixel-aiming a 1.7 rad/s keyboard yaw at a
weaving target. Two candidate reliefs, both needing a feel bench, neither
required for chase v3:

- **Mouse/trackpad steering** (Elite-style): cursor offset from center
  drives yaw/pitch with a deadzone; keys keep thrust. Conflicts with
  drag-to-look; would need a mode and consistency law.
- **PURSUIT ASSIST** (recommended candidate): fiction-true flight-computer
  behavior — when the nose is within ~10° of the hunted contact, the RCS
  holds it there (a hold, never a snap; breaks on any yaw/pitch input).
  The player flies throttle, translation, and the lock envelope — the
  game the design always wanted. Not fake-game-y: real flight computers
  do exactly this, and it only exists on contract, like everything else.

Decision deferred until chase v3 is flyable; judge with hands on keys.

## 4.7 Mobile: the bridge flies landscape

His phone read: runs smooth, buttons make no sense in portrait. The shape
(roadmap item, independent of the hunt): treat the site like a video —
**landscape fullscreen is the played state.**

- Portrait on touch → a full-screen interstitial: "THIS BRIDGE FLIES
  LANDSCAPE" + rotate glyph; tap = requestFullscreen + orientation.lock
  ('landscape') where supported (Android/Chrome). iOS can't lock from
  web: the interstitial simply stands until rotated (the YouTube
  pattern), fullscreen via the same tap where allowed.
- Landscape touch layout gets its own pass (thumb zones: thrust cluster
  right, translation left, accepts center-bottom) — rides with the
  density/toys HUD polish, not before.
- PWA manifest gains orientation: landscape for installed use.

## 4.8 Locked sequence (pending Tirtha's sign-off on this pass)

1. **clues.html bench** → judge → real assets into the trail (4.2).
2. **H key + dual offers** — kills alternation (4.1). Small.
3. **Scope sphere read** — the cross-section circle (4.3). Small.
4. **CHASE v3** — anchor arena + torpedo doctrine v2 + measured
   acceptance (4.4 + 4.5). The big build; harness first-class.
5. **Controls feel bench** — after v3 flies (4.6). Then his ruling.
6. **Mobile landscape pass** — scheduled on the roadmap, anytime (4.7).

# Pass 4 amendments — bench verdicts and the turn-trigger design (2026-08-08, late)

Tirtha judged both mocks. Locked and still-open, in his words where it
matters:

## A. Pursuit assist: ON — but a hand, not a magnet

- The mock's failure named precisely: "it's kind of snapping me back into
  the center — that's what was too easy." The assist SURVIVES; the snap
  dies. V2 behavior: **hold, never center** — feed-forward on her angular
  rate with only a whisper of centering; offset inside the cone is
  tolerated. The player still earns the capture and re-earns it after
  every break.
- **The capture cone (his geometry)**: apex at our nose, and the drawn
  ring is a **fixed WORLD-radius capture disc around her** (~150–200u,
  tuned on the bench), projected on the HUD — small and demanding at
  range, wide and forgiving up close. Self-balancing skill curve, honest
  instrument, sibling of the lock sphere.
- Ring = proper HUD element (from the mock's look); brightens when the
  nose is inside; solid while the assist holds.

## B. THE HUNT FOCUS state (locked last turn, restated)

Taking the case strips the world's tourist signage — project/work labels,
POI pointers, uninvolved ship tags — leaving mission truth only. Trail =
focus (nav scope + console in a quiet world); contact = battle mode.

## C. When does she turn? — decisions, never noise

Every hard break must be READABLE. Four triggers, all observable:

1. **Anchor breaks** (the backbone) — she turns at scenery. Geometry
   teaches corner-cutting.
2. **Proximity break** — you inside ~900 with a speed edge → she snaps
   perpendicular to your approach line. Newcomer-readable cause/effect.
3. **Lock panic** — the lock timer IS her fear meter: hold the envelope
   and she breaks to shatter it. The player's success forces her hand.
4. **Fire-and-turn** — she breaks behind her own salvo, forcing the
   choice: dodge the birds or hold the line.

Temperaments reweight the triggers (CAGEY schedules, BRAZEN reacts);
the dice become personality, not noise.

- **The tell**: ~0.3 s of visible drive torch before every hard break —
  the same honest telegraph grammar as the cert range's launch flash.
  Newcomers learn her body language; veterans pre-turn with her.
- **The keystone: turns cost her.** She is CREWED — G-limits her
  torpedoes don't have (fiction-true, and the balancing law). Every hard
  break bleeds her speed; she re-accelerates at only 55 u/s². Therefore:
  no chained breaks (cooldown → break/sprint/break rhythm), and every
  evasion CLOSES the gap for a clean pursuer — the chase carries a
  built-in convergence arc. Dogged newcomers win slowly; corner-cutting
  veterans win fast; only lost gap discipline lets her go. Escalation
  (caught-count) tunes ferocity.

## D. The name: THE REVENANT

His instinct, my endorsement: draugr literally MEANS revenant — the
rename is the translation. The repeatability fiction depends on players
getting "you can't impound a name," and REVENANT does that in plain
English. Locked direction: displayed name THE REVENANT everywhere
(board, labels, VOICE, case rows); *draugr* demoted to belter flavor
(T3: "belters call her kind draugr — the walking dead"). Storage keys
stay as-is; only display strings move.

## E. Clues — final asset rulings

- **THE SPILL (cargo)**: mixture locked from crates.html — begle's
  container, edwincgstudio's container, andreas9343's crate, ul1tka's
  boxes. EXCLUDED: the standardized red/yellow set, the NASA-styled
  crate, the last sci-fi crate. Bake a small variant set via the
  build-*.mjs pipeline, instance along her line.
- **THE SCORCH**: approved with the placement law — never in empty
  space: it carries its own cold un-burnt gravel pocket with the cooked
  lane cut through it, and trail generation prefers belt-adjacent hops.
- **THE PICKET (buoy)**: fiction locked — the sonobuoy pattern. Tightbeams
  are line-of-sight; after each raid the militia scatters passive
  listeners along her likely egress lines; one caught a fragment because
  her beam swept it. It hears, it cannot chase — hence the posting.
  Existing buoy hardware in militia paint. VOICE: "MILITIA PICKET — SHE
  TALKED TO SOMEBODY, AND THIS EAR WAS IN THE BEAM."
- Floodlight in the bench = judging tool only (asset under close light vs
  starlight); NOT a game feature.

## Pass 4 — BUILT (2026-08-09, same night)

Everything blessed shipped in one build, harness-verified end to end:

- **G escorts, H hunts** — both jobs stand on the board at once; the hint
  reads `G ESCORT KOSMO · H MANHUNT`; touch gets two pills. The scrolling
  offer is gone.
- **THE REVENANT** — displayed name everywhere (board, label, title,
  lines); the draugr survives as the T3 lore line on a cold accept.
- **HUNT FOCUS** — on contract, world labels and the tactical contact box
  go dark (CSS `body[data-focus]`); only mission labels survive. Trail =
  nav instruments in a quiet world; contact = battle mode.
- **CHASE v3, the Azure Dragon** — she runs legs between NAV ANCHORS
  (gunnery arena, the wreck, ten dark waypoints) inside a 12k arena;
  breaks at anchors, on proximity (<900 closing >120), on lock panic
  (>3.5 s), and behind her own salvos (60%); every break preceded by a
  0.3 s drive torch (the tell) and paid for in speed (×0.55, floored at
  140 so she never reads stalled). Cooldowns per temperament.
- **Torpedo doctrine v2** — HUNT RUNNER: accel 260, vmax 720, 6 s burn
  budget then ballistic coast on fins (dark coast doesn't spend the
  clock). She fires on GEOMETRY: closing pursuer inside 2.6k, or the
  point-blank desperation inside 800 — the harness caught that a
  matched-speed shadow in her skirts was never getting shot at, which is
  exactly when the gun to her head must answer.
- **Pursuit assist v2** — capture disc (world R=180) around her; the HUD
  ring scales with range (measured 186→354 px as the gap closed); hold is
  deadbanded soft-gain, capped at 0.55 stick; any yaw/pitch input breaks
  it. Bench snap is gone.
- **The scope's sphere read** — lock-sphere cross-section at her height,
  √(300²−dy²), dashed teal at her level.
- **Clues of real matter** — THE SPILL instanced from crates.glb (the
  locked four-variant mixture, 667 KB, credited in README); THE SCORCH
  from the belt rock pack with cold-pocket surroundings and warm fines;
  THE PICKET is the fleet's buoy at 12u with the patient lamp.
- Harness: dual offers, H-accept, focus/labels dark, trail→chase, anchor
  machinery, tell observed, ring shown+scaling, assist engagement, salvo
  under doctrine (bird at 497 and climbing at age 1.3 s), G-escort
  regression. Two harness catches fixed pre-ship: the matched-speed
  no-fire hole and a chained-break stall (speed floor).
