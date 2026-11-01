import { BEST_KEY } from './constants.js'

export function computeScore(distance, orbs, bonus = 0) {
  return Math.floor(distance) * 2 + orbs * 50 + bonus
}

const stats = {
  score: 0,
  distance: 0,
  orbs: 0,
  speed: 0,
  combo: 0,
  maxCombo: 0,
  shield: 0,
  smash: 0,
  magnetTime: 0,
  boostTime: 0,
  nearMisses: 0,
  chase: 0,
  banner: '',
}

export function statsFromWorld(world) {
  stats.score = computeScore(world.distance, world.orbsCollected, world.bonus || 0)
  stats.distance = world.distance
  stats.orbs = world.orbsCollected
  stats.speed = world.speed
  stats.combo = world.combo || 0
  stats.maxCombo = world.maxCombo || 0
  stats.shield = world.shield || 0
  stats.smash = world.smash || 0
  stats.magnetTime = world.magnetTime || 0
  stats.boostTime = world.boostTime || 0
  stats.nearMisses = world.nearMisses || 0
  stats.chase = world.chase || 0
  stats.banner = world.bannerTime > 0 ? world.banner : ''
  return stats
}

function storeOf(storage) {
  if (storage) return storage
  if (typeof localStorage === 'undefined') return null
  return localStorage
}

export function readBest(storage) {
  try {
    const store = storeOf(storage)
    if (!store) return 0
    return Number(store.getItem(BEST_KEY) || 0) || 0
  } catch {
    return 0
  }
}

export function writeBest(score, storage) {
  const store = storeOf(storage)
  const best = Math.max(readBest(store), Math.floor(score) || 0)
  try {
    store?.setItem(BEST_KEY, String(best))
  } catch {
    /* private mode */
  }
  return best
}
