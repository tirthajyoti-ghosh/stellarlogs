import { Vector3 } from 'three'

/** THE ARMED JUMP (docs/the-mobile-deck.md A): the chart arms it, the
 *  ◇ satellite in the arc fires it. Two taps, zero precision. */
export const deckState = {
  armed: null as null | { name: string; position: Vector3; standoff: number },
  armedAt: 0,
}

export function armJump(name: string, position: Vector3, standoff: number): void {
  deckState.armed = { name, position, standoff }
  deckState.armedAt = performance.now()
}

export function clearJump(): void {
  deckState.armed = null
}
