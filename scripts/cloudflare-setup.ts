import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const wrangler = resolve('node_modules/wrangler/bin/wrangler.js')
const env = { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' }
function run(args: string[], options: { capture?: boolean } = {}) {
  console.log(`[cloudflare:setup] ${args.slice(0, 3).join(' ')}`)
  const result = spawnSync(process.execPath, [wrangler, ...args], { cwd: process.cwd(), env, encoding: 'utf8', stdio: options.capture ? 'pipe' : 'inherit' })
  if (result.status !== 0) throw new Error(options.capture ? result.stderr || result.stdout : `wrangler ${args[0]} failed`)
  return options.capture ? result.stdout : ''
}

const whoami = run(['whoami'], { capture: true })
if (/not authenticated/i.test(whoami)) {
  console.error('BLOCKED_BY_CLOUDFLARE_AUTH')
  console.error('Run: npx wrangler login')
  process.exit(2)
}

const parseJson = <T>(text: string): T => JSON.parse(text.slice(text.indexOf(text.trimStart()[0]))) as T
type Database = { uuid?: string; id?: string; name: string }
let databases = parseJson<Database[]>(run(['d1', 'list', '--json'], { capture: true }))
let database = databases.find((item) => item.name === 'genki-lab-production')
if (!database) {
  run(['d1', 'create', 'genki-lab-production'])
  databases = parseJson<Database[]>(run(['d1', 'list', '--json'], { capture: true }))
  database = databases.find((item) => item.name === 'genki-lab-production')
}
const databaseId = database?.uuid ?? database?.id
if (!databaseId) throw new Error('Cloudflare D1 database_id was not returned by Wrangler.')

const configPath = resolve('wrangler.jsonc')
const config = JSON.parse(await readFile(configPath, 'utf8')) as { d1_databases: Array<Record<string, unknown>> }
config.d1_databases[0].database_id = databaseId
await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8')
console.log('[cloudflare:setup] wrote the real D1 database_id to wrangler.jsonc')

run(['d1', 'migrations', 'apply', 'genki-lab-production', '--remote'])
const prepare = spawnSync(process.execPath, [resolve('node_modules/tsx/dist/cli.mjs'), 'scripts/export-json-to-d1.ts'], { cwd: process.cwd(), env, stdio: 'inherit' })
if (prepare.status !== 0) throw new Error('D1 import preparation failed.')
run(['d1', 'execute', 'genki-lab-production', '--remote', '--file', 'data/migrations/generated/genki-lab-production-seed.sql'])
const d1Verify = spawnSync(process.execPath, [resolve('node_modules/tsx/dist/cli.mjs'), 'scripts/verify-d1.ts', '--remote'], { cwd: process.cwd(), env, stdio: 'inherit' })
if (d1Verify.status !== 0) throw new Error('Remote D1 verification failed.')
const build = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], { cwd: process.cwd(), env, stdio: 'inherit' })
if (build.status !== 0) throw new Error('Production build failed.')
const deploy = run(['deploy'], { capture: true })
process.stdout.write(deploy)
const url = deploy.match(/https:\/\/[^\s]+\.workers\.dev/)?.[0]
if (!url) throw new Error('Wrangler deploy succeeded but the workers.dev URL could not be parsed.')
const configureSecrets = spawnSync(process.execPath, [resolve('node_modules/tsx/dist/cli.mjs'), 'scripts/configure-cloudflare-secrets.ts'], { cwd: process.cwd(), env, stdio: 'inherit' })
if (configureSecrets.status !== 0) throw new Error('Cloudflare Secret configuration failed.')
await mkdir(resolve('.wrangler'), { recursive: true })
await writeFile(resolve('.wrangler/genki-lab-url.txt'), `${url}\n`, 'utf8')
console.log(`[cloudflare:setup] deployed ${url}`)

const verify = spawnSync(process.execPath, [resolve('node_modules/tsx/dist/cli.mjs'), 'scripts/cloudflare-verify.ts'], { cwd: process.cwd(), env: { ...env, CLOUDFLARE_PUBLIC_URL: url }, stdio: 'inherit' })
if (verify.status !== 0) process.exit(verify.status ?? 1)
