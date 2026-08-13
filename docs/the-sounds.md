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
- **EXHAUST VISUAL** (separate build, same pass): reference is the
  Roci's five-nozzle burn — blinding white-cyan CORE at the nozzle
  throat (turbine-like spiral detail reads at close range), tight
  un-flared column, long translucent blue streaks that fade without
  billowing (vacuum: no smoke, no cone spread). Our current plume is
  two cones; the upgrade: HDR core disc + tapered column + streak
  texture, judged against docs/ref/expanse-drive-exhaust.png.

## Status

- Bench LIVE at /sounds.html — awaiting his verdicts per section.
- Nothing integrated; no repo audio bundled yet.
- THE SCOPE combat-display references (hamma lok, drop-line chips,
  threat response) recorded in docs/the-scope.md for a LATER pass.
