import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import type { AIAnalysisRecord, ConsumerCommentEvaluationItem } from '../shared/types.js'

interface D1Envelope<T> { results: T[] }
interface D1RecordRow { item_id: string; payload: string }
interface DatasetFile { items: ConsumerCommentEvaluationItem[] }
interface SplitFile { developmentIds: string[]; holdoutIds: string[] }

const wrangler = resolve('node_modules', 'wrangler', 'bin', 'wrangler.js')
const sql = "SELECT item_id,payload FROM ai_analysis_records WHERE batch_id='B2-DEV-01' ORDER BY item_id"
const query = spawnSync(process.execPath, [wrangler, 'd1', 'execute', 'genki-lab-production', '--remote', '--command', sql, '--json'], {
  cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
})
if (query.status !== 0) throw new Error(query.stderr || 'D1 query failed')
const rows = (JSON.parse(query.stdout) as Array<D1Envelope<D1RecordRow>>)[0].results
const dataset = JSON.parse(readFileSync(resolve('data/evaluation/consumer-comments-v1.json'), 'utf8')) as DatasetFile
const split = JSON.parse(readFileSync(resolve('data/evaluation/split-v1.json'), 'utf8')) as SplitFile
const itemIds = split.developmentIds.slice(0, 10)
if (itemIds.length !== 10 || itemIds.some((id) => split.holdoutIds.includes(id))) throw new Error('DEV-01 split is invalid')
if (rows.length !== 10) throw new Error(`Expected 10 official records, received ${rows.length}`)

const groundTruthById = new Map(dataset.items.map((item) => [item.id, item]))
const recordById = new Map(rows.map((row) => [row.item_id, JSON.parse(row.payload) as AIAnalysisRecord]))
const set = (values: string[]) => new Set(values.map((value) => value.trim()).filter(Boolean))
const exact = (expected: string[], predicted: string[]) => {
  const left = set(expected); const right = set(predicted)
  return left.size === right.size && [...left].every((value) => right.has(value))
}
const sentiment = (record: AIAnalysisRecord) => {
  const output = record.parsedAIOutput
  if (output.positiveSignals.length > output.negativeSignals.length) return 'positive'
  if (output.negativeSignals.length > output.positiveSignals.length) return 'negative'
  return 'neutral'
}

let flavorTp = 0; let flavorFp = 0; let flavorFn = 0
const pairs = itemIds.map((itemId) => {
  const truth = groundTruthById.get(itemId)
  const record = recordById.get(itemId)
  if (!truth || !record) throw new Error(`Missing DEV-01 pair ${itemId}`)
  const output = record.parsedAIOutput
  const expectedFlavors = set(truth.humanFlavorTags); const predictedFlavors = set(output.flavors)
  for (const value of predictedFlavors) expectedFlavors.has(value) ? flavorTp += 1 : flavorFp += 1
  for (const value of expectedFlavors) if (!predictedFlavors.has(value)) flavorFn += 1
  const predictedPainPoints = [...new Set([...output.negativeSignals, ...output.riskSignals])]
  const modelSentiment = sentiment(record)
  return {
    itemId,
    groundTruth: {
      evidenceRole: 'consumer_evidence', sentiment: truth.humanSentiment, flavors: truth.humanFlavorTags,
      scenes: truth.humanSceneTags, painPoints: truth.humanPainPointTags,
    },
    modelResult: {
      evidenceRole: output.evidenceRole, sentiment: modelSentiment, flavors: output.flavors,
      scenes: output.scenes, painPoints: predictedPainPoints,
    },
    match: {
      evidenceRole: output.evidenceRole === 'consumer_evidence',
      sentiment: truth.humanSentiment !== null && modelSentiment === truth.humanSentiment,
      flavors: exact(truth.humanFlavorTags, output.flavors),
      scenes: exact(truth.humanSceneTags, output.scenes),
      painPoints: exact(truth.humanPainPointTags, predictedPainPoints),
    },
  }
})
const precision = flavorTp + flavorFp === 0 ? 0 : flavorTp / (flavorTp + flavorFp)
const recall = flavorTp + flavorFn === 0 ? 0 : flavorTp / (flavorTp + flavorFn)
const labeledSentiment = pairs.filter((pair) => pair.groundTruth.sentiment !== null)
const statuses = { validated: 0, auto_repaired: 0, needs_review: 0, rejected: 0 }
for (const record of recordById.values()) statuses[record.validationStatus ?? 'needs_review'] += 1

console.log(JSON.stringify({
  sampleCount: itemIds.length,
  recordCount: rows.length,
  schemaPass: [...recordById.values()].filter((record) => record.schemaValid).length,
  itemIdPass: [...recordById.values()].filter((record) => record.parsedAIOutput.itemId === record.itemId).length,
  quotePass: [...recordById.values()].filter((record) => record.quoteValid).length,
  traceableQuotePass: [...recordById.values()].filter((record) => record.quoteRepairs?.length && record.quoteRepairs.every((repair) => repair.traceable)).length,
  evidenceRoleAccuracy: pairs.filter((pair) => pair.match.evidenceRole).length / pairs.length,
  sentimentAccuracy: labeledSentiment.filter((pair) => pair.match.sentiment).length / labeledSentiment.length,
  flavorMicroF1: precision + recall === 0 ? 0 : 2 * precision * recall / (precision + recall),
  flavorPrecision: precision,
  flavorRecall: recall,
  sceneAccuracy: pairs.filter((pair) => pair.match.scenes).length / pairs.length,
  painPointAccuracy: pairs.filter((pair) => pair.match.painPoints).length / pairs.length,
  statuses,
  pairs,
}, null, 2))
