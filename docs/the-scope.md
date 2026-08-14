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


## P3.7 — Tirtha's bench verdict (2026-08-05, final)

The synthesis approved with one amendment: **the full-width mid-height
ellipse (the drawn plane) goes.** The cylinder is only its two cap rims;
the plane survives as an IMPLIED surface — every stem foot sits on it
and the PDC ring lives on it, so the eye reconstructs it without a third
circle competing with the caps. Ink count drops again. Design LOCKED;
build on his word.


## P3.8 — Build-go amendments (Tirtha, 2026-08-05 evening)

1. **The plane returns as a SURFACE, not a circle.** No mid-height
   ellipse outline — instead a tinted, faintly opaque disc the ship
   sits on. Contacts below the plane are seen THROUGH the tint, so
   "she dipped below" is a material fact, not an inference. Draw
   order: below-plane ink → plane fill → ring/feet/marker → above-
   plane ink.
2. **The morph is THE COLLAPSE**: one continuous camera move. Combat
   engages and the top-down disc tilts open into the cylinder (~450 ms,
   stems growing as it opens); combat ends and the cylinder collapses
   flat to 90° top-down. Content crossfades near the flat pole, where
   3D structure is invisible anyway — replacing pass 2's picture-cut,
   superseded by Tirtha's better idea.
3. Frame constancy restated: plane, cylinder, own-ship marker are the
   constant stage; only the world moves.
4. Bigger combat scope confirmed (132 → 200 px on engage).

---

## EXPANSE COMBAT DISPLAY REFERENCES (2026-08-14 — revisit LATER, his call)

Tirtha supplied three frames from the show's combat displays (saved to
docs/ref/): `expanse-radar-hamma-lok.png`, `expanse-threat-response.png`,
`expanse-target-torp-board.png`. "See how we can improve our own scope in
battle mode… see how cool and yet informative it looks. Let's revisit
this later." Anatomy worth stealing, noted for that pass:

1. **THE DROP-LINE (the big one).** Every contact is a small framed chip
   held above the tactical plane by a thin vertical STEM whose foot
   stands on the plane — altitude reads as stem length, plan position as
   the foot. This is the show's answer to 3D-on-a-2D-display, and our
   cylinder scope already half-speaks it (stem heights). Their version
   adds the framed chip + foot dot.
2. **HAMMA LOK (hammer lock)** — a labeled arc BAND drawn on the plane
   itself marking the weapons-lock zone; when a contact crosses into the
   band, the label sits right in the world, not in a corner. A "you are
   held" state made spatial. (Also DEFOTUNG LOK on the right panel —
   defensive lock readout with stacked chevrons per subsystem
   [SYS][ENG][WEP].)
3. **Guard-zone rings + radial grid** on the plane — concentric range
   rings with spokes; our scope has rings, theirs add the sector spokes
   and an explicit GUARD ZONE control.
4. **THREAT RESPONSE grouping** — contacts G01…G05 wear yellow RING
   markers (halo above the stem) and are assigned to groups in a left
   rail; a red thread connects a ring to its engaged interceptor.
   Group-and-assign grammar for multi-target fights.
5. **The proximity strip** — a single horizontal bar under the plane
   (PROXIMITY / HAMMA LOK) with a red tick: nearest-threat distance as
   a one-glance gauge.
6. **The torpedo board** — tube inventory as a two-column card grid
   (DEFOTUNG / LOK), spent tubes dark, with the ordnance drawn as a
   wireframe schematic below. Ammunition as furniture, not a number.
7. **Corner mass/LOS wireframe** — a tiny 3D wedge readout bottom-right
   (Q22.5 / MASS LOs) — dense, decorative-but-plausible instrument
   corner.

When we do this pass: fold 1, 2, 3 and 5 into THE SCOPE's battle mode
(drop-line chips, lock band, spokes, proximity strip); 4 waits for
multi-contact battles; 6 pairs with the torpedo HUD; 7 is garnish.

8. **PDC COVERAGE CONES** (`docs/ref/expanse-pdc-coverage-cones.png`,
   added 2026-08-14) — the SYSTEM OPS console draws the ship inside a
   wireframe threat SPHERE with the PDC firing arcs as translucent 3D
   CONES growing from each turret, plus a bulged lobe where arcs
   overlap. Right rail: per-turret cards (01 FORE … 06 AFT) in blue
   (AUTO TRACK ready) vs red (OFFLINE/MASKED), ammo bars per gun,
   40MM magazine readouts, launcher grids. Threats appear as red
   tracks in a corner inset ("THREAT DETECTED") before they reach the
   sphere. Direct kin to our scope's PDC-coverage reading — when the
   scope pass happens, the cones-in-sphere is the strongest single
   idea to steal: coverage as VOLUME, not as a ring segment.

   Close-up added (`expanse-pdc-coverage-cones-closeup.png`): the
   anatomy is legible now — the wireframe sphere is a DOTTED point
   lattice, the fore/aft cones are SOLID translucent volumes with a
   bright rim at the mouth, and the third arc is a soft-edged LOBE
   (a bubble, not a cone — a turret cluster's swept volume). The
   ship model sits ghosted at center with turret positions picked
   out as tiny red/blue dots matching the per-turret cards. Grid
   backdrop, corner threat inset, red ring reticles floating free.

---

# PASS 4 — THE EXPANSE COMBAT CONSOLES (exploration, 2026-08-14)

His order: read the reference frames properly, research the show and
the scenes they come from, gather context, THINK — no code yet.

## A. What these screens actually are (scene + story context)

Three of the four frames are the **PAS TYNAN's weapons console**, and
the scene matters enormously:

- The Tynan is a Belter ship — Ashford's, later **Drummer's**. The
  contact held in the display is the **ROCINANTE**, and the state
  hanging in the middle of the volume is **HAMMA LOK**.
- That is **S5E10 "Nemesis Games."** Under Marco Inaros's orders,
  Drummer's faction hunts the Rocinante. Her console gets the lock —
  torpedoes loaded, solution good — and Drummer **refuses to fire**,
  turning on Marco's loyalists instead.
- So the most-photographed tactical display in the show exists, in its
  most famous moment, to make **a decision not to shoot** legible. The
  loudest things on that screen are not numbers: they are a NAME in
  white (ROCINANTE) and a STATE floating in space (HAMMA LOK).

The fourth frame is a **PDC / AUTO-TRACK** console: the ship inside a
dotted engagement sphere with its gun coverage drawn as translucent
volumes, and an inset showing five red streaks — "THREAT DETECTED."
That display answers one question under fire: *am I covered?*

## B. Who made them, and their stated philosophy

Motion graphics by Rhys Yorke, Sumeet Vats, Victor Mare, Chris Ouimet,
Robert Nowacki, Walter H. May, Colin Graham, Nick Melia; production
designer Toni Ianni pushed for practical, functional interfaces
(hudsandguis.com). Their rule, in Yorke's words: *"any screen should
look like it could be functional."* They drew on NASA and military
display guidelines, and gave each ship its own style guide — the
Rocinante's blues with orange/green accents, a command-line
"under-the-hood" feel made for crews, not consumers.

That is the same law this project already runs on (elements earn their
place by informing). Good: we are not importing a foreign aesthetic,
we are importing a **grammar**.

## C. The anatomy, element by element (what I can read off the frames)

1. **THE DROP-LINE.** Every contact is a small framed chip held above
   the tactical plane by a thin vertical stem whose foot stands on the
   plane. Altitude = stem length; plan position = the foot. **We
   already speak this** — our scope is stems with feet on a plane.
   Their refinement: the head is a framed CHIP (identity at the head),
   not a bare dot.
2. **COLOR AS ROLE, not decoration.** Amber = structure and ordinary
   contacts; CYAN = the tracked/primary one (its whole stem changes);
   WHITE = the single most important label; RED = engaged/warning.
   One contact in white is worth more than twelve labels.
3. **HAMMA LOK — state announced IN the volume.** The lock is not a
   corner readout; the words hang in 3D space over the plane, and the
   same phrase labels the proximity strip. Lang Belta: *hamma lok* =
   "hammer lock" — the wrestling hold you cannot escape. (Also on
   these screens: OPERESHANS = operations, AJTO = auto, SITEM =
   system, DEFOTUNG ≈ defense, and the Belter console is titled CHESH
   XALTEWE. Renderings are my reading — Lang Belta dictionaries are
   thin online.)
4. **THE GUARD-ZONE BAND.** A thick banded ellipse at a set radius on
   the plane: the envelope, drawn as a ribbon rather than a hairline.
5. **THE PROXIMITY STRIP.** One horizontal bar beneath the plane with
   a dotted scale and a red tick: nearest threat, one glance, no math.
6. **SUBSYSTEM CHEVRONS.** Three stacked chevron gauges — [SYS]
   [ENG] [WEP] — compact health per system.
7. **THREAT GROUPING + ASSIGNMENT** (Rocinante's THREAT RESPONSE):
   contacts G01…G05 wear ring "baskets" on their stems; a left rail
   brackets numbered tubes into groups; a red thread connects an
   engaging weapon to its target.
8. **THE ORDNANCE BOARD.** Tube inventory as a card grid under
   DEFOTUNG / LOK headers; loaded cards filled, spent cards dark; the
   ordnance itself drawn as a wireframe below. Ammunition as
   furniture, not a number.
9. **COVERAGE AS VOLUME.** Gun arcs as translucent cones/lobes inside
   a **dotted lattice sphere** — the dots never occlude, the rims
   brighten at the cone mouths, and you read the far side through the
   near volume. Per-turret cards (01 FORE … 06 AFT) in blue (auto-
   track) vs red (offline/masked), with ammo bars.
10. **FACTION SKINNING.** The Tynan and the Rocinante run the *same
    underlying display* in different dress: amber + Lang Belta vs blue
    + English. One system, two cultures.

## D. Measured against OUR world (the honest filter)

Our combat is: torpedoes inbound, PDCs answer automatically, one
hostile hull, escort/hunt contracts. Against that:

- **REJECT — the assignment rail (G01…G05 + tubes).** We have no
  manual weapon assignment and shouldn't invent one; our PDCs are
  auto by design and the player's job is *geometry*, not tasking.
  Adding it would be exactly the "fake game-y mechanic" we banned.
- **REJECT — the torpedo tube board.** Player torpedoes are rejected
  on record. There is no inventory to draw.
- **ADOPT (strong) — per-mount cards.** We HAVE six mounts with real
  thermal lockout and real masking, and the HUD currently shows none
  of it. The show's turret rail answers precisely this, honestly.
- **ADOPT (strong) — the lock, announced spatially.** And here our
  fiction gives it back with interest: in the hunt, the raider can
  **squawk surrender**. A player holding a firing solution on a hull
  that is surrendering is *Drummer's exact moment*. If any state in
  this game deserves words hanging in the volume, it is that one.
- **ADOPT (medium) — the proximity strip.** We show "TORPEDO INBOUND"
  as text plus a pulsing stem; a linear nearest-threat gauge makes
  "how long have I got" glanceable without a numeric ladder.
- **ADOPT (cheap) — framed chips at stem heads.** Identity (torpedo /
  hull / escortee) at the head, replacing bare dots. Small ink, real
  information.
- **CONSIDER — coverage as volume.** The single most striking idea in
  the set, and it collides with a LOCKED design: our coverage is stem
  TINT plus dim mount wedges, chosen deliberately because twelve
  translucent cones in a 200 px corner instrument is ink, not
  information. Two ways it could still be ours, both needing his
  ruling (see E).
- **NOTE for later — faction skinning.** The Drift is Belter; the
  player's hull is Rocinante-class. If the Deep ever puts us on
  another people's bridge, the same instrument in another culture's
  dress is a ready-made idea.

## E. The one real strategic question

Everything in D except coverage fits inside the existing corner scope.
Coverage-as-volume does not — it wants room. Three ways:

1. **Leave coverage as it is** (stem tint + wedges) and take only the
   cheap wins. Zero risk, no new surface.
2. **Grow the scope in battle** — it already jumps 132 → 200 px on
   engage; the dotted sphere and 2–3 aggregated coverage lobes (not
   six cones) could live there, drawn as ellipse silhouettes in the
   existing canvas.
3. **A second display, battle-only** — a "SYSTEM OPS" panel that
   appears opposite the scope during combat, carrying the coverage
   sphere and the per-mount cards, and vanishes when the fight ends.
   Closest to the show (their bridges have many screens), most new
   surface, most risk of clutter.

My lean: **2 for coverage + the per-mount cards as a small rail**, on
the grounds that the scope is already the combat instrument and a
second panel splits the eye at the worst moment. But this is exactly
the kind of call he takes better than I do.

## F. Questions for Tirtha

1. Coverage: option 1, 2, or 3 above?
2. HAMMA LOK — do we adopt a lock state at all, and is its dramatic
   home the **surrender moment** (my strong lean) or ordinary
   PDC-tracking?
3. Do the per-mount heat/mask cards earn their space, or is the
   existing stem-tint enough?
4. Proximity strip: yes, or is the pulsing stem already the answer?
5. Language: our Belters are ours. Do their stations carry Lang
   Belta-flavored labels, or stay plain English?

---

## PASS 4, PLAIN WORDS (2026-08-14) — the version that counts

The first write-up of this pass was jargon and he called it: it went
over his head and couldn't be decided on. This is the same thinking in
plain language, and it CORRECTS one factual error (we already show
per-gun status — six pips in battle mode, red on overheat).

**What the show's combat screens are for.** Three jobs: (1) where is
everything, (2) can my guns reach it, (3) am I about to kill someone.
We do (1) well, (2) partly, and (3) not at all.

**Their ideas, one by one, against ours:**

| The show does | We do | Verdict |
| --- | --- | --- |
| Contacts as markers standing above a floor on a pole (height = how far above/below you) | The same — this is our scope already | Nothing to change |
| The marker at the top is a tiny framed badge saying WHAT it is | We draw a plain dot | Cheap upgrade, real information |
| The one that matters is a different colour, its name in white | Everything looks alike | Small, effective |
| "HAMMA LOK" floating over the map = we have a firing solution | Nothing | THE gap — and our surrender fiction gives it meaning |
| A bar under the map: how close is the nearest threat | "TORPEDO INBOUND" in words + the nearest pole pulses | Mostly covered; a bar is glanceable |
| Six turret readouts: which gun is live/overheated | WE ALREADY HAVE THIS (six pips) | No gap |
| Gun coverage as see-through cones in a dotted sphere | Each threat's pole is coloured: teal = a gun is on it, amber = waiting, red = nobody can reach it | Theirs is prettier; ours answers "is THIS one handled" better in a small box |
| Assign specific torpedo tubes to specific targets | Our guns are automatic by design | Doesn't fit — would be the fake mechanic we banned |
| Torpedo inventory board | The player has no torpedoes (decided) | Nothing to draw |
| Same screen, Belter dress vs Earth/Mars dress | One faction so far | Park it for the Deep |

**The three decisions, with recommendations:**

1. **The lock + surrender moment — build it?** RECOMMEND YES. In the
   hunt the raider can squawk surrender. If you are holding a firing
   solution on a ship that is giving up, the game should say so, out
   loud, in the middle of the picture — and then it is your choice.
   That is Drummer's scene, and it is already our fiction.
2. **Coverage cones.** RECOMMEND: leave ours as it is for now. Ours
   answers the question that matters in a 200 px box; theirs is a
   bridge-sized picture. Revisit only if he wants the spectacle.
3. **Small polish batch** — badge markers instead of dots, the
   important contact in white, a nearest-threat bar. RECOMMEND YES,
   it is an afternoon and it makes the scope readable at a glance.

## PASS 4 BUILT (2026-08-14) — and one honest correction

He approved all three. During the build the code corrected the plan:

**Our PDCs can only ever target torpedoes — the player CANNOT shoot the
raider.** So "will you fire on a ship that has surrendered?" is not a
choice this game can honestly offer, and inventing a way to shoot her
just to stage the drama would be the fake mechanic we ban. What IS
true is better: our lock is not a gun, it is a PIN — you corner her by
holding station inside her ring at matched velocity until she squawks.
In this game you win by FLYING, not by shooting, and mercy is
structural rather than optional. So the moment we built is not the
trigger — it is **the arrest**.

Shipped:

1. **THE ARREST.** New state (`hostileYielded`, `hostileName`) set the
   instant she squawks. Her whole glyph turns from threat-red to
   custody-teal, the surrender arc closes into a held ring, the dashed
   lock sphere (now meaningless) is dropped, and the instrument says
   `YIELDED · IN CUSTODY`.
2. **THE ONE NAME.** THE REVENANT prints beside her — the only name on
   the scope — dim white while she runs, bright white once she yields.
   The label flips to whichever side keeps it inside the glass.
3. **THE PROXIMITY STRIP.** The nearest live threat as a single bar
   under the volume, using the scope's OWN two-zone mapping so the PDC
   envelope owns half the bar: the tick crossing the ring mark IS the
   moment the fight changes owners, and it turns teal as it crosses.

Verified live with a forced-state harness in both the chase picture
(red, partial arc, dim name, dashed lock sphere) and the arrest
picture (teal, closed ring, white name, custody line).
