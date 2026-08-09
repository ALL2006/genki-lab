import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { MockDatabase } from '../shared/types.js'
import { bootstrapDataFile } from '../server/storage/DataBootstrap.js'
import { writeJsonAtomic } from '../server/storage/AtomicJsonFile.js'

const tempDir = resolve('tmp', `bootstrap-test-${randomUUID()}`)
const targetPath = resolve(tempDir, 'mock-db.json')
const seedPath = resolve('data/bootstrap/mock-db.seed.json.gz.base64')

await mkdir(tempDir, { recursive: true })
try {
  const evaluationDataset = JSON.parse(await readFile(resolve('data/evaluation/consumer-comments-v1.json'), 'utf8')) as { items: unknown[] }
  const evaluationSplit = JSON.parse(await readFile(resolve('data/evaluation/split-v1.json'), 'utf8')) as { developmentIds: string[]; holdoutIds: string[] }
  assert.equal(evaluationDataset.items.length, 49)
  assert.equal(evaluationSplit.developmentIds.length, 39)
  assert.equal(evaluationSplit.holdoutIds.length, 10)

  const first = await bootstrapDataFile(targetPath, seedPath)
  assert.equal(first.initialized, true)
  const initialized = JSON.parse(await readFile(targetPath, 'utf8')) as MockDatabase
  assert.equal(initialized.dataSources.length, 6)
  assert.equal(initialized.rawItems.length, 23)
  assert.equal(initialized.aiAnalysisRecords.filter((record) => !record.isDemo && record.provider === 'manual-doubao').length, 6)
  assert.equal(initialized.validationResponses.length, 10)
  assert.equal(initialized.evaluationRuns.length, 4)

  initialized.experimentRuns.push({
    id: 'persistent-user-data',
    experimentType: 'collection',
    mode: 'manual',
    startedAt: '2026-08-09T00:00:00.000Z',
    finishedAt: null,
    durationMs: 0,
    sampleCount: 1,
    notes: 'must survive second startup',
    operator: 'bootstrap-test',
  })
  await writeJsonAtomic(targetPath, initialized)

  const second = await bootstrapDataFile(targetPath, seedPath)
  assert.equal(second.initialized, false)
  const persisted = JSON.parse(await readFile(targetPath, 'utf8')) as MockDatabase
  assert.ok(persisted.experimentRuns.some((run) => run.id === 'persistent-user-data'))
  assert.equal(persisted.aiAnalysisRecords.length, initialized.aiAnalysisRecords.length)

  console.log('Bootstrap integration passed: empty volume initialized once; second startup preserved user data and B2 records.')
} finally {
  await rm(tempDir, { recursive: true, force: true })
}
