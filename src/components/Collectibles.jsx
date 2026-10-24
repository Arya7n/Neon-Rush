import { useLayoutEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../game/gameStore.js'
import { LANE_X, ORB_POOL } from '../game/constants.js'
import { getTheme } from '../game/themes.js'
import * as THREE from 'three'

const DUMMY = new THREE.Object3D()
const MAX = 24

function place(mesh, index, x, y, z, scale, spin) {
  DUMMY.position.set(x, y, z)
  DUMMY.rotation.set(spin * 0.6, spin, 0)
  DUMMY.scale.setScalar(scale)
  DUMMY.updateMatrix()
  mesh.setMatrixAt(index, DUMMY.matrix)
}

function placeRing(mesh, index, x, z) {
  DUMMY.position.set(x, 0.045, z)
  DUMMY.rotation.set(-Math.PI / 2, 0, 0)
  DUMMY.scale.setScalar(1)
  DUMMY.updateMatrix()
  mesh.setMatrixAt(index, DUMMY.matrix)
}

export function Collectibles({ worldRef }) {
  const theme = getTheme(useGameStore((state) => state.theme))
  const core = useRef()
  const glow = useRef()
  const ring = useRef()
  const shield = useRef()
  const shieldRing = useRef()

  useLayoutEffect(() => {
    ;[core, glow, ring, shield, shieldRing].forEach((ref) => {
      if (ref.current) ref.current.frustumCulled = false
    })
  }, [])

  useFrame(() => {
    if (!core.current || !shield.current) return
    const visible = useGameStore.getState().phase !== 'MENU'
    const world = worldRef.current
    const list = world.collectibles
    let energy = 0
    let shields = 0
    if (visible) {
      for (let i = 0; i < ORB_POOL; i += 1) {
        const orb = list[i]
        if (!orb.active) continue
        const bob = 1 + Math.sin(world.elapsed * 4 + i) * 0.12
        const spin = world.elapsed * 2.2 + i
        if (orb.kind === 'shield' && shields < MAX) {
          place(shield.current, shields, LANE_X[orb.lane], bob + 0.15, orb.z, 1.15, spin)
          placeRing(shieldRing.current, shields, LANE_X[orb.lane], orb.z)
          shields += 1
        } else if (energy < MAX) {
          place(core.current, energy, LANE_X[orb.lane], bob, orb.z, 1, spin)
          place(glow.current, energy, LANE_X[orb.lane], bob, orb.z, 1.15 + Math.sin(world.elapsed * 4 + i) * 0.08, spin)
          placeRing(ring.current, energy, LANE_X[orb.lane], orb.z)
          energy += 1
        }
      }
    }
    core.current.count = energy
    glow.current.count = energy
    ring.current.count = energy
    shield.current.count = shields
    shieldRing.current.count = shields
    core.current.instanceMatrix.needsUpdate = true
    glow.current.instanceMatrix.needsUpdate = true
    ring.current.instanceMatrix.needsUpdate = true
    shield.current.instanceMatrix.needsUpdate = true
    shieldRing.current.instanceMatrix.needsUpdate = true
  })

  return (
    <group>
      <instancedMesh ref={core} args={[null, null, MAX]}>
        <sphereGeometry args={[0.26, 16, 12]} />
        <meshStandardMaterial color="#f3ffff" emissive={theme.primary} emissiveIntensity={2.4} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={glow} args={[null, null, MAX]}>
        <sphereGeometry args={[0.46, 12, 10]} />
        <meshBasicMaterial color={theme.primary} transparent opacity={0.28} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={ring} args={[null, null, MAX]}>
        <ringGeometry args={[0.28, 0.48, 20]} />
        <meshBasicMaterial color={theme.primary} transparent opacity={0.7} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={shield} args={[null, null, MAX]}>
        <octahedronGeometry args={[0.32, 0]} />
        <meshStandardMaterial color="#fff4c2" emissive="#ffe38a" emissiveIntensity={2.2} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={shieldRing} args={[null, null, MAX]}>
        <ringGeometry args={[0.34, 0.52, 6]} />
        <meshBasicMaterial color="#ffe38a" transparent opacity={0.85} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
    </group>
  )
}
