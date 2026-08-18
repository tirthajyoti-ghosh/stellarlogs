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

---

# THE MOBILE POLISH PASS — BUILT (2026-08-18, his eleven-item verdict)

All eleven items from his first real phone flight, shipped:

1. **THE BLACK BOX, killed at the root.** The plume raymarch fed
   `uTime × flow` (≤68) and `uTime × 60` into its noise — unbounded,
   crossing 65,504 (half-float ceiling on mobile fragment shaders)
   after ~16 minutes → NaN → the volume BOX painting black, flickering.
   Fixed: uTime wraps at 300 s on upload, `precision highp float`
   requested where the GPU has it, final color/alpha clamped.
2. **Camera closer on phones**: OFFSET (0,3.1,10.2) vs desktop 13,
   BOOST_FOV 68 vs 76, speed pullback halved — verified at max burn:
   the ship holds size, the full plume stays in frame.
3. **Camera pitch flipped globally** (his ruling): swipe/drag DOWN →
   camera moves UP, both platforms. Verified in emulation.
4. **Right-half camera drag on touch: verified working** with the new
   sign (the old inverted feel likely read as broken).
5. **Phone rendering trade**: touch-medium tier drops the bloom pass
   and spends the headroom on pixels — dpr ceiling
   min(2.5, devicePixelRatio) (was 1.5), floor 1.25. Low tier 1.3.
6. **RCS hiss**: on touch, audible only under ~25 speed — the stick no
   longer buries the drive. Desktop unchanged.
7. **The stick is a parked translucent ghost** (opacity 0.22) at the
   default spot; grabs relocate it under the thumb at full opacity;
   release returns it to the ghost. Never invisible.
8. **FLIP button deleted** from the deck (action lives on: desktop X,
   warp autopilot).
9. **THE CHART, discoverable**: the chip wears a real MAP icon
   (Lucide, ISC), all taps are onClick, a scrim backdrop closes the
   drawer, tap-highlight suppressed. Verified: open → scrim-close →
   reopen → arm ◇.
10. **CONTEXT PILLS** replace the text chips: icon + ≤2 words
    (▶ RUN DRILL · ⛨ ESCORT · ⌖ MANHUNT), pop-in animation,
    bottom-center, hidden in battle. Verified with a forced offer.
11. **THROTTLE v2 — a lever that looks like a lever**: 28 px painted
    track (amber top, teal bottom), chunky ridged grip handle, detent
    ticks with microtext labels MAX · BURN · COAST · REV, state glow.
    Same 4-detent persistent driver.
12. **FIRST FLIGHT tutorial** (touch, once): four tap-through
    spotlight steps — stick, throttle, chart, and "YOUR GUNS AIM
    THEMSELVES. FLY." Skippable; every step logs to the black box.
    (Gate rides the preflight's display state — it hides, not
    unmounts.)

Desktop regression-checked: no touch furniture, MFDs intact, only the
pitch flip is shared. His phone is the final gate.

---

# ROUND 2 (2026-08-19, his phone verdict on the polish pass)

1. **THE CAMERA ZONE, owned.** His phone still had no camera drag —
   the window-level handler works in emulation but not under a real
   thumb. Rebuilt as a dedicated invisible surface (.hud-cam-zone,
   right 56% of the screen, touch-action none, pointer-captured,
   rendered FIRST inside the deck so every button still wins
   hit-testing). No visual indication, per his ruling: it simply
   works. Drag down → camera up (ship stays the center of the orbit).
   Same sign as desktop's flipped pitch.
2. **BRIGHTNESS +30% GLOBAL**: gl.toneMappingExposure 1.0 → 1.3 (his
   "three to four notches", desktop included).
3. **SHOW, DON'T TELL on the jump drive**: ALIGNING / BURN / FLIP /
   BRAKE BURN / COMING ABOUT narration DELETED from the warp panel —
   the ship visibly does all of it. The panel keeps destination,
   distance, and the arrival countdown only.
4. **THE VOICE, phone-sized**: banners 26 → 15 px on touch, tighter
   tracking; warp panel scaled 0.85; coach 11.5 px.

Verified in emulation: cam-zone swipe-down orbits the camera to
top-down over the hull (buttons unaffected), warp panel reads
"BLOG · 5.2k M" with no phase words, exposure visibly lifted.
