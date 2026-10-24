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
import { Scenery } from './Scenery.jsx'
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
      2.45 + player.y * 0.16 + (Math.random() - 0.5) * shake * 0.1,
      5.15 - boost * 0.3,
    )
    const camera = state.camera
    camera.position.lerp(target, 1 - Math.exp(-4.2 * dt))
    look.set(player.x * 0.72, 0.92 + player.y * 0.1, -8.5)
    camera.lookAt(look)
    camera.rotateZ(player.x * -0.015)
    const fov = 50 + boost * 4
    camera.fov += (fov - camera.fov) * (1 - Math.exp(-2.5 * dt))
    camera.updateProjectionMatrix()
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
      camera={{ position: [0, 2.45, 5.15], fov: 50, near: 0.1, far: 280 }}
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
      <fog attach="fog" args={[theme.fog, theme.fogNear, theme.fogFar]} />
      <AdaptiveDpr pixelated />
      <Simulator />
      <CameraRig />
      <ambientLight intensity={theme.ambient} />
      <hemisphereLight args={[theme.hemiSky, theme.hemiGround, 0.75]} />
      <directionalLight position={theme.sunPos} intensity={theme.sunIntensity} color={theme.sun} />
      {theme.place === 'city' && (
        <>
          <pointLight position={[-2.2, 2.4, 2.2]} color={theme.primary} intensity={3.2} distance={14} decay={2} />
          <pointLight position={[2.4, 1.8, 1]} color={theme.secondary} intensity={2.2} distance={12} decay={2} />
        </>
      )}
      <Scenery worldRef={worldRef} />
      <Road />
      <Obstacles worldRef={worldRef} />
      <Collectibles worldRef={worldRef} />
      <Player />
      <Effects />
    </Canvas>
  )
}
