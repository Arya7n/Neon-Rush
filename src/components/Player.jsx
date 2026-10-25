import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { LANE_X, SLIDE_TIME } from '../game/constants.js'
import { useGameStore, worldRef } from '../game/gameStore.js'
import { getTheme } from '../game/themes.js'

const ROLL = Math.PI * 2
const rollAxis = new THREE.Vector3(1, 0, -0.48).normalize()
const rollQuat = new THREE.Quaternion()
const leanQuat = new THREE.Quaternion()
const leanAxis = new THREE.Vector3(0, 0, 1)

function clamp01(value) {
  return Math.min(1, Math.max(0, value))
}

function smoothstep(value) {
  const t = clamp01(value)
  return t * t * (3 - 2 * t)
}

function lerp(from, to, t) {
  return from + (to - from) * t
}

/** Tuck in, turn one full forward roll, then open back onto the feet. */
function rollPose(slideTime) {
  const u = clamp01(1 - slideTime / SLIDE_TIME)
  const enter = smoothstep(u / 0.14)
  const exit = smoothstep((u - 0.78) / 0.22)
  return {
    tuck: enter * (1 - exit),
    spin: smoothstep((u - 0.1) / 0.72) * ROLL,
  }
}

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
  const roll = useRef({ spin: 0, tuck: 0, live: false })
  const impact = useRef(0)
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
      roll.current.spin = 0
      roll.current.tuck = 0
      roll.current.live = false
      impact.current = 0
      const t = Math.min(1, fall)
      const jolt = Math.sin(Math.min(1, t / 0.14) * Math.PI)
      const tumble = smoothstep(clamp01((t - 0.06) / 0.5))
      const settle = smoothstep(clamp01((t - 0.5) / 0.42))
      const hop = Math.sin(clamp01(t / 0.28) * Math.PI) * (1 - settle)
      const pitch = tumble * (Math.PI / 2)
      const yaw = jolt * 0.2
      const tip = Math.sin(tumble * Math.PI) * 0.22 * (1 - settle)
      const cos = Math.cos(pitch)
      const sin = Math.sin(pitch)
      const dropped = (y, z) => y * cos + z * sin
      const lowest = Math.min(dropped(1.38, -0.22), dropped(0.73, -0.16), dropped(0.04, -0.2))
      const lift = Math.max(0.02, 0.08 - lowest) + Math.abs(tip) * 0.4
      const flail = 1 - tumble
      root.current.position.x = player.x
      visual.current.position.y = player.y * (1 - settle) + hop * 0.4 + lift
      visual.current.position.z = -sin * 0.15
      visual.current.rotation.set(-pitch, yaw, tip)
      body.current.rotation.x = -0.2 * flail
      body.current.position.y = 0.52
      body.current.position.z = 0
      body.current.scale.set(1, 1, 1)
      legL.current.rotation.x = jolt * 1.3 * flail + tumble * 0.25
      legR.current.rotation.x = -jolt * 0.8 * flail + tumble * 0.05
      legL.current.rotation.z = tumble * 0.2
      legR.current.rotation.z = -jolt * 0.15 * flail - tumble * 0.16
      kneeL.current.rotation.x = -jolt * 0.6 * flail - tumble * 0.35
      kneeR.current.rotation.x = -jolt * 1.1 * flail - tumble * 0.65
      armL.current.rotation.x = -0.4 + jolt * 2.2 * flail + tumble * 0.15
      armR.current.rotation.x = -0.5 - jolt * 1.1 * flail - tumble * 0.1
      armL.current.rotation.z = jolt * 0.45 * flail + tumble * 1.05
      armR.current.rotation.z = -jolt * 0.6 * flail - tumble * 0.9
      shadow.current.position.y = 0.025
      shadow.current.scale.set(1.2 + settle * 0.35, 0.7, 1)
      if (aura.current) aura.current.visible = false
      return
    }
    const running = player.y <= 0.04 && !player.sliding
    const step = dt > 0 ? Math.min(dt, 0.05) : 0.016
    const blend = 1 - Math.exp(-10 * step)
    const cycle = world.distance * 0.64
    const stride = running ? Math.sin(cycle) : 0
    const flight = running ? (1 - Math.cos(cycle * 2)) * 0.5 : 0
    const bend = (amount) => Math.pow(Math.max(amount, 0), 1.65)
    const current = pose.current
    const aimY = 0.52
    const aimLean = running ? -0.24 : -0.1
    current.y += (aimY - current.y) * blend
    current.lean += (aimLean - current.lean) * blend

    const motion = roll.current
    if (player.sliding) {
      const posed = rollPose(player.slideTime)
      motion.spin = posed.spin
      motion.tuck = posed.tuck
      motion.live = true
    } else if (motion.live) {
      if (motion.spin > 0.25 && motion.spin < ROLL - 0.08) {
        motion.spin = Math.min(ROLL, motion.spin + step * 18)
        motion.tuck = Math.max(motion.tuck, 0.7)
      } else {
        motion.spin = 0
        motion.tuck += (0 - motion.tuck) * (1 - Math.exp(-14 * step))
        if (motion.tuck < 0.02) {
          motion.tuck = 0
          motion.live = false
        }
      }
    }
    const tucked = motion.tuck
    const spin = motion.spin
    const pivot = 0.4
    const takeoff = clamp01(player.vy / 4.2) * (1 - clamp01(player.y / 0.85))
    const hang = clamp01((player.y - 0.15) / 0.45) * (1 - clamp01(Math.abs(player.vy) / 6.5))
    const descent = clamp01(-player.vy / 3.6) * clamp01(player.y / 0.08)
    const airSum = takeoff + hang + descent
    const air = clamp01(airSum) * (1 - tucked)
    const wTake = airSum > 0 ? takeoff / airSum : 0
    const wHang = airSum > 0 ? hang / airSum : 0
    const wDrop = airSum > 0 ? descent / airSum : 0
    if ((player.land || 0) > 0.75) impact.current = 1
    impact.current = Math.max(0, impact.current - step * 2.6)
    const hit = impact.current * (1 - air) * (1 - tucked)
    const mix = (runVal, take, hung, drop, land, tuckVal) => {
      const aerial = take * wTake + hung * wHang + drop * wDrop
      return lerp(lerp(lerp(runVal, land, hit), aerial, air), tuckVal, tucked)
    }

    root.current.position.x = player.x
    visual.current.position.y = player.y + flight * 0.03 * (1 - tucked) * (1 - air) + pivot * tucked - hit * 0.05
    visual.current.position.z = -Math.sin(clamp01(spin / ROLL) * Math.PI) * 0.28 * tucked
    rollQuat.setFromAxisAngle(rollAxis, -spin)
    const laneLean = (LANE_X[player.lane] - player.x) * -0.1 * (1 - tucked * 0.85)
    const jumpBank = (wDrop * 0.18 - wTake * 0.08) * air
    leanQuat.setFromAxisAngle(leanAxis, laneLean + jumpBank)
    visual.current.quaternion.copy(leanQuat).multiply(rollQuat)
    body.current.rotation.x = mix(current.lean, 0.48, 0.22, -0.62, -0.88, -0.9)
    body.current.position.y = mix(current.y, current.y + 0.1, current.y + 0.04, current.y - 0.02, current.y - 0.2, 0.02)
    body.current.position.z = lerp(0, -0.02, tucked)
    const squash = Math.max(player.land || 0, hit) * (1 - tucked) * (1 - air)
    const stretch = wTake * air * 0.1
    body.current.scale.set(1 + squash * 0.16 - stretch * 0.4, 1 - squash * 0.28 + stretch, 1)
    legL.current.rotation.x = mix(stride * 0.92, 1.7, 1.55, 0.95, 1.15, 1.85)
    legR.current.rotation.x = mix(stride * -0.92, -0.95, 1.35, 0.25, 1.05, 2.05)
    legL.current.rotation.z = mix(0, 0.12, 0.22, 0.48, 0.2, 0.28)
    legR.current.rotation.z = mix(0, -0.08, -0.18, -0.15, -0.18, -0.22)
    kneeL.current.rotation.x = mix(-bend(-stride) * 1.45, -1.9, -1.85, -0.7, -2.25, -2.25)
    kneeR.current.rotation.x = mix(-bend(stride) * 1.45, -0.4, -1.75, -0.55, -2.2, -2.35)
    armL.current.rotation.x = mix(-0.5 - stride * 0.72, 2.9, 3.05, 1.55, -1.65, 2.45)
    armR.current.rotation.x = mix(-0.5 + stride * 0.72, 2.75, 3.05, 1.35, -1.4, 2.35)
    armL.current.rotation.z = mix(0, 0.28, -0.7, -0.95, -0.35, 0.42)
    armR.current.rotation.z = mix(0, -0.34, 0.78, 1.05, 0.3, -0.55)
    shadow.current.position.y = 0.025
    const lift = (1 - Math.min(0.62, player.y * 0.42)) * (1 - flight * 0.18)
    shadow.current.scale.set(lift * (1 + hit * 0.35), lift * 0.72, 1)
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
