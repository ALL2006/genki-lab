import { getConfig } from '../config.js'
import { DataPathResolver } from '../storage/DataPathResolver.js'
import { DevelopmentBatchPreparationService } from '../services/DevelopmentBatchPreparationService.js'

const config = getConfig()
const service = new DevelopmentBatchPreparationService(
  config.evaluationDatasetPath,
  config.evaluationSplitPath,
  new DataPathResolver(config.dataDir),
)
console.log(JSON.stringify(await service.prepare(), null, 2))
