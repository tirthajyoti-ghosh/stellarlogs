import { LabelLayer } from './LabelLayer'
import { Radar } from './Radar'
import { StatusBar } from './StatusBar'
import { NavPanel } from './NavPanel'
import { Welcome } from './Welcome'

/** DOM overlay: utilitarian Expanse-style HUD over the 3D canvas. */
export function HUD() {
  return (
    <div className="hud">
      <div className="hud-scanline" />
      <div className="hud-warp-tint" />
      <LabelLayer />
      <Radar />
      <StatusBar />
      <NavPanel />
      <Welcome />
    </div>
  )
}
