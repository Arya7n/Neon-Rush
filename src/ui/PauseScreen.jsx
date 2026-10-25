import { useEffect, useRef } from 'react'
import { displaySpeed } from '../game/difficulty.js'
import { playStart, resumeAudio } from '../game/audio.js'
import { useGameStore } from '../game/gameStore.js'

export function PauseScreen() {
  const phase = useGameStore((state) => state.phase)
  const score = useGameStore((state) => state.score)
  const distance = useGameStore((state) => state.distance)
  const speed = useGameStore((state) => state.speed)
  const resumeRef = useRef(null)

  useEffect(() => {
    if (phase === 'PAUSED') resumeRef.current?.focus()
  }, [phase])

  if (phase !== 'PAUSED') return null

  return (
    <div className="overlay overlay-scrim">
      <section className="panel" role="dialog" aria-modal="true" aria-labelledby="pause-title">
        <p className="eyebrow">Hold</p>
        <h2 id="pause-title">Paused</h2>
        <dl className="summary">
          <div><dt>Score</dt><dd>{Math.floor(score).toLocaleString('en-US')}</dd></div>
          <div><dt>Distance</dt><dd>{Math.floor(distance)}m</dd></div>
          <div><dt>Speed</dt><dd>{displaySpeed(speed)}</dd></div>
        </dl>
        <div className="action-row">
          <button
            ref={resumeRef}
            className="btn btn-primary"
            onClick={() => {
              resumeAudio()
              playStart()
              useGameStore.getState().resume()
            }}
          >
            Resume
          </button>
          <button className="btn btn-ghost" onClick={() => useGameStore.getState().leaveToMenu()}>
            Menu
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              resumeAudio()
              useGameStore.getState().restart()
            }}
          >
            Restart
          </button>
        </div>
      </section>
    </div>
  )
}

export function Countdown() {
  const phase = useGameStore((state) => state.phase)
  const countdown = useGameStore((state) => state.countdown)
  if (phase !== 'COUNTDOWN') return null
  return (
    <div className="countdown" aria-live="assertive">
      <div className="countdown-card">
        <span>Ready</span>
        <strong>{Math.ceil(countdown)}</strong>
      </div>
    </div>
  )
}
