import { MUTE_KEY } from './constants.js'

let ctx
let master
let droneGain
let muted = false

try {
  muted = localStorage.getItem(MUTE_KEY) === '1'
} catch {
  muted = false
}

function context() {
  if (ctx) return ctx
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return null
  ctx = new AudioContext()
  master = ctx.createGain()
  master.gain.value = muted ? 0 : 0.22
  master.connect(ctx.destination)
  startDrone()
  return ctx
}

function startDrone() {
  const audio = context()
  if (!audio || droneGain) return
  droneGain = audio.createGain()
  droneGain.gain.value = 0.045
  const filter = audio.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 240
  droneGain.connect(filter)
  filter.connect(master)
  for (const freq of [55, 82.5]) {
    const osc = audio.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = freq
    const gain = audio.createGain()
    gain.gain.value = 0.15
    osc.connect(gain)
    gain.connect(droneGain)
    osc.start()
  }
}

export function resumeAudio() {
  try {
    const audio = context()
    if (audio?.state === 'suspended') audio.resume()
  } catch {
    /* autoplay restrictions */
  }
}

export function setMuted(next) {
  muted = next
  if (!master) return
  master.gain.value = next ? 0 : 0.22
}

function tone({ freq = 440, to = freq, dur = 0.12, type = 'square', gain = 0.08, delay = 0 }) {
  const audio = context()
  if (!audio || !master || master.gain.value === 0) return
  const osc = audio.createOscillator()
  const amp = audio.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, audio.currentTime + delay)
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, to), audio.currentTime + delay + dur)
  amp.gain.setValueAtTime(gain, audio.currentTime + delay)
  amp.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + delay + dur)
  osc.connect(amp)
  amp.connect(master)
  osc.start(audio.currentTime + delay)
  osc.stop(audio.currentTime + delay + dur + 0.02)
}

export function playJump() {
  tone({ freq: 220, to: 540, dur: 0.12, type: 'triangle', gain: 0.07 })
}

export function playSlide() {
  tone({ freq: 180, to: 70, dur: 0.16, type: 'sawtooth', gain: 0.04 })
}

export function playCollect() {
  tone({ freq: 660, to: 990, dur: 0.08, type: 'square', gain: 0.05 })
}

export function playCrash() {
  tone({ freq: 180, to: 40, dur: 0.35, type: 'sawtooth', gain: 0.1 })
  tone({ freq: 90, to: 30, dur: 0.4, type: 'triangle', gain: 0.08, delay: 0.02 })
}

export function playNear() {
  tone({ freq: 520, to: 880, dur: 0.09, type: 'square', gain: 0.04 })
}

export function playShield() {
  tone({ freq: 180, to: 420, dur: 0.18, type: 'triangle', gain: 0.06 })
}

export function playStart() {
  tone({ freq: 330, to: 660, dur: 0.14, type: 'square', gain: 0.05 })
  tone({ freq: 495, to: 990, dur: 0.16, type: 'square', gain: 0.04, delay: 0.08 })
}
