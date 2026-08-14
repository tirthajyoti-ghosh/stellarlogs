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
