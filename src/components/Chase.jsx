import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore, worldRef } from '../game/gameStore.js'
import { getTheme } from '../game/themes.js'

export function Chase() {
  const root = useRef()
  const shown = useRef(0)
  const themeId = useGameStore((state) => state.theme)
  const place = getTheme(themeId).place
  const mats = useMemo(() => ({
    train: new THREE.MeshStandardMaterial({ color: '#1a2030', metalness: 0.45, roughness: 0.4 }),
    lamp: new THREE.MeshStandardMaterial({ color: '#ff3148', emissive: '#ff3148', emissiveIntensity: 2.2 }),
    vine: new THREE.MeshStandardMaterial({ color: '#14381c', roughness: 0.85 }),
    leaf: new THREE.MeshStandardMaterial({ color: '#2f8a3a', roughness: 0.7 }),
    sand: new THREE.MeshStandardMaterial({ color: '#e7b56a', transparent: true, opacity: 0.42, roughness: 0.9, depthWrite: false }),
    dust: new THREE.MeshBasicMaterial({ color: '#f0c48a', transparent: true, opacity: 0.35, depthWrite: false }),
    water: new THREE.MeshStandardMaterial({ color: '#1f8fd0', transparent: true, opacity: 0.55, roughness: 0.2, metalness: 0.1, depthWrite: false }),
    foam: new THREE.MeshStandardMaterial({ color: '#f4fbff', transparent: true, opacity: 0.8, roughness: 0.4, depthWrite: false }),
  }), [])

  useFrame((_, dt) => {
    const world = worldRef.current
    if (!root.current || !world) return
    const phase = useGameStore.getState().phase
    const pausedRun = useGameStore.getState().pausedRun
    const hide = phase === 'CRASH' || phase === 'GAME_OVER' || (phase === 'MENU' && !pausedRun)
    const want = hide ? 0 : world.chase || 0
    const step = dt > 0 ? Math.min(dt, 0.05) : 0.016
    shown.current += (want - shown.current) * (1 - Math.exp(-3.4 * step))
    const amount = shown.current
    root.current.visible = amount > 0.03
    root.current.position.z = 10.6 - amount * 8.8
    root.current.position.y = place === 'shore' ? amount * 0.35 : 0
    const fade = Math.min(1, Math.max(0, (amount - 0.12) / 0.4))
    mats.sand.opacity = 0.18 + fade * 0.4
    mats.dust.opacity = 0.12 + fade * 0.4
    mats.water.opacity = 0.2 + fade * 0.45
    mats.foam.opacity = 0.25 + fade * 0.6
    mats.lamp.emissiveIntensity = 1.2 + amount * 2.4
  })

  return (
    <group ref={root} visible={false} frustumCulled={false}>
      {place === 'city' && (
        <group>
          <mesh position={[0, 1.35, 3.2]} material={mats.train} frustumCulled={false}>
            <boxGeometry args={[7.4, 2.5, 7]} />
          </mesh>
          <mesh position={[0, 1.45, -0.35]} material={mats.train} frustumCulled={false}>
            <boxGeometry args={[6.6, 2.2, 0.4]} />
          </mesh>
          <mesh position={[-2.5, 0.7, -0.6]} material={mats.lamp} frustumCulled={false}>
            <sphereGeometry args={[0.16, 12, 10]} />
          </mesh>
          <mesh position={[2.5, 0.7, -0.6]} material={mats.lamp} frustumCulled={false}>
            <sphereGeometry args={[0.16, 12, 10]} />
          </mesh>
        </group>
      )}
      {place === 'jungle' && (
        <group>
          <mesh position={[0, 1.6, 2.4]} material={mats.vine} frustumCulled={false}>
            <boxGeometry args={[9, 3.4, 2.2]} />
          </mesh>
          {[-3.2, -1.4, 0.4, 2.2].map((x) => (
            <mesh key={x} position={[x, 2.4, 1.1]} material={mats.leaf} frustumCulled={false}>
              <coneGeometry args={[0.7, 1.6, 7]} />
            </mesh>
          ))}
        </group>
      )}
      {place === 'dunes' && (
        <group>
          <mesh position={[0, 1.5, 2]} material={mats.sand} frustumCulled={false}>
            <boxGeometry args={[12, 3.6, 4]} />
          </mesh>
          <mesh position={[0, 0.45, 0.2]} material={mats.dust} frustumCulled={false}>
            <boxGeometry args={[11, 0.35, 1.2]} />
          </mesh>
          <mesh position={[1.5, 2.2, 0.4]} material={mats.dust} frustumCulled={false}>
            <boxGeometry args={[8, 0.2, 0.8]} />
          </mesh>
        </group>
      )}
      {place === 'shore' && (
        <group>
          <mesh position={[0, 0.7, 1.6]} material={mats.water} frustumCulled={false}>
            <boxGeometry args={[12, 1.5, 3.2]} />
          </mesh>
          <mesh position={[0, 1.5, 0.15]} rotation={[0.15, 0, 0]} material={mats.foam} frustumCulled={false}>
            <boxGeometry args={[11.2, 0.22, 0.7]} />
          </mesh>
        </group>
      )}
    </group>
  )
}
