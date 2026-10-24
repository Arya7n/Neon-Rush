import { Component } from 'react'
import { GameCanvas } from './components/GameCanvas.jsx'
import { useGameHotkeys } from './game/controls.js'
import { GameOver } from './ui/GameOver.jsx'
import { GameHUD, MuteButton } from './ui/GameHUD.jsx'
import { Countdown, PauseScreen } from './ui/PauseScreen.jsx'
import { StartScreen } from './ui/StartScreen.jsx'
import { TouchControls } from './ui/TouchControls.jsx'

class Boundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return <div className="boot-error">Neon Rush failed to start. {this.state.error.message}</div>
    }
    return this.props.children
  }
}

export default function App() {
  useGameHotkeys()
  return (
    <div className="game-root">
      <Boundary>
        <GameCanvas />
      </Boundary>
      <div className="vignette" />
      <div className="ui-layer">
        <MuteButton />
        <GameHUD />
        <StartScreen />
        <PauseScreen />
        <Countdown />
        <GameOver />
        <TouchControls />
      </div>
    </div>
  )
}
