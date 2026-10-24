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
  const magnet = useRef()
  const boost = useRef()
  const smash = useRef()

  useLayoutEffect(() => {
    ;[core, glow, ring, shield, shieldRing, magnet, boost, smash].forEach((ref) => {
      if (ref.current) ref.current.frustumCulled = false
    })
  }, [])

  useFrame(() => {
    if (!core.current || !shield.current || !magnet.current || !boost.current || !smash.current) return
    const phase = useGameStore.getState().phase
    const visible = phase !== 'MENU' || useGameStore.getState().pausedRun
    const world = worldRef.current
    const list = world.collectibles
    let energy = 0
    let shields = 0
    let magnets = 0
    let boosts = 0
    let smashes = 0
    if (visible) {
      for (let i = 0; i < ORB_POOL; i += 1) {
        const orb = list[i]
        if (!orb.active) continue
        const x = orb.x ?? LANE_X[orb.lane]
        const bob = 1 + Math.sin(world.elapsed * 4 + i) * 0.12
        const spin = world.elapsed * 2.2 + i
        if (orb.kind === 'shield' && shields < MAX) {
          place(shield.current, shields, x, bob + 0.15, orb.z, 1.15, spin)
          placeRing(shieldRing.current, shields, x, orb.z)
          shields += 1
        } else if (orb.kind === 'magnet' && magnets < MAX) {
          place(magnet.current, magnets, x, bob + 0.2, orb.z, 1.1, spin)
          magnets += 1
        } else if (orb.kind === 'boost' && boosts < MAX) {
          place(boost.current, boosts, x, bob + 0.15, orb.z, 1.05, spin)
          boosts += 1
        } else if (orb.kind === 'smash' && smashes < MAX) {
          place(smash.current, smashes, x, bob + 0.15, orb.z, 1.05, spin)
          smashes += 1
        } else if (energy < MAX) {
          place(core.current, energy, x, bob, orb.z, 1, spin)
          place(glow.current, energy, x, bob, orb.z, 1.15 + Math.sin(world.elapsed * 4 + i) * 0.08, spin)
          placeRing(ring.current, energy, x, orb.z)
          energy += 1
        }
      }
    }
    core.current.count = energy
    glow.current.count = energy
    ring.current.count = energy
    shield.current.count = shields
    shieldRing.current.count = shields
    magnet.current.count = magnets
    boost.current.count = boosts
    smash.current.count = smashes
    for (const mesh of [core, glow, ring, shield, shieldRing, magnet, boost, smash]) {
      mesh.current.instanceMatrix.needsUpdate = true
    }
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
      <instancedMesh ref={magnet} args={[null, null, MAX]}>
        <torusGeometry args={[0.28, 0.08, 8, 16]} />
        <meshStandardMaterial color="#d7e6ff" emissive="#7aa2ff" emissiveIntensity={2} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={boost} args={[null, null, MAX]}>
        <icosahedronGeometry args={[0.28, 0]} />
        <meshStandardMaterial color="#e8fff6" emissive="#5dffe0" emissiveIntensity={2} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={smash} args={[null, null, MAX]}>
        <dodecahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial color="#ffd0c4" emissive="#ff5a3c" emissiveIntensity={2} toneMapped={false} />
      </instancedMesh>
    </group>
  )
}
