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

export function openLanes(pattern) {
  const blocked = new Set(pattern.filter((item) => item.type === 'block').map((item) => item.lane))
  return [0, 1, 2].filter((lane) => !blocked.has(lane))
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
export function planRow(rowDistance, prevOpen, rng = Math.random) {
  const gap = gapForDistance(rowDistance) + Math.floor(rng() * 4)
  const pattern = choosePattern(rowDistance, prevOpen, rng).map((item) => ({ ...item }))
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
  if (orbs.length && rng() < 0.16) orbs[0].kind = 'shield'
  return { obstacles: pattern, orbs, open, gap }
}
