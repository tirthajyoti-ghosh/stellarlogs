# THE PLUME — exploration pass 1 → build (2026-08-14)

His order: read the reference frames closely, emulate them, and check
whether ready-made exhaust assets exist before building.

## What the frames actually show (close read)

`docs/ref/expanse-plume-normal-thrust.png` — NORMAL THRUST, single
engine, side-on:

1. **The mouth is a LENS, not a flame.** The nozzle opening is filled
   with concentric structure: a bright blue-white ANNULUS hugging the
   bell wall → a darker blue ring inside it → a small INTENSE white
   core at dead center (the throat). The annulus carries mottled
   swirl texture. Light bleeds onto the bell's rim metal.
2. **The tail necks down FAST.** Within about one nozzle diameter the
   plume tapers to a translucent blue flame-tongue, only ~1.5–2
   diameters long, with feathered, slightly ragged edges — a torch
   flame made of light, not a geometric cone.

`docs/ref/expanse-plume-max-burn.png` — MAX BURN:

3. **The mouth becomes a BALL.** Annulus and core merge into one
   overexposed white disc larger than the bell; blue corona bleeds
   past the rim and over the stern silhouette (bloom does the
   engulfing).
4. **The tail becomes a BODY** — several diameters long, wider, still
   translucent and feather-edged, whitest along the axis near the
   mouth, dissolving with distance. No smoke, no cone spread: light
   with structure, vacuum-clean.

`docs/ref/expanse-drive-exhaust.png` — five nozzles, close:

5. **The turbine spiral.** At close range each mouth shows radial
   vane/spiral detail rotating inside the annulus.
6. **The streaks are parallel BEAMS.** Each nozzle throws a long,
   straight, narrow translucent shaft — many hull-lengths, soft-edged,
   non-spreading.

## Asset research → verdict: PROCEDURAL

Searched for drop-in exhaust plume assets: game plumes are not meshes —
they are engine-specific VFX (shader cones, flipbook sprites, particle
systems). CC0 flipbook/flame texture packs exist (Kenney particles,
Unity VFX sheets) but flat sprite flames cannot produce the mouth's
concentric lens + spiral anatomy, which is the identity of the look.
House precedent decides it: the billboard lamps and the vigil hologram
both won as small custom shaders. The plume is EMITTED light (a light
source, not lit surface), so painting it is physically honest — and
the glowRef pointLight keeps casting the REAL light on nearby hulls
(computed-light law intact).

## The build (DrivePlume.tsx) — four layers, one stage value

STAGE: 0 idle → 1 cruise (W) → 2 max burn (Shift+W), smoothed fast;
warp's powered legs read as burn (existing rule kept). All shaders
carry the LOG-DEPTH chunks (house law), additive, depthWrite off.

1. **THE MOUTH** — a disc in the bell: polar shader. Annulus peaking
   near the wall × rotating vane-swirl term × dark inner ring +
   center white core whose gaussian radius grows with stage; at burn
   the core swallows the disc (frame 3 → frame 2 behavior). Idle
   keeps a faint ember annulus (the "hot ring only" stage).
2. **THE TONGUE** — short open cone off the mouth: axial falloff,
   white-hot near the mouth fading to blue, animated hash-noise
   feathering the edge (the raggedness). Cruise ≈ 2 diameters; burn
   longer, wider, hotter.
3. **THE BEAM** — long thin faint shaft for the far read (frame 5's
   parallel streaks): axial fade only. Cruise modest; burn long.
4. **THE CORONA** — a billboard sprite with procedural radial
   gradient at the mouth; scale/opacity ride the stage; at burn it
   engulfs the stern the way the reference blooms.

Judged frame-by-frame against the three references via chase-cam and
orbit screenshots before deploy; his live read rules as always.


## Pass 2 (2026-08-14 night) — his rejection of build 1, and the hunt

His read of build 1: "No no no. When I look at it, I actually see
FLAMES — blue flame. It's not that wide, not that long — nothing
stringing along behind the ship. Normal thrust is way smaller; max
burn is ~3× the thrust and still looks like flames. And the light
spread so much the ship is not visible. Find proper assets — expand
your search terms. Think first."

What was wrong with build 1, named: the BEAM (nothing streams behind
the ship — deleted from the plan), the CORONA (washed the ship out
from chase view — reduced to a whisper), the TONGUE (too dim/thin to
read as burning), and the overall length.

Search terms that worked: "fire spritesheet", "flame animation",
FLIPBOOK — the game-industry standard for "actual flame". Found: para's
CC0 Animated Particle Effects #2 (OpenGameArt) — 64-frame 30 fps
1024² flipbooks including a LIGHTER FLAME (the exact torch-teardrop
silhouette of the show's cruise plume), FIRE 01 (ragged burning body)
and FIRE 02 (soft puffs).

**THE FLAME BENCH: /plume.html** — all three flipbooks animate
blue-tinted off a mock stern with a NORMAL THRUST / MAX BURN (3×)
toggle. His verdict picks the flame; then in-game: the winner rides
two crossed aft-aligned quads at the bell, cruise ≈ one bell-length,
burn ≈ 3×, mouth lens kept, corona to a faint rim bleed, beam gone.


## VERDICT + BUILD v2 (2026-08-14): "B"

FIRE 01 picked off the flame bench. Shipped: the flipbook (hue-shifted
blue offline via ffmpeg, 8×8/64f/30fps) rides two crossed aft-aligned
quads at the bell — cruise ≈ one bell-length, burn ≈ 3× with a wider
body; the bell LENS shader stays underneath; the corona is a whisper
(≤0.14 opacity — the hull is never veiled); the beam is deleted.
Verified side-profile at cruise (compact burning teardrop, ship fully
visible) and burn (tripled flame, ship still readable).


## v2.1 (2026-08-14, his live read of v2)

Fixes, all his: (1) the "+ sign" quad edges — root cause was my ffmpeg
brightness floor lifting the sheet's blacks (additive = faint glowing
rectangles) + cell-bleed from texture filtering; sheet reprocessed
clean (hue+sat only) and UVs inset 2% per cell, alphaTest 0.03.
(2) "Mini star" — brightness cut below the bloom threshold everywhere
(flame color 0.85/1.0/1.25, mouth level and core boosts halved): the
FLAME structure reads now, not a glare ball. (3) Flipbook speed rides
the stage — 45 fps at cruise, 85 at max burn, phase-accumulated so the
speed change never jumps frames. (4) Corona tightened again (opacity
≤0.09, smaller radius).

---

# PASS 3 — BUILD OUR OWN FLAME (2026-08-14, his call)

His ruling: drop the flipbook. "How about we construct our own flames?
The assets we download were also created — why can't we create them?"
And: it must be ACTUALLY 3D, not a hack; it must look like something
BURNING (blue flame), not a bright point source; the player must SEE
the flame. He also invited me to say if the approach is wrong, after
exhausting the options. My honest read: **his instinct is correct and
is also the professional answer for this exact look.** Reasoning below.

## Why the flipbook failed (root causes, not symptoms)

1. **It is 2D pretending.** Two crossed quads have no parallax; orbit
   the ship and the "flame" reveals itself as cardboard. The visible
   "+" was the literal quad edges. No amount of tuning fixes the
   category error.
2. **Additive stacking + bloom threshold 1.0 = a star.** The renderer
   tonemaps ACES with `Bloom luminanceThreshold={1}`. Two overlapping
   quads, each already near 1.0, sum past the threshold across their
   whole overlap → the entire mouth region blooms into a white ball.
   That is the "mini star" — it was never the color, it was the
   accumulation model.
3. **A sheet cannot self-occlude.** Real flame has a near side that
   partially hides the far side; that occlusion is most of what reads
   as "volume". A sprite has no inside.

## Options considered (exhaustive, with verdicts)

| Approach | Verdict |
| --- | --- |
| **Flipbook sprites** | REJECTED (above). |
| **Particle system** (100s of soft billboards) | Still billboards; up close the individual sprites read; classic "gamey" look; heavy overdraw. Rejected — it trades one sprite for many. |
| **Nested shells / layered cones** (shell texturing) | Cheap, but from any oblique angle you see the discrete shells. A hack, and he'd spot it. Rejected. |
| **Mesh with vertex displacement** (a cone whose surface wobbles by noise) | Gives a *surface*, and flame has no surface — it reads as a wobbling solid, not something burning. Rejected. |
| **Screen-space distortion / heat haze** | An accent at best, not the flame itself. Rejected as the primary. |
| **GPU fluid sim (advected velocity field)** | Genuinely simulates combustion; enormous complexity, unstable, per-frame cost, and needs FBO ping-pong. Overkill for a 200px-wide effect. Rejected — but its *look* is what we approximate below. |
| **RAYMARCHED PROCEDURAL VOLUME** | **CHOSEN.** Real 3D by construction. |

## The choice: raymarched volumetric emission

Render a bounding box at the bell. In the fragment shader, walk the
camera ray THROUGH that box in small steps, sampling a procedural
density field, accumulating emission and absorption. What that buys,
each mapping to one of his complaints:

- **Genuinely 3D** — the image is computed from the actual ray through
  the volume, so it has true parallax and looks correct from every
  angle. Orbit proves it (there is nothing to "edge on").
- **Self-occluding** — accumulating with absorption (Beer-Lambert)
  means the near flame dims the far flame. That is the depth cue that
  reads as *burning volume* instead of *glowing decal*.
- **Bounded brightness** — absorption saturates the accumulation, so
  the core approaches a limit instead of summing to infinity. We tune
  the limit to sit just under bloom threshold 1.0, with only the
  smallest throat above it. The star cannot come back by construction.
- **No edges, ever** — the box is invisible; only density is drawn, and
  density falls to zero smoothly inside the box.

## The density field (the actual "flame design")

Local plume space: `s` = 0 at the bell mouth → 1 at the tip;
`q` = radial distance from the axis / plume radius.

1. **Envelope** — the plume silhouette from the references: emerges at
   ~nozzle radius, bulges slightly, tapers to nothing.
   `R(s) = (0.9 + 0.5s) · (1−s)^0.45`, radial falloff Gaussian-ish
   `exp(−(q/R)^2.4 · k)` so edges are soft, never cut.
2. **Advection** — the noise field scrolls along the axis at speed
   (fast at cruise, faster at burn). This is what makes it read as
   *flowing exhaust* rather than a static cloud: structure is born at
   the bell and dies at the tip.
3. **Laminar → turbulent gradient** — turbulence amplitude ramps in
   with `s`: coherent and bright at the throat, breaking into ragged
   tongues downstream. This is both real gas dynamics and exactly what
   the reference frames show.
4. **Domain warping** — sample low-frequency noise to displace the
   high-frequency sample point. This is what turns "cloud" into
   "licking flame tongues"; without it, volumetric noise looks like
   smoke.
5. **Swirl** — a slight rotation about the axis growing with `s`: the
   turbine-spiral in the five-nozzle reference.
6. **Shock diamonds** — periodic axial brightness nodes near the
   throat, decaying downstream. Real rocket physics, visible in the
   references as banding, and the kind of detail that says someone
   *thought* about this.
7. **Temperature → color** — hot (dense, near-throat) white-blue; mid
   cyan-blue; cool deep blue; then nothing. Never orange: this is a
   fusion torch.

## Stages

One `stage` value (0 idle → 1 cruise → 2 max burn) drives: box length
(cruise ≈ 1 bell-length, burn ≈ 3×), radius, advection speed (burn
much faster), turbulence amplitude, emission, and shock-node count.

## Risks and how each is handled

- **Cost.** Raymarching is per-pixel work. Mitigations: the plume
  occupies a small screen area; steps are few (24–32) with a per-pixel
  dither to hide banding; early-out when opacity saturates; noise is
  3 octaves of cheap value noise. To be MEASURED on the bench at full
  screen — which is a far harsher test than the game.
- **"Looks like smoke."** Mitigated by domain warping, tight radial
  falloff, high-contrast density mapping, and fast advection.
- **Looks like a blob.** Mitigated by the laminar/turbulent gradient
  and the shock nodes — structure, not mush.
- **Depth/occlusion.** Box rendered back-faces (works with the camera
  inside), depth-tested, no depth write, plus the house log-depth
  chunks so it tests correctly against every other material.

## Verification plan

A standalone WebGL2 bench (`/plume2.html`) with the same shader,
ORBITABLE — because the one thing that proves "not a hack" is rotating
around it — plus a cruise/burn toggle, a mock bell for scale, and an
FPS readout for the cost measurement. Judged against the reference
frames, then ported into the game only when it earns it.

## BUILT (2026-08-14) — measured, verified, shipped

The bench (`/plume2.html`, orbitable, kept permanently) settled it:

- **Cost is a non-issue.** 34 steps at FULL SCREEN (1470×780 — orders of
  magnitude more pixels than the in-game plume) held a locked 60 FPS.
  Game build uses 26 steps and skips the march entirely when idle.
- **Findings that shaped the look:**
  1. Isotropic noise reads as a CAMPFIRE. The fix that made it a rocket:
     stretch the noise ALONG the flow — fine detail across the jet,
     long streaks down it.
  2. Multiplying density by the turbulence left a dark gap where the
     coherent root ended and the tongues began; turbulence must
     MODULATE a floor (0.40 + 0.60·tongues), not replace it.
  3. A separate collimated slug at the throat gives the incandescent
     root the references show, without a bloom-blowing point light.
- **Proof of 3D:** orbited to a three-quarter view — correct
  perspective foreshortening along the jet, and you can see INTO the
  bell through the nozzle opening. No billboard can do either.
- **In game:** box scaled per stage (cruise 1.15 long ×1.0 wide → burn
  3.2 × 1.5), BackSide so it survives the camera being inside,
  premultiplied-alpha so absorption bounds the brightness under the
  bloom threshold by construction, log-depth chunks (house law), noise
  frequencies scaled with the box so features stay world-constant as
  it stretches. The flipbook sheets are deleted.
