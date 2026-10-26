import { MAX_SPEED, START_SPEED } from './constants.js'
import { clamp } from './math.js'

export const CHASE_WARN = 0.68
export const CHASE_MISS_X = 1.7

const THREAT = {
  city: 'Train',
  jungle: 'Vines',
  dunes: 'Storm',
  shore: 'Wave',
}

export function threatName(place) {
  return THREAT[place] || THREAT.city
}

/** Slow push from behind. Faster runs close the gap sooner. */
export function creepChase(chase, dt, speed, distance) {
  if (distance < 36) return chase
  const pace = Math.max(1, speed / START_SPEED)
  return clamp(chase + dt * 0.011 * Math.pow(pace, 1.2), 0, 1)
}

export function grabChase(chase, speed) {
  const hot = Math.min(1, speed / MAX_SPEED)
  return clamp(chase - (0.062 + hot * 0.018), 0, 1)
}

export function missChase(chase, speed, close) {
  const hot = Math.min(1, speed / MAX_SPEED)
  const hit = (0.07 + hot * 0.02) * (close ? 1 : 0.28)
  return clamp(chase + hit, 0, 1)
}
