# THE VOICE — one line, five speakers, and a message-tier law

*Exploration pass 1, 2026-08-08. Tirtha's complaint, verbatim spirit:
"that coach line is kind of bombarded… the belt station drinks now… return
to play area… hull critical… all these different lines are displayed
there." Method as the-scope.md: inventory first, defects second, design
third. No code this pass.*

## 1. The inventory — who speaks through what

The HUD has four text channels, and the center banner carries almost
everything:

**Channel A — `.hud-banner`** (center screen, top 30%, kind = battle /
win / info / fail, fail blinks). Twenty-five writers across three
activities:

| speech act | examples | writers |
|---|---|---|
| ALARM | HULL CRITICAL · HULL FAILING — CLOSE UP · PDC OVERHEAT | 5 |
| COMMAND (countdown) | RETURN TO RANGE — nS · RETURN TO THE CONVOY — nS · RETURN TO COURSE — nS | 3 |
| EVENT | WAVE n/3 — CLASS · THERE — THE DRAUGR · TORPEDOES INBOUND — BEARING UNKNOWN · WAVE CLEARED | 7 |
| OUTCOME | DELIVERED + cargo toast · DRILL COMPLETE · RUN COMPLETE · n IS GONE · CRIPPLED · ABANDONED | 8 |
| FLAVOR | "GLAD FOR THE COMPANY, BOSMANG" · YOU TOOK THAT ONE FOR HER · THE AMNIA DRINKS | 2+ |

**Channel B — the battle strip** (TORPEDO INBOUND ×n · IMPACT T-n):
derived state, persistent, correct as-is.
**Channel C — the panel hint** (coach: THREATS AFT — TURN THE SHIP ·
RANGE COLD — PRESS G): the instructor's slot.
**Channel D — the panel flash** (times, results): quiet, correct.

Good news confirmed while auditing: the cargo toasts fire ONLY on the
player's own delivery (`endJob('delivered')`) — the Sound Law holds; the
"belt station drinks" spam is crowding, not an ambient leak.

## 2. The defects (two found by reading, one reproduced clean)

**D1 — last write wins. No priority exists.** Every writer assigns
`activityState.banner` directly, so a 1.8-second flavor line ("YOU TOOK
THAT ONE FOR HER") can OVERWRITE a live HULL FAILING alarm mid-display.
Nothing protects an alarm from a toast. This is the structural root of
"bombarded": five speech acts, one slot, zero arbitration.

**D2 — the stuck countdown is boundary flapping (probable cause).** The
grace logic re-arms with no hysteresis:

    outside → if (graceUntil === 0) graceUntil = now + 10
    inside  → graceUntil = 0

A ship weaving the arena boundary — which combat drift causes naturally,
the W3 fight pushes you around — resets the timer on every crossing:
the banner pins at "RETURN TO RANGE — 10S" indefinitely, counting
nothing, abandoning nothing. Matches Tirtha's "it stays there, not doing
anything." The clean paths were verified live on the harness (flee
straight out: 10→1 → DRILL ABANDONED → hides on schedule), so the bug
needs the boundary dance, not the simple exit. Same flaw exists in all
three graces (range LIVE_RADIUS, convoy CONVOY_RADIUS, race CORRIDOR).
*To confirm against his sighting: which activity was it, and did he
leave by flying or by jumping?*

**D3 — hidden banners keep stale text in the DOM** (`data-on=''` hides
by opacity but textContent remains). Harmless today; a foot-gun for any
future code that flips visibility without writing text.

## 3. The design — a tier law for one voice

The HUD is one crew member talking. A crew member doesn't interrupt
"hull's failing!" to mention what the station drinks. Four tiers, one
rule each:

- **T0 · ALARM/COMMAND** — HULL FAILING, RETURN countdowns, OVERHEAT.
  Owns the center slot unconditionally; blinking red stays. A countdown
  is a stateful single-owner banner (updated in place, hysteresis per
  D2's fix). **Nothing may overwrite a live T0 except a newer T0.**
- **T1 · EVENT** — WAVE banners, the Draugr reveal, inbound calls.
  Center slot when free; if a T0 is live, the event is dropped unless
  still true in 2 s (events are moments; a queued moment is a lie).
- **T2 · OUTCOME** — DELIVERED, COMPLETE, GONE, ABANDONED. Center slot,
  may follow a T0 the instant it clears (outcomes are why the alarm
  ended).
- **T3 · FLAVOR** — cargo toasts, "glad for the company," kill
  acknowledgments. **Leaves the center entirely**: joins the panel
  flash region (Channel D), quiet and lowercase-energy, where the BEST
  TIME line already lives. The center never says "THE AMNIA DRINKS"
  while anything is shooting.
- **Coach lines stay in Channel C** (the panel hint) and go plain:
  no aft/stern/port/starboard anywhere. Rewrite catalog:
  - THREATS AFT — TURN THE SHIP (A / D) → **THREATS BEHIND YOU — TURN
    (A / D)**
  - new W1 instructor rotation (non-veteran only, from the approved
    coach plan): **GUNS ARE AUTOMATIC — FLYING IS YOUR JOB** → **SCOPE:
    TEAL = A GUN HAS IT · RED = OUTFLY IT** → **THE RING IS YOUR GUNS'
    REACH**
  - moment-of-violation coach (any hit while nearly stationary):
    **YOU'RE SITTING STILL — BURN**
  - all future text speaks in above / below / left / right / behind.

Implementation shape (when approved): `activityState.say(tier, text,
kind, seconds)` replacing raw banner assignment — one arbiter, ~30
lines; writers change one call each. Grace fix: re-arm only after
returning WELL inside (radius − 200 u), and the countdown survives
boundary flicker.

## 4. Decisions for Tirtha

1. The four-tier law + T3 leaving the center — yes/no/amend?
2. The plain-language catalog above — approve lines as written?
3. D2 fix (hysteresis + persistent countdown) — build with the tiers?
4. His stuck-banner recipe: which activity, and how did he leave — to
   confirm D2 is the whole story.
