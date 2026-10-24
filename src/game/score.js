import { BEST_KEY } from './constants.js'

export function computeScore(distance, orbs, bonus = 0) {
  return Math.floor(distance) * 2 + orbs * 50 + bonus
}

export function statsFromWorld(world) {
  return {
    score: computeScore(world.distance, world.orbsCollected, world.bonus || 0),
    distance: world.distance,
    orbs: world.orbsCollected,
    speed: world.speed,
    combo: world.combo || 0,
    maxCombo: world.maxCombo || 0,
    shield: world.shield || 0,
    smash: world.smash || 0,
    magnetTime: world.magnetTime || 0,
    boostTime: world.boostTime || 0,
    nearMisses: world.nearMisses || 0,
    banner: world.bannerTime > 0 ? world.banner : '',
  }
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
