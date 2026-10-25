import { displaySpeed } from '../game/difficulty.js'
import { MAX_SPEED, START_SPEED } from '../game/constants.js'
import { useGameStore } from '../game/gameStore.js'

export function MuteButton() {
  const muted = useGameStore((state) => state.muted)
  const toggleMute = useGameStore((state) => state.toggleMute)
  return (
    <button className="mute" onClick={toggleMute} aria-pressed={muted}>
      {muted ? 'Muted' : 'Sound'}
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

  if (phase !== 'PLAYING' && phase !== 'PAUSED' && phase !== 'COUNTDOWN' && phase !== 'CRASH') return null

  const filled = Math.max(0, Math.min(100, ((speed - START_SPEED) / (MAX_SPEED - START_SPEED)) * 100))

  return (
    <div className="hud">
      <div className="score-block">
        <span>Score</span>
        <strong>{Math.floor(score).toLocaleString('en-US')}</strong>
      </div>
      <p
        className="readout"
        aria-label={`Distance ${Math.floor(distance)} meters, energy ${orbs}, combo ${combo}, speed ${displaySpeed(speed)}`}
      >
        <span>{Math.floor(distance)}m</span>
        <span>{orbs}</span>
        <span className={combo > 1 ? 'hot' : ''}>{combo > 1 ? `x${combo}` : '—'}</span>
        <span className="readout-speed">
          {displaySpeed(speed)}
          <span className="meter" aria-hidden="true"><i style={{ width: `${filled}%` }} /></span>
        </span>
      </p>
      {powers.length > 0 && (
        <div className="powers">
          {powers.map((power) => <span key={power} className="power">{power}</span>)}
        </div>
      )}
      {banner && <p className="banner">{banner}</p>}
      {phase === 'PLAYING' && (
        <button className="hud-pause" onClick={() => useGameStore.getState().pause()}>
          Pause
        </button>
      )}
    </div>
  )
}
