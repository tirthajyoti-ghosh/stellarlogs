# THE PLAYTEST — a usability pass on the missions we already have
(logged 2026-08-15, at Tirtha's call; he is the test subject)

Not "more content" — a hard look at whether what EXISTS delivers the
delight we keep saying we're obsessed with. His questions, verbatim in
spirit: what am I looking at while missiles hunt me, where do my eyes
go, what am I feeling, is it challenging without being unfair, is there
enough new to make me come back, and when I look at the scope do I
actually find it useful?

## PART 1 — the facts first (pulled from the code, not from vibes)

He asked what the randomness actually IS. Here it is.

### The gunnery range (the drill) — ZERO randomness
Three waves, hand-authored. Same torpedoes, same bearings, same
elevations, **every single run**:

- **Wave 1 — CIVILIAN JUNK**: 4 torpedoes, all from behind within a
  40° spread. Class: no corkscrew, slow (vmax 150).
- **Wave 2 — NAVAL SURPLUS**: 7 torpedoes, front and back mixed.
  Class: gentle corkscrew (radius 5.5), vmax 200.
- **Wave 3 — MIL-SPEC SALVO**: 12 torpedoes — two beam clusters
  (±75–100°), two aft, three spread, plus **one "runner" dead astern
  at 1.5× speed and half the turn rate**. Class: hard corkscrew
  (radius 12, spin 4.2), jukes, vmax 310.

**Implication to test:** the range is a certification ladder, and it is
identical forever. Excellent for learning. Possibly zero reason to
return once passed.

### The escort (the ice route) — randomness exists, but of one shape
- Whether a hauler is marked at all depends on her cargo:
  VOLATILES 60%, FUEL 50%, PARTS 40%, everything else 30%.
- If marked: **1–3 salvos**, first one 8–26 s after the handshake,
  then 17–34 s between salvos.
- Each torpedo: random spawn scatter (±45/±30/±45 u), speed ±6%,
  boost 0.6–0.9, random attack bearing per salvo.

**Implication to test:** the variety is in *timing and bearing*, not in
*kind*. One torpedo class, one script: mark → salvos. After several
escorts it may feel same-y, and the danger arrives on a **timer** —
nothing the player did causes it.

## PART 2 — what I already suspect is weak (my hypotheses, to be proved or killed)

1. **Range wave 3 never changes** → no replay pull after certification.
2. **Escort danger is timer-driven** → the player may not feel agency:
   nothing they do brings the fight on or delays it.
3. **The scope may go unread in the heat.** Its stem colours are the
   densest information in the game, and the "second glance" law was
   designed but never tested against a real player under pressure.
4. **One torpedo class in escort** vs three in the range → escort may
   be the *less* interesting fight, which is backwards.
5. **Heat lockout has never actually bitten.** If the guns never
   overheat in practice, an entire mechanic is invisible.

## PART 3 — the runs (what Tirtha actually does)

Four runs, short. After each, answer the six questions below **before
looking at the next run** (first impressions decay fast).

- **RUN A — range, waves 1→3, played normally.**
- **RUN B — range wave 3 again, immediately.** (Tests: does knowing
  the pattern make it boring, or does mastery feel good?)
- **RUN C — one escort, start to finish**, ideally a marked hauler.
- **RUN D — one manhunt** through to the arrest.
- **RUN E — one SLEET pass, stood as picket** (added 2026-09-01, his
  call after standing one for real). His field report already names
  the suspects, so this run has extra questions beyond the six:
  - **The disintegration beat feels wrong**: PDC rounds don't break
    rocks "at the correct time" — is the rock HP / round damage tuned
    so a tracked rock dies at a readable, satisfying moment, or do
    rocks absorb fire past the point where the stream visibly landed?
  - **Station-keeping is unreadable**: what IS the optimal picket
    distance from the tanks, and can a player discover it in-game?
    (PDC reach is 300u — does anything communicate that the shield
    envelope, not the gun, is what you position?)
  - Pull the numbers from KhioneSleet.tsx into PART 1 (rock HP, spawn
    rate, closing speeds, damage-per-round) before the run, same
    facts-first law as the others.

## PART 4 — the six questions, asked the same way every run

1. **Eyes:** name the three things you looked at most, in order.
   (Ship? scope? hull bar? the world outside? the coach line?)
2. **Feeling:** one word for the peak moment, one word for the dead
   moments.
3. **Difficulty:** too easy / right / unfair — and *where exactly*.
4. **The scope:** did you look at it? When? Did what you read change
   what you did? If it didn't, say so plainly.
5. **Surprise:** did anything happen you didn't expect?
6. **Return:** would you run this again tonight? Why or why not?

## PART 5 — instrumentation — APPROVED (Tirtha, 2026-08-15: "the session
recorder is fine, and we will do that")

BUILD IT BEFORE THE RUNS. A session recorder behind a flag that logs
per second:
nearest threat range, whether the guns held locks, hull hits, heat
lockouts, time inside vs outside the PDC ring, and how long the scope
spent in battle mode. That turns "it felt unfair" into "at 0:42 three
torpedoes crossed the ring within 1.2 s while two mounts were in
lockout." Say the word and I build it before the runs.

## PART 6 — what comes out of this

A findings list, ranked, and then fixes as a proper batch — likely
candidates given the facts above: randomised or rotating range waves,
escort attacks that respond to what the player does, a second torpedo
class in escort, and whatever the eye-tracking answers say about the
scope. **No fixes get built until the runs are done and the findings
are his, not mine.**

---

## THE BLACK BOX — SHIPPED 2026-08-15 (supersedes part 5's sketch)

His upgrade order: not just browser storage — a real pipeline, every
possible datum, mobile-ready, "a treasure trove by the playtest."

Built as roadmap 3.9 (see docs/roadmap.md for the full entry):
- **src/systems/flightRecorder.ts** — per-battle 1 Hz black-box rows +
  console debrief (unchanged core);
- **src/systems/blackbox.ts** — the session recorder around it:
  anonymous pilot id, device/GPU/touch/orientation/viewport/network
  snapshot, activity transitions, battle boundaries, debriefs WITH
  rows, tally bumps (torpedoes/candles/rocks), fps every 30 s, errors,
  session lifecycle with sendBeacon;
- **api/blackbox.ts** — Vercel function on our own deploy; Upstash
  Redis storage when attached, structured logs always;
- **store-and-forward**: batches clear only on stored:true — with no
  database attached nothing is lost, backlogs upload when storage
  appears.

ONE CLICK OUTSTANDING (his, dashboard-only): Vercel → Storage →
Marketplace → Upstash Redis → connect to the project. Env vars inject
automatically; no code change; every buffered event from every visitor
uploads on their next session.
