import {
  HIGH_BAR_Y,
  HIT_X,
  HIT_Z,
  LANE_X,
  LOW_CLEAR_Y,
  ORB_HIT_X,
  ORB_HIT_Z,
  SLIDE_HEIGHT,
  STAND_HEIGHT,
} from './constants.js'

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
  if (!overlapsXZ(player, obstacle.lane, HIT_X, HIT_Z, obstacle.z)) return false
  const height = player.sliding ? SLIDE_HEIGHT : STAND_HEIGHT
  const head = player.y + height
  if (obstacle.type === 'low') return player.y < LOW_CLEAR_Y
  if (obstacle.type === 'high') return head > HIGH_BAR_Y
  return true
}

export function overlapsOrb(player, orb) {
  return overlapsXZ(player, orb.lane, ORB_HIT_X, ORB_HIT_Z, orb.z)
}
