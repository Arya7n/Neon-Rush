import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { SEGMENT_COUNT, SEGMENT_LENGTH, TRACK_LEAD, TRACK_LENGTH } from '../game/constants.js'
import { useGameStore } from '../game/gameStore.js'
import { loopZ, mulberry32 } from '../game/math.js'
import { getTheme } from '../game/themes.js'

const DUMMY = new THREE.Object3D()
const TINTS = ['#243044', '#2a2238', '#1c3040', '#332033', '#24343c']
const SIGNS = ['NEON', 'RUSH', 'GRID', 'NOVA', 'KILO', 'VOID', 'ARC', '2077']

function buildBuildings() {
  const rng = mulberry32(11)
  const buildings = []
  for (let segment = 0; segment < SEGMENT_COUNT; segment += 1) {
    for (const side of [-1, 1]) {
      for (let n = 0; n < 2; n += 1) {
        const width = 3.2 + rng() * 3.6
        const depth = 3.4 + rng() * 4
        const height = 9 + rng() * 24
        const along = 4 + n * 14 + rng() * 3
        buildings.push({
          anchor: segment * SEGMENT_LENGTH + along,
          x: side * (8.4 + rng() * 7 + width * 0.15),
          width,
          depth,
          height,
          tint: TINTS[Math.floor(rng() * TINTS.length)],
          sign: rng() > 0.35,
          signText: SIGNS[Math.floor(rng() * SIGNS.length)],
          signColor: rng() > 0.5 ? '#3df0ff' : '#ff2bd6',
          signY: height * 0.62,
        })
      }
    }
  }
  return buildings
}

function buildSkyline() {
  const rng = mulberry32(29)
  return Array.from({ length: 14 }, (_, i) => {
    const side = i % 2 === 0 ? -1 : 1
    return {
      anchor: (i * TRACK_LENGTH) / 14,
      x: side * (28 + rng() * 16),
      width: 5 + rng() * 7,
      depth: 5 + rng() * 6,
      height: 26 + rng() * 36,
    }
  })
}

function buildLamps() {
  const lamps = []
  for (let segment = 0; segment < SEGMENT_COUNT; segment += 1) {
    for (const side of [-1, 1]) {
      lamps.push({ anchor: segment * SEGMENT_LENGTH + 6, x: side * 4.75 })
      lamps.push({ anchor: segment * SEGMENT_LENGTH + 22, x: side * 4.75 })
    }
  }
  return lamps
}

function makeWindows() {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#10151f'
  ctx.fillRect(0, 0, 64, 128)
  for (let y = 4; y < 128; y += 12) {
    for (let x = 4; x < 64; x += 10) {
      const roll = Math.random()
      if (roll < 0.45) ctx.fillStyle = '#39d7ff'
      else if (roll < 0.62) ctx.fillStyle = '#ff4ad8'
      else if (roll < 0.82) ctx.fillStyle = '#245066'
      else ctx.fillStyle = '#1a2030'
      ctx.fillRect(x, y, 6, 7)
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1, 2)
  return texture
}

function makeSign(text, color) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 96
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, 256, 96)
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 64px Bahnschrift, Segoe UI, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 128, 50)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

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

export function City({ worldRef }) {
  const theme = getTheme(useGameStore((state) => state.theme))
  const buildings = useMemo(buildBuildings, [])
  const skyline = useMemo(buildSkyline, [])
  const lamps = useMemo(buildLamps, [])
  const signs = useMemo(() => {
    const boards = []
    for (let segment = 0; segment < SEGMENT_COUNT; segment += 1) {
      for (const side of [-1, 1]) {
        boards.push({
          anchor: segment * SEGMENT_LENGTH + 15,
          x: side * 6.2,
          depth: 0,
          roadside: true,
          signText: SIGNS[(segment + (side > 0 ? 3 : 0)) % SIGNS.length],
          signColor: side > 0 ? '#ff2bd6' : '#3df0ff',
          signY: 2.55,
        })
      }
    }
    return [...buildings.filter((building) => building.sign), ...boards]
  }, [buildings])
  const windows = useMemo(() => makeWindows(), [])
  const sky = useMemo(() => makeSky(theme), [theme])
  const signTextures = useMemo(() => signs.map((sign) => makeSign(sign.signText, sign.signColor)), [signs])
  const bodies = useRef()
  const glass = useRef()
  const far = useRef()
  const poles = useRef()
  const bulbs = useRef()
  const signRefs = useRef([])

  useLayoutEffect(() => {
    ;[bodies, glass, far, poles, bulbs].forEach((ref) => {
      if (ref.current) ref.current.frustumCulled = false
    })
    buildings.forEach((building, index) => bodies.current.setColorAt(index, new THREE.Color(building.tint)))
    bodies.current.instanceColor.needsUpdate = true
  }, [buildings])

  useFrame(() => {
    const { distance, elapsed } = worldRef.current
    buildings.forEach((building, index) => {
      const z = loopZ(building.anchor, distance, TRACK_LENGTH, TRACK_LEAD)
      DUMMY.position.set(building.x, building.height / 2, z)
      DUMMY.rotation.set(0, 0, 0)
      DUMMY.scale.set(building.width, building.height, building.depth)
      DUMMY.updateMatrix()
      bodies.current.setMatrixAt(index, DUMMY.matrix)

      const facing = -Math.sign(building.x)
      DUMMY.position.set(building.x + facing * (building.depth / 2 + 0.04), building.height * 0.55, z)
      DUMMY.rotation.set(0, building.x > 0 ? -Math.PI / 2 : Math.PI / 2, 0)
      DUMMY.scale.set(building.width * 0.78, building.height * 0.7, 1)
      DUMMY.updateMatrix()
      glass.current.setMatrixAt(index, DUMMY.matrix)
    })
    bodies.current.instanceMatrix.needsUpdate = true
    glass.current.instanceMatrix.needsUpdate = true

    skyline.forEach((tower, index) => {
      const z = loopZ(tower.anchor, distance * 0.35, TRACK_LENGTH, TRACK_LEAD + 10)
      DUMMY.position.set(tower.x, tower.height / 2, z)
      DUMMY.rotation.set(0, 0, 0)
      DUMMY.scale.set(tower.width, tower.height, tower.depth)
      DUMMY.updateMatrix()
      far.current.setMatrixAt(index, DUMMY.matrix)
    })
    far.current.instanceMatrix.needsUpdate = true

    lamps.forEach((lamp, index) => {
      const z = loopZ(lamp.anchor, distance, TRACK_LENGTH, TRACK_LEAD)
      DUMMY.position.set(lamp.x, 1.5, z)
      DUMMY.rotation.set(0, 0, 0)
      DUMMY.scale.set(0.08, 3, 0.08)
      DUMMY.updateMatrix()
      poles.current.setMatrixAt(index, DUMMY.matrix)
      DUMMY.position.set(lamp.x, 3.05, z)
      DUMMY.scale.set(0.22, 0.22, 0.22)
      DUMMY.updateMatrix()
      bulbs.current.setMatrixAt(index, DUMMY.matrix)
    })
    poles.current.instanceMatrix.needsUpdate = true
    bulbs.current.instanceMatrix.needsUpdate = true

    const palette = getTheme(useGameStore.getState().theme)
    if (bulbs.current?.material) bulbs.current.material.color.set(palette.primary)
    signs.forEach((sign, index) => {
      const mesh = signRefs.current[index]
      if (!mesh) return
      mesh.material.color.set(index % 2 === 0 ? palette.primary : palette.secondary)
      const z = loopZ(sign.anchor, distance, TRACK_LENGTH, TRACK_LEAD)
      const facing = -Math.sign(sign.x)
      const x = sign.roadside ? sign.x : sign.x + facing * (sign.depth / 2 + 0.12)
      mesh.position.set(x, sign.signY, z)
      mesh.rotation.y = sign.x > 0 ? -Math.PI / 2 : Math.PI / 2
      const blink = Math.sin(elapsed * 6 + index * 1.7) > 0.94 ? 0.25 : 1
      mesh.material.opacity = blink
    })
  })

  return (
    <group>
      <mesh frustumCulled={false}>
        <sphereGeometry args={[190, 24, 16]} />
        <meshBasicMaterial map={sky} side={THREE.BackSide} fog={false} depthWrite={false} />
      </mesh>
      <instancedMesh ref={far} args={[null, null, skyline.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#090b12" roughness={1} metalness={0.05} />
      </instancedMesh>
      <instancedMesh ref={bodies} args={[null, null, buildings.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.86} metalness={0.18} />
      </instancedMesh>
      <instancedMesh ref={glass} args={[null, null, buildings.length]}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial
          color="#05070c"
          emissive="#ffffff"
          emissiveMap={windows}
          emissiveIntensity={2.1}
          map={windows}
          roughness={0.4}
          metalness={0.1}
          side={THREE.DoubleSide}
        />
      </instancedMesh>
      <instancedMesh ref={poles} args={[null, null, lamps.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#1b2030" metalness={0.7} roughness={0.35} />
      </instancedMesh>
      <instancedMesh ref={bulbs} args={[null, null, lamps.length]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color="#3df0ff" toneMapped={false} />
      </instancedMesh>
      {signs.map((sign, index) => (
        <mesh
          key={`${sign.signText}-${sign.anchor}-${sign.x}-${index}`}
          ref={(node) => {
            signRefs.current[index] = node
          }}
        >
          <planeGeometry args={[2.8, 1.05]} />
          <meshBasicMaterial map={signTextures[index]} transparent toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}
