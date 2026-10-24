import { spawn } from 'node:child_process'
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const port = 9341
const profile = await mkdtemp(join(tmpdir(), 'neon-pose-'))
const out = join(process.cwd(), '.verify')
await mkdir(out, { recursive: true })
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
  '--headless=new',
  '--disable-gpu',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--no-first-run',
  '--no-default-browser-check',
  '--window-size=1280,800',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  'about:blank',
], { stdio: 'ignore' })
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
let target
for (let i = 0; i < 40; i += 1) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })
    if (res.ok) {
      target = await res.json()
      break
    }
  } catch {
    /* booting */
  }
  await sleep(250)
}
if (!target) throw new Error('Chrome DevTools did not start')
const ws = new WebSocket(target.webSocketDebuggerUrl)
let seq = 0
const pending = new Map()
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve)
  ws.addEventListener('error', reject)
})
ws.addEventListener('message', (event) => {
  const message = JSON.parse(event.data)
  if (message.id && pending.has(message.id)) {
    pending.get(message.id)(message)
    pending.delete(message.id)
  }
})
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++seq
  pending.set(id, (message) => (message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result)))
  ws.send(JSON.stringify({ id, method, params }))
})
await send('Page.enable')
await send('Runtime.enable')
await send('Page.navigate', { url: 'http://127.0.0.1:5173/' })
for (let i = 0; i < 40; i += 1) {
  await sleep(250)
  const result = await send('Runtime.evaluate', { expression: '!!document.querySelector(".btn-primary")', returnByValue: true })
  if (result.result?.value) break
}
await send('Runtime.evaluate', { expression: 'document.querySelector(".btn-primary").click()', returnByValue: true })
await sleep(1100)
const shot = await send('Page.captureScreenshot', { format: 'png' })
const file = join(out, 'stride.png')
await writeFile(file, Buffer.from(shot.data, 'base64'))
console.log(file)
ws.close()
chrome.kill()
try { await rm(profile, { recursive: true, force: true }) } catch { /* lock */ }
