import { LabelLayer } from './LabelLayer'
import { Radar } from './Radar'
import { StatusBar } from './StatusBar'
import { NavPanel } from './NavPanel'
import { Welcome } from './Welcome'

/** DOM overlay: retro sci-fi HUD riding on top of the 3D canvas. */
export function HUD() {
  return (
    <div className="hud">
      <div className="hud-scanline" />
      <div className="hud-corner hud-corner-tl" />
      <div className="hud-corner hud-corner-tr" />
      <div className="hud-corner hud-corner-bl" />
      <div className="hud-corner hud-corner-br" />
      <LabelLayer />
      <Radar />
      <StatusBar />
      <NavPanel />
      <Welcome />
    </div>
  )
}
