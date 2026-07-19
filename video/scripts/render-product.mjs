import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(scriptDirectory, '..')

function readArgument(name, fallback) {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    env: process.env,
    stdio: 'inherit',
  })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

const config = readArgument('config', 'data/qingti-jasmine.json')
const output = readArgument('output', 'renders/qingti-jasmine.mp4')
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'

run(process.execPath, ['scripts/build.mjs', '--config', config, '--output', 'index.html'])
run(npx, [
  '--yes',
  'hyperframes@0.7.63',
  'render',
  '--quality',
  'high',
  '--fps',
  '30',
  '--skill',
  'product-launch-video',
  '--output',
  output,
])
