import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { TRACK_LEAD, TRACK_LENGTH } from '../game/constants.js'
import { loopZ } from '../game/math.js'
import { useGameStore, worldRef } from '../game/gameStore.js'
import { getTheme } from '../game/themes.js'

const DUMMY = new THREE.Object3D()
const CHEVRONS = 24

function makeMarkings(theme) {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, 128, 512)
  if (theme.place === 'shore') {
    ctx.fillStyle = '#c49658'
    for (let y = 0; y < 512; y += 40) ctx.fillRect(8, y, 112, 4)
  } else if (theme.place === 'dunes') {
    ctx.fillStyle = '#a86b38'
    ctx.fillRect(30, 0, 8, 512)
    ctx.fillRect(90, 0, 8, 512)
  } else if (theme.place === 'jungle') {
    ctx.fillStyle = '#6b4e2a'
    ctx.fillRect(16, 0, 4, 512)
    ctx.fillRect(108, 0, 4, 512)
    ctx.fillStyle = '#7d9a48'
    for (let y = 20; y < 512; y += 90) ctx.fillRect(58, y, 12, 18)
  } else {
    ctx.fillStyle = theme.primary
    ctx.fillRect(3, 0, 4, 512)
    ctx.fillRect(121, 0, 4, 512)
    ctx.fillStyle = theme.secondary
    for (const x of [42, 84]) {
      for (let y = 8; y < 512; y += 64) ctx.fillRect(x, y, 4, 28)
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1, 22)
  texture.anisotropy = 8
  return texture
}

function makeGrain(place) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 1600; i += 1) {
    const tone = 150 + Math.floor(Math.random() * 90)
    ctx.fillStyle = `rgba(${tone},${tone},${tone},0.28)`
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1 + Math.random() * 2)
  }
  if (place === 'shore') {
    ctx.strokeStyle = 'rgba(120, 78, 40, 0.28)'
    ctx.lineWidth = 2
    for (let y = 8; y < 256; y += 28) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.bezierCurveTo(80, y + 3, 160, y - 3, 256, y + 1)
      ctx.stroke()
    }
  } else if (place === 'dunes') {
    ctx.strokeStyle = 'rgba(120, 70, 30, 0.18)'
    ctx.lineWidth = 3
    for (let y = 0; y < 256; y += 18) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.quadraticCurveTo(128, y + 8, 256, y - 2)
      ctx.stroke()
    }
  } else if (place === 'city') {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(30, 0)
    ctx.lineTo(48, 256)
    ctx.moveTo(180, 0)
    ctx.lineTo(150, 256)
    ctx.stroke()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2, place === 'shore' ? 14 : 26)
  texture.anisotropy = 8
  return texture
}

function makeWaves() {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#2f92c4'
  ctx.fillRect(0, 0, 128, 256)
  ctx.strokeStyle = 'rgba(230, 248, 255, 0.55)'
  ctx.lineWidth = 3
  for (let y = 12; y < 256; y += 28) {
    ctx.beginPath()
    for (let x = 0; x <= 128; x += 8) {
      const wave = Math.sin(x * 0.08 + y) * 4
      if (x === 0) ctx.moveTo(x, y + wave)
      else ctx.lineTo(x, y + wave)
    }
    ctx.stroke()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(4, 8)
  return texture
}

export function Road() {
  const theme = getTheme(useGameStore((state) => state.theme))
  const markings = useMemo(() => makeMarkings(theme), [theme])
  const grain = useMemo(() => makeGrain(theme.place), [theme])
  const waves = useMemo(() => (theme.place === 'shore' ? makeWaves() : null), [theme])
  const left = useRef()
  const right = useRef()
  const streaks = useRef()
  const city = theme.place === 'city'

  useLayoutEffect(() => {
    left.current.frustumCulled = false
    right.current.frustumCulled = false
    streaks.current.frustumCulled = false
    const cyan = new THREE.Color(theme.primary)
    const magenta = new THREE.Color(theme.secondary)
    for (let i = 0; i < CHEVRONS; i += 1) {
      const color = i % 2 === 0 ? cyan : magenta
      left.current.setColorAt(i, color)
      right.current.setColorAt(i, color)
    }
    left.current.instanceColor.needsUpdate = true
    right.current.instanceColor.needsUpdate = true
    if (streaks.current?.material?.color) streaks.current.material.color.set(theme.primary)
  }, [theme])

  useFrame(() => {
    const { distance, speed } = worldRef.current
    markings.offset.y = -distance * (theme.place === 'shore' ? 0.12 : 0.085)
    grain.offset.y = -distance * 0.04
    if (waves) waves.offset.y = -distance * 0.012
    if (!city) {
      left.current.count = 0
      right.current.count = 0
      streaks.current.count = 0
      return
    }
    left.current.count = CHEVRONS
    right.current.count = CHEVRONS
    streaks.current.count = 16
    for (let i = 0; i < CHEVRONS; i += 1) {
      const z = loopZ(i * (TRACK_LENGTH / CHEVRONS), distance, TRACK_LENGTH, TRACK_LEAD)
      DUMMY.rotation.set(0, 0, 0)
      DUMMY.scale.set(1, 1, 1)
      DUMMY.position.set(-1.28, 0.045, z)
      DUMMY.updateMatrix()
      left.current.setMatrixAt(i, DUMMY.matrix)
      DUMMY.position.set(1.28, 0.045, z)
      DUMMY.updateMatrix()
      right.current.setMatrixAt(i, DUMMY.matrix)
    }
    left.current.instanceMatrix.needsUpdate = true
    right.current.instanceMatrix.needsUpdate = true

    const show = Math.min(1, Math.max(0, (speed - 18) / 12))
    for (let i = 0; i < 16; i += 1) {
      const side = i < 8 ? -1 : 1
      const lane = (i % 8) / 8
      const z = loopZ(i * 14, distance * 1.35, TRACK_LENGTH, TRACK_LEAD)
      DUMMY.position.set(side * (5.3 + lane * 2.2), 0.7 + (i % 5) * 0.35, z)
      DUMMY.scale.set(0.03, 0.03, 1.6 + show * 2.4)
      DUMMY.rotation.set(0, 0, 0)
      DUMMY.updateMatrix()
      streaks.current.setMatrixAt(i, DUMMY.matrix)
    }
    streaks.current.instanceMatrix.needsUpdate = true
  })

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, -20]} receiveShadow={false}>
        <planeGeometry args={[90, 240]} />
        <meshStandardMaterial color={theme.ground} map={waves || grain} roughness={theme.place === 'shore' ? 0.28 : 0.96} metalness={theme.place === 'shore' ? 0.28 : 0.02} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -24]}>
        <planeGeometry args={[8.15, 210]} />
        <meshStandardMaterial
          color={theme.path}
          map={grain}
          metalness={0.04}
          roughness={0.88}
          emissive={theme.pathGlow}
          emissiveMap={markings}
          emissiveIntensity={city ? 0.55 : 0.18}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-6.1, 0.02, -24]}>
        <planeGeometry args={[3.4, 210]} />
        <meshStandardMaterial color={theme.shoulder} map={grain} roughness={0.94} metalness={0.02} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[6.1, 0.02, -24]}>
        <planeGeometry args={[3.4, 210]} />
        <meshStandardMaterial color={theme.shoulder} map={grain} roughness={0.94} metalness={0.02} />
      </mesh>
      {(city || theme.place === 'jungle') && (
        <group>
          <mesh position={[-4.15, city ? 0.18 : 0.1, -24]}>
            <boxGeometry args={city ? [0.12, 0.36, 210] : [0.28, 0.2, 210]} />
            <meshStandardMaterial color={theme.edge} emissive={theme.edgeGlow} emissiveIntensity={city ? 0.4 : 0.08} metalness={city ? 0.6 : 0.05} roughness={city ? 0.3 : 0.9} />
          </mesh>
          <mesh position={[4.15, city ? 0.18 : 0.1, -24]}>
            <boxGeometry args={city ? [0.12, 0.36, 210] : [0.28, 0.2, 210]} />
            <meshStandardMaterial color={theme.edge} emissive={theme.edgeGlowAlt} emissiveIntensity={city ? 0.35 : 0.08} metalness={city ? 0.6 : 0.05} roughness={city ? 0.3 : 0.9} />
          </mesh>
        </group>
      )}
      <instancedMesh ref={left} args={[null, null, CHEVRONS]}>
        <boxGeometry args={[0.22, 0.025, 0.85]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={right} args={[null, null, CHEVRONS]}>
        <boxGeometry args={[0.22, 0.025, 0.85]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={streaks} args={[null, null, 16]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#7af6ff" transparent opacity={0.35} depthWrite={false} toneMapped={false} />
      </instancedMesh>
    </group>
  )
}
