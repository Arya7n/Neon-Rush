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
import { duneRise, waveCenter } from './hazards.js'

export const NEAR_MISS_PAD = 0.9

export function laneCenter(lane) {
  return LANE_X[lane] ?? 0
}

export function obstacleX(obstacle) {
  if (obstacle?.type === 'wave') return waveCenter(obstacle)
  return laneCenter(obstacle?.lane)
}

function overlapsXZ(player, lane, hitX, hitZ, z) {
  if (Math.abs(player.x - laneCenter(lane)) > hitX) return false
  if (Math.abs(z) > hitZ) return false
  return true
}

/**
 * Low barriers and erupted sand bars are cleared by jumping.
 * Overhead bars and vines are cleared by sliding.
 * Blocks, trains, and waves occupy the whole body and force a lane change.
 */
export function overlapsPlayer(player, obstacle) {
  const long = obstacle.type === 'train' || (obstacle.type === 'vine' && obstacle.length)
  const halfZ = long ? (obstacle.length || TRAIN_LENGTH) / 2 : HIT_Z
  if (Math.abs(player.x - obstacleX(obstacle)) > HIT_X) return false
  if (Math.abs(obstacle.z) > halfZ) return false
  if ((obstacle.type === 'block' || obstacle.type === 'train' || obstacle.type === 'wave') && player.y > RAMP_CLEAR_Y) return false
  if (obstacle.type === 'ramp') return player.y < 0.45
  const height = player.sliding ? SLIDE_HEIGHT : STAND_HEIGHT
  const head = player.y + height
  if (obstacle.type === 'dune') {
    if (duneRise(obstacle.z) < 0.55) return false
    return player.y < LOW_CLEAR_Y
  }
  if (obstacle.type === 'low') return player.y < LOW_CLEAR_Y
  if (obstacle.type === 'high' || obstacle.type === 'vine') return player.y <= RAMP_CLEAR_Y && head > HIGH_BAR_Y
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
  const dx = Math.abs(player.x - obstacleX(obstacle))
  return dx > HIT_X && dx < HIT_X + NEAR_MISS_PAD
}
