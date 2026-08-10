import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { mkdir, readFile, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'

const port = 8791
const origin = `http://127.0.0.1:${port}`
const persistPath = resolve('tmp/cf-runtime-test-state')
const tmpRoot = resolve('tmp')
if (!persistPath.startsWith(`${tmpRoot}\\`) && !persistPath.startsWith(`${tmpRoot}/`)) throw new Error('Invalid temporary test path')
await rm(persistPath, { recursive: true, force: true })
await mkdir(persistPath, { recursive: true })

const wrangler = resolve('node_modules/wrangler/bin/wrangler.js')
const environment = { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' }
function run(args: string[]) {
  const result = spawnSync(process.execPath, [wrangler, ...args], { cwd: process.cwd(), env: environment, encoding: 'utf8' })
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `wrangler ${args.join(' ')} failed`)
}
function runExpectFailure(args: string[]) {
  const result = spawnSync(process.execPath, [wrangler, ...args], { cwd: process.cwd(), env: environment, encoding: 'utf8' })
  assert.notEqual(result.status, 0, `wrangler ${args.join(' ')} was expected to fail`)
}

run(['d1', 'migrations', 'apply', 'genki-lab-production', '--local', '--persist-to', persistPath])
run(['d1', 'execute', 'genki-lab-production', '--local', '--persist-to', persistPath, '--file', 'data/migrations/generated/genki-lab-production-seed.sql'])
run(['d1', 'execute', 'genki-lab-production', '--local', '--persist-to', persistPath, '--command', "UPDATE data_sources SET enabled=0, payload=json_set(payload, '$.enabled', json('false'))"])
const staleRun = {
  id: 'automation-cf-test-stale', idempotencyKey: 'cf-test-stale', triggerType: 'test', startedAt: '2026-08-08T00:00:00.000Z', finishedAt: null,
  status: 'running', collectionRunIds: [], analysisBatchIds: [], sourceCount: 0, fetchedCount: 0, newCount: 0, duplicateCount: 0,
  failedCount: 0, analysisPendingCount: 0, analysisCompletedCount: 0, analysisFailedCount: 0, analysisStatus: 'not_needed',
  notificationStatus: 'pending', errorSummary: null, durationMs: 0, isDemo: false,
}
const stalePayload = JSON.stringify(staleRun).replaceAll("'", "''")
run(['d1', 'execute', 'genki-lab-production', '--local', '--persist-to', persistPath, '--command',
  `INSERT INTO automation_runs (id,idempotency_key,trigger_type,status,started_at,finished_at,is_demo,payload) VALUES ('${staleRun.id}','${staleRun.idempotencyKey}','test','running','${staleRun.startedAt}',NULL,0,'${stalePayload}')`])
runExpectFailure(['d1', 'execute', 'genki-lab-production', '--local', '--persist-to', persistPath, '--command',
  `INSERT INTO automation_runs (id,idempotency_key,trigger_type,status,started_at,finished_at,is_demo,payload) VALUES ('automation-cf-test-conflict','cf-test-conflict','test','running','${staleRun.startedAt}',NULL,0,'${stalePayload}')`])

let server: ChildProcess | undefined
let logs = ''
const stop = () => {
  if (!server?.pid) return
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' })
  else server.kill('SIGTERM')
}

try {
  server = spawn(process.execPath, [wrangler, 'dev', '--ip', '127.0.0.1', '--port', String(port), '--test-scheduled', '--persist-to', persistPath,
    '--compatibility-date', '2026-08-08',
    '--var', 'AUTOMATION_SECRET:test-automation-secret', '--var', 'AI_IMPORT_SECRET:test-import-secret', '--var', 'JOB_SECRET:test-job-secret', '--log-level', 'error'],
  { cwd: process.cwd(), env: environment, stdio: ['ignore', 'pipe', 'pipe'] })
  server.stdout?.on('data', (chunk) => { logs += String(chunk) })
  server.stderr?.on('data', (chunk) => { logs += String(chunk) })

  let healthy = false
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await new Promise((resolveWait) => setTimeout(resolveWait, 500))
    try {
      const response = await fetch(`${origin}/api/health`)
      if (response.ok) { healthy = true; break }
    } catch { /* server is still starting */ }
  }
  if (!healthy) throw new Error(`Worker did not become healthy. Logs:\n${logs.slice(-4000)}`)

  const healthText = await (await fetch(`${origin}/api/health`)).text()
  const health = JSON.parse(healthText)
  assert.equal(health.data.runtime, 'cloudflare-workers')
  assert.ok(!healthText.includes('test-automation-secret') && !healthText.includes('test-import-secret'))

  const readiness = await (await fetch(`${origin}/api/system/readiness`)).json() as { data: Record<string, unknown> }
  assert.equal(readiness.data.repositoryType, 'd1')
  assert.equal(readiness.data.d1Writable, true)
  assert.equal(readiness.data.filesystemPersistence, false)
  assert.equal(readiness.data.databasePersistence, true)

  assert.equal((await fetch(`${origin}/`)).status, 200)
  assert.equal((await fetch(`${origin}/trends`)).status, 200)
  const missing = await fetch(`${origin}/api/not-a-route`)
  assert.equal(missing.status, 404)
  assert.match(missing.headers.get('content-type') ?? '', /application\/json/)
  assert.equal((await fetch(`${origin}/api/automation/daily`, { method: 'POST' })).status, 401)

  const candidates = await (await fetch(`${origin}/api/ai-batches/candidates`)).json() as { data: Array<{ dataset: string | null; selectable: boolean }> }
  const holdout = candidates.data.filter((item) => item.dataset === 'holdout')
  assert.equal(holdout.length, 10)
  assert.ok(holdout.every((item) => !item.selectable), 'holdout candidates must remain locked')

  const trendsBefore = await (await fetch(`${origin}/api/trend-signals`)).json() as { data: Array<{ id: string; reviewStatus: string }> }
  const trend = trendsBefore.data[0]
  assert.ok(trend)
  const reviewed = await fetch(`${origin}/api/trend-signals/${encodeURIComponent(trend.id)}/review`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reviewStatus: 'confirmed', reviewer: '运行测试' }),
  })
  assert.equal(reviewed.status, 200)

  const automationHeaders = { 'Content-Type': 'application/json', 'X-AUTOMATION-SECRET': 'test-automation-secret', 'Idempotency-Key': 'cf-test-idempotency' }
  const first = await (await fetch(`${origin}/api/automation/daily`, { method: 'POST', headers: automationHeaders, body: '{}' })).json() as { data: { automationRunId: string; skipped?: boolean } }
  const replay = await (await fetch(`${origin}/api/automation/daily`, { method: 'POST', headers: automationHeaders, body: '{}' })).json() as { data: { automationRunId: string; skipped?: boolean } }
  assert.equal(first.data.automationRunId, replay.data.automationRunId)
  assert.equal(replay.data.skipped, true)
  const afterClaim = await (await fetch(`${origin}/api/automation-runs`)).json() as { data: Array<{ id: string; status: string }> }
  assert.equal(afterClaim.data.find((item) => item.id === staleRun.id)?.status, 'stale_failed')

  const scheduled = await fetch(`${origin}/__scheduled?cron=0%201%20*%20*%20*`)
  assert.ok(scheduled.ok)
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const runs = await (await fetch(`${origin}/api/automation-runs`)).json() as { data: Array<{ triggerType: string }> }
    if (runs.data.some((item) => item.triggerType === 'cloudflare-cron')) break
    await new Promise((resolveWait) => setTimeout(resolveWait, 200))
    if (attempt === 29) assert.fail(`scheduled handler did not persist an AutomationRun. Logs: ${logs.slice(-3000)}`)
  }

  const bundleText = await readFile(resolve('tmp/cloudflare-worker-bundle/index.js'), 'utf8')
  assert.ok(!bundleText.includes('node:fs') && !bundleText.includes('require("express")') && !bundleText.includes('from "express"'))
  console.log(JSON.stringify({ passed: true, api: ['health', 'readiness', 'daily', 'scheduled'], spa: ['/', '/trends'], holdoutLocked: 10, secretsReturned: false }, null, 2))
} finally {
  stop()
}
