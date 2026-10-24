import { create } from 'zustand'
import { setMuted } from './audio.js'
import {
  detectQuality,
  MUTE_KEY,
  QUALITY_KEY,
  START_SPEED,
} from './constants.js'
import { clearInput } from './inputBuffer.js'
import { readBest, statsFromWorld, writeBest } from './score.js'
import { createWorld } from './world.js'

function readFlag(key) {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function initialQuality() {
  try {
    const saved = localStorage.getItem(QUALITY_KEY)
    if (saved === 'high' || saved === 'low') return { quality: saved, qualityPinned: true }
  } catch {
    /* ignore */
  }
  return { quality: detectQuality(), qualityPinned: false }
}

const qualityState = initialQuality()

export const worldRef = { current: createWorld({ spawn: false }) }

export const useGameStore = create((set, get) => ({
  phase: 'MENU',
  score: 0,
  distance: 0,
  orbs: 0,
  speed: START_SPEED,
  best: readBest(),
  muted: readFlag(MUTE_KEY),
  quality: qualityState.quality,
  qualityPinned: qualityState.qualityPinned,

  setQuality: (quality, pinned = true) => {
    if (!pinned && get().qualityPinned) return
    try {
      localStorage.setItem(QUALITY_KEY, quality)
    } catch {
      /* ignore */
    }
    set({ quality, qualityPinned: pinned ? true : get().qualityPinned })
  },

  toggleMute: () => {
    const muted = !get().muted
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
    } catch {
      /* ignore */
    }
    setMuted(muted)
    set({ muted })
  },

  start: () => {
    clearInput()
    worldRef.current = createWorld()
    set({
      phase: 'PLAYING',
      score: 0,
      distance: 0,
      orbs: 0,
      speed: START_SPEED,
    })
  },

  restart: () => get().start(),

  pause: () => {
    if (get().phase !== 'PLAYING') return
    clearInput()
    const world = worldRef.current
    set({ phase: 'PAUSED', ...(world ? statsFromWorld(world) : {}) })
  },

  resume: () => {
    if (get().phase !== 'PAUSED') return
    clearInput()
    set({ phase: 'PLAYING' })
  },

  togglePause: () => {
    const phase = get().phase
    if (phase === 'PLAYING') get().pause()
    else if (phase === 'PAUSED') get().resume()
  },

  toMenu: () => {
    clearInput()
    worldRef.current = createWorld({ spawn: false })
    set({ phase: 'MENU', score: 0, distance: 0, orbs: 0, speed: START_SPEED })
  },

  gameOver: () => {
    const world = worldRef.current
    const stats = world ? statsFromWorld(world) : { score: 0, distance: 0, orbs: 0, speed: 0 }
    const best = writeBest(Math.max(get().best, stats.score))
    clearInput()
    set({ phase: 'GAME_OVER', ...stats, best })
  },

  pushHud: (stats) => {
    if (get().phase !== 'PLAYING') return
    set(stats)
  },
}))
