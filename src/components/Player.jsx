import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { LANE_X } from '../game/constants.js'
import { useGameStore, worldRef } from '../game/gameStore.js'
import { getTheme } from '../game/themes.js'

export function Player() {
  const root = useRef()
  const visual = useRef()
  const body = useRef()
  const legL = useRef()
  const legR = useRef()
  const kneeL = useRef()
  const kneeR = useRef()
  const armL = useRef()
  const armR = useRef()
  const shadow = useRef()
  const aura = useRef()
  const pose = useRef({ y: 0.52, lean: -0.2 })
  const themeId = useGameStore((state) => state.theme)

  const mats = useMemo(
    () => ({
      skin: new THREE.MeshStandardMaterial({ color: '#f0c4a0', roughness: 0.72, metalness: 0.02 }),
      hair: new THREE.MeshStandardMaterial({ color: '#3a2418', roughness: 0.8, metalness: 0.04 }),
      cloth: new THREE.MeshStandardMaterial({ color: '#f04b3a', roughness: 0.78, metalness: 0.02 }),
      jeans: new THREE.MeshStandardMaterial({ color: '#2c4c86', roughness: 0.84, metalness: 0.02 }),
      shoe: new THREE.MeshStandardMaterial({ color: '#f7f7f4', roughness: 0.55, metalness: 0.08 }),
      sole: new THREE.MeshStandardMaterial({ color: '#24262c', roughness: 0.7, metalness: 0.05 }),
      accent: new THREE.MeshStandardMaterial({
        color: '#3df0ff',
        emissive: '#3df0ff',
        emissiveIntensity: 0.35,
        roughness: 0.4,
        metalness: 0.05,
      }),
      pack: new THREE.MeshStandardMaterial({ color: '#1d2430', roughness: 0.7, metalness: 0.12 }),
    }),
    [],
  )

  useEffect(() => {
    const theme = getTheme(themeId)
    mats.cloth.color.set(theme.secondary)
    mats.accent.color.set(theme.primary)
    mats.accent.emissive.set(theme.primary)
  }, [mats, themeId])

  useFrame((_, dt) => {
    const world = worldRef.current
    const player = world.player
    const fall = player.fall || 0
    if (fall > 0.001) {
      const t = Math.min(1, fall)
      const stumble = Math.sin((Math.min(t, 0.22) / 0.22) * Math.PI)
      const drop = Math.min(1, Math.max(0, (t - 0.12) / 0.7))
      const eased = drop * drop * (3 - 2 * drop)
      root.current.position.x = player.x
      visual.current.position.y = player.y + stumble * 0.28 * (1 - eased)
      visual.current.rotation.x = -stumble * 0.35 + eased * 1.4
      visual.current.rotation.z = eased * 1.05
      body.current.rotation.x = -0.15 - stumble * 0.55 * (1 - eased)
      body.current.position.y = 0.52 - eased * 0.28
      body.current.scale.set(1, 1, 1)
      legL.current.rotation.x = eased * 0.55
      legR.current.rotation.x = -eased * 1.15
      legL.current.rotation.z = eased * 0.25
      legR.current.rotation.z = -eased * 0.15
      kneeL.current.rotation.x = -eased * 1.7
      kneeR.current.rotation.x = -eased * 0.45
      armL.current.rotation.x = -0.4 + stumble * 1.1 * (1 - eased) + eased * 1.5
      armR.current.rotation.x = -0.5 - eased * 0.2
      armL.current.rotation.z = eased * 0.9
      armR.current.rotation.z = -eased * 0.55
      shadow.current.position.y = 0.025
      shadow.current.scale.set(1.15, 0.7, 1)
      if (aura.current) aura.current.visible = false
      return
    }
    visual.current.rotation.x = 0
    legL.current.rotation.z = 0
    legR.current.rotation.z = 0
    armL.current.rotation.z = 0
    armR.current.rotation.z = 0

    const running = player.y <= 0.04 && !player.sliding
    const step = dt > 0 ? Math.min(dt, 0.05) : 0.016
    const blend = 1 - Math.exp(-10 * step)
    const cycle = world.distance * 0.64
    const stride = running ? Math.sin(cycle) : 0
    const flight = running ? (1 - Math.cos(cycle * 2)) * 0.5 : 0
    const tuck = (amount) => Math.pow(Math.max(amount, 0), 1.65)
    const current = pose.current
    const aimY = player.sliding ? 0.34 : 0.52
    const aimLean = player.sliding ? -1.02 : running ? -0.24 : -0.1
    current.y += (aimY - current.y) * blend
    current.lean += (aimLean - current.lean) * blend

    root.current.position.x = player.x
    visual.current.position.y = player.y + flight * 0.03
    visual.current.rotation.z = (LANE_X[player.lane] - player.x) * -0.1
    body.current.rotation.x = current.lean
    body.current.position.y = current.y
    const squash = player.land || 0
    body.current.scale.set(1 + squash * 0.04, 1 - squash * 0.08, 1)
    legL.current.rotation.x = stride * 0.92
    legR.current.rotation.x = stride * -0.92
    kneeL.current.rotation.x = -tuck(-stride) * 1.45
    kneeR.current.rotation.x = -tuck(stride) * 1.45
    armL.current.rotation.x = -0.5 - stride * 0.72
    armR.current.rotation.x = -0.5 + stride * 0.72
    shadow.current.position.y = 0.025
    const lift = (1 - Math.min(0.45, player.y * 0.18)) * (1 - flight * 0.18)
    shadow.current.scale.set(lift, lift * 0.72, 1)
    if (aura.current) {
      const power = world.smash > 0 ? '#ff5a3c' : world.boostTime > 0 ? '#5dffe0' : world.magnetTime > 0 ? '#7aa2ff' : ''
      aura.current.visible = power !== ''
      if (power) {
        aura.current.material.color.set(power)
        const pulse = 1 + Math.sin(world.elapsed * 8) * 0.08
        aura.current.scale.set(pulse, pulse, pulse)
      }
    }
  })

  return (
    <group ref={root}>
      <mesh ref={aura} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]} visible={false}>
        <ringGeometry args={[0.5, 0.68, 28]} />
        <meshBasicMaterial color="#7aa2ff" transparent opacity={0.8} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0.1]}>
        <circleGeometry args={[0.42, 24]} />
        <meshBasicMaterial color="#1a140e" transparent opacity={0.32} depthWrite={false} />
      </mesh>
      <group ref={visual}>
        <group ref={body}>
          <RoundedBox args={[0.48, 0.5, 0.26]} radius={0.1} smoothness={3} position={[0, 0.46, 0]} material={mats.cloth} />
          <RoundedBox args={[0.5, 0.12, 0.28]} radius={0.04} smoothness={2} position={[0, 0.66, 0]} material={mats.cloth} />
          <RoundedBox args={[0.34, 0.4, 0.12]} radius={0.04} smoothness={2} position={[0, 0.42, 0.16]} material={mats.pack} />
          <mesh position={[0, 0.42, 0.23]} material={mats.accent}>
            <boxGeometry args={[0.08, 0.22, 0.02]} />
          </mesh>
          <mesh position={[0, 0.86, -0.02]} material={mats.skin}>
            <sphereGeometry args={[0.18, 20, 16]} />
          </mesh>
          <mesh position={[0, 0.96, 0.02]} scale={[1.05, 0.72, 1.05]} material={mats.hair}>
            <sphereGeometry args={[0.18, 18, 14]} />
          </mesh>
          <mesh position={[0, 0.9, 0.08]} scale={[0.95, 0.7, 0.7]} material={mats.hair}>
            <sphereGeometry args={[0.16, 16, 12]} />
          </mesh>
          <mesh position={[-0.16, 0.84, 0]} material={mats.skin}>
            <sphereGeometry args={[0.045, 10, 8]} />
          </mesh>
          <mesh position={[0.16, 0.84, 0]} material={mats.skin}>
            <sphereGeometry args={[0.045, 10, 8]} />
          </mesh>
          <group ref={armL} position={[-0.3, 0.62, 0]}>
            <mesh position={[0, -0.16, 0]} material={mats.cloth}>
              <capsuleGeometry args={[0.055, 0.18, 4, 8]} />
            </mesh>
            <mesh position={[0, -0.32, -0.02]} material={mats.skin}>
              <sphereGeometry args={[0.055, 10, 8]} />
            </mesh>
          </group>
          <group ref={armR} position={[0.3, 0.62, 0]}>
            <mesh position={[0, -0.16, 0]} material={mats.cloth}>
              <capsuleGeometry args={[0.055, 0.18, 4, 8]} />
            </mesh>
            <mesh position={[0, -0.32, -0.02]} material={mats.skin}>
              <sphereGeometry args={[0.055, 10, 8]} />
            </mesh>
          </group>
          <group ref={legL} position={[-0.12, 0.18, 0]}>
            <mesh position={[0, -0.16, 0]} material={mats.jeans}>
              <capsuleGeometry args={[0.07, 0.16, 4, 8]} />
            </mesh>
            <group ref={kneeL} position={[0, -0.32, 0]}>
              <mesh position={[0, -0.14, 0]} material={mats.jeans}>
                <capsuleGeometry args={[0.055, 0.14, 4, 8]} />
              </mesh>
              <RoundedBox args={[0.14, 0.08, 0.26]} radius={0.03} smoothness={2} position={[0, -0.26, -0.05]} material={mats.shoe} />
              <RoundedBox args={[0.15, 0.035, 0.28]} radius={0.015} smoothness={2} position={[0, -0.3, -0.04]} material={mats.sole} />
            </group>
          </group>
          <group ref={legR} position={[0.12, 0.18, 0]}>
            <mesh position={[0, -0.16, 0]} material={mats.jeans}>
              <capsuleGeometry args={[0.07, 0.16, 4, 8]} />
            </mesh>
            <group ref={kneeR} position={[0, -0.32, 0]}>
              <mesh position={[0, -0.14, 0]} material={mats.jeans}>
                <capsuleGeometry args={[0.055, 0.14, 4, 8]} />
              </mesh>
              <RoundedBox args={[0.14, 0.08, 0.26]} radius={0.03} smoothness={2} position={[0, -0.26, -0.05]} material={mats.shoe} />
              <RoundedBox args={[0.15, 0.035, 0.28]} radius={0.015} smoothness={2} position={[0, -0.3, -0.04]} material={mats.sole} />
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}
