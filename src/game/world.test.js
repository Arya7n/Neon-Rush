import test from 'node:test'
import assert from 'node:assert/strict'
import { HIGH_BAR_Y, LOW_CLEAR_Y, MAX_SPEED, TRACK_LEAD, TRACK_LENGTH } from './constants.js'
import { overlapsPlayer } from './collision.js'
import { loopZ, mulberry32 } from './math.js'
import { ALL_PATTERNS, openLanes, planRow } from './spawning.js'
import { computeScore } from './score.js'
import { createWorld, updateWorld } from './world.js'
import { useGameStore, worldRef } from './gameStore.js'

function isolate(world) {
  world.obstacles.forEach((item) => {
    item.active = false
  })
  world.collectibles.forEach((item) => {
    item.active = false
  })
  world.nextSpawn = 1e9
}

function place(world, type, lane) {
  const obstacle = world.obstacles[0]
  obstacle.active = true
  obstacle.type = type
  obstacle.lane = lane
  obstacle.spawnAt = world.distance
  obstacle.z = 0
  world.player.lane = 1
  world.player.x = 0
  world.player.alive = true
}

test('score combines distance and energy', () => {
  assert.equal(computeScore(10.9, 2), 120)
  assert.equal(computeScore(0, 0), 0)
})

test('looping props move toward the camera then wrap', () => {
  const a = loopZ(90, 0, TRACK_LENGTH, TRACK_LEAD)
  const b = loopZ(90, 25, TRACK_LENGTH, TRACK_LEAD)
  assert.ok(b > a)
  assert.ok(Math.abs(b - a - 25) < 0.001)
  const far = loopZ(0, 0, TRACK_LENGTH, TRACK_LEAD)
  assert.ok(far < -100)
})

test('every pattern leaves a survivable lane and never stacks two hits in one lane', () => {
  for (const pattern of ALL_PATTERNS) {
    const lanes = pattern.map((item) => item.lane)
    assert.equal(new Set(lanes).size, lanes.length)
    assert.ok(openLanes(pattern).length >= 1)
    assert.ok(pattern.some((item) => item.type !== 'block') || pattern.length < 3)
  }
})

test('consecutive rows keep a connected open lane', () => {
  const rng = mulberry32(7)
  let open = [0, 1, 2]
  for (let i = 0; i < 500; i += 1) {
    const plan = planRow(i * 30, open, rng)
    assert.ok(plan.open.some((lane) => open.includes(lane)))
    assert.ok(plan.gap >= 27)
    open = plan.open
  }
})

test('jump clears low barriers, slide clears bars, blocks ignore vertical moves', () => {
  const world = createWorld({ rng: mulberry32(1) })
  isolate(world)
  place(world, 'low', 1)
  world.player.y = 1.3
  assert.equal(updateWorld(world, 0.001, { laneDelta: 0, jump: false, slide: false }).crashed, false)

  isolate(world)
  place(world, 'low', 1)
  world.player.y = 0
  assert.equal(updateWorld(world, 0.001, { laneDelta: 0, jump: false, slide: false }).crashed, true)

  const slider = createWorld({ rng: mulberry32(2) })
  isolate(slider)
  place(slider, 'high', 1)
  slider.player.sliding = true
  slider.player.slideTime = 1
  assert.equal(updateWorld(slider, 0.001, { laneDelta: 0, jump: false, slide: false }).crashed, false)

  isolate(slider)
  place(slider, 'high', 1)
  slider.player.sliding = false
  slider.player.y = 0
  slider.player.alive = true
  assert.equal(updateWorld(slider, 0.001, { laneDelta: 0, jump: false, slide: false }).crashed, true)

  const jumper = createWorld({ rng: mulberry32(3) })
  isolate(jumper)
  place(jumper, 'block', 1)
  jumper.player.y = 1.3
  assert.equal(updateWorld(jumper, 0.001, { laneDelta: 0, jump: false, slide: false }).crashed, true)

  isolate(jumper)
  place(jumper, 'block', 0)
  jumper.player.alive = true
  jumper.player.y = 0
  assert.equal(overlapsPlayer(jumper.player, { ...jumper.obstacles[0], z: 0 }), false)
})

test('combo, near misses, and shields change the score without ending a shielded hit', () => {
  const combo = createWorld({ rng: mulberry32(4) })
  isolate(combo)
  const orb = combo.collectibles[0]
  orb.active = true
  orb.kind = 'energy'
  orb.lane = 1
  orb.x = 0
  orb.spawnAt = combo.distance
  updateWorld(combo, 0.001, { laneDelta: 0, jump: false, slide: false })
  assert.equal(combo.orbsCollected, 1)
  assert.equal(combo.combo, 1)
  orb.active = true
  orb.x = 0
  orb.spawnAt = combo.distance
  updateWorld(combo, 0.001, { laneDelta: 0, jump: false, slide: false })
  assert.equal(combo.combo, 2)
  assert.ok(combo.bonus >= 20)

  const skim = createWorld({ rng: mulberry32(5) })
  isolate(skim)
  skim.obstacles[0].active = true
  skim.obstacles[0].type = 'block'
  skim.obstacles[0].lane = 1
  skim.obstacles[0].resolved = false
  skim.obstacles[0].spawnAt = skim.distance - 0.7
  skim.player.x = 1.45
  const skimmed = updateWorld(skim, 0.05, { laneDelta: 0, jump: false, slide: false })
  assert.equal(skimmed.crashed, false)
  assert.equal(skim.nearMisses, 1)
  assert.equal(skim.bonus, 40)

  const guarded = createWorld({ rng: mulberry32(6) })
  isolate(guarded)
  place(guarded, 'block', 1)
  guarded.shield = 1
  const blocked = updateWorld(guarded, 0.001, { laneDelta: 0, jump: false, slide: false })
  assert.equal(blocked.crashed, false)
  assert.equal(blocked.shielded, true)
  assert.equal(guarded.player.alive, true)
  assert.equal(guarded.shield, 0)
})

test('magnet, score boost, and smash change a run', () => {
  const pulled = createWorld({ rng: mulberry32(7) })
  isolate(pulled)
  pulled.magnetTime = 1.5
  const orb = pulled.collectibles[0]
  orb.active = true
  orb.kind = 'energy'
  orb.lane = 0
  orb.x = -2.55
  orb.spawnAt = pulled.distance + 6
  orb.z = -6
  updateWorld(pulled, 0.8, { laneDelta: 0, jump: false, slide: false })
  assert.equal(pulled.orbsCollected, 1)

  const doubled = createWorld({ rng: mulberry32(8) })
  isolate(doubled)
  doubled.boostTime = 8
  const energy = doubled.collectibles[0]
  energy.active = true
  energy.kind = 'energy'
  energy.lane = 1
  energy.x = 0
  energy.spawnAt = doubled.distance
  updateWorld(doubled, 0.001, { laneDelta: 0, jump: false, slide: false })
  assert.equal(doubled.orbsCollected, 1)
  assert.ok(doubled.bonus >= 50)

  const ram = createWorld({ rng: mulberry32(9) })
  isolate(ram)
  place(ram, 'block', 1)
  ram.obstacles[1].active = true
  ram.obstacles[1].type = 'block'
  ram.obstacles[1].lane = 0
  ram.obstacles[1].spawnAt = ram.obstacles[0].spawnAt
  ram.obstacles[1].resolved = false
  ram.smash = 1
  const smashed = updateWorld(ram, 0.001, { laneDelta: 0, jump: false, slide: false })
  assert.equal(smashed.crashed, false)
  assert.equal(smashed.smashed, true)
  assert.equal(ram.player.alive, true)
  assert.equal(ram.smash, 0)
  assert.equal(ram.obstacles[0].active, false)
  assert.equal(ram.obstacles[1].active, false)
})

test('speed is capped and an autopilot survives a minute of traffic', () => {
  const world = createWorld({ rng: mulberry32(42) })
  world.distance = 5000
  updateWorld(world, 0.016, { laneDelta: 0, jump: false, slide: false })
  assert.equal(world.speed, MAX_SPEED)

  const run = createWorld({ rng: mulberry32(42) })
  const dt = 1 / 60
  for (let frame = 0; frame < 70 * 60; frame += 1) {
    const input = autopilot(run)
    const result = updateWorld(run, dt, input)
    if (result.crashed) {
      const nearby = run.obstacles
        .filter((item) => item.active && Math.abs(item.z) < 8)
        .map((item) => `${item.type}@lane${item.lane} z=${item.z.toFixed(2)}`)
        .join(', ')
      assert.fail(
        `crashed d=${run.distance.toFixed(1)} speed=${run.speed.toFixed(2)} lane=${run.player.lane} x=${run.player.x.toFixed(2)} y=${run.player.y.toFixed(2)} slide=${run.player.sliding} [${nearby}]`,
      )
    }
  }
  assert.ok(run.distance > 1500)
  assert.ok(run.orbsCollected > 0)
  assert.equal(run.player.alive, true)
})

test('restart replaces the world and returns to a clean run', () => {
  useGameStore.getState().start()
  const first = worldRef.current
  first.distance = 80
  first.player.alive = false
  useGameStore.getState().restart()
  assert.equal(useGameStore.getState().phase, 'PLAYING')
  assert.notEqual(worldRef.current, first)
  assert.equal(worldRef.current.distance, 0)
  assert.equal(worldRef.current.player.alive, true)
  assert.equal(worldRef.current.orbsCollected, 0)
})

function autopilot(world) {
  const near = world.obstacles.filter((item) => item.active && item.z < -0.4 && item.z > -36)
  if (!near.length) return { laneDelta: 0, jump: false, slide: false }
  const closestZ = Math.max(...near.map((item) => item.z))
  const row = near.filter((item) => Math.abs(item.z - closestZ) < 3)
  const byLane = [[], [], []]
  row.forEach((item) => byLane[item.lane].push(item.type))
  const safe = (lane) => !byLane[lane].includes('block')
  const lane = world.player.lane
  if (!safe(lane)) {
    const options = [0, 1, 2]
      .filter(safe)
      .sort((a, b) => Math.abs(a - lane) - Math.abs(b - lane) || a - b)
    if (options.length && options[0] !== lane) {
      return { laneDelta: options[0] > lane ? 1 : -1, jump: false, slide: false }
    }
  }
  const types = byLane[lane]
  const lead = 4.8 + world.speed * 0.07
  const close = closestZ > -lead
  return {
    laneDelta: 0,
    jump: close && types.includes('low'),
    slide: close && types.includes('high') && !types.includes('low'),
  }
}
