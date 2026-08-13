# THE SCORE — exploration pass 1 (2026-08-14)

Tirtha, 2026-08-09: "music has been absent… the Expanse is really good
because of the music." Tirtha, 2026-08-14: "I don't really trust you
with creating music… but I'm fine having an exploration pass." So: this
document THINKS; nothing here is built. The bench and any sound waits
for his ruling on the approach.

## What the reference actually does (Clinton Shorter, The Expanse)

- **Sparseness is the instrument.** Long stretches carry only a drone
  or nothing; the music enters for MEANING (arrival, dread, grief), not
  for wallpaper. Silence is the default state, sound is an event.
- **Percussion is industrial and dry** — struck metal, taiko-adjacent
  hits, no reverb-drenched Hollywood swell.
- **The Belt has a voice**: sparse vocal lines (the "Belter lament"
  color), fifths and open intervals, nothing lush.
- **Drones carry dread and scale**: low sustained clusters that sit
  UNDER the sound design rather than over it.

Corollary for us: our SOUND LAW (every sound earns its place) extends
naturally — the score must be mostly absent to matter when present.

## Three candidate approaches

### A. Curated CC beds (licensed tracks, streamed/bundled)
Real composed music (CC-BY / CC0 ambient — e.g. Kai Engel, Scott
Buckley tier, or commissioned later). Pros: real musicianship, zero
taste risk from generative code. Cons: attribution management, payload
(3–6 MB/track — against our payload discipline), loops audible on a
15-min session, and NOTHING will sound like it was written for our
world unless we get very lucky curating.

### B. Generative WebAudio (the house engine grows a music voice)
Drones, slow pads, sparse struck-metal hits — synthesized like all our
audio (no samples, no payload). Pros: infinite, adaptive by
construction, zero licensing, aesthetically OURS. Cons: this is the
part Tirtha explicitly doesn't trust me to make tasteful — generative
"music" reads as noodling very easily. If chosen, it must pass through
a LISTENING BENCH (score.html) where he auditions every layer alone
and in combination, exactly like radar.html settled THE SCOPE.

### C. Hybrid (recommended lean)
Generative FOUNDATION (drone + rare metal hits — barely "music", more
like the ship's soul; low taste risk because it stays close to sound
design we've already proven) + a small number of COMPOSED MOTIFS
reserved for meaningful states (arrival fanfare 4–6 notes, the vigil's
lament, race start). Motifs are where taste risk lives, so they're
few, short, and bench-judged one at a time.

## The adaptive layer map (state → music), whatever the source

| State            | Music                                        |
| ---------------- | -------------------------------------------- |
| Cold boot        | nothing (the preflight IS the overture)      |
| Idle drift       | near-silence: drone at threshold             |
| Transit/warp     | drone opens up; one motif at arrival         |
| Battle           | music OUT (Sound Law: combat owns the mix);  |
|                  | at most a low pulse under the PDC            |
| The hunt (hot)   | dry percussion only, sparse                  |
| Racing           | pulse layer, no melody                       |
| THE VIGIL sphere | everything yields; if anything: one held     |
|                  | vocal-ish tone, the Belter lament color —    |
|                  | or true silence (current behavior may BE the |
|                  | right score here)                            |
| Cantina (Drift)  | the jukebox: diegetic CC Belter tracks with  |
|                  | NOW PLAYING credit — separate from the score |

Ducking discipline: the score NEVER competes with sound effects; it
sits ~12 dB under, and the vigil duck (setVigilDuck) already outranks
everything.

## What the bench must prove before anything ships

score.html (permanent, like radar.html): every layer solo-auditable,
every state-transition triggerable, A/B between approaches A/B/C on
the same simulated 10-minute session timeline. Judged by ear — his.

## Open questions for Tirtha

1. Approach: A (curated), B (generative), C (hybrid — my lean)?
2. Does THE VIGIL get a lament, or is silence its score? (My lean:
   silence is already working; add nothing until it feels missing.)
3. Jukebox: ride along or separate later pass?
4. Budget for commissioned motifs someday, or CC-only forever?
