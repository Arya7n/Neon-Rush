import { spawn } from 'node:child_process'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const port = 9333
const profile = await mkdtemp(join(tmpdir(), 'neon-rush-chrome-'))
const outDir = join(process.cwd(), '.verify')
await rm(outDir, { recursive: true, force: true })
const { mkdir } = await import('node:fs/promises')
await mkdir(outDir)

const chrome = spawn(chromePath, [
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForJson() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })
      if (res.ok) return res.json()
    } catch {
      /* chrome still booting */
    }
    await sleep(250)
  }
  throw new Error('Chrome DevTools did not start')
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl)
  let seq = 0
  const pending = new Map()
  const logs = []
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message)
      pending.delete(message.id)
      return
    }
    if (message.method === 'Runtime.exceptionThrown') logs.push(message.params.exceptionDetails.text + ' ' + (message.params.exceptionDetails.exception?.description || ''))
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      logs.push(message.params.args.map((arg) => arg.value || arg.description || '').join(' '))
    }
  })
  return {
    logs,
    ready: new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve)
      ws.addEventListener('error', reject)
    }),
    send(method, params = {}) {
      const id = ++seq
      return new Promise((resolve, reject) => {
        pending.set(id, (message) => {
          if (message.error) reject(new Error(`${method}: ${JSON.stringify(message.error)}`))
          else resolve(message.result)
        })
        ws.send(JSON.stringify({ id, method, params }))
      })
    },
    close() { ws.close() },
  }
}

async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text + ' ' + (result.exceptionDetails.exception?.description || ''))
  return result.result.value
}

async function shot(client, name) {
  const { data } = await client.send('Page.captureScreenshot', { format: 'png' })
  const file = join(outDir, name)
  await writeFile(file, Buffer.from(data, 'base64'))
  return file
}

async function key(client, keyName, code, windowsVirtualKeyCode) {
  await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: keyName, code, windowsVirtualKeyCode })
  await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: keyName, code, windowsVirtualKeyCode })
}

const target = await waitForJson()
const client = connect(target.webSocketDebuggerUrl)
await client.ready
await client.send('Page.enable')
await client.send('Runtime.enable')
await client.send('Page.addScriptToEvaluateOnNewDocument', {
  source: `window.__errs=[];
    window.addEventListener('error', (event) => window.__errs.push(String(event.message)));
    window.addEventListener('unhandledrejection', (event) => window.__errs.push(String(event.reason && event.reason.stack || event.reason)));`,
})
await client.send('Page.navigate', { url: 'http://127.0.0.1:5173/' })

let ready = null
for (let i = 0; i < 40; i += 1) {
  await sleep(250)
  ready = await evaluate(client, `(() => {
    const canvas = document.querySelector('canvas');
    const start = document.querySelector('.btn-primary');
    return { canvas: !!canvas, w: canvas ? canvas.width : 0, h: canvas ? canvas.height : 0, start: start ? start.textContent : '', errs: window.__errs || [] };
  })()`)
  if (ready.canvas && ready.start.includes('Start')) break
}

const menuShot = await shot(client, 'menu.png')
await evaluate(client, `document.querySelector('.btn-primary').click()`)
await sleep(700)
const playing = await evaluate(client, `(() => ({
  text: document.body.innerText.replace(/\\s+/g, ' ').slice(0, 400),
  errs: window.__errs || [],
}))()`)
await key(client, 'ArrowRight', 'ArrowRight', 39)
await key(client, ' ', 'Space', 32)
await sleep(250)
await key(client, 'ArrowDown', 'ArrowDown', 40)
await sleep(500)
const playShot = await shot(client, 'play.png')
await key(client, 'Escape', 'Escape', 27)
await sleep(300)
const paused = await evaluate(client, `(() => ({
  text: document.body.innerText.replace(/\\s+/g, ' ').slice(0, 500),
  errs: window.__errs || [],
}))()`)
const pauseShot = await shot(client, 'pause.png')
await evaluate(client, `document.querySelector('.btn-primary').click()`)
let ended = null
for (let i = 0; i < 24; i += 1) {
  await sleep(500)
  ended = await evaluate(client, `(() => ({
    over: document.body.innerText.includes('Run over'),
    text: document.body.innerText.replace(/\\s+/g, ' ').slice(0, 400),
    best: localStorage.getItem('neon-rush-best'),
    errs: window.__errs || [],
  }))()`)
  if (ended.over) break
}
const overShot = ended.over ? await shot(client, 'over.png') : null
await client.send('Page.reload')
await sleep(1200)
const afterReload = await evaluate(client, `(() => ({
  best: localStorage.getItem('neon-rush-best'),
  text: document.body.innerText.replace(/\\s+/g, ' ').slice(0, 240),
  errs: window.__errs || [],
}))()`)

console.log(JSON.stringify({ ready, menuShot, playing, playShot, paused, pauseShot, ended, overShot, afterReload, cdpLogs: client.logs }, null, 2))
client.close()
chrome.kill()
try { await rm(profile, { recursive: true, force: true }) } catch { /* chrome lock */ }
