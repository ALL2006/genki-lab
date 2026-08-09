import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const wrangler = resolve('node_modules/wrangler/bin/wrangler.js')
const result = spawnSync(process.execPath, [wrangler, 'deploy', '--dry-run', '--outdir', 'tmp/cloudflare-worker-bundle'], {
  cwd: process.cwd(),
  env: { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' },
  stdio: 'inherit',
})

if (result.error) throw result.error
if (result.status !== 0) process.exit(result.status ?? 1)
