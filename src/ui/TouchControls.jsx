import { useGameStore } from '../game/gameStore.js'
import { queueJump, queueLane, queueSlide } from '../game/inputBuffer.js'

export function TouchControls() {
  const phase = useGameStore((state) => state.phase)
  if (phase !== 'PLAYING') return null

  const press = (event, action) => {
    event.preventDefault()
    action()
  }

  return (
    <div className="touch-controls">
      <button onPointerDown={(event) => press(event, () => queueLane(-1))} aria-label="Move left">Left</button>
      <button onPointerDown={(event) => press(event, () => queueJump())} aria-label="Jump">Jump</button>
      <button onPointerDown={(event) => press(event, () => queueSlide())} aria-label="Slide">Slide</button>
      <button onPointerDown={(event) => press(event, () => queueLane(1))} aria-label="Move right">Right</button>
    </div>
  )
}
