# THE PILOT'S LOGBOOK — exploration (2026-09-01, his verdict: option c)

His ruling closed the achievements question: **a pilot's logbook with
port-authority stamps** — diegetic paperwork, no completion %, no
badges, no leaderboards. This pass explores it from the fiction
outward before any code. Visual judging bench: `/logbook.html`.

---

## 1. The fiction, extrapolated (why the Belt stamps paper)

The Amnia runs on scarcity and trust. A colony that lost a hauler with
all hands does not take a stranger's word about what they can do — and
electronic records die with reactors. So the Belt keeps the oldest
kind of proof there is: **paper that was physically in the room when
the thing happened, marked by the authority that watched it happen.**

A working pilot's logbook is their employment history, their
certification file, and their reputation, bound in one object that
lives on the ship. The dockmaster stamps it. The militia stamps it.
The Surveyor's office stamps it. Nobody stamps what they didn't
witness — which is exactly our honesty law wearing a fiction.

The book belongs to the SHIP'S PILOT, but Belter custom keeps the name
line blank — the port authority knows the hull (**BLT-1129**, the
preflight's own header), and that is all the Belt concedes to
paperwork. "Name withheld" is not a missing feature; it is
characterization, and it neatly matches the truth that our pilots are
anonymous ids.

## 2. What earns ink (v1 stamp set — real feats only)

| Stamp | Issuing authority | Earned by | Signal exists today |
|---|---|---|---|
| **PORT OF ENTRY** | Amnia Dockmaster | first arrival at the Drift | yes (`stellarlogs-visited`) |
| **PDC CERTIFICATION** | Amnia Militia | completing the gunnery drill | yes (drill-complete + best time persisted) |
| **ESCORT DUTY** | Amnia Dockmaster | first cargo DELIVERED; ink tallies for repeats | yes (endJob 'delivered') |
| **THE INTERDICTION** | Militia Constabulary | an arrest — the Draugr squawking surrender | yes (squawk event) |
| **PICKET STOOD** | Colony Civil Defense | standing a Khione pass on the picket with rocks stopped | yes (pass + rocks counters) |
| **THE FULL CHART** | Surveyor's Office | having entered every charted system | partial (starmap visits — verify at build) |
| *(reserved)* **FIRST SURVEY** | Surveyor's Office | the Deep's first-discovery credit | future — the page is designed now so the Deep lands into it |
| *(dormant)* **THE WATER RUN** | Drift Racing Club | a posted lap | designed, not shipped while the race is tabled |

Repeat deeds do not re-stamp — they add **tally marks in ink under the
stamp** (ESCORT DUTY ||||) with the date of the first. A stamp is an
event; a tally is a history. Very Belter: one rubber stamp, then the
dockmaster's pen.

**The vigil never stamps. Ever.** Lighting a candle for the Nilak is
mourning, not a feat, and putting it in an achievement book would
cheapen the most sacred object in the game (standing law: the vigil
stays quiet). The book's silence about the vigil IS the design.

## 3. The mechanic that makes it a game object, not a menu

**Deeds earn the stamp; the dockmaster applies it.** Completing a feat
anywhere in the system marks the endorsement PENDING — a quiet coach
line ("THE DOCKMASTER OWES YOU INK — CALL AT THE DRIFT") and a small
pill on the docks board. Fly to the docks, and the stamp lands in the
book with a thunk — ink animation, one haptic tick on phone.

Why this matters:
- It gives every activity a **return-to-port beat** — the Bruno
  return-hook, worn as fiction (working pilots always come home to
  paperwork).
- The reward has a PLACE. You watch the stamp land. Delight law: see
  it happen, no popup toast "ACHIEVEMENT UNLOCKED" — the popup IS the
  anti-pattern we rejected.
- Port of Entry self-teaches the system: your FIRST docking opens the
  book unprompted, stamps page one, and the dockmaster line runs
  "NEW BOOK, BOSMANG? FIRST PAGE IS ON THE HOUSE."

## 4. What the book refuses to do (the no-badges law, kept)

- **No empty slots.** Blank pages are blank paper. A grid of grayed-out
  locked stamps is a checklist — the exact Bruno pattern he rejected.
  Discovery lives in the WORLD: the docks board already posts jobs;
  those postings are the only "here's what you could do" surface.
- **No completion percent, no counter of stamps, no "3/7".**
- **No ranking, no comparison, nothing global.** The book is yours.
  (The liveness relay is not involved; a stamp is personal paper, not
  a world-fact.)
- **No paint/cosmetic unlocks in v1.** The old sketch tied paints to
  stamp thresholds; faction skins are parked for the Deep, and
  coupling rewards to stamps turns paperwork back into a progress bar.
  Open ruling for later, default NO.

## 5. Where it lives

- **Reading:** anywhere — it is your book, on your ship. A drawer on
  the chart pattern (proven on phone): key **L** on desktop, a small
  book chip near the map chip on touch. Opens the spread, ESC/scrim
  closes. No 3D-world-only friction for reading (the Crib lesson:
  ceremony on WRITE, convenience on READ).
- **Stamping:** only at the docks (see §3) — the one deliberate
  friction, and it is the fun kind.
- **Persistence:** localStorage, alongside every other personal record.
  Lost storage = lost book; the fiction absorbs it ("the Belt keeps no
  copies") — same honesty as the race board and tallies. Option noted
  for later: pilot-id-keyed backup via the relay, but that makes the
  book a server record and invites the privacy questions we just
  designed out of the liveness layer. Default: local only.
- **Grandfathering:** the book honors what the ship can PROVE on first
  open — visited ⇒ Port of Entry; a persisted gunnery best time ⇒ PDC
  Certification; a Water Run best ⇒ (dormant). Deeds with no persisted
  proof (past escorts, arrests, pickets) are not retro-stamped: the
  dockmaster stamps what he witnessed, and half a history is worse
  than a fresh page. One honest line on the inside cover: "ISSUED
  [date]" — the book starts when the book starts.

## 6. The object itself (see /logbook.html for the three inks)

A well-used A6-ish booklet, paper the color of reclaimed pulp, worn at
the staple line. Left page: the plate — AMNIA PORT AUTHORITY · PILOT'S
LOG, hull line BLT-1129 · ROCINANTE-CLASS, name line struck through
with "WITHHELD — BELTER CUSTOM", issue date. Right page(s): stamps,
each with authority name, deed, date, and imperfect placement — ink is
honest about being applied by a person (slight rotation, uneven
pressure, occasional double-strike ghost).

The bench shows three stamp languages to judge:
- **A. ROUND SEALS** — classic port-authority rubber circles.
- **B. CUSTOMS BARS** — rectangular entry-stamp style with fat
  serifed caps, closest to real harbor paperwork.
- **C. MIXED PASSPORT** — round for authorities, bars for deeds,
  tally pen-strokes beneath; the "lived-in" option.
Each shown with a PENDING state (a pencilled outline where ink will
land — visible only after a deed is earned, which is not an empty
slot: the deed already happened) and the tally-mark treatment.

## 7. Plot holes hunted

- *"Why would a militia stamp a stranger's book?"* — Because the drill
  is CERTIFICATION, run for escort duty standard (its signage already
  says so). The fiction was already load-bearing.
- *"Why does the arrest stamp come from a different office?"* — The
  constabulary posted the interdiction on the docks board (it already
  does); their stamp closes their own posting. Every stamp's issuer is
  an entity the game has already introduced.
- *"What if a deed happens with the book 'full'?"* — Pages are cheap;
  the drawer scrolls. Non-issue, noted so nobody invents a cap.
- *"Does the tutorial/first-flight get a stamp?"* — No. Ignition is
  not a feat. Port of Entry covers the beginning and it requires
  actually flying somewhere.
- *"Multiple ships someday (the Deep)?"* — The book is the pilot's,
  not the hull's; the hull line records the CURRENT ship. A future
  second hull adds a line, not a book.
- *"Offline/relay-down?"* — Irrelevant by design: the book never
  touches the network.

## 8. Open rulings for him

1. The v1 stamp set (§2) — approve/trim. (FULL CHART needs a visited-
   systems check I'll verify at build time.)
2. Stamp-at-the-docks mechanic (§3) — in, or stamps land instantly?
3. Ink language from the bench: A round / B bars / C mixed.
4. Paints at thresholds: stays out (my strong lean), or v2 list?

---

# PIVOT — 2026-09-01, his ruling: PAPER REJECTED

The whole passbook premise fails his design test: our universe mimics
The Expanse, and The Expanse is DIGITAL — hand terminals, translucent
slabs, sleek utilitarian UI. Nothing important lives on paper there,
and my "electronic records die with reactors" rationale was invented,
not derived. His direction: **"utilitarian UI, but still looks
futuristic... exactly how we see the hand terminals in the show.
Research those images, then come up with a mockup."**

What SURVIVES the pivot (the bones were approved in spirit):
- The deed set (§2 table) — same feats, same issuing authorities,
  the vigil still never appears.
- Repeats as accumulating counts, first-date kept.
- The pending state and the docks beat (§3) — recast: an endorsement
  is ISSUED in the field but needs the dockmaster's COUNTERSIGN,
  applied when you call at the Drift. Same return-to-port pull, now
  reading as network authority instead of ink.
- Every refusal in §4 (no empty slots, no %, nothing global, no
  paints).
- Read anywhere via drawer; L key / touch chip.

What DIES: the paper object, the stamps, the tallies-as-pen-strokes,
the "Belt keeps no copies" fiction, logbook.html's three inks (bench
superseded; kept in git history).

The replacement object: the pilot's **SERVICE RECORD** — a screen on
the pilot's hand terminal. Endorsements as signed digital entries:
issuer glyph, deed, date, count, countersign status. New bench built
from researched show-UI grammar.
