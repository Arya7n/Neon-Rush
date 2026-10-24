import {
  COYOTE_TIME,
  DESPAWN_Z,
  GRAVITY,
  INITIAL_SPAWN,
  JUMP_BUFFER,
  JUMP_V,
  LANE_LERP,
  LANE_X,
  OBSTACLE_POOL,
  ORB_POOL,
  SLIDE_BUFFER,
  SLIDE_TIME,
  SPAWN_AHEAD,
  START_SPEED,
} from './constants.js'
import { overlapsOrb, overlapsPlayer } from './collision.js'
import { speedForDistance } from './difficulty.js'
import { clamp } from './math.js'
import { planRow } from './spawning.js'

function obstacleSlot() {
  return { active: false, lane: 1, type: 'low', spawnAt: 0, z: 40 }
}

function orbSlot() {
  return { active: false, lane: 1, spawnAt: 0, z: 40 }
}

export function createWorld({ spawn = true, rng = Math.random } = {}) {
  const world = {
    rng,
    distance: 0,
    elapsed: 0,
    speed: START_SPEED,
    orbsCollected: 0,
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
    slot.spawnAt = rowAt
    slot.z = world.distance - rowAt
  }
  for (const orb of plan.orbs) {
    const slot = world.collectibles.find((entry) => !entry.active)
    if (!slot) break
    slot.active = true
    slot.lane = orb.lane
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

function step(world, dt, input) {
  const player = world.player
  if (!player.alive) return { collected: 0, crashed: false }

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

  recycle(world.obstacles, world.distance)
  recycle(world.collectibles, world.distance)

  let guard = 0
  while (world.nextSpawn < world.distance + SPAWN_AHEAD && guard < 8) {
    spawnRow(world)
    guard += 1
  }

  let collected = 0
  for (const orb of world.collectibles) {
    if (!orb.active || !overlapsOrb(player, orb)) continue
    orb.active = false
    world.orbsCollected += 1
    collected += 1
  }

  for (const obstacle of world.obstacles) {
    if (!obstacle.active || !overlapsPlayer(player, obstacle)) continue
    player.alive = false
    world.shake = 1
    return { collected, crashed: true }
  }

  return { collected, crashed: false }
}

export function updateWorld(world, dt, input) {
  const steps = Math.max(1, Math.ceil(dt / 0.016))
  const slice = dt / steps
  let collected = 0
  let crashed = false
  for (let i = 0; i < steps; i += 1) {
    const result = step(world, slice, i === 0 ? input : { laneDelta: 0, jump: false, slide: false })
    collected += result.collected
    if (result.crashed) {
      crashed = true
      break
    }
  }
  return { collected, crashed }
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
