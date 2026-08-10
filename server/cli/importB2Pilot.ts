import { readJsonStrict } from '../storage/AtomicJsonFile.js'
import { DataPathResolver } from '../storage/DataPathResolver.js'
import { getConfig } from '../config.js'
import { createDependencies } from '../dependencies.js'

interface PilotInputFile { batch: { id: string } }
interface PilotResultFile { results: unknown[] }

const config = getConfig()
const dataPaths = new DataPathResolver(config.dataDir)
const [input, result] = await Promise.all([
  readJsonStrict<PilotInputFile>(dataPaths.resolve('manual-batches/B2-PILOT-01-input.json')),
  readJsonStrict<PilotResultFile>(dataPaths.resolve('manual-batches/B2-PILOT-01-result.json')),
])
const { aiAnalysis } = createDependencies(config)
console.log(JSON.stringify(await aiAnalysis.importResults({
  batchId: input.batch.id,
  provider: 'manual-doubao',
  mode: 'manual_import',
  validationMode: 'automated',
  results: result.results,
  rawModelResponse: result,
}), null, 2))
