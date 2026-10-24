import { useEffect, useRef } from 'react'
import { playStart, resumeAudio } from '../game/audio.js'
import { useGameStore } from '../game/gameStore.js'

export function StartScreen() {
  const phase = useGameStore((state) => state.phase)
  const best = useGameStore((state) => state.best)
  const quality = useGameStore((state) => state.quality)
  const setQuality = useGameStore((state) => state.setQuality)
  const startRef = useRef(null)

  useEffect(() => {
    startRef.current?.focus()
  }, [])

  if (phase !== 'MENU') return null

  const start = () => {
    resumeAudio()
    playStart()
    useGameStore.getState().start()
  }

  return (
    <div className="overlay overlay-start">
      <section className="panel panel-start">
        <p className="eyebrow">Cyberpunk endless runner</p>
        <h1 className="title">
          NEON
          <span> RUSH</span>
        </h1>
        <p className="tagline">Three lanes. No brakes.</p>
        <button ref={startRef} className="btn btn-primary" onClick={start}>
          Start Run
        </button>
        <div className="controls">
          <p><b>A / D</b> or arrows change lanes</p>
          <p><b>W / ↑ / Space</b> jump</p>
          <p><b>S / ↓</b> slide</p>
          <p><b>Esc</b> pause</p>
          <p><b>Swipe</b> on touch screens</p>
        </div>
        <div className="start-row">
          {best > 0 && <p className="best">Best {best.toLocaleString('en-US')}</p>}
          <button
            className="btn btn-ghost"
            onClick={() => setQuality(quality === 'high' ? 'low' : 'high')}
          >
            Effects {quality === 'high' ? 'High' : 'Low'}
          </button>
        </div>
      </section>
    </div>
  )
}
