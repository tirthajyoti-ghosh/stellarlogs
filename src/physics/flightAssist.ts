/**
 * FLIGHT ASSIST — the flight computer nulling residual velocity with RCS
 * whenever nothing is commanded. This is the "auto-brake" every mainstream
 * space game defaults to (Elite's Flight Assist, Star Citizen's coupled
 * mode): without it casual pilots read pure Newtonian drift as broken
 * controls. ON everywhere; the Track's drive-dark rule switches it OFF at
 * the START line so corridor speed persists and gravity alone shapes the
 * run, and back ON when the run ends.
 */
export const flightAssist = {
  enabled: true,
}
