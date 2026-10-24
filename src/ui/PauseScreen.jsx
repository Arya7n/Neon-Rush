import { useEffect, useRef } from 'react'
import { resumeAudio } from '../game/audio.js'
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
            onClick={() => useGameStore.getState().resume()}
          >
            Resume
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
