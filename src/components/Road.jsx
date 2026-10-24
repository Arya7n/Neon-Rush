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
  ctx.fillStyle = theme.primary
  ctx.fillRect(3, 0, 4, 512)
  ctx.fillRect(121, 0, 4, 512)
  ctx.fillStyle = theme.secondary
  for (const x of [42, 84]) {
    for (let y = 8; y < 512; y += 64) ctx.fillRect(x, y, 4, 28)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1, 22)
  texture.anisotropy = 8
  return texture
}

export function Road() {
  const theme = getTheme(useGameStore((state) => state.theme))
  const markings = useMemo(() => makeMarkings(theme), [theme])
  const left = useRef()
  const right = useRef()
  const streaks = useRef()

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
    markings.offset.y = -distance * 0.085
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
        <meshStandardMaterial color="#080910" roughness={1} metalness={0.05} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -24]}>
        <planeGeometry args={[8.15, 210]} />
        <meshStandardMaterial
          color="#141822"
          metalness={0.28}
          roughness={0.68}
          emissive="#d7fbff"
          emissiveMap={markings}
          emissiveIntensity={1.35}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-6.1, 0.012, -24]}>
        <planeGeometry args={[3.4, 210]} />
        <meshStandardMaterial color="#10131c" roughness={0.92} metalness={0.08} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[6.1, 0.012, -24]}>
        <planeGeometry args={[3.4, 210]} />
        <meshStandardMaterial color="#10131c" roughness={0.92} metalness={0.08} />
      </mesh>
      <mesh position={[-4.15, 0.18, -24]}>
        <boxGeometry args={[0.12, 0.36, 210]} />
        <meshStandardMaterial color="#121722" emissive="#143040" emissiveIntensity={0.4} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[4.15, 0.18, -24]}>
        <boxGeometry args={[0.12, 0.36, 210]} />
        <meshStandardMaterial color="#121722" emissive="#3a1230" emissiveIntensity={0.35} metalness={0.6} roughness={0.3} />
      </mesh>
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
