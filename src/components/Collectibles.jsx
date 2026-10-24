import { useLayoutEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../game/gameStore.js'
import { LANE_X, ORB_POOL } from '../game/constants.js'
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
  const core = useRef()
  const glow = useRef()
  const ring = useRef()

  useLayoutEffect(() => {
    core.current.frustumCulled = false
    glow.current.frustumCulled = false
    ring.current.frustumCulled = false
  }, [])

  useFrame(() => {
    if (!core.current || !glow.current || !ring.current) return
    const visible = useGameStore.getState().phase !== 'MENU'
    const world = worldRef.current
    const list = world.collectibles
    let count = 0
    if (visible) {
      for (let i = 0; i < ORB_POOL && count < MAX; i += 1) {
        const orb = list[i]
        if (!orb.active) continue
        const bob = 1 + Math.sin(world.elapsed * 4 + i) * 0.12
        const spin = world.elapsed * 2.2 + i
        place(core.current, count, LANE_X[orb.lane], bob, orb.z, 1, spin)
        place(glow.current, count, LANE_X[orb.lane], bob, orb.z, 1.15 + Math.sin(world.elapsed * 4 + i) * 0.08, spin)
        placeRing(ring.current, count, LANE_X[orb.lane], orb.z)
        count += 1
      }
    }
    core.current.count = count
    glow.current.count = count
    ring.current.count = count
    core.current.instanceMatrix.needsUpdate = true
    glow.current.instanceMatrix.needsUpdate = true
    ring.current.instanceMatrix.needsUpdate = true
  })

  return (
    <group>
      <instancedMesh ref={core} args={[null, null, MAX]}>
        <sphereGeometry args={[0.26, 16, 12]} />
        <meshStandardMaterial color="#f3ffff" emissive="#8af7ff" emissiveIntensity={2.4} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={glow} args={[null, null, MAX]}>
        <sphereGeometry args={[0.46, 12, 10]} />
        <meshBasicMaterial color="#3df0ff" transparent opacity={0.28} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={ring} args={[null, null, MAX]}>
        <ringGeometry args={[0.28, 0.48, 20]} />
        <meshBasicMaterial color="#7af6ff" transparent opacity={0.7} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>
    </group>
  )
}
