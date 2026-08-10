import { getConfig } from '../config.js'
import { MockRepository } from '../repositories/MockRepository.js'
import { AnalysisTextBackfillService } from '../services/AnalysisTextBackfillService.js'

const config = getConfig()
const result = await new AnalysisTextBackfillService(new MockRepository(config.mockDbPath)).backfill()
console.log(JSON.stringify(result, null, 2))
