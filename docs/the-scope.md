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


---

# PASS 2 — the adversarial pass

*Same day. Method: attack pass 1's conclusions with arithmetic and
eye-flow reasoning; keep what survives, overturn what doesn't, add what
the attack uncovers.*

## P2.1 The tilt is a trade, and 58° pays too much

A tilt compresses the depth axis by cos(tilt). At 58°, bearings ahead
and astern — the sectors that matter most — keep only 53% of their
plot resolution. Elite runs much shallower than people remember,
precisely for this reason. **Revised: tilt ≈ 40–42°** (76% depth
resolution kept, height still clearly a separate axis), and an explicit
**ink z-order law** so W3's twelve stems survive the tilt's overlap:
ring > stems+tips > threat axes > wedge underlay > rim ghosts.
Stems get a 1px dark outline so they cross plane ink without tangling.

## P2.2 OVERTURNED: the decisions live OUTSIDE the ring

Pass 1 enlarged the inner PDC disc "because that's where the guns
decide." Run the numbers and it's backwards. A mil-spec closes at
~200–310 u/s: the outer approach (300–1,800 u) is **~7 seconds of
pilot decision time** — geometry shaping, de-syncing flights, flying
onto threat axes. Inside the ring everything resolves in **~1.5
seconds** and the pilot's choices are already spent; that zone is the
guns' show. Pass 1 would have crammed seven decision-seconds into 20 px
and spent 40 px on a spectacle zone.

**Revised mapping: outer annulus gets ~70% of the radius (linear,
300–1,800 u); the inner PDC disc gets ~30% (compressed but present).**
The RING keeps the emphasis instead: thick, bright, and it flashes once
as a stem crosses it — the fight changing owners is a drawn beat, not a
zone size.

## P2.3 NEW — the corridor read (the escort's whole job, one glance)

The stationing truth pass 1 under-used: you intercept a torpedo when
its **threat axis passes through your PDC bubble** — and your PDC
bubble IS the ring, because the scope is ego-centered. So tint each
threat axis by a trivial segment-circle test:

- axis **passes through your ring** → solid teal-tinted: this corridor
  is yours; the guns will get their chance.
- axis **misses your ring** → red-dashed: this one reaches her without
  ever entering your reach. Fly onto it.

The escort's entire positioning loop becomes one glyph rule: **keep the
red dashes at zero.** Read truth (one intersection test), zero new
data, and it composes with the ring emphasis above. This is the
strongest single addition of the pass.

## P2.4 The ring is also the master status light

Six mounts, up to twelve stems — counting red stems under fire is
still counting. Give the global answer to the one line the eye already
owns: **the ring's own color** = white/teal when every live threat is
answerable, amber when queues or thermal lockouts are strained, red
while anything is uncovered. Zero added ink; the scope's most prominent
element becomes its one-glance verdict.

## P2.5 Eye-flow law: the scope is the SECOND glance

Combat attention lives center-screen (the reticle cluster, the strip,
damage direction) — that is standing battle-HUD anatomy. The scope
cannot and should not compete for urgency. **Its unique jobs are the
two things the center cannot say: coverage and geometry.** Urgency
stays center (the existing INBOUND strip); the soonest-stem pulse
remains only as a cross-reference when the eye arrives. This finally
settles the numeric-ladder question for good: numbers on the scope
would duplicate the center at a worse address.

## P2.6 NEW — the intercept leg gets a picture

Pass 1 left escort's quiet leg as a bare nav disc. But the intercept
leg has a scope-shaped job: close a moving rendezvous. While the job is
'intercept': her blip, her track line, and the computed rendezvous
point ∘ drawn on the disc — the mission strip keeps the numbers, the
scope shows the geometry, and the pilot learns scope-reading in calm
before the same instrument goes loud. Cheap ink, big continuity.

## P2.7 Symbology amendments

- **Ambient ordnance: REVERSED.** Pass 1 said undrawn; that makes the
  instrument lie about a torpedo crossing your bow while you spectate.
  Instruments report the world; GRAMMAR reports concern. Ambient
  ordnance and traffic both appear as the same faint anchorless dots —
  alive, stemless, tintless, silent.
- **The rim ghosts are the elevation scale**: drawn at the ±45° caps
  only, so a stem "touching the ceiling" reads as a steep threat
  without any numbers.
- **Palette law**: gold belongs to the WORLD's gunfire and is banned on
  the scope. Instrument palette: teal = handled/yours, amber =
  strained, red = threat/unhandled, white = reference geometry.

## P2.8 The morph is a picture-cut, not a data-morph

Animating the range remap would slide every blip mid-transition —
disorienting exactly at the klaxon moment. CICs don't morph pictures;
they switch them. **Revised: nav ink fades out (~100 ms), the empty
plane tilts (~200 ms), combat ink fades in (~100 ms).** Same 400 ms
envelope, nothing slides, and the empty-plane beat reads as the
instrument taking a breath before the fight.

## P2.9 Consolidated decisions (supersedes pass 1's list)

1. Tilt ≈ 40–42° with the ink z-order law — NEW verdict of P2.1.
2. **Outer-weighted two-zone mapping** + ring flash on crossing —
   SUPERSEDES pass 1's enlarged inner disc (P2.2).
3. **Corridor read**: threat axes tinted by ring intersection; the
   escort loop = keep red dashes at zero — NEW (P2.3).
4. Ring as master coverage light + per-stem TEWA tint — refined (P2.4).
5. Combat morph as picture-cut, battle-flag driven — refined (P2.8).
6. Nose-up bearing + lane-stable vertical — UNCHANGED, survived attack.
7. Ambient = faint anchorless dots INCLUDING ordnance — REVERSED
   (P2.7).
8. Urgency stays center-screen; scope pulse is cross-reference only —
   sharpened (P2.5).
9. Intercept-leg picture (her track + rendezvous ∘ on the disc) — NEW
   (P2.6).
10. Ghost-track glyph reserved for DARK RUNNER — UNCHANGED.


---

# PASS 3 — the research pass

*Same day, after Tirtha's bench verdict on the free cylinder ("doesn't
look like an actual cylinder… I do think having a proper plane is
necessary") and his mandate: stop mocking, research how fighters, games,
and the show actually do this. Mock untouched this pass.*

## P3.1 Fighter avionics: they never draw the volume

Air-to-air radar displays are **B-scopes** — azimuth across, range up,
a flat Cartesian plot — and elevation is carried as DATA, not geometry:
an antenna-elevation caret on the display edge, and per-target
altitude/Mach printed as digits (the F/A-18's TWS prints bearing,
range, altitude, Mach beside the track). Where aviation needs the
vertical picture it adds a SEPARATE side-profile view (the Vertical
Situation Display) — the "coplanar" pattern — rather than tilting the
plot into perspective. Nobody who does this for a living renders a
free volume. ([B-scope primer](https://codex.uoaf.net/index.php/Air-to-air_radar),
[DCS F/A-18 radar](https://dcs.man-sim.org/en/fa18c/11.a-t-a/))

## P3.2 The human-factors literature has a name for our problem

The free-cylinder's weakness isn't taste — it's **line-of-sight
ambiguity** (Boyer & Wickens 1994; Sedgwick's "projective ambiguity"):
in any static perspective projection, position along the depth axis is
under-determined, so relative-position judgments — exactly a combat
scope's job — degrade. Wickens' cockpit-display studies find coplanar
(map + side view) beats 3D perspective for precise horizontal AND
vertical judgments; 3D's ambiguity cost disappears only with
INTERACTIVE viewpoint rotation — affordable in Homeworld's fullscreen
sensors manager, not in a corner instrument. ([Wickens CDTI study](https://www.researchgate.net/publication/253458007_Cockpit_Display_of_Traffic_Information_The_Effects_of_Traffic_Load_Dimensionality_and_Vertical_Profile_Orientation),
[Olmos & Wickens on tactical displays](https://www.semanticscholar.org/paper/Tactical-Displays-for-Combat-Awareness:-An-of-and-Olmos-Wickens/0a612e1187e138110c713b5ea481fb6a873fd184))

## P3.3 Games: forty years of the same verdict

- **Elite (1984 → Dangerous)**: the enduring, beloved solution is the
  plane + stem — the community explains it exactly as the anchor
  mechanism ("the other end shows where the object is on the horizontal
  plane; the length shows how far above or below").
  ([Elite scanner guide](http://nosuchwebpage.com/index.php?post_id=107))
- **Sphere/orb radars** (FreeSpace's optional orb and kin) are
  community-rated "hardcore," harder to read, and a plane that moves
  with ship rotation is called out as confusing — supporting both the
  plane AND the lane-stable vertical.
  ([design thread](https://gamedev.net/forums/topic/486579-opinions-on-space-radar-style/4179375/))
- **Homeworld's sensors manager** earns its 3D by being fullscreen and
  freely rotatable — the interactive-rotation exception from P3.2,
  unaffordable at minimap scale.

## P3.4 The show: volumes always carry reference structure

The Expanse's UI language (HUDS+GUIS breakdown): the Roci's screens are
functional, under-the-hood, command-line-flavored — our HUD already
speaks this. Its holograms are for MAPS ("a 2D map is simply not
adequate"), and even those always include **orbit lines and a faint
grid for distance reference** — the show never floats naked dots in a
volume. Reference structure inside the volume IS the show's look.
([HUDS+GUIS on The Expanse](https://www.hudsandguis.com/home/2021/theexpanse))

## P3.5 Synthesis — the cylinder is the vessel, the plane is the truth

Tirtha's two instincts after seeing the naked cylinder — "it needs the
plane" and "the cylinder should look like a real cylinder, edges
colored, fading toward the middle" — are exactly what the research
supports, and they are not in tension:

- **The DATA layer** (what the eye measures): the ship-level PLANE,
  stems anchoring every contract threat, the PDC ring on the plane,
  corridor axes, TEWA tint. This is Elite's law, the fighters' law,
  and Wickens' law.
- **The VESSEL layer** (what makes it a cylinder): edge-lit walls —
  rim color strongest at the caps and walls, **fading to nothing
  toward the middle** (his image), drawn as gradient strokes. The
  cylinder look without a single pixel of data ambiguity. The show's
  precedent: structure, not naked space.
- **Simplification** (his ask): default ink shrinks to FIVE things —
  plane, ring, stems+dots, corridor axes (escort only), vessel edges.
  Wedges, rim-cap scale marks, velocity ticks become off-by-default
  toggles. Fighter practice suggests one optional NUMBER: the soonest
  threat's time digit, nothing else.
- **A BIGGER combat scope** (his ask): the morph grows the panel —
  nav stays 132 px; combat expands the instrument (~200 px, panel
  priority) the way a fighter gives the fight a dedicated MFD page.
  The picture-cut morph already provides the beat where growth reads
  naturally.
- Considered and set aside: the full aviation **coplanar** answer (a
  separate side-profile strip) — highest measurement precision, but
  Wickens' own finding is that scanning between views costs under
  load, and at minimap scale the scanning cost dominates. Revisit only
  if playtest shows elevation misreads.

## P3.6 What this changes in the decision list

Supersedes P2.9 items 1 and pass-1's geometry framing where they
conflict; everything else stands:

1. Representation: **plane + stems inside an edge-lit cylinder vessel**
   (fading walls, his aesthetic; the data layer untouched by it).
2. Combat scope SIZE: morph 132 px → ~200 px panel expansion.
3. Default ink: the five-element kit; everything else opt-in.
4. Optional single digit: soonest-impact seconds beside its stem.
All other pass-2 decisions (outer-weighted mapping, ring status light,
corridor read, lane-stable nose-up, ambient grammar, ghost tracks)
survive the research unchanged.
