import { BEST_KEY } from './constants.js'

export function computeScore(distance, orbs) {
  return Math.floor(distance) * 2 + orbs * 50
}

export function statsFromWorld(world) {
  return {
    score: computeScore(world.distance, world.orbsCollected),
    distance: world.distance,
    orbs: world.orbsCollected,
    speed: world.speed,
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
