import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore, worldRef } from '../game/gameStore.js'
import { getTheme } from '../game/themes.js'

const COUNT = 32

export function Weather() {
  const specks = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const themeId = useGameStore((state) => state.theme)
  const place = getTheme(themeId).place

  useFrame(() => {
    const mesh = specks.current
    const world = worldRef.current
    if (!mesh || !world) return
    const time = world.elapsed || 0
    const color = place === 'city' ? '#b7dcff' : place === 'jungle' ? '#8ed45a' : place === 'dunes' ? '#f3c98a' : '#f7fdff'
    mesh.material.color.set(color)
    mesh.material.opacity = place === 'dunes' ? 0.28 : 0.45
    for (let i = 0; i < COUNT; i += 1) {
      const seed = i * 19.7
      const span = 16
      const x = ((seed * 1.3) % span) - span / 2
      const speed = 7 + (i % 6) * 1.4
      const z = -(((time * speed + seed) % 42) - 8)
      const y = place === 'city' ? 3.2 - ((time * speed * 0.35 + seed) % 3.2) : 0.6 + ((seed * 0.37) % 3.4)
      const tall = place === 'city' ? 0.55 : 0.08
      const wide = place === 'dunes' ? 0.42 : 0.07
      dummy.position.set(x, y, z)
      dummy.scale.set(wide, tall, wide)
      dummy.rotation.set(0, 0, place === 'jungle' ? 0.4 : 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={specks} args={[null, null, COUNT]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial transparent opacity={0.4} depthWrite={false} />
    </instancedMesh>
  )
}
