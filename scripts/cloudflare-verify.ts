import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import assert from 'node:assert/strict'

let localSecrets: Record<string, string> = {}
try { localSecrets = JSON.parse(await readFile(resolve('.wrangler/production-secrets.local.json'), 'utf8')) as Record<string, string> } catch { /* optional */ }

let publicUrl = process.env.CLOUDFLARE_PUBLIC_URL?.replace(/\/+$/, '')
if (!publicUrl) {
  try { publicUrl = (await readFile(resolve('.wrangler/genki-lab-url.txt'), 'utf8')).trim().replace(/\/+$/, '') } catch { /* handled below */ }
}
if (!publicUrl) throw new Error('Set CLOUDFLARE_PUBLIC_URL or run npm run cloudflare:setup first.')

const healthText = await (await fetch(`${publicUrl}/api/health`)).text()
const health = JSON.parse(healthText)
assert.equal(health.success, true)
assert.equal(health.data.runtime, 'cloudflare-workers')
const readiness = await (await fetch(`${publicUrl}/api/system/readiness`)).json() as { data: Record<string, unknown> }
assert.equal(readiness.data.repositoryType, 'd1')
assert.equal(readiness.data.d1Writable, true)
assert.equal((await fetch(`${publicUrl}/`)).status, 200)
assert.equal((await fetch(`${publicUrl}/trends`)).status, 200)
const missing = await fetch(`${publicUrl}/api/not-a-route`)
assert.equal(missing.status, 404)
assert.match(missing.headers.get('content-type') ?? '', /application\/json/)
assert.equal((await fetch(`${publicUrl}/api/automation/daily`, { method: 'POST' })).status, 401)
assert.ok(!healthText.includes('AUTOMATION_SECRET') && !healthText.includes('AI_IMPORT_SECRET'))

const automationSecret = process.env.AUTOMATION_SECRET ?? localSecrets.AUTOMATION_SECRET
if (automationSecret) {
  const response = await fetch(`${publicUrl}/api/automation/daily`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-AUTOMATION-SECRET': automationSecret, 'Idempotency-Key': `verify:${new Date().toISOString().slice(0, 10)}` },
    body: JSON.stringify({ triggerType: 'test' }),
  })
  assert.ok(response.ok, `authorized automation returned ${response.status}`)
}

const verify = spawnSync(process.execPath, [resolve('node_modules/tsx/dist/cli.mjs'), 'scripts/verify-d1.ts', '--remote'], { cwd: process.cwd(), env: { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' }, stdio: 'inherit' })
if (verify.status !== 0) process.exit(verify.status ?? 1)
console.log(JSON.stringify({ passed: true, publicUrl, health: true, readiness: true, d1: true, spa: true, apiRouting: true, automationAuth: true }, null, 2))
