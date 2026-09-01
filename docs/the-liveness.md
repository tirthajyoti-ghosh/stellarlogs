# THE LIVENESS — exploration pass 1 (2026-09-01)

Design exploration before any code (his order: "no code until I say
so"). The question: how does a visitor flying alone feel the presence
of every visitor who came before — without accounts, chat, or
multiplayer netcode.

---

## 1. The ground we already hold (better than the roadmap remembered)

An audit of the repo shows the liveness layer is already half-built —
not as stubs, but as shipped systems that were designed waiting for
this backend:

| Lever (Bruno's four) | Our state |
|---|---|
| Shared clock/weather | **DONE.** The Khione sleet runs on pure wall-clock math (`sleetClock.ts`) — every visitor on Earth already shares the same storm schedule. The docks board posts the next pass from the same arithmetic. |
| Global counters | **Frames built, numbers local.** `tallies.ts` counts torpedoes downed, rocks stopped, candles lit — painted on the militia kill-board (`DriftKillBoard.tsx`) and the vigil (`NilakVigil.tsx`, where the count literally instances candle flames). The file's own comment: "when the liveness backend lands, these frames stay and the numbers become everyone's." |
| Visitor messages | Not built. The comms fiction is ready for it (radio, buoys, the dockmaster). |
| Daily boards | Not built — and see §3: we should NOT build them. |
| (infrastructure) | Anonymous pilot id (`plt-…`, localStorage), session id, store-and-forward batching, the `api/blackbox.ts` endpoint pattern, Upstash Redis attached and paid for. |

## 2. The master constraint: our real traffic

From the black box (internal read, 2026-08-22 → 08-31): **1–14
sessions/day, ~6 average.** Every design decision bends around this
number.

Research confirms what this means (The Button: 51% of all interaction
in its first two days; portfolio-site baseline ~20–50 visitors/day
with HN spikes of 11–18k that decay in 48h):

- **Cumulative artifacts win.** A counter that only grows is always
  large and never looks dead. A candle lit in August still burns in
  December.
- **Anything "right now" or daily-reset loses.** "3 pilots online
  today" reads as an empty room; a daily top-10 is blank six days a
  week. Synchronous presence (live cursors etc.) fails by construction
  at our concurrency.
- **A number that visibly hasn't moved is worse than no number** — so
  every global figure needs a frame that stays honest when it moves
  slowly (totals, not rates; "since the Dry Weeks", not "today").

## 3. The laws that bind this build

1. **No public analytics — his standing rule.** Site metrics are
   internal forever. The line we draw: a *world-fact* (candles lit at
   the vigil) is part of the game; a *metric* (sessions, fps, devices)
   is analytics. The liveness endpoint exposes ONLY an allowlist of
   world-facts he has personally approved — nothing derived from the
   black box, ever, and the two systems stay separate keys, separate
   endpoints, separate tokens.
2. **No badges, no leaderboards** (game-design law). Kills the
   roadmap's old "daily-reset Track top-10" sketch for good (the race
   is tabled anyway). Collective numbers yes; ranked pilots no.
3. **Never fake it.** Research is blunt: fabricated social proof is a
   documented dark pattern that measurably *lowers* trust. No seeded
   counters, no invented presence. The empty room is more honest than
   a mannequin — and our cumulative-only design means the room is
   never actually empty.
4. **Lore-native or not at all.** Every surface must be something this
   colony would really build. Nothing renders as a widget; everything
   is signage, radio, or hardware.
5. **Progressive enhancement** (Bruno's discipline, and ours for
   free): `tallies.ts` is already local-first. If the backend is down
   the boards show your own numbers, exactly as today. An explicit
   "RELAY DOWN" beats a stale lie.

## 4. The surfaces — what exists, what it becomes, what's new

### 4.1 The counters going global (the safe, certain win)

- **The vigil's candles** — the crown. Every candle any visitor ever
  lit burns in the instanced flame field (capped visually, the board
  says the true total). The most emotionally loaded number we have,
  and it needs zero moderation: it is only a count.
- **The militia kill-board** — TORPEDOES DOWNED and KHIONE ROCKS
  STOPPED become all-pilots totals, with the pilot's own count kept
  alongside ("YOURS / ALL HANDS" — both numbers honest).
- **The sleet's civic residue** — after each pass, the docks board
  could post "LAST PASS: n ROCKS STOPPED" — the shared-clock event
  leaving a shared trace. (The pass is already global-schedule; this
  makes its outcome global too.)

### 4.2 Presence traces without messages (new, cheap, zero risk)

- **The pennant line.** A cord of flags at the docks — one pennant per
  country that has ever docked a ship here. Grows monotonically,
  starts at 1 (his), can only accumulate, says "people from 23 places
  have stood where you stand." Flag derived from `Intl` locale
  client-side (Bruno's privacy-clean pattern — no geo-IP), user-
  overridable, user-removable.
- **The dockmaster's log** — "LAST ARRIVAL: [flag] · THIS WEEK".
  ⚠ De-anonymization trap at our traffic: flag + timestamp can
  identify a person. If built at all: coarse time buckets only, flag
  optional. Lower priority than the pennants, which carry the same
  feeling without the trap.

### 4.3 The hails — visitor transmissions as beacon buoys (the jewel, and the entire risk budget)

The vision: a visitor composes a short transmission; it becomes a
blinking buoy pinned in space where they left it; later visitors fly
close and read it. Bruno's "whispers" made diegetic — and his client
is open source (30-char cap, proximity reveal, fixed 30-instance pool,
server-curated rolling window, locale-derived editable flags).

The one big fork, informed by hard research:

**Branch A — free text (30 chars) + moderation pipeline.**
What it costs: 30 characters is the *pathological* case for every
moderation approach — long enough for any slur in any language, too
short for classifiers to have context. A real pipeline is layered:
deterministic regex (URLs, digit-runs, @-handles — the PII/spam
layer), an LLM rubric pass (~$0.24/1k messages via Haiku; the fixed-
category APIs can't encode "no impersonation, on-theme only", and
Google's Perspective API shuts down Dec 2026 — vendor rug-pull is
real), then **hold-for-approval**: nothing renders until reviewed.
At 6 sessions/day the review queue is maybe 1-2 messages/day — read
via an internal CLI, the same way we read the black box. The diegetic
cover is perfect: a transmission "propagates through the relay
network" and appears later. But the failure surface never closes:
PII pasted in, impersonation, evasion, right-to-erasure with no
identity to authenticate, and one human's attention (his) as the
permanent moderation budget.

**Branch B — the phrasebook (construction kit, Dark Souls' answer).**
No free text. A hail is composed from **standard Belter traffic
phrases** — template + slots, curated by us: "KEEP HER TANKS WET" ·
"GOOD HUNTING ON THE LANE" · "I STOOD THE PICKET" · "THE [SLEET/DRAUGR/
DRY WEEKS] TOOK NOTHING FROM ME" · "FLY SAFE, BOSMANG". Composed, not
picked from a flat list — stem × subject × sign-off gives thousands of
combinations, all speakable, none weaponizable. Zero moderation cost,
zero PII surface, zero legal exposure, ships without a queue. The
research honestly notes the cap: an allowlist prevents slurs, not
sarcasm (Rocket League's "What a save!") — our defense is curating
phrases with no victim ("nice try" has a target; "keep her tanks wet"
does not). And ambiguity is native here: Dark Souls proved constrained
vocabulary *generates* meaning, and half-understood radio protocol is
exactly what Belter comms sound like in the fiction.

**Recommendation: Branch B for v1.** It ships the feeling (a human was
here, they chose to say something, the flag says from where) with none
of the risk, and it can't embarrass the site while it's unattended.
Branch A can be revisited once the phrasebook proves people engage.

Shared mechanics either way, straight from the research: buoys render
as a **sampled window** (cap ~30 in-world, oldest expire server-side —
the world reads as populated at any traffic level, and expiry solves
right-to-erasure structurally); proximity reveal (fly close to read —
traversal is what makes finding one feel like discovery); placement
constrained to lanes/POI margins (Elden Ring's ladder-blocking lesson:
the artifact must never occlude gameplay); writing costs a small
ceremony (you transmit from the comms console, not from anywhere —
cheap but not free).

### 4.4 Carry-forward: the Deep

The pilot id + KV + allowlisted-endpoint pattern is exactly the
first-survey-credit architecture (HORIZON): "first surveyed by a pilot
from [flag], [date]" painted on a system's chart. Building liveness
correctly now is building the Deep's social layer early.

## 5. Abuse, cost, and the write path (the unglamorous part that decides survival)

- **Read path is the cost bomb, not writes.** Naive per-visitor Redis
  reads die at 500k commands/month on any HN spike (~4k page loads/day
  ceiling). Answer: ONE public GET, edge-cached (`s-maxage=60`) — the
  whole world reads Redis about once a minute no matter the traffic.
  We're on a paid Upstash tier, but the discipline stands.
- **Writes:** `@upstash/ratelimit` fixed-window (cheapest: ≤3
  commands, ephemeral-cache floor of 0 under a flood), keyed on pilot
  id + IP-hash; server-side validation of everything (bounded
  increments — a candle event is +1, never +n; a counter bump can't
  exceed plausible play rates per session); honeypot + timing checks
  on the hail composer; **interaction gating** — the server mints a
  token on session start and a hail needs a token ≥N minutes old
  (server clock, not client claim).
- **Shadowban as the ban mechanism**: a poisoned pilot id's buoys
  render only for their author. No feedback channel, nothing to evade.
- **Validation is not optional** (One Million Checkboxes died of
  unvalidated indices, not missing rate limits): clamp coordinates to
  charted space, enforce phrase ids server-side (Branch B makes this
  trivial — a hail is three enum indices, not a string).
- **No CAPTCHAs ever** (it's a game). If bot pressure appears:
  Vercel BotID basic (free) on the write endpoint only.

## 6. What we will NOT build

- Live "pilots online now" counts — empty-room by construction at our
  traffic. Any real-time presence claim.
- Daily-reset anything (boards, streaks) — dead six days a week.
- Leaderboards/rankings of any kind — his law, reaffirmed.
- Seeded/faked numbers — dark pattern, measurably corrosive.
- Geo-IP flags — locale-derived + user-editable only.
- Free-text v1 — Branch A stays parked until the phrasebook earns it.

## 7. The build plan (phases, each shippable alone; NO CODE until his GO)

- **L0 — the spine.** `api/liveness.ts` (separate from blackbox):
  POST accepts allowlisted world-fact events (validated, rate-limited);
  GET returns the approved world-facts, edge-cached. Separate Redis
  key namespace (`lv:`). The tallies stay local-first; the boards
  render local numbers instantly, then swap in the global figure when
  the fetch lands ("RELAY DOWN" state if it never does).
- **L1 — the counters go global.** Candles, torpedoes, rocks on the
  existing frames; YOURS/ALL HANDS split on the kill-board; the
  vigil's flame field driven by the true total.
- **L2 — the pennant line** at the docks (first flag surface, no text,
  no moderation).
- **L3 — the hails**: the phrasebook composer at the comms console,
  buoy rendering with proximity reveal, the 30-buoy window, expiry.
- **L4 (later, opt-in ruling): sleet pass residue** on the docks
  board; dockmaster's log if the privacy coarsening satisfies him.

Perf-frontier work (the ~44fps CPU ceiling, label DOM cost, post-dpr
telemetry read) rides alongside L0/L1 as agreed — same infrastructure
bucket.

## 8. Open rulings (his decisions before any code)

1. **The public allowlist.** Proposed world-facts, each needing
   explicit sign-off: candles lit · torpedoes downed (all hands) ·
   rocks stopped (all hands) · country count + list for the pennants ·
   (later) hail texts by construction. Nothing else. Confirm or trim.
2. **Hails: Branch B (phrasebook) for v1?** Or does he want free text
   badly enough to own the moderation queue (Branch A)?
3. **The pennant line: in?** And the dockmaster's log: build with
   coarse time, or skip?
4. **Phase order confirm** (L0→L1→L2→L3), and whether L4's sleet
   residue is wanted at all.
