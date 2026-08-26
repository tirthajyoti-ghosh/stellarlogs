# THE MOBILE HUD CHARTER — exploration & thinking (2026-08-26, no code)

His six items from the phone, thought through completely before any
build. The core ruling this document serves: **the mobile HUD shares
NOTHING with the desktop HUD.** Two instruments panels for two
cockpits.

---

## PART A — THE COMPLETE DESKTOP HUD INVENTORY (from code)

Every element the desktop draws, with its job and its CURRENT mobile
behavior — the leak list is the point:

**HUD CHROME (panels & text pinned to the screen):**
| # | Element (component) | Job | On mobile today |
|---|---|---|---|
| 1 | NAV MFD, left (Cockpit) | system name, HDG/POS, jump list | hidden (chart chip replaces) ✓ |
| 2 | TACTICAL SCOPE, right (Radar) | nav map / battle cylinder | hidden; battle-only 118px disc ✓ |
| 3 | DRIVE CONSOLE, bottom (Cockpit) | **speed M/S**, throttle state, pitch, RCS schematic | hidden — took the speedometer with it (his item 3) |
| 4 | ACTIVITY PANEL (ActivityPanel) | board title + label·value rows (IN LANE / MANHUNT / BEST) | **LEAKS** — his screenshot |
| 5 | COACH LINE (ActivityPanel) | one-line guidance | kept, restyled top-center (violates the no-common law) |
| 6 | WARP PANEL (WarpPanel) | destination + distance | **LEAKS** (scaled 0.85) |
| 7 | BATTLE CLUSTER (BattleHud) | VEL / PDC pips / HULL around reticle | **LEAKS** (scaled 0.82) |
| 8 | WARNING STRIP (BattleHud) | TORPEDO/ROCK INBOUND | **LEAKS** (font-shrunk) |
| 9 | CENTER BANNER (BattleFx) | tiered say() voice | **LEAKS** (font-shrunk) |
| 10 | HIT DIRECTION + DAMAGE VIGNETTE (BattleFx) | where it came from / hurt state | leaks |
| 11 | SCANLINE / WARP TINT / WARP FLASH overlays | cockpit glass feel | leaks (cheap, cosmetic) |
| 12 | MUTE BUTTON | audio toggle | kept, repositioned |

**WORLD ANCHORS (projected onto things in the world, not screen
furniture):** label layer (names+distances on stations/planets/POIs),
threat arrows/boxes (TRK), race gate arrow/ring, hunt capture disc,
hostile name on the scope. These are the world's signage, not HUD
chrome — Part B proposes they are TUNED for mobile, not banned, and
this is flagged as an open question for his ruling.

**MOBILE-ONLY today (already separate):** landscape gate, deck
tutorial, chart chip + drawer, floating stick, throttle, context
pills, camera zone.

## PART B — THE MOBILE HUD, DESIGNED FROM ZERO

The phone set, complete. Nothing inherited; every desktop chrome
element above gets `body[data-touch]` display:none, and mobile draws
its own:

- **M1 · THE CHIP** (exists): map icon + system name, top-left. The
  only nav chrome.
- **M2 · THE SPEED BUG (new — his item 3):** a compact speed readout
  living DIRECTLY ABOVE THE THROTTLE — the thumb's home column, where
  the eye already goes for drive state. Large tabular digits (~20px)
  + "M/S" microlabel + a small chevron showing accel (▲ amber) /
  decel (▼ teal) / steady (·). Nothing else. Rationale: speed is a
  drive fact; it belongs beside the drive control, not center-screen
  (center belongs to the world).
- **M3 · THE VOICE, mobile edition:** ONE banner style (center,
  15px, plate-backed) + ONE coach line (top-center, 11.5px, single
  line). These are mobile-owned styles, not the desktop banner
  shrunk: separate class, tighter copy budget (≤5 words for coach on
  touch — enforced at the string source with touch variants).
- **M4 · BATTLE SET, mobile edition** (replaces the leaked cluster):
  one TOP STRIP: warning text (11px) with hull as a 3-segment
  micro-bar and PDC pips INSIDE the strip's right end; the scope disc
  top-right (exists); proximity bar under the disc (exists in scope).
  No VEL panel (the speed bug covers it), no separate hull panel, no
  center furniture — the reticle area stays clean world.
- **M5 · CONTEXT PILLS** (exist): the only mission chrome. The
  ACTIVITY PANEL DIES on mobile — its data (lane counts, case
  status, best) lives on the in-world AMNIA DOCKS board itself:
  show, don't tell; fly closer if you care.
- **M6 · WARP MICRO-LINE:** during transit only, a small line under
  the chip: "BLOG · 5.2K · 12S". The desktop warp panel never shows.
- **M7 · WORLD ANCHORS, mobile-tuned** (pending his ruling): labels
  keep but stricter culling on touch (fewer simultaneous, min font
  12px, distances dropped under 900u); threat arrows slightly larger
  (combat-critical); race/capture anchors unchanged (already world).
- Scanline/tint/damage vignettes: keep (glass, not information —
  cosmetic layer, near-free). Flagged in open questions.

## PART C — THE THROTTLE, THIRD TRY: EYES-FREE (his item 4)

Why the lever failed: SETTING a detent means AIMING at a detent —
which means LOOKING. A control the thumb must aim at fails the core
test of flight controls: eyes stay on the world.

Frequency ranking of drive verbs (black-box + design truth):
1. thrust on/off — constant
2. coast — constant (it is thrust's release)
3. max burn — frequent (transits, chases)
4. reverse — RARE (docking, the arrest ring)

The design that follows (recommendation):
- **One big BURN button at the thumb's rest (hold = thrust, release
  = coast).** The most frequent pair costs zero thought and zero
  looking — it is every shooter's trigger. The thumb FINDS it by
  position; no aiming.
- **Swipe UP while holding = MAX BURN LOCK** — persists after
  release; TAP the button to kill the lock. (The PUBG sprint-lock he
  asked for originally; muscle-direction, not target-aiming, so it
  stays eyes-free.)
- **REVERSE = its own small hold-only button** above BURN. Rare +
  deliberate + hold-only = safe and discoverable (it is VISIBLE,
  unlike the old swipe-down), and its rarity earns the reach.
- **State is SHOWN, not remembered:** the button glows amber while
  locked, the SPEED BUG sits right above it, and the plume itself is
  the truth. Nothing requires reading a scale.
- The 4-detent lever is retired. The first gesture build failed on
  discoverability (hidden grammar), the lever failed on eyes-down
  (aimed grammar); this keeps the lever's honesty (visible state) on
  the gesture's economics (positional, not aimed). The tutorial's
  step 2 already teaches the one gesture that exists.

## PART D — THE STICK FIXES (his item 1)

1. **Edge clamp:** when the thumb lands closer than (stick radius +
   10px) to any screen edge, the stick CENTERS CLAMPED inside that
   margin while input keeps tracking the true thumb position (the
   knob can deflect past the ring edge visually capped). The full
   circle is always on screen — thumb position still wins (floating
   law kept).
2. **Parked ghost lift:** parked spot rises to bottom ≥ 96px +
   safe-area (currently sinks: bottom 40 with a +50% translate).
3. Zone unchanged (thumb may land anywhere left; clamp does the
   rest).

## PART E — BRIGHTNESS (+4 more notches, his item 5)

toneMappingExposure 1.3 → **1.55** (each notch ≈ 6%; four ≈ +25%).
Global, desktop included, same as last round's lift. ACES handles the
highlights; verify the vigil hologram and boards don't clip (they are
toneMapped=false — unaffected by exposure — so only world surfaces
brighten, which is exactly what he is asking for).

## PART F — FRAME PACING ON THE PHONE (his item 6)

His description — "frames skipped, no smooth transition, the
resolution of frames is less" — is a FRAME RATE ceiling / jank
problem, not stutter spikes. Two suspect classes:

**GPU fill:** we raised the phone dpr ceiling to native (≤2.5) while
removing bloom. On a 1080p+ phone the plume raymarch (26 steps),
log-depth everywhere, and 200 asteroids at dpr 2.4 is real fill.
AdaptiveResolution only steps down when its median test says pixels
help — and it re-tries slowly.

**CPU main thread (the likelier ceiling):** the July audit measured
the site CPU-bound at heavy viewpoints. Known unfixed costs, all
worse on phone silicon: ~2,950 board material instances / ~36 draw
calls per billboard (the shelved perf plan's B1), no static matrix
freezing (B2), ~19 live point lights in every material (B3),
per-frame label sort+layout DOM writes, troika text updates.

**The program (measure on HIS phone, then cut):**
1. Add a frame-pacing metric to the black box: per 30s, report avg
   fps AND % of frames longer than 1.5× the display interval (jank
   ratio) + current dpr. His ordinary play sessions become the
   benchmark harness — no lab needed.
2. Ship a `?perf=` query-param A/B kit (touch only): `dpr2/dpr17`
   (cap 2.0/1.7), `steps16` (plume raymarch 16 steps on touch),
   `nolights` (far-light gating), `noboards` (billboards static-
   frozen)… each flag logs itself into the black-box session so the
   telemetry separates arms.
3. Execute the shelved perf plan's B1+B2+B3 (board material sharing
   + geometry merge, static matrix freeze, far-light gating) — they
   are pure wins for BOTH platforms and the audit already designed
   them.
4. Then set the phone dpr ceiling where the data says the knee is
   (suspect: 1.8–2.0, not 2.5).
5. Frame pacing polish: `powerPreference: 'high-performance'` on the
   context; verify no per-frame React setState in the deck (the
   throttle/pills use refs + 300ms intervals — fine).

## PART G — OPEN QUESTIONS FOR HIS RULING

1. **The battle set (M4):** one top strip with hull+pips folded in —
   sign off the shape?
2. **The throttle (Part C):** hold-to-burn + swipe-up lock + small
   REV hold-button — approved to replace the lever?
3. **World anchors (M7):** tuned-shared (my recommendation — they
   are the world's signage, not chrome) or fully mobile-redesigned?
4. **Activity panel dies on mobile** with its data living only on
   the in-world board — confirm?
5. **Perf program:** approve the A/B kit + B1-B3 execution order?
6. Scanline/glass overlays on mobile: keep (cosmetic) or kill?
