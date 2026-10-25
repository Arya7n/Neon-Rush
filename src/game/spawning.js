import { TRAIN_LENGTH } from './constants.js'
import { gapForDistance } from './difficulty.js'

const SINGLES = [
  [{ lane: 0, type: 'low' }],
  [{ lane: 1, type: 'low' }],
  [{ lane: 2, type: 'low' }],
  [{ lane: 0, type: 'high' }],
  [{ lane: 1, type: 'high' }],
  [{ lane: 2, type: 'high' }],
  [{ lane: 0, type: 'block' }],
  [{ lane: 1, type: 'block' }],
  [{ lane: 2, type: 'block' }],
]

const DOUBLES = [
  [{ lane: 0, type: 'block' }, { lane: 1, type: 'block' }],
  [{ lane: 1, type: 'block' }, { lane: 2, type: 'block' }],
  [{ lane: 0, type: 'block' }, { lane: 2, type: 'block' }],
  [{ lane: 0, type: 'low' }, { lane: 2, type: 'low' }],
  [{ lane: 0, type: 'high' }, { lane: 2, type: 'high' }],
  [{ lane: 0, type: 'low' }, { lane: 1, type: 'block' }],
  [{ lane: 2, type: 'low' }, { lane: 1, type: 'block' }],
  [{ lane: 0, type: 'high' }, { lane: 2, type: 'block' }],
  [{ lane: 2, type: 'high' }, { lane: 0, type: 'block' }],
  [{ lane: 1, type: 'low' }, { lane: 2, type: 'high' }],
]

const TRIPLES = [
  [
    { lane: 0, type: 'low' },
    { lane: 1, type: 'low' },
    { lane: 2, type: 'high' },
  ],
  [
    { lane: 0, type: 'high' },
    { lane: 1, type: 'high' },
    { lane: 2, type: 'low' },
  ],
  [
    { lane: 0, type: 'low' },
    { lane: 1, type: 'high' },
    { lane: 2, type: 'low' },
  ],
  [
    { lane: 0, type: 'high' },
    { lane: 1, type: 'low' },
    { lane: 2, type: 'high' },
  ],
]

export const ALL_PATTERNS = [...SINGLES, ...DOUBLES, ...TRIPLES]

const BLOCKING = new Set(['block', 'train', 'wave'])

export function openLanes(pattern) {
  const blocked = new Set(pattern.filter((item) => BLOCKING.has(item.type)).map((item) => item.lane))
  return [0, 1, 2].filter((lane) => !blocked.has(lane))
}

function toWave(item, rng) {
  const to = item.lane
  const from = to === 1 ? (rng() < 0.5 ? 0 : 2) : 1
  return { ...item, type: 'wave', lane: to, fromLane: from, toLane: to, sweep: 16 }
}

function dressPattern(pattern, place, rng) {
  if (place === 'jungle') {
    return pattern.map((item) => (item.type === 'high' ? { ...item, type: 'vine' } : item))
  }
  if (place === 'dunes') {
    return pattern.map((item) => (item.type === 'low' ? { ...item, type: 'dune' } : item))
  }
  if (place === 'shore') {
    const blocks = pattern.filter((item) => item.type === 'block')
    if (blocks.length !== 1) return pattern
    return pattern.map((item) => (item.type === 'block' ? toWave(item, rng) : item))
  }
  return pattern
}

function planTrain(rowDistance, prevOpen, rng) {
  const pairs = [
    { blocked: [0, 1], open: 2 },
    { blocked: [1, 2], open: 0 },
  ]
  const fair = pairs.filter((pair) => !prevOpen?.length || prevOpen.includes(pair.open))
  if (!fair.length) return null
  const pick = fair[Math.floor(rng() * fair.length)]
  const gap = TRAIN_LENGTH / 2 + gapForDistance(rowDistance)
  const obstacles = pick.blocked.map((lane) => ({ lane, type: 'train', length: TRAIN_LENGTH }))
  const orbs = [0, 1, 2].map((index) => ({
    lane: pick.open,
    kind: 'energy',
    spawnAt: rowDistance - gap * 0.28 + index * 2.2,
  }))
  return { obstacles, orbs, open: [pick.open], gap }
}

function planVines(rowDistance, prevOpen, rng) {
  const options = [
    { lanes: [0, 1], open: 2 },
    { lanes: [1, 2], open: 0 },
    { lanes: [0, 2], open: 1 },
  ]
  const fair = options.filter((option) => !prevOpen?.length || prevOpen.includes(option.open))
  if (!fair.length) return null
  const pick = fair[Math.floor(rng() * fair.length)]
  const gap = gapForDistance(rowDistance) + 6
  const obstacles = pick.lanes.map((lane) => ({ lane, type: 'vine' }))
  const orbs = [0, 1, 2].map((index) => ({
    lane: pick.open,
    kind: 'energy',
    spawnAt: rowDistance - gap * 0.4 + index * 2.2,
  }))
  return { obstacles, orbs, open: [pick.open], gap }
}

function planWave(rowDistance, prevOpen, rng) {
  const sweeps = [
    { from: 0, to: 1 },
    { from: 2, to: 1 },
    { from: 1, to: 0 },
    { from: 1, to: 2 },
    { from: 0, to: 2 },
    { from: 2, to: 0 },
  ]
  const fair = sweeps.filter((sweep) => !prevOpen?.length || prevOpen.some((lane) => lane !== sweep.to))
  if (!fair.length) return null
  const pick = fair[Math.floor(rng() * fair.length)]
  const gap = gapForDistance(rowDistance) + 4
  const open = [0, 1, 2].filter((lane) => lane !== pick.to)
  const orbLane = open.find((lane) => prevOpen?.includes(lane)) ?? open[0]
  return {
    obstacles: [{ type: 'wave', lane: pick.to, fromLane: pick.from, toLane: pick.to, sweep: 18 }],
    orbs: [{ lane: orbLane, kind: 'energy', spawnAt: rowDistance - gap * 0.4 }],
    open,
    gap,
  }
}

function planSetPiece(place, rowDistance, prevOpen, rng) {
  if (place === 'jungle') return rng() < 0.6 ? planVines(rowDistance, prevOpen, rng) : planRamp(rowDistance)
  if (place === 'dunes') return planRamp(rowDistance)
  if (place === 'shore') return rng() < 0.65 ? planWave(rowDistance, prevOpen, rng) : planRamp(rowDistance)
  return rng() < 0.5 ? planTrain(rowDistance, prevOpen, rng) : planRamp(rowDistance)
}

function planRamp(rowDistance) {
  const wallAt = rowDistance + 13
  const gap = 13 + Math.max(gapForDistance(rowDistance), 46)
  const obstacles = [0, 1, 2].map((lane) => ({ lane, type: 'ramp' }))
  for (const lane of [0, 1, 2]) obstacles.push({ lane, type: 'block', spawnAt: wallAt })
  const orbs = [{ lane: 1, kind: 'energy', spawnAt: rowDistance - 6 }]
  return { obstacles, orbs, open: [0, 1, 2], gap }
}

function patternsFor(distance) {
  if (distance < 140) return SINGLES
  if (distance < 420) return [...SINGLES, ...DOUBLES]
  return ALL_PATTERNS
}

function choosePattern(distance, prevOpen, rng) {
  let pool = patternsFor(distance)
  if (prevOpen?.length) {
    const connected = pool.filter((pattern) => openLanes(pattern).some((lane) => prevOpen.includes(lane)))
    if (connected.length) pool = connected
  }
  return pool[Math.floor(rng() * pool.length)]
}

/** Build one fair row. Open lanes always overlap the previous row's open lanes. */
export function planRow(rowDistance, prevOpen, rng = Math.random, place = 'city') {
  if (rowDistance > 200 && rng() < 0.16) {
    const setPiece = planSetPiece(place, rowDistance, prevOpen, rng)
    if (setPiece) return setPiece
  }
  const gap = gapForDistance(rowDistance) + Math.floor(rng() * 4)
  const pattern = dressPattern(choosePattern(rowDistance, prevOpen, rng).map((item) => ({ ...item })), place, rng)
  const open = openLanes(pattern)
  const orbLane = open[Math.floor(rng() * open.length)] ?? 1
  const count = rng() > 0.4 ? 3 : 1
  const mid = rowDistance - gap * 0.48
  const orbs = []
  for (let i = 0; i < count; i += 1) {
    orbs.push({
      lane: orbLane,
      kind: 'energy',
      spawnAt: mid + (i - (count - 1) / 2) * 2.3,
    })
  }
  if (orbs.length && rng() < 0.18) {
    const kinds = ['shield', 'magnet', 'boost', 'smash']
    orbs[0].kind = kinds[Math.floor(rng() * kinds.length)]
  }
  return { obstacles: pattern, orbs, open, gap }
}
