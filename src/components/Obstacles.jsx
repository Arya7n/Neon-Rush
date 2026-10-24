import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../game/gameStore.js'
import { LANE_X, OBSTACLE_POOL } from '../game/constants.js'
import { getTheme } from '../game/themes.js'

const DUMMY = new THREE.Object3D()
const MAX = 20

function place(mesh, index, x, y, z, sx, sy, sz) {
  if (!mesh) return
  DUMMY.position.set(x, y, z)
  DUMMY.rotation.set(0, 0, 0)
  DUMMY.scale.set(sx, sy, sz)
  DUMMY.updateMatrix()
  mesh.setMatrixAt(index, DUMMY.matrix)
}

function commit(mesh, count) {
  if (!mesh) return
  mesh.count = count
  mesh.instanceMatrix.needsUpdate = true
}

export function Obstacles({ worldRef }) {
  const theme = getTheme(useGameStore((state) => state.theme))
  const low = useRef()
  const bar = useRef()
  const postL = useRef()
  const postR = useRef()
  const block = useRef()
  const edge = useRef()
  const warnLow = useRef()
  const warnHigh = useRef()
  const warnBlock = useRef()
  const stripes = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#1a0a16'
    ctx.fillRect(0, 0, 64, 64)
    ctx.strokeStyle = '#ff2bd6'
    ctx.lineWidth = 8
    for (let i = -64; i < 128; i += 16) {
      ctx.beginPath()
      ctx.moveTo(i, 64)
      ctx.lineTo(i + 64, 0)
      ctx.stroke()
    }
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    return texture
  }, [])

  useLayoutEffect(() => {
    ;[low, bar, postL, postR, block, edge, warnLow, warnHigh, warnBlock].forEach((ref) => {
      if (ref.current) ref.current.frustumCulled = false
    })
  }, [])

  useFrame(() => {
    if (!low.current || !warnBlock.current) return
    const visible = useGameStore.getState().phase !== 'MENU'
    const list = worldRef.current.obstacles
    let lowCount = 0
    let highCount = 0
    let blockCount = 0
    if (visible) {
      for (let i = 0; i < OBSTACLE_POOL; i += 1) {
        const item = list[i]
        if (!item.active) continue
        const x = LANE_X[item.lane]
        if (item.type === 'low' && lowCount < MAX) {
          place(low.current, lowCount, x, 0.41, item.z, 1.78, 0.82, 0.74)
          place(warnLow.current, lowCount, x, 0.04, item.z - 4.5, 1.15, 0.03, 2.2)
          lowCount += 1
        } else if (item.type === 'high' && highCount < MAX) {
          place(bar.current, highCount, x, 1.5, item.z, 2.15, 0.34, 0.42)
          place(postL.current, highCount, x - 0.95, 2.15, item.z, 0.1, 1.15, 0.1)
          place(postR.current, highCount, x + 0.95, 2.15, item.z, 0.1, 1.15, 0.1)
          place(warnHigh.current, highCount, x, 0.04, item.z - 4.5, 1.15, 0.03, 2.2)
          highCount += 1
        } else if (item.type === 'block' && blockCount < MAX) {
          place(block.current, blockCount, x, 1.05, item.z, 1.55, 2.1, 1.25)
          place(edge.current, blockCount, x, 1.85, item.z, 1.62, 0.1, 1.28)
          place(warnBlock.current, blockCount, x, 0.04, item.z - 4.5, 1.35, 0.03, 2.2)
          blockCount += 1
        }
      }
    }
    commit(low.current, lowCount)
    commit(bar.current, highCount)
    commit(postL.current, highCount)
    commit(postR.current, highCount)
    commit(block.current, blockCount)
    commit(edge.current, blockCount)
    commit(warnLow.current, lowCount)
    commit(warnHigh.current, highCount)
    commit(warnBlock.current, blockCount)
  })

  return (
    <group>
      <instancedMesh ref={low} args={[null, null, MAX]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={theme.secondary}
          emissive={theme.secondary}
          emissiveIntensity={0.9}
          map={stripes}
          emissiveMap={stripes}
          roughness={0.4}
          metalness={0.15}
        />
      </instancedMesh>
      <instancedMesh ref={bar} args={[null, null, MAX]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={theme.primary} emissive={theme.primary} emissiveIntensity={1.8} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={postL} args={[null, null, MAX]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={theme.primary} emissive={theme.primary} emissiveIntensity={1.1} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={postR} args={[null, null, MAX]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={theme.primary} emissive={theme.primary} emissiveIntensity={1.1} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={block} args={[null, null, MAX]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#161924" emissive="#2a1030" emissiveIntensity={0.3} roughness={0.45} metalness={0.55} />
      </instancedMesh>
      <instancedMesh ref={edge} args={[null, null, MAX]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={theme.secondary} emissive={theme.secondary} emissiveIntensity={1.6} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={warnLow} args={[null, null, MAX]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={theme.secondary} transparent opacity={0.45} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={warnHigh} args={[null, null, MAX]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={theme.primary} transparent opacity={0.4} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={warnBlock} args={[null, null, MAX]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={theme.danger} transparent opacity={0.4} depthWrite={false} toneMapped={false} />
      </instancedMesh>
    </group>
  )
}
