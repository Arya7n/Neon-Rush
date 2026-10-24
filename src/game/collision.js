import {
  HIGH_BAR_Y,
  HIT_X,
  HIT_Z,
  LANE_X,
  LOW_CLEAR_Y,
  RAMP_CLEAR_Y,
  TRAIN_LENGTH,
  ORB_HIT_X,
  ORB_HIT_Z,
  SLIDE_HEIGHT,
  STAND_HEIGHT,
} from './constants.js'

export const NEAR_MISS_PAD = 0.9

export function laneCenter(lane) {
  return LANE_X[lane] ?? 0
}

function overlapsXZ(player, lane, hitX, hitZ, z) {
  if (Math.abs(player.x - laneCenter(lane)) > hitX) return false
  if (Math.abs(z) > hitZ) return false
  return true
}

/**
 * Low barriers are cleared by jumping.
 * Overhead bars are cleared by sliding.
 * Blocks occupy the whole body and force a lane change.
 */
export function overlapsPlayer(player, obstacle) {
  const halfZ = obstacle.type === 'train' ? (obstacle.length || TRAIN_LENGTH) / 2 : HIT_Z
  if (Math.abs(player.x - laneCenter(obstacle.lane)) > HIT_X) return false
  if (Math.abs(obstacle.z) > halfZ) return false
  if ((obstacle.type === 'block' || obstacle.type === 'train') && player.y > RAMP_CLEAR_Y) return false
  if (obstacle.type === 'ramp') return player.y < 0.45
  const height = player.sliding ? SLIDE_HEIGHT : STAND_HEIGHT
  const head = player.y + height
  if (obstacle.type === 'low') return player.y < LOW_CLEAR_Y
  if (obstacle.type === 'high') return player.y <= RAMP_CLEAR_Y && head > HIGH_BAR_Y
  return true
}

export function overlapsOrb(player, orb) {
  const x = orb.x ?? laneCenter(orb.lane)
  if (Math.abs(player.x - x) > ORB_HIT_X) return false
  if (Math.abs(orb.z) > ORB_HIT_Z) return false
  return true
}

/** Close enough to feel the pass, far enough that the hit boxes do not overlap. */
export function isNearMiss(player, obstacle) {
  const dx = Math.abs(player.x - laneCenter(obstacle.lane))
  return dx > HIT_X && dx < HIT_X + NEAR_MISS_PAD
}
