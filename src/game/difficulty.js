import { MAX_SPEED, MIN_GAP, SPEED_RAMP, START_SPEED } from './constants.js'

export function speedForDistance(distance) {
  return Math.min(MAX_SPEED, START_SPEED + distance * SPEED_RAMP)
}

export function gapForDistance(distance) {
  return Math.max(MIN_GAP, 42 - distance * 0.016)
}

/** Shown on the HUD. Maps simulation speed into a readable velocity. */
export function displaySpeed(speed) {
  return Math.round(90 + speed * 5)
}
