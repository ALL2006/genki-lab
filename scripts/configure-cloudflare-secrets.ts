import { randomBytes } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const wrangler = resolve('node_modules/wrangler/bin/wrangler.js')
const secretFile = resolve('.wrangler/production-secrets.local.json')
const environment = { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' }

function wranglerJson(args: string[]) {
  const result = spawnSync(process.execPath, [wrangler, ...args], { cwd: process.cwd(), env: environment, encoding: 'utf8' })
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `wrangler ${args.join(' ')} failed`)
  return JSON.parse(result.stdout) as Array<{ name: string }>
}

function putSecret(name: string, value: string) {
  const result = spawnSync(process.execPath, [wrangler, 'secret', 'put', name], {
    cwd: process.cwd(), env: environment, encoding: 'utf8', input: `${value}\n`, stdio: ['pipe', 'pipe', 'pipe'],
  })
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `wrangler secret put ${name} failed`)
  console.log(`[cloudflare:secrets] configured ${name}`)
}

let saved: Record<string, string> = {}
try { saved = JSON.parse(await readFile(secretFile, 'utf8')) as Record<string, string> } catch { /* first setup */ }
const remote = new Set(wranglerJson(['secret', 'list', '--format', 'json']).map((item) => item.name))

const envText = await readFile(resolve('.env'), 'utf8').catch(() => '')
const localJobSecret = /^\s*X_JOB_SECRET\s*=\s*(.+)\s*$/m.exec(envText)?.[1]?.trim()
const candidates: Record<string, string | undefined> = {
  AUTOMATION_SECRET: saved.AUTOMATION_SECRET,
  AI_IMPORT_SECRET: saved.AI_IMPORT_SECRET,
  JOB_SECRET: saved.JOB_SECRET ?? localJobSecret,
}
const recovery = { ...saved }

for (const [name, candidate] of Object.entries(candidates)) {
  if (remote.has(name)) {
    console.log(`[cloudflare:secrets] ${name} already configured; left unchanged`)
    continue
  }
  const value = candidate ?? randomBytes(32).toString('base64url')
  putSecret(name, value)
  recovery[name] = value
}
await mkdir(resolve('.wrangler'), { recursive: true })
await writeFile(secretFile, `${JSON.stringify(recovery, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 })
console.log('[cloudflare:secrets] recoverable configured values are stored under ignored .wrangler; no values were printed')
