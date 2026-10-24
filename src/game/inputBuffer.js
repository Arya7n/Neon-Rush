const buffer = { lane: 0, jump: false, slide: false }

export function queueLane(direction) {
  buffer.lane = Math.max(-1, Math.min(1, buffer.lane + direction))
}

export function queueJump() {
  buffer.jump = true
}

export function queueSlide() {
  buffer.slide = true
}

export function consumeInput() {
  const input = { laneDelta: buffer.lane, jump: buffer.jump, slide: buffer.slide }
  clearInput()
  return input
}

export function clearInput() {
  buffer.lane = 0
  buffer.jump = false
  buffer.slide = false
}
