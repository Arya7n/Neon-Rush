import {
  COYOTE_TIME,
  DESPAWN_Z,
  GRAVITY,
  INITIAL_SPAWN,
  JUMP_BUFFER,
  JUMP_V,
  LAUNCH_V,
  LANE_LERP,
  LANE_X,
  OBSTACLE_POOL,
  ORB_POOL,
  SLIDE_BUFFER,
  SLIDE_TIME,
  SPAWN_AHEAD,
  START_SPEED,
  HIT_Z,
} from './constants.js'
import { isNearMiss, overlapsOrb, overlapsPlayer } from './collision.js'
import { speedForDistance } from './difficulty.js'
import { clamp } from './math.js'
import { planRow } from './spawning.js'

function obstacleSlot() {
  return { active: false, lane: 1, type: 'low', spawnAt: 0, z: 40, resolved: false, length: 0, warned: false }
}

function orbSlot() {
  return { active: false, lane: 1, spawnAt: 0, z: 40, kind: 'energy', x: LANE_X[1] }
}

export function createWorld({ spawn = true, rng = Math.random } = {}) {
  const world = {
    rng,
    distance: 0,
    elapsed: 0,
    speed: START_SPEED,
    orbsCollected: 0,
    bonus: 0,
    combo: 0,
    comboTimer: 0,
    maxCombo: 0,
    shield: 0,
    smash: 0,
    magnetTime: 0,
    boostTime: 0,
    nearMisses: 0,
    banner: '',
    bannerTime: 0,
    nextSpawn: INITIAL_SPAWN,
    lastGap: 36,
    prevOpen: [0, 1, 2],
    shake: 0,
    player: {
      lane: 1,
      x: 0,
      y: 0,
      vy: 0,
      sliding: false,
      slideTime: 0,
      coyote: COYOTE_TIME,
      jumpBuffer: 0,
      slideBuffer: 0,
      land: 0,
      fall: 0,
      alive: true,
    },
    obstacles: Array.from({ length: OBSTACLE_POOL }, obstacleSlot),
    collectibles: Array.from({ length: ORB_POOL }, orbSlot),
  }
  if (spawn) prefill(world)
  return world
}

function prefill(world) {
  let guard = 0
  while (world.nextSpawn < SPAWN_AHEAD && guard < 16) {
    spawnRow(world)
    guard += 1
  }
}

function spawnRow(world) {
  const plan = planRow(world.nextSpawn, world.prevOpen, world.rng)
  const rowAt = world.nextSpawn
  for (const item of plan.obstacles) {
    const slot = world.obstacles.find((entry) => !entry.active)
    if (!slot) break
    slot.active = true
    slot.type = item.type
    slot.lane = item.lane
    slot.spawnAt = item.spawnAt ?? rowAt
    slot.length = item.length || 0
    slot.warned = false
    slot.resolved = false
    slot.z = world.distance - slot.spawnAt
  }
  for (const orb of plan.orbs) {
    const slot = world.collectibles.find((entry) => !entry.active)
    if (!slot) break
    slot.active = true
    slot.kind = orb.kind || 'energy'
    slot.lane = orb.lane
    slot.x = LANE_X[orb.lane] ?? 0
    slot.spawnAt = orb.spawnAt
    slot.z = world.distance - orb.spawnAt
  }
  world.prevOpen = plan.open
  world.lastGap = plan.gap
  world.nextSpawn = rowAt + plan.gap
}

function recycle(list, distance) {
  for (const item of list) {
    if (!item.active) continue
    item.z = distance - item.spawnAt
    if (item.z > DESPAWN_Z) item.active = false
  }
}

function flash(world, text) {
  world.banner = text
  world.bannerTime = 1.15
}

function step(world, dt, input) {
  const player = world.player
  if (!player.alive) return { collected: 0, crashed: false, shielded: false, smashed: false, nearMisses: 0, powered: 0 }

  if (input.laneDelta) {
    player.lane = clamp(player.lane + input.laneDelta, 0, 2)
  }

  const grounded = player.y <= 0.001
  player.coyote = grounded ? COYOTE_TIME : Math.max(0, player.coyote - dt)
  player.jumpBuffer = input.jump ? JUMP_BUFFER : Math.max(0, player.jumpBuffer - dt)
  player.slideBuffer = input.slide ? SLIDE_BUFFER : Math.max(0, player.slideBuffer - dt)

  if (player.jumpBuffer > 0 && player.coyote > 0) {
    player.vy = JUMP_V
    player.sliding = false
    player.slideTime = 0
    player.jumpBuffer = 0
    player.coyote = 0
    player.slideBuffer = 0
  } else if (player.slideBuffer > 0 && grounded && !player.sliding) {
    player.sliding = true
    player.slideTime = SLIDE_TIME
    player.slideBuffer = 0
    player.vy = 0
  }

  const falling = player.vy < -1
  player.vy -= GRAVITY * dt
  player.y += player.vy * dt
  if (player.y <= 0) {
    if (falling) player.land = 1
    player.y = 0
    player.vy = 0
  }
  if (player.sliding) {
    player.slideTime -= dt
    if (player.slideTime <= 0) player.sliding = false
  }
  player.land = Math.max(0, player.land - dt * 5)

  const target = LANE_X[player.lane]
  player.x += (target - player.x) * (1 - Math.exp(-LANE_LERP * dt))

  world.speed = speedForDistance(world.distance)
  world.distance += world.speed * dt
  world.elapsed += dt
  world.bannerTime = Math.max(0, world.bannerTime - dt)
  world.comboTimer = Math.max(0, world.comboTimer - dt)
  world.magnetTime = Math.max(0, world.magnetTime - dt)
  world.boostTime = Math.max(0, world.boostTime - dt)
  if (world.comboTimer === 0) world.combo = 0

  recycle(world.obstacles, world.distance)
  recycle(world.collectibles, world.distance)

  let guard = 0
  while (world.nextSpawn < world.distance + SPAWN_AHEAD && guard < 8) {
    spawnRow(world)
    guard += 1
  }

  const mul = world.boostTime > 0 ? 2 : 1
  if (mul > 1) world.bonus += world.speed * dt * 2

  if (world.magnetTime > 0) {
    const pull = 1 - Math.exp(-8 * dt)
    for (const orb of world.collectibles) {
      if (!orb.active || orb.kind !== 'energy' || orb.z < -24 || orb.z > 3) continue
      if (orb.x == null) orb.x = LANE_X[orb.lane] ?? 0
      orb.x += (player.x - orb.x) * pull
      const nextZ = orb.z * (1 - pull)
      orb.spawnAt = world.distance - nextZ
      orb.z = nextZ
    }
  }

  let collected = 0
  let powered = 0
  let shielded = false
  let smashed = false
  for (const orb of world.collectibles) {
    if (!orb.active || !overlapsOrb(player, orb)) continue
    orb.active = false
    if (orb.kind === 'shield') {
      world.shield = 1
      powered += 1
      flash(world, 'SHIELD')
      continue
    }
    if (orb.kind === 'magnet') {
      world.magnetTime = 8
      powered += 1
      flash(world, 'MAGNET')
      continue
    }
    if (orb.kind === 'boost') {
      world.boostTime = 8
      powered += 1
      flash(world, 'x2 SCORE')
      continue
    }
    if (orb.kind === 'smash') {
      world.smash = 1
      powered += 1
      flash(world, 'SMASH')
      continue
    }
    world.combo = Math.min(8, world.combo + 1)
    world.maxCombo = Math.max(world.maxCombo, world.combo)
    world.comboTimer = 3.2
    world.bonus += 20 * (world.combo - 1) * mul
    if (mul > 1) world.bonus += 50
    world.orbsCollected += 1
    collected += 1
  }

  let nearMisses = 0
  for (const obstacle of world.obstacles) {
    if (!obstacle.active || obstacle.resolved || obstacle.z <= HIT_Z) continue
    obstacle.resolved = true
    if (!isNearMiss(player, obstacle)) continue
    nearMisses += 1
    world.nearMisses += 1
    world.bonus += 40 * mul
    world.shake = Math.max(world.shake, 0.16)
    flash(world, 'NEAR MISS')
  }

  for (const obstacle of world.obstacles) {
    if (!obstacle.warned && obstacle.active && obstacle.z > -46 && obstacle.z < -34) {
      if (obstacle.type === 'train') {
        for (const other of world.obstacles) {
          if (other.type === 'train' && other.spawnAt === obstacle.spawnAt) other.warned = true
        }
        flash(world, 'TRAIN')
      } else if (obstacle.type === 'ramp' && obstacle.lane === 1) {
        obstacle.warned = true
        flash(world, 'RAMP')
      }
    }
    if (!obstacle.active || !overlapsPlayer(player, obstacle)) continue
    obstacle.active = false
    obstacle.resolved = true
    if (obstacle.type === 'ramp') {
      const row = obstacle.spawnAt
      for (const other of world.obstacles) {
        if (other.active && other.type === 'ramp' && other.spawnAt === row) {
          other.active = false
          other.resolved = true
        }
      }
      player.vy = LAUNCH_V
      player.y = Math.max(player.y, 0.2)
      player.sliding = false
      player.slideTime = 0
      world.shake = Math.max(world.shake, 0.22)
      flash(world, 'LAUNCH')
      continue
    }
    if (world.smash > 0) {
      const row = obstacle.spawnAt
      for (const other of world.obstacles) {
        if (!other.active || other.spawnAt !== row) continue
        other.active = false
        other.resolved = true
      }
      world.smash = 0
      world.bonus += 80 * mul
      world.shake = Math.max(world.shake, 0.4)
      flash(world, 'SMASH')
      smashed = true
      continue
    }
    if (world.shield > 0) {
      world.shield -= 1
      world.combo = 0
      world.comboTimer = 0
      world.shake = Math.max(world.shake, 0.45)
      flash(world, 'SHIELD BREAK')
      shielded = true
      continue
    }
    player.alive = false
    world.shake = 1
    return { collected, crashed: true, shielded: false, smashed, nearMisses, powered }
  }

  return { collected, crashed: false, shielded, smashed, nearMisses, powered }
}

export function updateWorld(world, dt, input) {
  const steps = Math.max(1, Math.ceil(dt / 0.016))
  const slice = dt / steps
  let collected = 0
  let nearMisses = 0
  let powered = 0
  let crashed = false
  let shielded = false
  let smashed = false
  for (let i = 0; i < steps; i += 1) {
    const result = step(world, slice, i === 0 ? input : { laneDelta: 0, jump: false, slide: false })
    collected += result.collected
    nearMisses += result.nearMisses
    powered += result.powered
    if (result.shielded) shielded = true
    if (result.smashed) smashed = true
    if (result.crashed) {
      crashed = true
      break
    }
  }
  return { collected, crashed, shielded, smashed, nearMisses, powered }
}

export function updateMenu(world, dt) {
  world.elapsed += dt
  world.distance += dt * 10
  world.player.lane = 1
  world.player.sliding = false
  world.player.y = Math.sin(world.elapsed * 1.7) * 0.045
  world.player.x = Math.sin(world.elapsed * 0.35) * 0.18
  world.player.vy = 0
}
