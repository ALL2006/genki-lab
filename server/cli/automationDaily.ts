import { getConfig } from '../config.js'
import { createDependencies } from '../dependencies.js'

const config = getConfig()
const { automation } = createDependencies(config)
const dryRun = process.argv.includes('--dry-run')

if (dryRun) {
  console.log(JSON.stringify(await automation.dryRun(), null, 2))
} else {
  const result = await automation.run({
    triggerType: 'local-cron',
    idempotencyKey: process.env.AUTOMATION_IDEMPOTENCY_KEY ?? null,
  })
  console.log(JSON.stringify(result, null, 2))
  if (!result.success) process.exitCode = 1
}
