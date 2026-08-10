import { getConfig } from '../config.js'
import { createDependencies } from '../dependencies.js'

const config = getConfig()
if (!config.enableHoldoutEvaluation) {
  throw new Error('holdout评测默认锁定；仅可在ENABLE_HOLDOUT_EVALUATION=true时通过专用命令运行。')
}
const { evaluations } = createDependencies(config)
console.log(JSON.stringify(await evaluations.run('holdout'), null, 2))
