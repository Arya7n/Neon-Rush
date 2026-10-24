import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'
import { playCollect, playCrash, playJump, playSlide } from '../game/audio.js'
import { useGameStore, worldRef } from '../game/gameStore.js'
import { consumeInput } from '../game/inputBuffer.js'
import { statsFromWorld } from '../game/score.js'
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
      player.x * 0.42 + (Math.random() - 0.5) * shake * 0.28,
      3.2 + player.y * 0.16 + (Math.random() - 0.5) * shake * 0.12,
      7.05 - boost * 0.4,
    )
    const camera = state.camera
    camera.position.lerp(target, 1 - Math.exp(-4.2 * dt))
    look.set(player.x * 0.55, 1.02 + player.y * 0.1, -12)
    camera.lookAt(look)
    camera.rotateZ(player.x * -0.012)
    const fov = 66 + boost * 7
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

  return (
    <Canvas
      className="game-canvas"
      dpr={quality === 'high' ? [1, 1.6] : [1, 1.1]}
      camera={{ position: [0, 3.2, 7.1], fov: 66, near: 0.1, far: 280 }}
      gl={{
        antialias: quality === 'high',
        alpha: false,
        stencil: false,
        powerPreference: 'high-performance',
      }}
      onCreated={({ gl }) => {
        gl.setClearColor('#070814')
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.12
      }}
    >
      <color attach="background" args={['#070814']} />
      <fog attach="fog" args={['#070814', 30, 165]} />
      <PerformanceMonitor onDecline={() => useGameStore.getState().setQuality('low', false)} />
      <AdaptiveDpr pixelated />
      <Simulator />
      <CameraRig />
      <ambientLight intensity={0.32} />
      <hemisphereLight args={['#2a3d66', '#1a0c16', 0.6]} />
      <directionalLight position={[5, 12, 6]} intensity={0.75} color="#d5e9ff" />
      <pointLight position={[-2.4, 2.5, 1.5]} color="#3df0ff" intensity={26} distance={18} decay={2} />
      <pointLight position={[2.8, 1.7, -1]} color="#ff2bd6" intensity={16} distance={14} decay={2} />
      <City worldRef={worldRef} />
      <Road />
      <Obstacles worldRef={worldRef} />
      <Collectibles worldRef={worldRef} />
      <Player />
      <Effects />
    </Canvas>
  )
}
