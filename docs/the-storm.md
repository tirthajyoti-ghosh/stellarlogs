# THE SLEET — the debris storm, explored (2026-08-15)

Fiction alignment and design exploration, before any code. Plain
language on purpose.

## 1. The problem with the generic version

The roadmap's old sketch was: "a rock shower where PDCs do civil
defence — fly picket over the colony, guns eat debris, no enemy at
all." That is a fine *shape*, but as written it is a re-skinned wave:
things come, guns kill them, nothing is at stake but a number. This
world has earned better, and it turns out our own canon hands us the
missing piece.

## 2. The fiction we already wrote (and what it gives us)

Two things are already true in this game, written on the memorial
board at the vigil:

> **HER PLATES ARE THIS DECK. HER TANKS ARE OUR WATER.**

and the story of THE DRY WEEKS — eleven days the Drift lived on dregs
and reclaimer steam after the Nilak died, until the racing club ran raw
ice from the outer wells, lap after lap, until the reserve came back.
The colony's motto since: **NO SHIP LEAVES THE DRIFT DRY.**

So the Interamnia Drift's water reserve is held in the **Nilak's own
salvaged tanks**, bolted to the colony's rim. That is the stake, and it
is the most emotionally loaded object in our universe: this community
has already been dry once, and the thing that keeps them wet is the
body of the ship they mourn.

**A rock through those tanks is not a damage number. It is the Dry
Weeks happening again.**

## 3. Where the rock comes from (and why it is a civic occasion)

Not an attack. Not a raid. A **charted rubble stream** — the wreckage
of some ancient collision that crosses this lane on a schedule the
FIRST CHARTS recorded generations ago (docs/the-fiction.md). The
Surveyor's charts predicted it; the colony has known its return dates
for as long as they have been here.

That framing earns three things:

1. **It is announced, not ambushed.** The docks board posts the pass
   the way it posts escorts and manhunts. No jump-scare, no arming.
2. **It is a duty, not a mission.** Belters stand a picket because
   there are not enough hulls to cover the rim. You are not a hero
   hired to fight; you are a neighbour who showed up.
3. **The Surveyor is still protecting them.** His charts are why they
   know it is coming. The whole world is his record — this is the
   record doing work.

Name: **THE SLEET** — plain, cold, Belter. (What comes across the lane
is rock and old ice together.)

## 4. What you actually do

- The stream arrives along a **known bearing**, announced ahead.
- The tanks are fixed on the Drift's rim. You take station **between
  the stream and the tanks**.
- Your PDCs engage automatically, as always. Your job is the same job
  this whole game is about: **be in the right place.** Escort taught
  it with a moving corridor; the Sleet teaches it with a fixed one you
  cannot leave.
- **Heat finally matters.** Our PDCs already have thermal lockout, and
  it has never really bitten. With a stream instead of a salvo you
  cannot hold everything; you must let the harmless ones pass and
  spend your guns on the ones that are actually on line with the
  tanks.

## 5. Why rocks are not torpedoes (this is not a re-skin)

- **Rocks do not steer.** They are ballistic and honest: you can read
  a rock's line the instant you see it. The skill is anticipation and
  geometry, not pursuit.
- **Rocks break rather than die.** Fracture, not fireworks (a ruling
  already on the books). A big one shot late becomes a spray of
  fragments still carrying through; shot early, the fragments scatter
  wide and miss. **Range is the lesson**, and the instrument already
  draws it — that PDC ring on the scope is now a fact about survival.
- **Most rocks are nothing.** A stream is mostly harmless gravel. The
  fight is triage: which handful is actually on line with the tanks.

## 6. What failure costs (honest, no game-over)

A rock through the rim holes a tank and the reserve drops. Not a
"defeat" screen — a number on the docks board that means something,
kept the way we keep TORPEDOES DOWNED and CANDLES LIT. The Drift
refills over time. The Sleet returns.

That is the whole feedback loop, and it needs no new fiction: they
have been dry before and they will not go dry again on your watch.

## 7. What we will NOT do (from standing rulings)

- No manual gunnery or aiming minigame — the PDCs stay automatic; the
  player's job is flying.
- No health bars on rocks, no score popups, no combo counters.
- Fracture, never fireworks.
- No punishment beyond the honest number; no failure state that ejects
  the player.
- No fake urgency: it is posted, it is predictable, and you may
  ignore it entirely.

## 8. The liveness hook (later, not now)

The roadmap already imagined a clock-synced "storm hour" every visitor
shares. This fits perfectly: the pass is CHARTED, so its time is
public — a real UTC-keyed schedule when the backend lands, with the
reserve level and the rocks-stopped tally becoming everyone's numbers.

## 9. Open questions

1. **The stake — the water tanks (my recommendation) or generic dock
   damage?** The tanks tie the event to the vigil, the Dry Weeks and
   the colony's motto; generic damage ties it to nothing.
2. **How it starts.** My recommendation: the board posts the coming
   pass; the Sleet then arrives on its own clock whether or not you
   are there. You show up or you don't. (No accept-key, matching the
   playzone law.)
3. **The ice wrinkle.** Some of what crosses is old ice — water the
   colony would love to have. A Belter would not shoot ice they could
   catch. Tempting, but it is a second verb; my recommendation is to
   leave it OUT of v1 and keep one honest job.
4. **The name: THE SLEET?**
