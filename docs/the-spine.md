# The Spine — the railgun exploration (pass 1, 2026-08-09)

Born from Tirtha's voice note: "our only attack part is the PDC… what if
we put something like a railgun? The Rocinante did have one in its spine
— more like a sniper." Rolled around against every law, not just
accepted. Player torpedoes examined and rejected in the same pass.

## 1. The identity test

Combat law: "you are not the gun, you are the fire-control officer."
A spine railgun INVERTS it — and that's a missing verb, not a violation:
today every player verb is defensive or custodial (protect, arrest,
survive). The railgun adds the game's one deliberate, aimed, owned SHOT,
and its skill is FLYING (the whole ship is the mount; you point it by
pointing yourself; you hold the line through the charge). The deep law
survives: hands fly, they never aim a turret.

## 2. Where it must not work — impound rules

The hunt's drama is the gun that never fires. So, fiction-true law:
**interdiction contracts are impound contracts; the spine is SAFED on a
manhunt.** Banner on accept: "IMPOUND RULES — SPINE WEAPON SAFED."
The lock game stays the lock game, permanently.

## 3. Where it is true

- **THE DEBRIS STORM (the reason it exists now):** boulders too big for
  PDC rounds fall toward the Drift — the spine cracks the big ones, the
  PDCs eat the fragments. Layered defense, real doctrine, spectacular,
  morally weightless. The storm becomes a two-weapon dance.
- **THE LONG SHOT (the sport):** the range's second discipline. The
  tower tows old freighter hull plates to distance markers downrange;
  line the spine, charge, crack steel at range. Score = distance ×
  plates; best painted on the tower. Plain name, borrowed body,
  five-second read — everything the skeet wasn't.
- **THE DEEP (later, the clincher):** the ASSAY SLUG — fire into a rock,
  the impact flash is the poor surveyor's spectrometer. The weapon built
  today becomes a survey instrument tomorrow. Dual-use; nothing wasted.

## 4. The feel (bench before build — railgun.html, assist-bench style)

Charge ~1.5 s (capacitor whine, hold your line) → one blinding instant
streak → RECOIL: a real backward shove the RCS visibly catches → long
cooldown (~6–8 s). Sniper rhythm against the PDCs' rain. Open questions
for the bench: fire input (tap vs held key), charge-abort, cooldown
length, slug visibility at range, recoil magnitude vs flight feel.

## 5. Player torpedoes — REJECTED, with the bones recorded

1. A torpedo OUTSOURCES the skill — the brain we built flies the fight
   while the pilot watches. Every verb in this game celebrates flying.
2. NO LEGITIMATE TARGET EXISTS: freighters are wards, the Revenant is an
   arrest, torpedoes are the PDCs' food. A weapon without an honest
   target forces content to justify it.
3. The asymmetry IS the combat flavor: they have reach, you have truth.
Revisit only if the Deep births something hostile AND huge — its own
laws say it shouldn't. Torpedoes remain the enemy's voice.

## 6. Sequence (pending Tirtha's ruling)

1. railgun.html — the feel bench (charge/kick/slug/cooldown by hand).
2. The weapon into the ship (input, physics recoil, fx, HUD charge bar).
3. THE LONG SHOT at the range (replaces the retired skeet; OPEN GUNS —
   the tower lobbing its own practice buoys for the PDCs — optional
   beside it).
4. THE DEBRIS STORM as the two-weapon finale.

## BUILT (2026-08-09, same day)

- **Audio v2 first**: the bench's toy sounds (rejected: "spanking someone")
  replaced in both the bench and the game engine — charge is a deep
  capacitor swell (sine undertone + bandpassed brown noise, never a
  whine), fire is a THOOM (brown-noise pressure wave lowpassed at 210 +
  sub drop 74→23 Hz + two close rail tones beating as they cool), vent is
  a falling sigh.
- **The weapon**: systems/railgun.ts (the law) + scene/Railgun.tsx (the
  body). HOLD T charges 1.5 s, release at full fires, early release
  vents, full charge self-vents after 2.5 s into a partial cycle; 7 s
  cooldown. The slug is a hitscan line (no ballistics — his call: "it's
  space, it's a single line"); recoil is a real 26 u/s shove through
  shipRig.pendingImpulse (measured 0→22 on the harness). Aiming is the
  ship's own movement, nothing tuned (his law).
- **Adjudication is registry-only**: slugs hit ONLY registered rail
  targets (plates today, storm boulders next) — combat balance is
  structurally out of reach.
- **IMPOUND RULES wired**: the hunt safes the spine (IceRoute sets the
  flag through every hunt phase); pressing T while safed answers once —
  "IMPOUND RULES — SPINE SAFED" (harness-verified).
- **THE LONG SHOT live**: the proving line 3.4k south of the range —
  militia sign, four condemned hull plates at 800/1600/2800/4200 with
  their ranges painted on, drift-leashed, 12 s respawn; CRACKED / BEST
  RANGE (localStorage) / STANDING panel; touch gets a hold-to-charge
  SPINE button at the line. HUD: a conic charge ring around the reticle
  (amber charging, teal RELEASE, grey cycling).

# Pass 2 — THE SIGHT (2026-08-10, after his first firing session)

His ride's verdict on v1: wrong trigger, wrong availability, invisible
kick, a "light streak" for a shot, and a cooldown circle where an
instrument should be. The redesign, blessed in conversation:

- **Availability law**: the spine exists only where its work exists —
  THE LONG SHOT and the debris storm. Both are weapons-engaged states →
  BATTLE MODE runs there. Normal flight never sees the gun. (Interim
  gate shipped same night: the anywhere-gun is dead.)
- **Trigger = SPACE** (the thumb's key; safe because the gun only exists
  in those two places). T retired.
- **THE SIGHT**: hold Space → the camera DIVES into the keel gun camera
  (telephoto, FOV 55→20, ~8.4×) — aiming is the ship's own movement,
  magnified, nothing tuned (his law). Release at full: fire. Early:
  vent. After the shot the sight lingers a beat for the kick + breech;
  Space during cooldown holds it open to watch the reload.
- **Sight HUD** (battle-cluster language): GUN CAMERA · 8.4× + BRG/PIT
  digits; crosshair with bracket-snap + RANGE/DRIFT on the target under
  it; the CAPACITOR BANK — six discrete cells, amber→teal RELEASE (no
  filling circle); the BREECH LEDGER — LOADED → FIRING → BREECH OPEN →
  NEW SLUG → RAILS COOLING, each with its own bar: the reload as
  visible machinery.
- **The discharge**: violet corona rims the frame at full charge (the
  field made visible); on release — purple-white radial flash, jagged
  electric arcs off the muzzle, a POINTED white core in a violet sheath
  dragging a fading trail, two lateral rail-gas vents.
- **The kick, visible**: camera slams back with shake, crosshair thrown
  off-line and re-settled (re-lay the gun between shots); in third
  person the ship visibly shoves backward (impulse stays real physics,
  raised to read).
- **Audio adds**: the breech CLUNK — low thunk + metal latch tick when
  the new slug seats.

**sight.html** is the judging bench: the complete sequence — dive,
cells, corona, discharge, kick, ledger, clunk — playable end to end.
Game build proceeds on its verdict: camera dive in ChaseCamera, battle
mode at the proving line, Space trigger, the discharge in 3D.
