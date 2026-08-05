# THE SCOPE — the combat radar as an honest instrument

*Design exploration, 2026-08-05. Companion to roadmap #5 ("cylindrical
combat radar"). Method as with docs/the-deep.md: first principles, genre
and real-world reference, an inventory of what already exists, then the
design and its decision points. No code in this pass.*

---

## 1. The job to be done

Under fire, the scope must answer five questions at a glance, in this
order of urgency:

1. **WHERE is the threat?** Bearing first, range second, elevation as a
   modifier — that is the order a pilot's brain asks in, which is why
   cylindrical coordinates (θ, r, z) are the right basis and a raw 3D
   sphere plot is not.
2. **HOW SOON?** The soonest impact owns the next two seconds of the
   pilot's attention.
3. **AM I COVERED?** Can my guns answer this inbound — and if not, is it
   because of my geometry (turn!) or my heat (wait!) or my saturation
   (move!)?
4. **WHERE SHOULD I BE?** Escort stationing is a positioning problem;
   the scope is the only place the answer can live.
5. **WHOSE fight is this?** Contract threats engage me; ambient violence
   is scenery (the Sound Law). The scope's symbology must carry that
   grammar.

Everything below serves those five. Anything that doesn't is ink.

## 2. What already exists (inventory, measured against the code)

The current instrument (`src/hud/Radar.tsx`, 132 px canvas 2D, top-right
panel) is further along than the roadmap entry assumes:

- **Nav modes**: far (seven systems), near (planets of the local
  system), with **click-to-jump** blips. Combat must not break this;
  conveniently, the battle branch never registers blips, so clicks
  already dead-end during a fight. The morph costs nothing here.
- **Battle mode already draws**: per-threat elevation **stems** (foot
  dot + stem + tip), the **escortee** as a cyan square with stem,
  **threat-axis lines** from every torpedo tip to its target (the
  stationing instrument recommended in the roadmap — already built),
  velocity ticks per contact, and **turret arc wedges** brightened when
  a mount is engaged.
- **The fire-control truth is available**: each of the six mounts has a
  real traverse cone (`ARC_HALF = 75°` around a per-mount arc axis), a
  range gate, load-balanced target assignment, per-barrel `heat`, and a
  thermal `overheated` lockout. Nothing about coverage needs to be
  invented or faked; it only needs to be *read*.

**The real deficiency** — and the honest content of the "cylinder" ask —
is projection dishonesty: stems push *screen-up* on a *top-down* plot.
"Above you" and "further north" render identically. In a world where
mil-spec ordnance corkscrews through elevation and doglegs arrive off-
plane, that ambiguity is now a gameplay cost, not a cosmetic one.

## 3. References, and the one perceptual law

- **Elite Dangerous' scanner** is the genre's proof: a tilted disc where
  every contact is a dot *anchored to the plane by a stem*. It works
  because the anchor foot gives the 2D projection and the stem gives
  height — one glance, no ambiguity. Sphere radars (Freespace family)
  fail because contacts float anchorless in a projected volume.
- **The Expanse's CIC grammar**: threat tracks as curves, a ladder of
  times, red hostile / teal friendly, instruments that stay level while
  the ship tumbles. The feel target: militia-surplus TEWA scope, not
  hologram theater.
- **Real CICs (Aegis)** layer pictures by job: a search picture and a
  weapons-engagement picture. Our nav disc vs combat volume is exactly
  that split, and the morph is the mode change made legible.

The one law: **every contact in a projected volume needs a plane
anchor.** The tilt turns height into a real, separate axis; the stems
anchor it. That is the entire optical justification for the cylinder.

## 4. The design — a tilted volume, drawn honestly

### 4.1 Geometry

- **Fixed tilt ≈ 58°**: the disc becomes an ellipse, elevation becomes
  true screen-vertical, and a faint rim ghost closes the cylinder. Fixed
  (never user-rotated): a corner instrument must be learnable as a
  glyph. Still canvas 2D — the projection is two multiplies; no WebGL,
  no scene cost, no composer involvement.
- **Bearing**: nose-up, rotating with yaw — the convention the current
  radar already trained. **Vertical: lane-plane-stable.** Roll and pitch
  never tumble the instrument. When you pitch 90° up, a torpedo dead
  ahead reads as a tall stem — correct: the windshield reports view
  geometry, the instrument reports world geometry, and instruments hold
  still. (This is also the anti-nausea law.)
- **Two-zone range mapping**: the inner disc is the **PDC envelope,
  0–300 u, enlarged**; a hard bright ring at 300 u; the outer annulus
  compresses 300–2,000 u. Inside the ring, the guns decide; outside it,
  your geometry decides. The scope draws the game's core law — *you are
  the shield's position* — as its most prominent line. Launches appear
  at the rim and fall inward; the moment a stem crosses the ring is the
  moment the fight changes owners.
- **Elevation**: stem height maps elevation *angle* (asin of z over
  range), clamped ±45° visual — matches how pilots think and keeps
  corkscrew wiggle visible at any range.

### 4.2 Symbology (the Sound Law carried into ink)

- **Contract threats**: foot dot + tinted stem + tip dot; the velocity
  tick stays. A corkscrewing torpedo's tip visibly orbits its foot —
  the show's maneuver, on the instrument.
- **The escortee**: teal diamond + stem. **Threat axes** (existing)
  drawn foot-to-foot on the plane; stationing remains "put my center on
  those lines."
- **The Draugr at her reveal**: a ship glyph, not ordnance — the only
  hostile HULL symbol in the game.
- **Ambient traffic**: faint dots, **no stems**. Stems mean "this
  concerns you" — the Sound Law's engagement grammar becomes the
  symbology rule. (Ambient torpedoes: not drawn at all. Watching the
  fireworks is a windshield activity, by design.)
- **Urgency**: the soonest-impact stem **pulses**; everything else
  holds still. The existing TORPEDO INBOUND strip keeps the number. No
  numeric ladder in v1 — twelve stems plus twelve numbers in 132 px is
  ink, not information.

### 4.3 Coverage — read, never painted

Coverage is three truths, all already in `turretControl` /
`shipTurrets`, stamped per threat by the owning activity and worn as
**stem tint**:

- **TEAL — engaged**: a mount holds this track (`tracked` exists
  today).
- **AMBER — covered, waiting**: inside at least one mount's 75° cone
  and range but unassigned (queue), or its eligible mounts are in
  thermal lockout. Amber blooming during W3 is the heat story told on
  the threat picture.
- **RED — uncovered**: outside every cone, or saturation has orphaned
  it. Red stems multiplying is the scope screaming *your geometry is
  failing — move.*

The existing mount-facing wedges stay as a dim underlay (they answer
"where am I strong," the stems answer "is THIS one handled"). Both are
read live from fire control; nothing is painted. One plumbing task
falls out: the per-threat `inArc` stamp next to the existing `tracked`
stamp.

### 4.4 The morph

Disc → volume on `activityState.battle`, ~400 ms ease; reverse on end.
The klaxon moment gets its visual echo, and the mode change is legible
the way the reference CICs make it. Escort quiet legs (intercept, no
live birds) stay a disc.

### 4.5 Designed now, wired later — ghost tracks

When THE HUNT introduces DARK RUNNER ordnance (drive cuts midcourse,
relights terminal), the scope needs a grammar for *losing* a track: the
stem fades, a hollow × holds the last-known foot, and the tip is gone.
Designing the glyph now costs a paragraph; discovering during THE HUNT
that the scope can only draw certainties would cost the feature.

## 5. Anti-goals (explored and declined)

- **Rotatable 3D sensor view** (Homeworld): wrong scale for a corner
  instrument; rotation destroys glyph-learnability.
- **Volumetric holo shader**: theater. The panel is militia surplus.
- **Fullscreen tactical mode**: the game is flying, not menuing —
  see→play→win forbids a pause-and-plot layer.
- **Numeric time-to-impact ladder** (v1): clutter at this size; the
  pulse + strip carry it. Revisit only if playtest asks for numbers.
- **Log-polar or fisheye range mapping**: two linear zones with one
  honest ring beat a clever curve nobody can read distances off.

## 6. Cost

Canvas 2D, ≤ ~40 strokes per frame at W3 worst case, zero scene-graph
or composer involvement, no new draw calls in the 3D world. The whole
feature is arithmetic plus ink. The single cross-module touch is the
per-threat `inArc` stamp written where `tracked` is already written.

## 7. Decisions for Tirtha (recommendation first)

1. **Two-zone range with the hard PDC ring at 300 u** — recommend YES;
   it draws the core mechanic. (Alternative: plain linear to 2 km.)
2. **Coverage = live TEWA stem tint (teal/amber/red) over dim facing
   wedges** — recommend YES; this replaces the roadmap's painted-wedge
   framing with read truth. (Alternative: geometric wedges only.)
3. **Combat-only morph, ~400 ms** — recommend YES. (Alternative:
   always-cylinder with a degenerate flat state.)
4. **Nose-up bearing + lane-stable vertical** — recommend YES; the
   instrument never tumbles. (Alternative: full ship-frame — rejected
   for 6DOF nausea and meaningless elevation.)
5. **Ambient traffic in combat: faint dots, no stems; ambient ordnance
   undrawn** — recommend YES; symbology enforces the Sound Law.
   (Alternative: hide all ambient in combat.)
6. **Urgency = pulse the soonest stem only** — recommend YES.
   (Alternative: numeric ladder — declined v1.)
7. **Ghost-track glyph reserved for DARK RUNNER** — recommend YES;
   design now, wire at THE HUNT.
