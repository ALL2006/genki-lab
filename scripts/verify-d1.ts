import { readFile, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

interface Manifest {
  counts: Record<string, number>
  samples: {
    rawItemIds: string[]
    b2AnalysisRecordIds: string[]
    b2ValidationFlagIds: string[]
    latestAutomationRunId: string | null
  }
}

const remote = process.argv.includes('--remote')
const manifest = JSON.parse(await readFile(resolve('data/migrations/generated/genki-lab-production-seed.manifest.json'), 'utf8')) as Manifest
const entities: Record<string, string> = {
  DataSource: 'data_sources', RawItem: 'raw_items', TrendSignal: 'trend_signals', ProductConcept: 'product_concepts',
  ValidationResponse: 'validation_responses', JobRun: 'job_runs', AIBatch: 'ai_batches', AIAnalysisRecord: 'ai_analysis_records',
  AIAnalysisRun: 'ai_analysis_runs', AIResultImport: 'ai_result_imports', TrendCandidate: 'trend_candidates',
  EvaluationRun: 'evaluation_runs', AutomationRun: 'automation_runs', ValidationFlag: 'validation_flags', ExperimentRun: 'experiment_runs',
}

function execute(sql: string) {
  const wrangler = resolve('node_modules/wrangler/bin/wrangler.js')
  const result = spawnSync(process.execPath, [wrangler, 'd1', 'execute', 'genki-lab-production', remote ? '--remote' : '--local', '--command', sql, '--json'], {
    cwd: process.cwd(), encoding: 'utf8', env: { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' },
  })
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'D1 verify command failed')
  const output = JSON.parse(result.stdout) as Array<{ results: Array<Record<string, unknown>> }>
  return output[0]?.results ?? []
}

const counts = new Map(Object.entries(entities).map(([entity, table]) => [
  entity,
  Number(execute(`SELECT COUNT(*) AS count FROM ${table}`)[0]?.count ?? -1),
]))
const comparison = Object.entries(entities).map(([entity]) => ({
  entity,
  jsonCount: manifest.counts[entity] ?? 0,
  d1Count: counts.get(entity) ?? -1,
  matched: (manifest.counts[entity] ?? 0) === (counts.get(entity) ?? -1),
}))

const placeholders = (values: string[]) => values.map((value) => `'${value.replaceAll("'", "''")}'`).join(',') || "''"
const samples = {
  rawItems: Number(execute(`SELECT COUNT(*) AS count FROM raw_items WHERE id IN (${placeholders(manifest.samples.rawItemIds)})`)[0]?.count ?? 0),
  b2Records: Number(execute(`SELECT COUNT(*) AS count FROM ai_analysis_records WHERE id IN (${placeholders(manifest.samples.b2AnalysisRecordIds)})`)[0]?.count ?? 0),
  b2Flags: Number(execute(`SELECT COUNT(*) AS count FROM validation_flags WHERE id IN (${placeholders(manifest.samples.b2ValidationFlagIds)})`)[0]?.count ?? 0),
  latestAutomationRun: manifest.samples.latestAutomationRunId
    ? Number(execute(`SELECT COUNT(*) AS count FROM automation_runs WHERE id = '${manifest.samples.latestAutomationRunId.replaceAll("'", "''")}'`)[0]?.count ?? 0)
    : 0,
}
const sampleMatched = samples.rawItems === manifest.samples.rawItemIds.length
  && samples.b2Records === manifest.samples.b2AnalysisRecordIds.length
  && samples.b2Flags === manifest.samples.b2ValidationFlagIds.length
  && samples.latestAutomationRun === (manifest.samples.latestAutomationRunId ? 1 : 0)
const report = { target: remote ? 'remote' : 'local', checkedAt: new Date().toISOString(), comparison, samples, sampleMatched, matched: comparison.every((item) => item.matched) && sampleMatched }
await writeFile(resolve('data/migrations/generated', `d1-verification-${remote ? 'remote' : 'local'}.json`), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(JSON.stringify(report, null, 2))
if (!report.matched) process.exitCode = 1
