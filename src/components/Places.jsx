import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SEGMENT_COUNT, SEGMENT_LENGTH, TRACK_LEAD, TRACK_LENGTH } from '../game/constants.js'
import { loopZ, mulberry32 } from '../game/math.js'

const DUMMY = new THREE.Object3D()

function scatter(seed, perSide, near, span) {
  const rng = mulberry32(seed)
  const items = []
  for (let segment = 0; segment < SEGMENT_COUNT; segment += 1) {
    for (const side of [-1, 1]) {
      for (let n = 0; n < perSide; n += 1) {
        items.push({
          anchor: segment * SEGMENT_LENGTH + (n + 0.35) * (SEGMENT_LENGTH / perSide) + rng() * 1.5,
          x: side * (near + rng() * span),
          h: 0.65 + rng(),
          rot: rng() * Math.PI * 2,
          variant: rng(),
          side,
        })
      }
    }
  }
  return items
}

function paint(mesh, items, colors) {
  if (!mesh) return
  items.forEach((item, index) => {
    mesh.setColorAt(index, colors[Math.floor(item.variant * colors.length) % colors.length])
  })
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
}

function stamp(mesh, index, x, y, z, sx, sy, sz, rotY = 0, rotZ = 0) {
  if (!mesh) return
  DUMMY.position.set(x, y, z)
  DUMMY.rotation.set(0, rotY, rotZ)
  DUMMY.scale.set(sx, sy, sz)
  DUMMY.updateMatrix()
  mesh.setMatrixAt(index, DUMMY.matrix)
}

export function Jungle({ worldRef }) {
  const trees = useMemo(() => scatter(11, 3, 6.4, 8), [])
  const bushes = useMemo(() => scatter(19, 2, 5.3, 2.2), [])
  const trunks = useRef()
  const canopy = useRef()
  const under = useRef()
  const leaves = useMemo(
    () => ['#1c6a30', '#3e9a32', '#145228', '#67a83a'].map((hex) => new THREE.Color(hex)),
    [],
  )
  const bushColors = useMemo(
    () => ['#246b32', '#4ea844', '#1a5528'].map((hex) => new THREE.Color(hex)),
    [],
  )

  useLayoutEffect(() => {
    ;[trunks, canopy, under].forEach((ref) => {
      if (ref.current) ref.current.frustumCulled = false
    })
    paint(canopy.current, trees, leaves)
    paint(under.current, bushes, bushColors)
  }, [bushes, bushColors, leaves, trees])

  useFrame(() => {
    if (!trunks.current || !canopy.current || !under.current) return
    const { distance } = worldRef.current
    trees.forEach((tree, index) => {
      const z = loopZ(tree.anchor, distance, TRACK_LENGTH, TRACK_LEAD)
      const height = 4.2 + tree.h * 4.5
      stamp(trunks.current, index, tree.x, height / 2, z, 0.55 + tree.variant * 0.45, height, 0.55 + tree.variant * 0.45)
      const crown = 2.2 + tree.variant * 1.4
      stamp(canopy.current, index, tree.x, height + crown * 0.32, z, 1.5 + tree.variant, crown, 1.5 + tree.variant, tree.rot)
    })
    bushes.forEach((bush, index) => {
      const z = loopZ(bush.anchor, distance, TRACK_LENGTH, TRACK_LEAD)
      const size = 0.7 + bush.h * 0.55
      stamp(under.current, index, bush.x, size * 0.45, z, size * 1.3, size, size * 1.3, bush.rot)
    })
    trunks.current.count = trees.length
    canopy.current.count = trees.length
    under.current.count = bushes.length
    trunks.current.instanceMatrix.needsUpdate = true
    canopy.current.instanceMatrix.needsUpdate = true
    under.current.instanceMatrix.needsUpdate = true
  })

  return (
    <group>
      <instancedMesh ref={trunks} args={[null, null, trees.length]}>
        <cylinderGeometry args={[0.22, 0.34, 1, 6]} />
        <meshStandardMaterial color="#5c3b24" roughness={0.92} />
      </instancedMesh>
      <instancedMesh ref={canopy} args={[null, null, trees.length]}>
        <coneGeometry args={[1, 1, 7]} />
        <meshStandardMaterial color="#2f8a34" roughness={0.84} />
      </instancedMesh>
      <instancedMesh ref={under} args={[null, null, bushes.length]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color="#2d7a34" roughness={0.9} />
      </instancedMesh>
    </group>
  )
}

export function Dunes({ worldRef }) {
  const mounds = useMemo(() => scatter(31, 2, 10, 16), [])
  const buttes = useMemo(() => scatter(47, 1, 16, 12), [])
  const cacti = useMemo(() => scatter(53, 2, 5.4, 2.4), [])
  const sand = useRef()
  const rock = useRef()
  const cactus = useRef()
  const arms = useRef()
  const sandColors = useMemo(
    () => ['#f0c27a', '#e2a45a', '#f6d7a0'].map((hex) => new THREE.Color(hex)),
    [],
  )
  const rockColors = useMemo(
    () => ['#c4623e', '#a34a32', '#8d5a3c'].map((hex) => new THREE.Color(hex)),
    [],
  )

  useLayoutEffect(() => {
    ;[sand, rock, cactus, arms].forEach((ref) => {
      if (ref.current) ref.current.frustumCulled = false
    })
    paint(sand.current, mounds, sandColors)
    paint(rock.current, buttes, rockColors)
  }, [buttes, mounds, rockColors, sandColors])

  useFrame(() => {
    if (!sand.current || !rock.current || !cactus.current || !arms.current) return
    const { distance } = worldRef.current
    mounds.forEach((mound, index) => {
      const z = loopZ(mound.anchor, distance * 0.85, TRACK_LENGTH, TRACK_LEAD)
      const sx = 4 + mound.h * 5
      const sy = 0.7 + mound.variant * 1.1
      stamp(sand.current, index, mound.x, sy * 0.35, z, sx, sy, 3.2 + mound.variant * 3)
    })
    buttes.forEach((butte, index) => {
      const z = loopZ(butte.anchor, distance * 0.55, TRACK_LENGTH, TRACK_LEAD + 8)
      const height = 7 + butte.h * 14
      stamp(rock.current, index, butte.x, height / 2, z, 3.5 + butte.variant * 4, height, 3 + butte.variant * 3, butte.rot)
    })
    cacti.forEach((plant, index) => {
      const z = loopZ(plant.anchor, distance, TRACK_LENGTH, TRACK_LEAD)
      const height = 1.3 + plant.h * 1.6
      stamp(cactus.current, index, plant.x, height / 2, z, 0.7 + plant.variant * 0.4, height, 0.7 + plant.variant * 0.4)
      stamp(arms.current, index, plant.x + plant.side * 0.22, height * 0.62, z, 0.45, 0.7, 0.45, 0, plant.side * 1.15)
    })
    sand.current.instanceMatrix.needsUpdate = true
    rock.current.instanceMatrix.needsUpdate = true
    cactus.current.instanceMatrix.needsUpdate = true
    arms.current.instanceMatrix.needsUpdate = true
  })

  return (
    <group>
      <instancedMesh ref={sand} args={[null, null, mounds.length]}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial color="#efc27a" roughness={1} />
      </instancedMesh>
      <instancedMesh ref={rock} args={[null, null, buttes.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#c4623e" roughness={0.92} />
      </instancedMesh>
      <instancedMesh ref={cactus} args={[null, null, cacti.length]}>
        <cylinderGeometry args={[0.16, 0.2, 1, 6]} />
        <meshStandardMaterial color="#3f7d46" roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={arms} args={[null, null, cacti.length]}>
        <cylinderGeometry args={[0.1, 0.12, 1, 5]} />
        <meshStandardMaterial color="#3f7d46" roughness={0.8} />
      </instancedMesh>
    </group>
  )
}

export function Shore({ worldRef }) {
  const palms = useMemo(() => scatter(61, 2, 6.6, 3.5), [])
  const shades = useMemo(() => scatter(71, 1, 5.6, 1.2), [])
  const trunks = useRef()
  const crowns = useRef()
  const poles = useRef()
  const tops = useRef()
  const cloth = useMemo(
    () => ['#fff6ea', '#ffd27a', '#ff8d7a', '#7fd4ff'].map((hex) => new THREE.Color(hex)),
    [],
  )

  useLayoutEffect(() => {
    ;[trunks, crowns, poles, tops].forEach((ref) => {
      if (ref.current) ref.current.frustumCulled = false
    })
    paint(tops.current, shades, cloth)
  }, [cloth, shades])

  useFrame(() => {
    if (!trunks.current || !crowns.current || !poles.current || !tops.current) return
    const { distance, elapsed } = worldRef.current
    palms.forEach((palm, index) => {
      const z = loopZ(palm.anchor, distance, TRACK_LENGTH, TRACK_LEAD)
      const height = 3.4 + palm.h * 2.4
      stamp(trunks.current, index, palm.x, height / 2, z, 0.7, height, 0.7, 0, palm.side * 0.08)
      stamp(crowns.current, index, palm.x + palm.side * 0.2, height + 0.15, z, 1.5 + palm.variant * 0.6, 1.15, 1.5 + palm.variant * 0.6, palm.rot)
    })
    shades.forEach((shade, index) => {
      const z = loopZ(shade.anchor + 4, distance, TRACK_LENGTH, TRACK_LEAD)
      const sway = Math.sin(elapsed * 1.4 + index) * 0.04
      stamp(poles.current, index, shade.x, 1.1, z, 1, 2.2, 1)
      stamp(tops.current, index, shade.x, 2.25 + sway, z, 1.35, 0.55, 1.35)
    })
    trunks.current.instanceMatrix.needsUpdate = true
    crowns.current.instanceMatrix.needsUpdate = true
    poles.current.instanceMatrix.needsUpdate = true
    tops.current.instanceMatrix.needsUpdate = true
  })

  return (
    <group>
      <instancedMesh ref={trunks} args={[null, null, palms.length]}>
        <cylinderGeometry args={[0.12, 0.18, 1, 6]} />
        <meshStandardMaterial color="#8a5a32" roughness={0.86} />
      </instancedMesh>
      <instancedMesh ref={crowns} args={[null, null, palms.length]}>
        <coneGeometry args={[1, 1.1, 7]} />
        <meshStandardMaterial color="#2f9a4a" roughness={0.78} />
      </instancedMesh>
      <instancedMesh ref={poles} args={[null, null, shades.length]}>
        <cylinderGeometry args={[0.04, 0.04, 1, 6]} />
        <meshStandardMaterial color="#f4efe6" roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={tops} args={[null, null, shades.length]}>
        <coneGeometry args={[1, 1, 8]} />
        <meshStandardMaterial color="#fff6ea" roughness={0.55} />
      </instancedMesh>
    </group>
  )
}
