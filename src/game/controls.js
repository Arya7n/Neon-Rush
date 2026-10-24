import { useEffect } from 'react'
import { playStart, resumeAudio } from './audio.js'
import { useGameStore } from './gameStore.js'
import { clearInput, queueJump, queueLane, queueSlide } from './inputBuffer.js'

export function useGameHotkeys() {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.repeat) return
      const store = useGameStore.getState()
      const phase = store.phase

      if (event.key === 'Escape') {
        store.togglePause()
        return
      }

      if (phase === 'MENU' && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault()
        resumeAudio()
        playStart()
        if (store.pausedRun) store.continueRun()
        else store.start()
        return
      }

      if (phase === 'PAUSED' && event.key === 'Enter') {
        event.preventDefault()
        resumeAudio()
        playStart()
        store.resume()
        return
      }

      if (phase === 'GAME_OVER' && event.key === 'Enter') {
        event.preventDefault()
        resumeAudio()
        store.restart()
        return
      }

      if (phase !== 'PLAYING') return
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault()
      }

      switch (event.key.toLowerCase()) {
        case 'arrowleft':
        case 'a':
          queueLane(-1)
          break
        case 'arrowright':
        case 'd':
          queueLane(1)
          break
        case 'arrowup':
        case 'w':
        case ' ':
          queueJump()
          break
        case 'arrowdown':
        case 's':
          queueSlide()
          break
        default:
          break
      }
    }

    let originX = 0
    let originY = 0
    let tracking = false

    const onTouchStart = (event) => {
      if (event.target.closest?.('.touch-controls, button')) return
      const touch = event.changedTouches[0]
      originX = touch.clientX
      originY = touch.clientY
      tracking = true
    }

    const onTouchEnd = (event) => {
      if (!tracking) return
      tracking = false
      if (useGameStore.getState().phase !== 'PLAYING') return
      const touch = event.changedTouches[0]
      const dx = touch.clientX - originX
      const dy = touch.clientY - originY
      if (Math.hypot(dx, dy) < 32) return
      if (Math.abs(dx) > Math.abs(dy)) queueLane(dx > 0 ? 1 : -1)
      else if (dy < 0) queueJump()
      else queueSlide()
    }

    const onHide = () => {
      if (document.hidden) useGameStore.getState().pause()
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
      document.removeEventListener('visibilitychange', onHide)
      clearInput()
    }
  }, [])
}
