import { LabelLayer } from './LabelLayer'
import { Cockpit } from './Cockpit'
import { WarpPanel } from './WarpPanel'
import { ActivityPanel } from './ActivityPanel'
import { ThreatLayer } from './ThreatLayer'
import { RaceLayer } from './RaceLayer'
import { BattleFx } from './BattleFx'
import { BattleHud } from './BattleHud'
import { Preflight } from './Preflight'
import { TouchControls } from './TouchControls'
import { LandscapeGate } from './LandscapeGate'
import { ChartDrawer } from './ChartDrawer'
import { DeckTutorial } from './DeckTutorial'
import { MuteButton } from './MuteButton'

/**
 * DOM overlay: the pilot-seat cockpit HUD over the 3D canvas.
 *
 * The first-visit Welcome card is deliberately not mounted. Preflight now runs
 * before anyone can fly and carries what that card carried — the name and role
 * on the coaming placard, the controls on the console placard — so mounting
 * both stacked a second modal on top of the ignition the visitor just pressed.
 * Asset attribution is unaffected: it lives in the SEO mirror and on the Port
 * Registry boards at the Comms Station. `Welcome.tsx` is left in place for
 * anyone who wants it back.
 */
export function HUD() {
  return (
    <div className="hud">
      <div className="hud-scanline" />
      <div className="hud-warp-tint" />
      <div className="hud-warp-flash" />
      <div className="hud-damage" />
      <LabelLayer />
      <ThreatLayer />
      <RaceLayer />
      <BattleHud />
      <BattleFx />
      <Cockpit />
      <WarpPanel />
      <ActivityPanel />
      <TouchControls />
      <LandscapeGate />
      <ChartDrawer />
      <DeckTutorial />
      <MuteButton />
      <Preflight />
    </div>
  )
}
