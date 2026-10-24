export const LANE_X = [-2.55, 0, 2.55]

export const START_SPEED = 17
export const MAX_SPEED = 36
export const SPEED_RAMP = 0.02

export const GRAVITY = 28
export const JUMP_V = 8.8
export const SLIDE_TIME = 0.7
export const COYOTE_TIME = 0.12
export const JUMP_BUFFER = 0.12
export const SLIDE_BUFFER = 0.1
export const LANE_LERP = 14

export const SPAWN_AHEAD = 130
export const INITIAL_SPAWN = 64
export const DESPAWN_Z = 18
export const MIN_GAP = 27

export const HIT_X = 1.05
export const HIT_Z = 0.82
export const ORB_HIT_X = 1
export const ORB_HIT_Z = 0.95
export const LOW_CLEAR_Y = 0.9
export const HIGH_BAR_Y = 1.25
export const STAND_HEIGHT = 1.68
export const SLIDE_HEIGHT = 0.66

export const SEGMENT_LENGTH = 32
export const SEGMENT_COUNT = 7
export const TRACK_LENGTH = SEGMENT_LENGTH * SEGMENT_COUNT
export const TRACK_LEAD = TRACK_LENGTH - 28

export const OBSTACLE_POOL = 36
export const ORB_POOL = 28

export const BEST_KEY = 'neon-rush-best'
export const QUALITY_KEY = 'neon-rush-quality'
export const MUTE_KEY = 'neon-rush-muted'

export function detectQuality() {
  if (typeof navigator === 'undefined') return 'high'
  const cores = navigator.hardwareConcurrency || 8
  const memory = navigator.deviceMemory || 8
  const saveData = navigator.connection?.saveData
  if (saveData || cores <= 4 || memory <= 4) return 'low'
  return 'high'
}
