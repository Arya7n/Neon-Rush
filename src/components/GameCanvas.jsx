import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { AdaptiveDpr } from '@react-three/drei'
import * as THREE from 'three'
import { playCollect, playCrash, playJump, playNear, playShield, playSlide } from '../game/audio.js'
import { useGameStore, worldRef } from '../game/gameStore.js'
import { consumeInput } from '../game/inputBuffer.js'
import { statsFromWorld } from '../game/score.js'
import { getTheme } from '../game/themes.js'
import { updateMenu, updateWorld } from '../game/world.js'
import { City } from './City.jsx'
import { Collectibles } from './Collectibles.jsx'
import { Effects } from './Effects.jsx'
import { Obstacles } from './Obstacles.jsx'
import { Player } from './Player.jsx'
import { Road } from './Road.jsx'

const target = new THREE.Vector3()
const look = new THREE.Vector3()

function Simulator() {
  const hudTimer = useRef(0)

  useFrame((_, dt) => {
    const step = Math.min(dt, 0.05)
    const store = useGameStore.getState()
    const world = worldRef.current
    if (!world) return

    if (store.phase === 'MENU') {
      updateMenu(world, step)
      return
    }
    if (store.phase !== 'PLAYING') return

    const beforeY = world.player.y
    const beforeSlide = world.player.sliding
    const result = updateWorld(world, step, consumeInput())
    if (beforeY <= 0.001 && world.player.vy > 4) playJump()
    if (!beforeSlide && world.player.sliding) playSlide()
    if (result.collected) playCollect()
    if (result.nearMisses) playNear()
    if (result.powered || result.shielded) playShield()
    if (result.crashed) {
      playCrash()
      store.gameOver()
      return
    }

    hudTimer.current += step
    if (hudTimer.current >= 0.1 || result.collected) {
      hudTimer.current = 0
      store.pushHud(statsFromWorld(world))
    }
  })

  return null
}

function CameraRig() {
  useFrame((state, dt) => {
    const world = worldRef.current
    const player = world.player
    const boost = (world.speed - 17) / 20
    const shake = world.shake
    target.set(
      player.x * 0.55 + (Math.random() - 0.5) * shake * 0.22,
      2.15 + player.y * 0.2 + (Math.random() - 0.5) * shake * 0.1,
      4.35 - boost * 0.25,
    )
    const camera = state.camera
    camera.position.lerp(target, 1 - Math.exp(-4.2 * dt))
    look.set(player.x * 0.65, 1.05 + player.y * 0.12, -7)
    camera.lookAt(look)
    camera.rotateZ(player.x * -0.02)
    const fov = 58 + boost * 6
    if (Math.abs(camera.fov - fov) > 0.08) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }
    world.shake = Math.max(0, world.shake - dt * 1.6)
  })
  return null
}

export function GameCanvas() {
  const quality = useGameStore((state) => state.quality)
  const theme = getTheme(useGameStore((state) => state.theme))

  return (
    <Canvas
      className="game-canvas"
      dpr={quality === 'high' ? [1, 1.6] : [1, 1.1]}
      camera={{ position: [0, 2.15, 4.35], fov: 58, near: 0.1, far: 280 }}
      gl={{
        antialias: quality === 'high',
        alpha: false,
        stencil: false,
        powerPreference: 'high-performance',
      }}
      onCreated={({ gl }) => {
        gl.setClearColor(theme.fog)
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.12
      }}
    >
      <color attach="background" args={[theme.fog]} />
      <fog attach="fog" args={[theme.fog, 30, 165]} />
      <AdaptiveDpr pixelated />
      <Simulator />
      <CameraRig />
      <ambientLight intensity={0.42} />
      <hemisphereLight args={['#31486f', '#241018', 0.7]} />
      <directionalLight position={[5, 12, 6]} intensity={0.85} color="#d5e9ff" />
      <pointLight position={[-2.2, 2.4, 2.2]} color={theme.primary} intensity={7} distance={16} decay={2} />
      <pointLight position={[2.4, 1.8, 1]} color={theme.secondary} intensity={5} distance={14} decay={2} />
      <City worldRef={worldRef} />
      <Road />
      <Obstacles worldRef={worldRef} />
      <Collectibles worldRef={worldRef} />
      <Player />
      <Effects />
    </Canvas>
  )
}
