# THE MARKER GRAMMAR — exploration pass 1 (2026-08-13)

Tirtha's verdict on the first glyph pass: "I see no change… it looks very
colorful, like a festival of lights. Lot of clutter." His rule, verbatim:
**color IS category.** All portfolio systems one color. Stations another.
POIs a different color AND symbol. Proper thinking, not decoration.

## What was wrong

Every label carried its own accent color (magenta TRAVEL, yellow BLOG,
red RECOMMENDATIONS, pink READING, orange EMBER…). Color carried NO
information — it was per-thing branding, so the eye had to read every
name. Nineteen labels at once, nineteen colors. The 8px glyphs I added
were decoration on top of noise.

## The rule (his): color answers "what KIND of thing is that?"

One glance, no reading. Five categories, five colors, five shapes:

| Category      | What                                            | Color                | Glyph          |
| ------------- | ----------------------------------------------- | -------------------- | -------------- |
| PORTFOLIO     | the 7 content systems + their planets           | amber `#ffb45e`      | filled diamond |
| INFRASTRUCTURE| the Drift, comms station, docks                 | teal `#5fd0c0`       | square         |
| POI           | spills, secrets, activities, wrecks             | grey-blue `#8fa8bd`  | ringed dot     |
| CONTACT       | live ships (escort haulers)                     | dim white `#aab6c2`  | chevron        |
| HOSTILE       | the hunted raider                               | signal red `#ff7a5c` | double chevron |
| MEMORIAL      | the vigil                                       | cyan `#9fdcff`       | burning candle |
| FRONTIER      | the UNSURVEYED stars (the Deep's business)      | ash `#6c7a86`        | hollow diamond |

The AMBER answers the portfolio question ("where's the content?") from
any distance. TEAL answers "where can I dock?". Everything grey-blue is
world texture — present, never shouting. The candle is the only thing
that breathes.

## Implementation notes

- One source of truth: `markerCategory(label)` + `MARKER_COLORS` in
  `hudState.ts`. Labels DON'T choose display colors anymore — the
  category does. (`label.color` stays for radar/legacy uses.)
- Ship contacts ride the existing `ship-*` id convention;
  `ship-draugr` is the hostile.
- Inert systems carry `category: 'frontier'` from config.
- Declutter: POI label range tightened 4000 → 2500 (they are local
  texture, not nav targets). Collision culling and per-kind ranges
  already existed and stay.
- The in-WORLD color stays rich (boards, stars, liveries keep their
  accents) — calm is a HUD property, not a world property.

## Pass 2 (2026-08-14) — his second verdict, shipped

"The marker is tiny… invisible because there are other stars. We need
proper actual designs — look at Everspace 2. Big enough to spot, really
good balance." And: names at the sphere are for STARS; planets
introduce themselves only on arrival. And: the jump chart follows the
same grammar in sections.

- **Designed SVG marks** (MarkerIcon.tsx) replaced the 8px CSS glyphs:
  every mark sits on a soft dark backing disc (the disc is what makes a
  mark readable over the Milky Way), 13–22px by importance, subtle
  category-color glow on systems and the memorial. Portfolio = double
  diamond; frontier = dashed hollow diamond; infra = docking brackets;
  POI = scanner reticle; contact = hull chevron; hostile = double
  chevron (pulsing); memorial = the candle; planets = small ringed dot.
- **Names for stars, arrival for planets**: the 2600 sphere names
  SYSTEMS; planet marks appear <1600 and their names only <1000 —
  you meet the planets when you're among them.
- **The jump chart sectioned by the grammar**: DOCKS (teal) ·
  PORTFOLIO SYSTEMS (amber) · UNSURVEYED (ash), section headers in
  category colors, destination dots follow.

## Open questions for future passes

- Planet labels inside inert systems will read amber (portfolio) if
  ever visited before survey — acceptable until the Deep opens them.
- The tactical radar still uses per-thing colors; folding it into the
  category palette is a follow-up judged on its own screenshot.
- Battle mode already blanks all labels (kept — threats own the screen).
