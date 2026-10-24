import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { LANE_X } from '../game/constants.js'
import { worldRef } from '../game/gameStore.js'

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
  const lamp = useRef()

  const mats = useMemo(
    () => ({
      suit: new THREE.MeshStandardMaterial({ color: '#141824', metalness: 0.62, roughness: 0.38 }),
      dark: new THREE.MeshStandardMaterial({ color: '#0c1018', metalness: 0.5, roughness: 0.45 }),
      trim: new THREE.MeshStandardMaterial({
        color: '#3df0ff',
        emissive: '#3df0ff',
        emissiveIntensity: 1.7,
        toneMapped: false,
      }),
      mag: new THREE.MeshStandardMaterial({
        color: '#ff2bd6',
        emissive: '#ff2bd6',
        emissiveIntensity: 1.35,
        toneMapped: false,
      }),
    }),
    [],
  )

  useFrame(() => {
    const world = worldRef.current
    const player = world.player
    const running = player.y <= 0.04 && !player.sliding
    const cycle = world.distance * 0.62
    const bob = running ? Math.abs(Math.sin(cycle)) * 0.045 : 0
    root.current.position.x = player.x
    visual.current.position.y = player.y + bob
    visual.current.rotation.z = (LANE_X[player.lane] - player.x) * -0.16
    // Negative X pitch leans the chest toward -Z, the direction of travel.
    body.current.rotation.x = player.sliding ? -1.05 : running ? -0.32 : -0.16
    body.current.position.y = player.sliding ? 0.32 : 0.68
    const squash = player.land || 0
    body.current.scale.set(1 + squash * 0.08, 1 - squash * 0.16, 1)
    const stride = running ? Math.sin(cycle) : 0
    // Positive thigh rotation reaches down the road. The knee folds on the trailing leg.
    legL.current.rotation.x = stride * 0.9
    legR.current.rotation.x = stride * -0.9
    kneeL.current.rotation.x = (stride < 0 ? stride : stride * 0.12) * 1.25
    kneeR.current.rotation.x = (stride > 0 ? -stride : stride * -0.12) * 1.25
    armL.current.rotation.x = stride * -0.7
    armR.current.rotation.x = stride * 0.7
    shadow.current.position.y = 0.035
    const lift = 1 - Math.min(0.55, player.y * 0.22)
    shadow.current.scale.set(lift, lift, 1)
    lamp.current.material.emissiveIntensity = 1.4 + Math.sin(world.elapsed * 8) * 0.25
  })

  return (
    <group ref={root}>
      <mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0]}>
        <circleGeometry args={[0.46, 20]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.4} depthWrite={false} />
      </mesh>
      <group ref={visual}>
        <group ref={body}>
          <RoundedBox args={[0.5, 0.58, 0.3]} radius={0.08} smoothness={2} position={[0, 0.28, 0]} material={mats.suit} />
          <RoundedBox args={[0.56, 0.16, 0.32]} radius={0.05} smoothness={2} position={[0, 0.48, 0]} material={mats.dark} />
          <mesh position={[0, 0.3, 0.18]} material={mats.mag}>
            <boxGeometry args={[0.06, 0.4, 0.04]} />
          </mesh>
          <mesh position={[-0.12, 0.36, 0.2]} material={mats.dark}>
            <boxGeometry args={[0.1, 0.18, 0.12]} />
          </mesh>
          <mesh position={[0.12, 0.36, 0.2]} material={mats.dark}>
            <boxGeometry args={[0.1, 0.18, 0.12]} />
          </mesh>
          <mesh ref={lamp} position={[-0.12, 0.32, 0.32]} rotation={[-Math.PI / 2, 0, 0]} material={mats.trim}>
            <coneGeometry args={[0.045, 0.2, 6]} />
          </mesh>
          <mesh position={[0.12, 0.32, 0.32]} rotation={[-Math.PI / 2, 0, 0]} material={mats.mag}>
            <coneGeometry args={[0.045, 0.2, 6]} />
          </mesh>
          <mesh position={[0, 0.66, 0]} material={mats.dark}>
            <sphereGeometry args={[0.2, 18, 14]} />
          </mesh>
          <mesh position={[0, 0.64, -0.16]} material={mats.trim}>
            <boxGeometry args={[0.26, 0.09, 0.06]} />
          </mesh>
          <group ref={armL} position={[-0.34, 0.4, -0.02]}>
            <mesh position={[0, -0.18, 0]} material={mats.suit}>
              <capsuleGeometry args={[0.055, 0.22, 4, 8]} />
            </mesh>
          </group>
          <group ref={armR} position={[0.34, 0.4, -0.02]}>
            <mesh position={[0, -0.18, 0]} material={mats.suit}>
              <capsuleGeometry args={[0.055, 0.22, 4, 8]} />
            </mesh>
          </group>
          <group ref={legL} position={[-0.13, 0.02, 0]}>
            <mesh position={[0, -0.16, 0]} material={mats.suit}>
              <capsuleGeometry args={[0.065, 0.16, 4, 8]} />
            </mesh>
            <group ref={kneeL} position={[0, -0.3, 0]}>
              <mesh position={[0, -0.13, 0]} material={mats.dark}>
                <capsuleGeometry args={[0.05, 0.14, 4, 8]} />
              </mesh>
              <mesh position={[0, -0.26, -0.08]} material={mats.trim}>
                <boxGeometry args={[0.14, 0.06, 0.3]} />
              </mesh>
            </group>
          </group>
          <group ref={legR} position={[0.13, 0.02, 0]}>
            <mesh position={[0, -0.16, 0]} material={mats.suit}>
              <capsuleGeometry args={[0.065, 0.16, 4, 8]} />
            </mesh>
            <group ref={kneeR} position={[0, -0.3, 0]}>
              <mesh position={[0, -0.13, 0]} material={mats.dark}>
                <capsuleGeometry args={[0.05, 0.14, 4, 8]} />
              </mesh>
              <mesh position={[0, -0.26, -0.08]} material={mats.trim}>
                <boxGeometry args={[0.14, 0.06, 0.3]} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}
