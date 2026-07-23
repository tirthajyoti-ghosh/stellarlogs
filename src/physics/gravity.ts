import { Vector3 } from 'three'

/**
 * Gravity wells: clamped inverse-square attraction, zeroed beyond each body's
 * influence radius. Bodies register themselves when their system mounts.
 */
export interface GravityBody {
  position: Vector3
  /** Strength at distance = radius; falls off with inverse square. */
  strength: number
  /** Physical radius (used for collision). */
  radius: number
  /** No pull beyond this distance. */
  influenceRadius: number
}

const bodies: GravityBody[] = []

export function registerGravityBody(body: GravityBody): () => void {
  bodies.push(body)
  return () => {
    const i = bodies.indexOf(body)
    if (i !== -1) bodies.splice(i, 1)
  }
}

export function getGravityBodies(): readonly GravityBody[] {
  return bodies
}

/**
 * Static solid colliders — stations, wrecks, colony rocks: things the ship
 * should bounce off but that exert no pull and light no GRAV warning.
 */
export interface StaticCollider {
  position: Vector3
  radius: number
}

const colliders: StaticCollider[] = []

export function registerCollider(collider: StaticCollider): () => void {
  colliders.push(collider)
  return () => {
    const i = colliders.indexOf(collider)
    if (i !== -1) colliders.splice(i, 1)
  }
}

const _toBody = new Vector3()
const MAX_PULL = 55 // hard cap so wells are fun, never punishing

export function applyGravity(position: Vector3, velocity: Vector3, dt: number): void {
  for (const body of bodies) {
    _toBody.copy(body.position).sub(position)
    const dist = _toBody.length()
    if (dist > body.influenceRadius || dist < 1e-3) continue
    // strength is defined at the body surface, inverse-square beyond it
    const pull = Math.min(MAX_PULL, body.strength * (body.radius * body.radius) / (dist * dist))
    // fade to zero near the influence edge so entry isn't a visible "step"
    const edgeFade = Math.min(1, (body.influenceRadius - dist) / (body.influenceRadius * 0.15))
    velocity.addScaledVector(_toBody.normalize(), pull * edgeFade * dt)
  }
}

/**
 * Sphere collision against gravity bodies: pushes the ship out and reflects
 * velocity with heavy energy loss (soft bounce).
 */
const _normal = new Vector3()

function resolveAgainst(
  position: Vector3,
  velocity: Vector3,
  shipRadius: number,
  center: Vector3,
  radius: number,
): boolean {
  _normal.copy(position).sub(center)
  const dist = _normal.length()
  const minDist = radius + shipRadius
  if (dist >= minDist || dist < 1e-3) return false
  _normal.divideScalar(dist)
  position.copy(center).addScaledVector(_normal, minDist)
  const vDotN = velocity.dot(_normal)
  if (vDotN < 0) {
    velocity.addScaledVector(_normal, -1.6 * vDotN) // bounce with damping
    velocity.multiplyScalar(0.55)
  }
  return true
}

export function resolveCollisions(position: Vector3, velocity: Vector3, shipRadius: number): boolean {
  let hit = false
  for (const body of bodies) {
    if (resolveAgainst(position, velocity, shipRadius, body.position, body.radius)) hit = true
  }
  for (const collider of colliders) {
    if (resolveAgainst(position, velocity, shipRadius, collider.position, collider.radius)) hit = true
  }
  return hit
}
