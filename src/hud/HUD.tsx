import { LabelLayer } from './LabelLayer'
import { Cockpit } from './Cockpit'
import { HeadingTape } from './HeadingTape'
import { WarpPanel } from './WarpPanel'
import { ActivityPanel } from './ActivityPanel'
import { Welcome } from './Welcome'
import { TouchControls } from './TouchControls'
import { MuteButton } from './MuteButton'

/** DOM overlay: the pilot-seat cockpit HUD over the 3D canvas. */
export function HUD() {
  return (
    <div className="hud">
      <div className="hud-scanline" />
      <div className="hud-warp-tint" />
      <div className="hud-warp-flash" />
      <LabelLayer />
      <HeadingTape />
      <Cockpit />
      <WarpPanel />
      <ActivityPanel />
      <TouchControls />
      <MuteButton />
      <Welcome />
    </div>
  )
}
