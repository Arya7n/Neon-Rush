import { useEffect, useRef } from 'react'
import { playStart, resumeAudio } from '../game/audio.js'
import { useGameStore } from '../game/gameStore.js'

export function PauseScreen() {
  const phase = useGameStore((state) => state.phase)
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
      <strong>{Math.ceil(countdown)}</strong>
    </div>
  )
}
