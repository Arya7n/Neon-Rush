import { useEffect, useRef } from 'react'
import { resumeAudio } from '../game/audio.js'
import { displaySpeed } from '../game/difficulty.js'
import { useGameStore } from '../game/gameStore.js'

export function GameOver() {
  const phase = useGameStore((state) => state.phase)
  const score = useGameStore((state) => state.score)
  const distance = useGameStore((state) => state.distance)
  const best = useGameStore((state) => state.best)
  const speed = useGameStore((state) => state.speed)
  const orbs = useGameStore((state) => state.orbs)
  const nearMisses = useGameStore((state) => state.nearMisses)
  const maxCombo = useGameStore((state) => state.maxCombo)
  const restartRef = useRef(null)

  useEffect(() => {
    if (phase === 'GAME_OVER') restartRef.current?.focus()
  }, [phase])

  if (phase !== 'GAME_OVER') return null

  const record = score >= best && score > 0

  return (
    <div className="overlay overlay-scrim">
      <section className="panel" role="dialog" aria-modal="true" aria-labelledby="over-title">
        <p className="eyebrow">{record ? 'New record' : 'Signal lost'}</p>
        <h2 id="over-title">Run over</h2>
        <p className="final-score">{Math.floor(score).toLocaleString('en-US')}</p>
        <dl className="summary">
          <div><dt>Distance</dt><dd>{Math.floor(distance)}m</dd></div>
          <div><dt>Energy</dt><dd>{orbs}</dd></div>
          <div><dt>Near miss</dt><dd>{nearMisses || 0}</dd></div>
          <div><dt>Best combo</dt><dd>{maxCombo > 1 ? `x${maxCombo}` : '—'}</dd></div>
          <div><dt>Top speed</dt><dd>{displaySpeed(speed)}</dd></div>
          <div><dt>Best</dt><dd>{Math.floor(best).toLocaleString('en-US')}</dd></div>
        </dl>
        <div className="action-row">
          <button
            ref={restartRef}
            className="btn btn-primary"
            onClick={() => {
              resumeAudio()
              useGameStore.getState().restart()
            }}
          >
            Restart
          </button>
          <button className="btn btn-ghost" onClick={() => useGameStore.getState().toMenu()}>
            Menu
          </button>
        </div>
      </section>
    </div>
  )
}
