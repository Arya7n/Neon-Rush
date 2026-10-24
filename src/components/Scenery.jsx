import { useMemo } from 'react'
import * as THREE from 'three'
import { useGameStore } from '../game/gameStore.js'
import { getTheme } from '../game/themes.js'
import { City } from './City.jsx'
import { Dunes, Jungle, Shore } from './Places.jsx'

function makeSky(theme) {
  const canvas = document.createElement('canvas')
  canvas.width = 16
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createLinearGradient(0, 0, 0, 256)
  gradient.addColorStop(0, theme.sky[0])
  gradient.addColorStop(0.45, theme.sky[1])
  gradient.addColorStop(0.72, theme.sky[2])
  gradient.addColorStop(1, theme.sky[3])
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 16, 256)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export function Scenery({ worldRef }) {
  const theme = getTheme(useGameStore((state) => state.theme))
  const sky = useMemo(() => makeSky(theme), [theme])

  return (
    <group>
      <mesh frustumCulled={false}>
        <sphereGeometry args={[190, 24, 16]} />
        <meshBasicMaterial map={sky} side={THREE.BackSide} fog={false} depthWrite={false} />
      </mesh>
      {theme.place !== 'city' && (
        <mesh position={theme.sunPos}>
          <sphereGeometry args={[5.5, 16, 12]} />
          <meshBasicMaterial color={theme.sun} fog={false} />
        </mesh>
      )}
      {theme.place === 'city' && <City worldRef={worldRef} />}
      {theme.place === 'jungle' && <Jungle worldRef={worldRef} />}
      {theme.place === 'dunes' && <Dunes worldRef={worldRef} />}
      {theme.place === 'shore' && <Shore worldRef={worldRef} />}
    </group>
  )
}
