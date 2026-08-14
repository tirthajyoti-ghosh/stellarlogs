# THE SOUNDS — real recordings replace synthesis (pass 1, 2026-08-14)

Tirtha's ruling: the adaptive score is dead; what lives is (1) THE
JUKEBOX — actual music, never generative; (2) RADIO CHATTER — his new
idea; (3) a quality pass on the PDC fire and the drive burn using real
CC/public-domain recordings ("I really like the sound of the TV
series"); (4) the drive EXHAUST VISUAL brought up to the show's look
(reference saved: docs/ref/expanse-drive-exhaust.png).

**The bench: `sounds.html`** — every candidate streams from its source;
nothing is bundled until he picks. Judged by ear — his.

## Sources found and staged on the bench

| Slot | Candidate | License | Source |
| --- | --- | --- | --- |
| DRIVE | Saturn V · Saturn short · Shuttle close-mic · Launch texture · Far rumble · STS-41 ONBOARD CABIN · Low-end far | NASA, public domain | archive.org/NasaAudioHighlightReels |
| PDC | M242 Bushmaster 3-shot burst (854186, qubodup) · minigun bursts (165042, 85246, rob762x51) | CC0 | freesound.org |
| CHATTER | 8 shuttle UHF/air-ground comm bites ("go ahead", "no errors", "roll program", "welcome to space"…) — dozens more in the same archive | NASA, public domain | archive.org/NasaAudioHighlightReels |
| JUKEBOX | Backbay Lounge · Slow Burn · Space Jazz · Lobby Time (Kevin MacLeod) — first slate, can curate wider | CC-BY (credit in NOW PLAYING) | incompetech.com |

## Integration design (built only after his picks)

- **Engine grows a sample voice** alongside synthesis: fetch +
  decodeAudioData at boot (lazy, off the preflight critical path),
  buffers played through the existing bus (master gain, vigil duck).
- **Drive**: chosen take cut offline to a seamless 8–15 s loop
  (crossfade splice, normalized, ~64 kbps mono ≈ 100–200 KB). Gain and
  a slight playbackRate ride the throttle; the current synth rumble
  stays underneath at low level (the sub-band synthesis is good — it's
  the mid/high character that needs the real recording). Interior
  muffling: if the ONBOARD CABIN take wins, a lowpass rides camera
  proximity.
- **PDC**: burst sample sliced per-shot, round-robin pool with ±4%
  rate jitter (no machine-gun phasing), dry. A/B flag against synth.
- **RADIO CHATTER** (new system, `src/audio/chatter.ts`): sparse
  scheduler — near the Drift/docks/escorts only, one bite every 45–120 s
  at most, band-passed 400–3200 Hz + soft squelch click in/out, ducked
  under everything. Sound Law: it must feel overheard, not performed.
  Fiction: dock traffic control. NEVER during battle or inside the
  vigil's quiet sphere.
- **JUKEBOX** (`src/scene/DriftJukebox.tsx`): diegetic point source at
  the cantina — real distance rolloff, NOW PLAYING board with track +
  artist credit (CC-BY attribution), shuffle, maybe a G interaction to
  skip. Tracks bundled at ~96 kbps (~2–3 MB each) or streamed; decide
  at integration by payload budget.
- **EXHAUST VISUAL** (separate build, same pass): Tirtha supplied the
  clearest reference set yet — the plume has STAGES:
  - `docs/ref/expanse-plume-normal-thrust.png` — NORMAL THRUST: the
    nozzle shows a white-hot ring (torus) around a darker throat, a
    tight blue column with visible swirl detail, translucent tapering
    tail a few hull-lengths long. Restrained, mechanical, readable.
  - `docs/ref/expanse-plume-max-burn.png` — MAX BURN: the core blooms
    into a blinding white BALL that engulfs the stern, blue-white
    corona, the tail flares longer and wider but still never billows
    (vacuum — no smoke, no cone spread, just light with structure).
  - `docs/ref/expanse-drive-exhaust.png` — the five-nozzle wide shot:
    per-nozzle turbine-spiral detail at close range, parallel streaks.
  Our current plume is two scaled cones; the upgrade maps our existing
  throttle states onto the SHOW'S stages: idle → dark nozzle with the
  hot ring only; cruise thrust → normal-thrust anatomy; boost (Shift)
  → max-burn bloom. HDR core + torus ring + tapered swirl column +
  streak fade, judged frame-by-frame against these three references.

## HIS BENCH VERDICTS (2026-08-14) + what shipped same day

1. **DRIVE — WINNER: Shuttle Launch Close-Mic, from ~47 s** ("the
   actual crackling of the engine exhaust — that's really good").
   SHIPPED v2 (his correction 2026-08-14): the loop is EXACTLY his
   40–45 s segment — 5 s, wrap-point crossfade, +7 dB, mono, 60 KB.
   Normal thrust plays it at 0.2 gain over the synth sub (synth drops
   to 60% when the sample is live).
   **MAX BURN** (his must-have: "a blast sound and then a louder
   burning, crackling sound"): SHIPPED v2 — ONE boom, INSTANT. The
   true transient sits at 11.23 s in Launch-Sound_Sonic-Booms (the
   earlier "boom at 10 s" was a windowing artifact); the cut opens ON
   the bang with zero pre-roll and the second boom excised (0.46 s,
   6 KB). Fires the frame Shift engages; the loop then runs 0.5 gain
   at 1.07× rate.
   Samples lazy-load after boot; synth-only fallback if fetch fails.
2. **PDC — miniguns REJECTED** ("one continuous sound — in the show I
   can make out single firing sounds; fast, sharp, treble-forward,
   bass muted"). New bench candidates: two .50 cal recordings with
   distinct shots (CC0, freesound 160355/239138) + the Bushmaster.
   SHIPPED: his pick, the Bushmaster — ONE round sliced as THE UNIT.
   v3 after his ear ("bass still more, treble more, muted, faster —
   35–40/s"): recut to 140 ms, highpass 650 Hz, +7 dB treble shelf at
   3.5 kHz, level down again (0.055 base, 0.11 cap), rate 35–40/s.
3. **RADIO CHATTER — APPROVED and SHIPPED** (his spec: random, faint,
   MOSTLY indistinct). `src/audio/chatter.ts`: interval-driven, only
   within 1600 u of the Drift or comms station, 40–110 s random gaps,
   80% murmur / 20% clear bite, squelch clicks either side, stands
   down in battle and the vigil sphere. Assets: 36 s murmur bed cut
   from Gemini XII launch comm (band-passed 500–2600 Hz past
   intelligibility, 40 kbps mono) + five radio-filtered bites.
   All public/audio, 488 KB total.
4. **JUKEBOX — BUILT (2026-08-14 evening)**: DriftJukebox.tsx at the
   Amnia docks (DRIFT+[90,30,40]). Starter rotation: BACKBAY LOUNGE +
   SPACE JAZZ (his approved family), 96 kbps, lazy-loaded only within
   2400 u of the Drift (7.6 MB stays off the boot path). Diegetic
   rolloff full→silent over 160→1300 u; battle ducks it to zero; the
   vigil duck is upstream in master. Between tracks: THE DATA-CORE
   SEEK (static breath + relay click — the approved fiction). NOW
   PLAYING rides THE CANTINA's label: title · OFF THE <ship>'S CORES ·
   K. MACLEOD CC-BY (attribution always visible). Wider curation still
   open — the other 12 bench candidates await his picks.
