import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore, worldRef } from '../game/gameStore.js'
import { writeInstance } from '../game/instance.js'
import { getTheme } from '../game/themes.js'

const COUNT = 32
const SPECKS = Array.from({ length: COUNT }, (_, i) => {
  const seed = i * 19.7
  return {
    x: ((seed * 1.3) % 16) - 8,
    speed: 7 + (i % 6) * 1.4,
    seed,
    hover: 0.6 + ((seed * 0.37) % 3.4),
  }
})
const TINT = {
  city: '#b7dcff',
  jungle: '#8ed45a',
  dunes: '#f3c98a',
  shore: '#f7fdff',
}

export function Weather() {
  const specks = useRef()
  const painted = useRef('')
  const themeId = useGameStore((state) => state.theme)
  const place = getTheme(themeId).place

  useFrame(() => {
    const mesh = specks.current
    const world = worldRef.current
    if (!mesh || !world) return
    if (painted.current !== place) {
      painted.current = place
      mesh.material.color.set(TINT[place] || TINT.shore)
      mesh.material.opacity = place === 'dunes' ? 0.28 : 0.45
    }
    const time = world.elapsed || 0
    const rain = place === 'city'
    const tilt = place === 'jungle' ? 0.4 : 0
    const tall = rain ? 0.55 : 0.08
    const wide = place === 'dunes' ? 0.42 : 0.07
    for (let i = 0; i < COUNT; i += 1) {
      const speck = SPECKS[i]
      const z = -(((time * speck.speed + speck.seed) % 42) - 8)
      const y = rain ? 3.2 - ((time * speck.speed * 0.35 + speck.seed) % 3.2) : speck.hover
      writeInstance(mesh, i, speck.x, y, z, wide, tall, wide, 0, 0, tilt)
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
