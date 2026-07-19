import { LabelLayer } from './LabelLayer'
import { Cockpit } from './Cockpit'
import { HeadingTape } from './HeadingTape'
import { WarpPanel } from './WarpPanel'
import { Welcome } from './Welcome'
import { TouchControls } from './TouchControls'

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
      <TouchControls />
      <Welcome />
    </div>
  )
}
