# Bruno Simon folio-2025 — UX Study

*Field notes from a hands-on Playwright drive of bruno-simon.com (2026-07-25) + published sources
(Awwwards case study, folio-2025 GitHub repo, devlogs). Purpose: distill the design thinking so we
can take inspiration for the stellarlogs.dev redesign — UX design, not assets.*

---

## 1. What it is

One island, one car, one verb. A cozy fantasy-village diorama (~a minute to cross) rendered in a
saturated hand-painted palette, with a **server-synchronized** day/night + seasons + weather
simulation — every visitor on Earth sees the same moment. You drive a small red truck; everything
in the portfolio — projects, career, social links, toys, credits — is reached and operated by
driving into it. There is deliberately **no HTML content UI**: interactions (click, scroll, paging,
input) are recreated on 3D objects in the world. Tech: Three.js + TSL (auto-WebGPU), Rapier
physics, Howler audio, world authored entirely in Blender. MIT-licensed code, CC0 Blender files,
CC0 soundtrack (composer: Kounine).

## 2. Complete zone inventory (11 named POIs, from the in-game map)

| Zone | What it is | How it works |
|---|---|---|
| **Landing** | Spawn: giant physical "BRUNO SIMON" letters, bench, lantern, cherry tree, notice-board hut with the world map painted on it | Letters are physics objects; intro copy: "drive around to learn more… and don't break anything!" |
| **Projects** | A blacksmith **workshop**: wooden-framed screens showing project slides, glowing anvil, grindstone, "FWA DISTINCTIONS" awards bench | Carousel: side signposts NAME the prev/next projects with painted arrows; metadata (ROLE / WITH) as signposts; painted control sign "NEXT → PREV ← OPEN ⏎ EXIT ESC". Two categories: client work + Lab experiments |
| **Career** | A physical **timeline**: 3–4 color-coded neon rails inlaid in the terrain, "2008" slab → "2025" slab, node-gates per milestone | Drive along it; floating labels light per node ("HETIC STUDENT +5 YEARS DIPLOMA"). The rails **terminate at the Social plaza** — your career literally delivers you to "find me here" |
| **Social** | Plaza ring of pedestals with giant carved icons: GitHub, LinkedIn, X, Twitch, YouTube, Bluesky butterfly | Each pedestal has an interact diamond → opens profile |
| **Achievements** | A ruined blue **temple** with a waterfall through it, obelisk on a rune-inscribed platform, glowing glyphs | ~38 tiered objectives (obvious → cryptic), rewards = **car skins** (orange@8, white@15, black@23, flames@30, abyssal@38). Born from watching people speedrun folio-2019 |
| **Circuit** | Half the island: full GP track with red-white curbs, hairpins, checkered start line, grid boxes, five-light gantry, pit garages | Lap timing; **top-10 leaderboard displayed in-world near the start line, resets daily**. Paddock dressed with **sponsor tents that are his tech stack** (Three.js, WebGL), tire stacks, bean bags, inflatable tube-man |
| **Bowling** | Two lanes with pins | Ram the pins; reset available; pins spatialized audio |
| **Cookie Lab** | A cookie stand/oven — **GDPR cookie-banner satire** | "Accept cookies" physically; a **global shared counter** above the oven counts everyone's accepted cookies |
| **Altar** | Crater/abyss structure with fire rim | Falling in increments a **global counter** — "with a special twist" (kept secret) |
| **Time Machine** | Area inside the circuit's north loop | Time/season control toy (day-cycle system exposed as a place) |
| **Behind the Scene** | Floor tiles opened into a **starfield void** — holes in the world's fabric, ringed by traffic cones and a work truck | Credits/tech zone; the menu panel lists Three.js, TSL, Rapier, Howler, fonts, licenses |

**Ambient/social systems on top:** *Whispers* — visitors post ≤30-char messages (T key) that appear
as magic flames with the poster's **country flag**, scattered across the island (max 30 active,
AI-moderated, placement rules). *Campfire* gathering spot. *Jukebox* that switches the soundtrack
("Now playing: Boy.mp3" toast). *Weather* — rain, snow, **lightning**, tornados. Discord panel
(public server + DM). Animated browser-tab title: a car emoji drives between tree emoji.

## 3. How the map is constructed

- **One island, two halves.** East: dense content village (8 zones within ~20s of each other).
  West: the sport (circuit) wrapping ponds. The mystical outliers (Altar NE, Time Machine NW)
  pull explorers to the corners.
- **Wayfinding trinity:** stone-tile paths as desire lines ("tiles work like a path to signal
  there's more this way") + one landmark structure per zone readable from afar + white interact
  diamonds floating at POIs. Map overlay (M / pin button) with hover labels.
- **Zone identity = architecture + a crest.** Each zone has a themed set (forge, temple, rails,
  plaza) and a guild-crest seal inlaid in the pavement (anvil crest at Projects).
- **Water bounds the island** — a soft natural boundary; no walls.
- **Spatial narrative:** the Career rails *end* at Social; the controls are monuments at spawn;
  credits are literally holes showing behind the world. Placement carries meaning.
- **Everything is minutes-dense:** 11 zones + toys on a map you can lap in about a minute of
  boosting. Nothing is far; nothing needs fast travel.

## 4. UX anatomy

**Loading & consent.** The world materializes as a tiny diorama inside a glowing ring on a dark
grid — your car, a lantern, a tree — while the rest streams. "CLICK TO START" (hand-drawn, with a
speaker icon) makes the required audio-unlock gesture *the* start action. The day cycle is already
running on the load screen.

**Camera.** Fixed isometric-ish follow. No player camera control on desktop (two-finger orbit/zoom
on mobile only). Zero degrees of freedom to manage → composition is always authored, always
readable, never motion-sick. The cost — you can't look around — is accepted for the benefit that
*every frame is a designed frame*.

**Controls & onboarding.** WASD/arrows + shift boost + space jump + Enter interact. Taught by:
giant keyboard and gamepad **lying in the grass at spawn with the relevant keys glowing gold** and
arrows pointing at them; painted signs at content ("NEXT → PREV ← OPEN ⏎ EXIT ESC"); a controls
panel in the menu (three tabs: kb/touch/gamepad). No tutorial modal, no forced sequence.

**Driving feel.** Forgiving arcade physics: generous grip, easy reverse, jump to hop obstacles.
Trees/planks are obstacles but never traps — 2–3 errors and you've internalized it (his words in
the FWA/case-study framing: the circuit provides "concrete goals" that justify the car beyond
wandering).

**Failure design.** There is no fail state anywhere except the opt-in circuit clock. Crash through
a rock pile → a "RES(E)T ⏎" prompt appears at the rubble. Fall in the abyss → a shared counter
ticks (and a secret). Stuck → R teleports you to the closest respawn point, and **respawn points
are zone entrances** — the rescue re-aims you at content (I got unstuck onto the "2008" slab facing
down the Career rails). Menu offers "Reset every object."

**Interactivity feedback.** Interactive areas **expand/tilt when driven on** and are also
mouse-hoverable; a floating diamond + prompt appears in range; every collision/action has a
spatialized sound (anvil rings, pins clatter, crates explode). His words: "Sound is… a powerful
UX tool which provides cues, feedback, and clarity." One UI click sound, pitch-varied per action.

**Content delivery.** No modals for content: screens are furniture (wood-framed displays), text is
signposts, metadata is painted boards, links are pedestals. DOM appears only for the menu system
(options/controls/achievements/circuit results/whispers/credits) and toasts ("Now playing").

**Liveness (the "lively" feeling).** Four subtle multiplayer levers instead of shared physics
(his words: a full shared world "wasn't realistic… more subtle multiplayer features"):
1. **Shared time & weather** — everyone sees the same sunset, storm, season.
2. **Whispers** — other humans' messages as flames with country flags, everywhere.
3. **Global counters** — cookies accepted, abyss falls.
4. **Daily-reset leaderboard** — fresh competition every day.
Plus a world that acts without you: day cycle, weather, birds/crickets/waves/wind, floating
wisps. The place feels inhabited even when you're alone.

**Performance doctrine.** "Performance is the real constraint on creativity." Style chosen BECAUSE
it's cheap: 78,400 single-triangle grass blades, camera-facing SDF trees (leaves shrink when they
block your view of the car!), one palette texture for all colors, instancing everywhere, looping
geometry, DRACO + ETC1S/UASTC, TSL → auto-WebGPU, mobile presets that drop water blur/DoF/shadows.

**Personality.** Handwritten font (Amatic SC) for all world text; jokes structural, not decorative
(cookie-consent stand, tech-stack sponsor tents, credits as holes in reality, tube-man, animated
tab title); the copy is first-person and warm ("don't break anything!").

## 5. The distilled thinking (principles worth stealing)

1. **One verb.** Everything — content, toys, links, credits — is operated by driving. No mode
   switch, no second interaction grammar to learn.
2. **The camera is the designer's, not the player's.** Fixed frame = every screenshot is composed,
   nothing is ever off-camera-confusing, zero camera skill required.
3. **Failure is comedy or opt-in, never punishment.** The only clock is the circuit; everything
   else you can only *play* wrong, not *fail*.
4. **Content is furniture.** Reading happens in the world, in diegetic materials (wood, paint,
   neon), with paging controls painted next to the screen.
5. **Placement tells the story.** Career rails end at the social plaza; controls are monuments at
   spawn; credits live behind the world's fabric. Geography does narrative work.
6. **Liveness is cheap and priceless.** Shared clock/weather + strangers' messages + global
   counters + daily boards ≈ multiplayer feeling at ~zero netcode risk.
7. **Rescue re-aims you at content.** Respawn = nearest zone entrance, facing in.
8. **Onboarding is scenery.** Glowing giant input devices; painted key-hints where needed; the
   audio-consent click doubles as "start".
9. **Density over scale.** Eleven zones a minute apart beat majestic emptiness — exploration
   rewards arrive every ~20 seconds.
10. **Sound is a UX channel** (cues, feedback, clarity), not garnish — and it's spatialized.
11. **Goals exist because players asked with their behavior** — achievements were built for the
    speedrunners he observed on folio-2019. Watch what visitors do; formalize *that*.
12. **Performance constraint as art direction.** The look was chosen to be renderable everywhere,
    then polished until the cheapness reads as style.

## 6. Implications for stellarlogs.dev (discussion starters — nothing decided)

**Where we already match him:** content as in-world furniture (billboards, Port Registry boards,
painted signage); zone landmarks + marquees; activities auto-start on entry; one-page-density
*within* each POI; friction-is-fun flight doctrine; attribution done diegetically (his sponsor
tents ≈ our Port Registry).

**Where we differ, deliberately (space genre demands it):** free camera + 6DOF flight is our
Bruno-bowling friction source and our fantasy (being a pilot). His fixed camera wouldn't survive
contact with "you are flying a ship." Same for challenge: our gunnery/Track are real games with
fail states — that's our identity now (see→play→win→move on).

**Where he exposes real gaps in ours:**
- **Liveness.** Our world is static and alone. His four levers all have space-native equivalents:
  synced world clock/lighting events (a shared "solar storm" hour?), visitor transmissions on a
  moderated board (whispers ≈ short radio hails pinned in space with flags), global counters
  (torpedoes downed at the range, Track runs flown, candles at the Nilak vigil), daily-reset Track
  leaderboard (needs a tiny backend).
- **Travel dead time.** His island: next reward is always ~20s away. Our map spread + jump drive
  gives majesty but minutes of nothing between POIs. Worth discussing: densify *clusters* (keep
  system-to-system scale, make each system internally Bruno-dense with toys/secrets).
- **Rescue & re-aim.** Our "I'm stuck" story is weak (manual flying back). Respawn-to-nearest-POI
  standoff, facing the content, is directly stealable.
- **Onboarding as scenery.** We have a welcome popup; he has monuments. A "controls billboard" at
  spawn (giant glowing WASD/mouse glyphs floating near the station) is stealable verbatim.
- **Toy layer.** He has bowling/crates/jukebox — pure delight objects with sound. We have almost
  no gratuitous toys (everything is either content or a mission). Space toys: debris to nudge,
  a derelict horn, asteroid billiards…
- **Micro-delight inventory:** animated tab title, "Now playing" toast, click-to-start-as-audio-
  consent, interactive areas that physically react on approach, one pitch-varied UI click.

**Open tension to resolve with Tirtha:** achievements/skins. He ships them (38 objectives, car
skins) and they demonstrably work for his audience; our standing law is NO meta-progression
(badges/leaderboards rejected 2026-07). His daily-reset in-world top-10 is the closest thing that
might fit our laws (ephemeral, in-world, no account) — the Track already has a local best.

## Sources

- Hands-on Playwright session, bruno-simon.com (2026-07-25) — 20 field screenshots
- [Awwwards — Bruno's Portfolio Case Study](https://www.awwwards.com/brunos-portfolio-case-study.html)
- [GitHub — brunosimon/folio-2025](https://github.com/brunosimon/folio-2025)
- [bruno-simon.com](https://bruno-simon.com/) (site copy, controls, menu panels)
- [Devlog announcements on X](https://x.com/bruno_simon/status/1929492183175876738) · [Devlog 1](https://www.youtube.com/watch?v=OBZtVz6IM18) · [Devlog 11 — New Areas](https://www.youtube.com/watch?v=YtKgrEd7Ec4)
- [Muzli — Bruno's](https://me.muz.li/bruno-simon/bruno-s-2)
