import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import { shipRig } from '../state/shipRig'
import { activityState } from '../state/activityState'
import { registerHudLabel, type HudLabel } from '../hud/hudState'
import { getAudioBus } from '../audio/engine'
import { DRIFT_POI } from '../config/pois'

/**
 * THE CANTINA JUKEBOX (docs/the-fiction.md, his rulings 2026-08-14):
 * music in the Belt is CARRIED, not composed here — every track came
 * in on a ship, traded port to port off hauler data cores. A salvaged
 * sound rig at the Amnia docks plays them: diegetic point source,
 * real distance rolloff, and between tracks the DATA-CORE SEEK — a
 * breath of static and a relay click, the same comm grammar as the
 * radio chatter. NOW PLAYING rides the cantina's HUD label with the
 * in-fiction ship attribution AND the real CC-BY credit, always.
 * Ducks out entirely in battle; the master vigil duck is upstream.
 */

interface Track {
  url: string
  title: string
  credit: string
  ship: string
}

const ROTATION: Track[] = [
  {
    url: '/audio/jukebox-1.mp3',
    title: 'BACKBAY LOUNGE',
    credit: 'K. MACLEOD · CC-BY',
    ship: "OFF THE IMIQ'S CORES",
  },
  {
    url: '/audio/jukebox-2.mp3',
    title: 'SPACE JAZZ',
    credit: 'K. MACLEOD · CC-BY',
    ship: "OFF THE VANAJA'S CORES",
  },
]

const CANTINA = new Vector3(
  DRIFT_POI.position[0] + 90,
  DRIFT_POI.position[1] + 30,
  DRIFT_POI.position[2] + 40,
)
/** Tracks start LOADING inside this range… */
const LOAD_R = 2400
/** …are audible inside this… */
const HEAR_R = 1300
/** …and at full level this close to the rig */
const FULL_R = 160
const LEVEL = 0.14

export function DriftJukebox() {
  const labelRef = useRef<HudLabel | null>(null)
  const g = useRef({
    loading: false,
    buffers: [] as (AudioBuffer | null)[],
    gain: null as GainNode | null,
    src: null as AudioBufferSourceNode | null,
    track: -1,
    seekUntil: 0,
  })

  useEffect(() => {
    const label: HudLabel = {
      id: 'poi-cantina',
      name: 'THE CANTINA',
      color: '#8fa8bd',
      kind: 'poi',
      position: CANTINA,
      yOffset: 24,
      el: null,
      detail: 'AMNIA DOCKS — THE BOX IS WARMING UP',
      jumpStandoff: 500,
    }
    labelRef.current = label
    const off = registerHudLabel(label)
    const st = g.current
    return () => {
      off()
      st.src?.stop()
      st.src = null
    }
  }, [])

  useFrame(() => {
    const st = g.current
    const bus = getAudioBus()
    if (!bus) return
    const { ctx, master } = bus
    const d = shipRig.position.distanceTo(CANTINA)

    // lazy load the rotation only when the pilot comes near
    if (!st.loading && d < LOAD_R) {
      st.loading = true
      ROTATION.forEach((t, i) => {
        fetch(t.url)
          .then((r) => r.arrayBuffer())
          .then((b) => ctx.decodeAudioData(b))
          .then((buf) => {
            st.buffers[i] = buf
          })
          .catch(() => {})
      })
    }

    if (!st.gain) {
      st.gain = ctx.createGain()
      st.gain.gain.value = 0
      st.gain.connect(master)
    }

    // start / advance the rotation
    const now = ctx.currentTime
    if (!st.src && now > st.seekUntil) {
      const next = (st.track + 1) % ROTATION.length
      const buf = st.buffers[next]
      if (buf) {
        st.track = next
        const src = ctx.createBufferSource()
        src.buffer = buf
        src.connect(st.gain)
        src.start()
        st.src = src
        src.onended = () => {
          st.src = null
          // THE DATA-CORE SEEK: static breath + relay click, then next
          st.seekUntil = ctx.currentTime + 1.4
          const seekNoise = ctx.createBufferSource()
          const len = Math.floor(ctx.sampleRate * 0.5)
          const nb = ctx.createBuffer(1, len, ctx.sampleRate)
          const data = nb.getChannelData(0)
          for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) * 0.5
          seekNoise.buffer = nb
          const bp = ctx.createBiquadFilter()
          bp.type = 'bandpass'
          bp.frequency.value = 1500
          const sg = ctx.createGain()
          sg.gain.value = Math.min(0.05, st.gain ? st.gain.gain.value * 0.6 : 0)
          seekNoise.connect(bp).connect(sg).connect(master)
          seekNoise.start()
        }
        const label = labelRef.current
        const t = ROTATION[next]
        if (label) label.detail = `♪ ${t.title} · ${t.ship} · ${t.credit}`
      }
    }

    // diegetic level: distance rolloff, silent in battle
    const roll = d < FULL_R ? 1 : d > HEAR_R ? 0 : 1 - (d - FULL_R) / (HEAR_R - FULL_R)
    const target = activityState.battle ? 0 : LEVEL * roll * roll
    st.gain.gain.setTargetAtTime(target, now, 0.4)
  })

  return null
}
