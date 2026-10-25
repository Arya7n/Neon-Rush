import { LANE_X } from './constants.js'

const DUNE_RISE_FROM = -26
const DUNE_RISE_TO = -12

/** 0 while the bar is still under the sand, 1 once it has erupted. */
export function duneRise(z) {
  if (z >= DUNE_RISE_TO) return 1
  if (z <= DUNE_RISE_FROM) return 0
  return (z - DUNE_RISE_FROM) / (DUNE_RISE_TO - DUNE_RISE_FROM)
}

/** Slides from the starting lane toward the lane it will hit. */
export function waveCenter(obstacle) {
  const span = obstacle.sweep || 16
  const along = Math.min(1, Math.max(0, (obstacle.z + span) / span))
  const from = LANE_X[obstacle.fromLane ?? obstacle.lane] ?? 0
  const to = LANE_X[obstacle.toLane ?? obstacle.lane] ?? from
  return from + (to - from) * along
}
