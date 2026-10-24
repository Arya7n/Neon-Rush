import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore } from '../game/gameStore.js'
import { LANE_X, OBSTACLE_POOL } from '../game/constants.js'
import { getTheme } from '../game/themes.js'

const DUMMY = new THREE.Object3D()
const MAX = 20

function place(mesh, index, x, y, z, sx, sy, sz, rotX = 0, rotZ = 0) {
  if (!mesh) return
  DUMMY.position.set(x, y, z)
  DUMMY.rotation.set(rotX, 0, rotZ)
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
  const legs = useRef()
  const wheels = useRef()
  const windows = useRef()
  const stripes = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#f4efe4'
    ctx.fillRect(0, 0, 64, 64)
    ctx.strokeStyle = '#2a241c'
    ctx.lineWidth = 10
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
    ;[low, bar, postL, postR, block, edge, warnLow, warnHigh, warnBlock, legs, wheels, windows].forEach((ref) => {
      if (ref.current) ref.current.frustumCulled = false
    })
  }, [])

  useFrame(() => {
    if (!low.current || !warnBlock.current || !legs.current || !wheels.current || !windows.current) return
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
          place(low.current, lowCount, x, 0.48, item.z, 1.7, 0.62, 0.42)
          place(legs.current, lowCount * 2, x - 0.62, 0.18, item.z, 0.08, 0.36, 0.08)
          place(legs.current, lowCount * 2 + 1, x + 0.62, 0.18, item.z, 0.08, 0.36, 0.08)
          place(warnLow.current, lowCount, x, 0.03, item.z - 4.5, 1.05, 0.02, 1.6)
          lowCount += 1
        } else if (item.type === 'high' && highCount < MAX) {
          place(bar.current, highCount, x, 1.62, item.z, 1.9, 0.16, 0.22)
          place(postL.current, highCount, x - 0.86, 1.15, item.z, 0.08, 1.7, 0.08)
          place(postR.current, highCount, x + 0.86, 1.15, item.z, 0.08, 1.7, 0.08)
          place(warnHigh.current, highCount, x, 0.03, item.z - 4.5, 1.05, 0.02, 1.6)
          highCount += 1
        } else if (item.type === 'block' && blockCount < MAX) {
          place(block.current, blockCount, x, 1.05, item.z, 1.45, 1.7, 1.35)
          place(edge.current, blockCount, x, 1.82, item.z, 1.5, 0.12, 1.4)
          place(windows.current, blockCount, x, 1.2, item.z + 0.66, 0.85, 0.42, 0.06)
          for (const side of [-0.5, 0.5]) {
            for (const along of [-0.4, 0.4]) {
              const wheel = blockCount * 4 + (side > 0 ? 2 : 0) + (along > 0 ? 1 : 0)
              place(wheels.current, wheel, x + side, 0.22, item.z + along, 0.22, 0.1, 0.22, 0, Math.PI / 2)
            }
          }
          place(warnBlock.current, blockCount, x, 0.03, item.z - 4.5, 1.2, 0.02, 1.7)
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
    commit(legs.current, lowCount * 2)
    commit(wheels.current, blockCount * 4)
    commit(windows.current, blockCount)
  })

  return (
    <group>
      <instancedMesh ref={low} args={[null, null, MAX]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={theme.secondary} map={stripes} roughness={0.62} metalness={0.04} />
      </instancedMesh>
      <instancedMesh ref={legs} args={[null, null, MAX * 2]}>
        <cylinderGeometry args={[1, 1, 1, 8]} />
        <meshStandardMaterial color="#c5ccd4" roughness={0.45} metalness={0.35} />
      </instancedMesh>
      <instancedMesh ref={bar} args={[null, null, MAX]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={theme.primary} roughness={0.4} metalness={0.2} emissive={theme.primary} emissiveIntensity={0.25} />
      </instancedMesh>
      <instancedMesh ref={postL} args={[null, null, MAX]}>
        <cylinderGeometry args={[1, 1, 1, 8]} />
        <meshStandardMaterial color="#d5dbe3" roughness={0.4} metalness={0.4} />
      </instancedMesh>
      <instancedMesh ref={postR} args={[null, null, MAX]}>
        <cylinderGeometry args={[1, 1, 1, 8]} />
        <meshStandardMaterial color="#d5dbe3" roughness={0.4} metalness={0.4} />
      </instancedMesh>
      <instancedMesh ref={block} args={[null, null, MAX]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={theme.secondary} roughness={0.48} metalness={0.18} />
      </instancedMesh>
      <instancedMesh ref={edge} args={[null, null, MAX]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#f4f7fb" roughness={0.35} metalness={0.2} />
      </instancedMesh>
      <instancedMesh ref={windows} args={[null, null, MAX]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#d7f1ff" emissive="#9fdfff" emissiveIntensity={0.35} roughness={0.15} metalness={0.05} />
      </instancedMesh>
      <instancedMesh ref={wheels} args={[null, null, MAX * 4]}>
        <cylinderGeometry args={[1, 1, 1, 12]} />
        <meshStandardMaterial color="#1c1e24" roughness={0.7} metalness={0.2} />
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
