# THE MOBILE CONTROLS — from first principles (2026-08-15)

His reset order: forget every implementation. Step 1: list what the
ship CAN DO — no keys, no buttons, no screens. Step 2: research how
the most successful mobile flight/space COMBAT games (not simulators)
hand those verbs to a thumb. Then, and only then, think about ours.
This document supersedes the control sections of the-mobile-deck.md.

---

## PART 1 — WHAT THE SHIP CAN DO (implementation-blind)

### Flight (continuous verbs)
1. **Point the nose** — turn left/right, tilt nose up/down. The ship
   is Newtonian: it keeps its velocity until pushed; pointing the
   nose does not change course until thrust is applied.
2. **Thrust** — push along the nose, sustained.
3. **Max burn** — the same push, much harder; louder, brighter,
   typically held for long stretches (chases, transits).
4. **Reverse thrust** — push backwards to brake or back off,
   sustained, usually brief (docking, station-holding, the arrest).
5. **Strafe** — small lateral nudge, rarely load-bearing.
6. **Flip** — snap the nose 180° (the Expanse brake-turn), discrete.
7. **Look around** — orbit the eye without changing the flight.

### Navigation (discrete verbs)
8. **Consult the chart and jump** — pick a charted destination, warp.
9. Everything else is proximity: approaches, playzones, the vigil —
   the world reacts to WHERE you fly, not to buttons.

### Missions (discrete, rare, contextual)
10. **Accept a posted job** (escort · manhunt) at the docks board.
11. **Re-run a drill** at the range, after finishing one.
12. That is ALL. Battle mode is not a verb — it engages itself in
    designated areas and under attack (playzone law: no arming).

### Combat (the crucial truth)
13. **The guns are automatic. There is no fire verb, no aim verb, no
    weapon-select verb.** The player's entire combat contribution is
    FLYING: being in the right place (between the threat and the
    ward, inside gun reach, out of the stream). Every researched
    game spends its best screen real estate on fire buttons — we
    spend ours on nothing, because our fight IS the flying.

Count: 7 continuous flight verbs (really 4 that matter: nose, thrust,
max, reverse), 1 navigation verb, 2 rare mission verbs. That is the
whole contract.

---

## PART 2 — HOW THE BEST MOBILE COMBAT FLIERS DO IT (research)

**Sky Gamblers (Storm Raiders / Air Supremacy)** — the long-standing
gold standard of mobile dogfighting: TIERED control schemes from
arcade to near-sim; default steering by tilt or virtual stick; SPEED
AS TAP BUTTONS — increase / decrease steps, not hold-to-fly (the
plane cruises on its own); hold-to-fire weapons; optional auto-aim;
a full tutorial. Speed is a STATE you adjust, not a muscle you keep
tensed.

**Ace Combat Xi (official mobile Ace Combat)** — tilt to maneuver;
weapons are ICONS you tap; targets are icons you tap. Discrete verbs
= icons, continuous verbs = the whole device.

**Modern Warships (aircraft modes)** — the clearest modern spec:
- ARCADE: the left joystick holds SPEED; you steer by MOVING THE
  CAMERA — the plane flies where you look.
- PROFESSIONAL: left joystick = attitude; on the right, TWO stacked
  buttons: AFTERBURNER on top, AIR BRAKE beneath. A throttle pair
  under one thumb.

**Galaxy on Fire 2 / Subdivision Infinity (mobile space combat)** —
steering by drag-the-nose or tilt; FIRE / boost / autopilot as
corner buttons; Subdivision adds vertical drag for speed. Space
ships cruise by default; buttons modulate.

**The shooter conventions he invoked (PUBG/CoD Mobile)** — floating
stick that spawns under the thumb; right-half camera drag; ONE big
primary at the right thumb's rest with satellites arced around;
sprint-LOCK: a state you set and walk away from.

### The patterns, extracted
P1. **Steering is stick-or-camera, and it is the LEFT thumb's whole
    job.** Nobody gives the left thumb a second duty.
P2. **Speed is a STATE, not a held muscle.** Planes cruise; buttons
    STEP the throttle (Sky Gamblers +/-, Modern Warships
    afterburner/brake pair, PUBG's sprint lock). Hold-to-fly exists
    mainly in casual endless-fliers, not in the combat class.
P3. **The right thumb owns discrete power/weapon actions**, as a
    small stack/arc at its rest.
P4. **Rare verbs are small icons at the edges; contextual verbs
    appear only when live.**
P5. **Everyone ships a tutorial for the first 60 seconds.**

---

## PART 3 — WHAT THE PATTERNS IMPLY FOR OUR SHIP

The deep miss in every previous attempt: **our throttle verbs were
mapped as HELD BUTTONS, but the genre — and his own instinct (the
swipe-lock ask) — treat speed as a STATE.** A Newtonian ship makes
this even more natural: the drive is either lit or it is not.

### The throttle: a DETENT COLUMN (recommendation)
One vertical throttle on the right edge — four detents:

```
   ▲▲  MAX BURN        (drive lit hard, stays lit)
   ▲   THRUST          (drive lit, stays lit)
   ●   COAST           (drive dark — Newton keeps your speed)
   ▼   REVERSE         (backing thrust while set; snaps to COAST
                        when tapped again — nobody reverses blind
                        for long)
```

Tap a detent or drag the puck between them. The state PERSISTS —
this is his swipe-lock generalised: max burn across a whole transit
with no thumb on glass, coast through a scope read, a dab of reverse
into the arrest ring. One control, every drive verb, zero gestures
to discover: the states are VISIBLE on the column.

### Steering: the floating stick (recommendation), camera-drag kept
Left half: floating stick under the thumb = the nose (P1; matches
our rotate-to-aim model exactly). Right half outside controls =
look around. (The Modern Warships ARCADE alternative — fly where
the camera looks — is powerful but changes our flight model's feel;
listed as the fallback if the stick fails his thumb test.)

### The rest
- **FLIP**: one icon above the throttle column (it IS a drive verb).
- **JUMP ◇**: appears armed from the chart, as built.
- **ACCEPTS**: word-chips bottom-center, as built.
- **STRAFE**: does not come to mobile (P4 — nobody spends screen on
  a nudge; the stick + flip covers its uses).
- **TUTORIAL (P5)**: three coach lines on first flight — "STICK
  STEERS THE NOSE" · "SET THE THROTTLE — IT STAYS SET" · "YOUR GUNS
  AIM THEMSELVES. FLY." The last one is the game's whole soul and
  no researched title gets to say it.

### Why this fits US specifically
- No fire button to compete for the right thumb → the throttle can
  own that thumb's rest position with a control most games can't
  afford spatially.
- Newtonian coast makes COAST a real, meaningful detent — arcade
  planes can't stop; our ship's stillness is a feature.
- The detent column is honest instrumentation (house law): the
  drive's state is readable at a glance, like every instrument we
  keep.

---

## PART 4 — his ruling wanted before code
1. The detent throttle column — yes/no?
2. Steering: floating stick confirmed, or trial the camera-pointer
   school?
3. Detent count: is COAST-between-THRUST-and-REVERSE right, or
   should REVERSE need a firmer commitment (e.g. hold-only)?

---

# BUILT — THE THROTTLE (2026-08-16, his "you're the expert" call)

The detent column shipped, replacing every previous drive control:

- A vertical LEVER on the right edge: MAX BURN (double chevron) /
  THRUST (chevron) / COAST (dot) / REVERSE (down chevron), with a
  glowing puck that rides to the set detent — amber when burning,
  teal in reverse.
- Tap a detent or drag through them; each detent change gives one
  haptic tick and the state PERSISTS — max burn with the thumb at
  home, honest coast (Newton keeps the speed and the column says so),
  reverse that stays only as long as it is set.
- Window blur resyncs the lever to COAST (matching the input clear).
- FLIP sits above the lever; the armed ◇ beside it; the floating
  stick, chart, accepts unchanged. The gesture drive (swipe-lock) and
  its hidden grammar are DELETED — every state is visible on the
  column, nothing to discover by accident.
- Machine-verified: tap and drag reach all four detents; MAX held
  through thumb release (screenshot: plume lit, no touch down);
  every detent change logs to the black box as {throttle: state}.

Why this is the delight answer: the control looks like what it does
(everyone has moved a lever through notches), the ship answers it
instantly (drive sound, plume, velocity), and it hands the thumb
back. Verdict now belongs to his phone.
