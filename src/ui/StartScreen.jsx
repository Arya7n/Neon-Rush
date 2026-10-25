import { useEffect, useRef } from 'react'
import { playStart, resumeAudio } from '../game/audio.js'
import { useGameStore } from '../game/gameStore.js'
import { THEMES } from '../game/themes.js'

export function StartScreen() {
  const phase = useGameStore((state) => state.phase)
  const best = useGameStore((state) => state.best)
  const quality = useGameStore((state) => state.quality)
  const setQuality = useGameStore((state) => state.setQuality)
  const themeId = useGameStore((state) => state.theme)
  const setTheme = useGameStore((state) => state.setTheme)
  const pausedRun = useGameStore((state) => state.pausedRun)
  const distance = useGameStore((state) => state.distance)
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

  const continueRun = () => {
    resumeAudio()
    playStart()
    useGameStore.getState().continueRun()
  }

  return (
    <div className="overlay overlay-start">
      <section className="panel panel-start">
        <p className="eyebrow">Endless runner</p>
        <h1 className="title">
          NEON <span>RUSH</span>
        </h1>
        <p className="tagline">Three lanes. No brakes. Chain energy, then grab a magnet, a score boost, or a smash.</p>
        <div className="themes" role="listbox" aria-label="Place">
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              className={theme.id === themeId ? 'theme on' : 'theme'}
              onClick={() => setTheme(theme.id)}
              aria-pressed={theme.id === themeId}
            >
              <i style={{ background: `linear-gradient(145deg, ${theme.primary}, ${theme.secondary})` }} />
              <span>{theme.name}</span>
            </button>
          ))}
        </div>
        <p className="hazard-note">{THEMES.find((theme) => theme.id === themeId)?.hazard}</p>
        {pausedRun ? (
          <div className="action-row">
            <button ref={startRef} className="btn btn-primary" onClick={continueRun}>
              Continue
            </button>
            <button className="btn btn-ghost" onClick={start}>
              Start Run
            </button>
          </div>
        ) : (
          <button ref={startRef} className="btn btn-primary" onClick={start}>
            Start Run
          </button>
        )}
        {pausedRun && <p className="best">Paused at <b>{Math.floor(distance)}m</b></p>}
        <div className="controls">
          <p><span><kbd>A</kbd><kbd>D</kbd></span>Lanes</p>
          <p><span><kbd>W</kbd><kbd>↑</kbd></span>Jump</p>
          <p><span><kbd>S</kbd><kbd>↓</kbd></span>Slide</p>
          <p><span><kbd>Esc</kbd></span>Pause</p>
        </div>
        <div className="start-row">
          {best > 0 && (
            <p className="best">
              <span>Best</span>
              <b>{best.toLocaleString('en-US')}</b>
            </p>
          )}
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
