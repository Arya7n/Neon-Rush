import { displaySpeed } from '../game/difficulty.js'
import { MAX_SPEED, START_SPEED } from '../game/constants.js'
import { useGameStore } from '../game/gameStore.js'

export function MuteButton() {
  const muted = useGameStore((state) => state.muted)
  const toggleMute = useGameStore((state) => state.toggleMute)
  return (
    <button className="mute" onClick={toggleMute} aria-pressed={muted}>
      {muted ? 'Sound off' : 'Sound on'}
    </button>
  )
}

export function GameHUD() {
  const phase = useGameStore((state) => state.phase)
  const score = useGameStore((state) => state.score)
  const distance = useGameStore((state) => state.distance)
  const orbs = useGameStore((state) => state.orbs)
  const speed = useGameStore((state) => state.speed)
  const combo = useGameStore((state) => state.combo)
  const shield = useGameStore((state) => state.shield)
  const smash = useGameStore((state) => state.smash)
  const magnetTime = useGameStore((state) => state.magnetTime)
  const boostTime = useGameStore((state) => state.boostTime)
  const banner = useGameStore((state) => state.banner)
  const powers = [
    smash ? 'Smash' : '',
    boostTime > 0 ? `x2 ${Math.ceil(boostTime)}s` : '',
    magnetTime > 0 ? `Magnet ${Math.ceil(magnetTime)}s` : '',
    shield ? 'Shield' : '',
  ].filter(Boolean)

  if (phase !== 'PLAYING' && phase !== 'PAUSED') return null

  const filled = Math.max(0, Math.min(100, ((speed - START_SPEED) / (MAX_SPEED - START_SPEED)) * 100))

  return (
    <div className="hud">
      <div className="score-block">
        <span>Score</span>
        <strong>{Math.floor(score).toLocaleString('en-US')}</strong>
      </div>
      <div className="stat-row">
        <p className="stat"><span>Distance</span><b>{Math.floor(distance)}m</b></p>
        <p className="stat"><span>Energy</span><b>{orbs}</b></p>
        <p className="stat"><span>Combo</span><b>{combo > 1 ? `x${combo}` : '—'}</b></p>
        <p className="stat"><span>Power</span><b>{powers.length ? powers.join(' · ') : '—'}</b></p>
        <p className="stat stat-speed">
          <span>Speed</span>
          <b>{displaySpeed(speed)}</b>
          <span className="meter"><i style={{ width: `${filled}%` }} /></span>
        </p>
      </div>
      {banner && <p className="banner">{banner}</p>}
    </div>
  )
}
