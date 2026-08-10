import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { AIBatch, AIAnalysisRecord, EvidenceAnalysisData, RawItem } from '../shared/types.js'
import { ManualJsonAIProvider } from '../server/providers/ManualJsonAIProvider.js'
import { MockRepository } from '../server/repositories/MockRepository.js'
import { AIAnalysisService } from '../server/services/AIAnalysisService.js'
import { NodeEvaluationDataLoader } from '../server/evaluation/NodeEvaluationDataLoader.js'
import {
  buildB2PilotSelection,
  countPilotRoles,
  getCreateBatchLabel,
  getEffectiveSelectionRole,
  getRoleHint,
  isB2PilotDistribution,
  selectionRoleLabels,
  toggleSelectedId,
} from '../shared/analysisBatchSelection.js'
import {
  DEFAULT_BATCH_EXPORT_FILE_NAME,
  saveJsonFile,
} from '../shared/saveJsonFile.js'
import type { JsonSaveFilePickerOptions } from '../shared/saveJsonFile.js'

const tempDir = resolve('tmp', `analysis-batch-test-${randomUUID()}`)
await mkdir(tempDir, { recursive: true })

const makeRawItem = (id: string, patch: Partial<RawItem> = {}): RawItem => {
  const rawText = patch.rawText ?? `资料 ${id} 的有效原文，用于验证Manual Doubao批次资格。`
  return {
    id,
    sourceId: 'source-industry-qj-statistics',
    title: `资料 ${id}`,
    rawText,
    summary: `资料 ${id} 的中文摘要`,
    publishedAt: null,
    fetchedAt: new Date().toISOString(),
    originalUrl: `https://example.com/${id}`,
    normalizedUrl: `https://example.com/${id}`,
    contentHash: `hash-${id}`,
    rawPayload: {},
    status: 'processed',
    collectorType: 'generic_article',
    httpStatus: 200,
    contentLength: rawText.length,
    qualityStatus: 'good',
    failureReason: null,
    isDemo: false,
    ...patch,
  }
}

const makeBatch = (id: string, itemId: string, status: AIBatch['status']): AIBatch => ({
  id,
  provider: 'manual-json',
  model: null,
  status,
  itemIds: [itemId],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  promptVersion: 'evidence-analysis-v1',
  schemaVersion: 'evidence-analysis-v1',
  importedResultHashes: [],
  isDemo: false,
})

const makeOutput = (item: RawItem): EvidenceAnalysisData => ({
  itemId: item.id,
  evidenceRole: 'background_evidence',
  relevanceScore: 0.7,
  relevanceReason: '公开资料作为背景证据。',
  brands: [],
  productCategories: ['饮料'],
  flavors: [],
  consumerNeeds: [],
  scenes: [],
  positiveSignals: [],
  negativeSignals: [],
  riskSignals: ['单条资料不足以代表市场'],
  signalType: 'category_trend',
  evidenceQuotes: [{ quote: item.rawText.slice(0, 12), supports: '原文片段' }],
  confidence: 0.65,
  eligibleForConceptGeneration: false,
})

const makeRecord = (id: string, batchId: string, item: RawItem, provider: string, isDemo: boolean, reviewStatus: AIAnalysisRecord['reviewStatus'] = 'pending'): AIAnalysisRecord => {
  const output = makeOutput(item)
  return {
    id,
    batchId,
    itemId: item.id,
    provider,
    model: null,
    mode: provider === 'mock' ? 'mock' : 'manual_import',
    originalAIOutput: output,
    parsedAIOutput: output,
    finalHumanVersion: null,
    schemaValid: true,
    quoteValid: true,
    reviewStatus,
    reviewer: null,
    reviewedAt: null,
    reviewComment: null,
    editedFields: [],
    isAutomated: provider !== 'manual-doubao',
    isDemo,
    createdAt: new Date().toISOString(),
  }
}

try {
  const repository = new MockRepository(resolve(tempDir, 'db.json'))
  const processed = makeRawItem('raw-processed')
  const mockOnly = makeRawItem('raw-mock-only')
  const manualDone = makeRawItem('raw-manual-done')
  const arkDone = makeRawItem('raw-ark-done')
  const active = makeRawItem('raw-active')
  const empty = makeRawItem('raw-empty', { rawText: '', contentLength: 0 })
  const cocaCola = makeRawItem('raw-coca-market', { sourceId: 'source-brand-coca-media' })
  const marketTwo = makeRawItem('raw-kdp-market', { sourceId: 'source-brand-kdp-innovation-2026' })
  const backgroundOne = makeRawItem('raw-fsa-background-1', { sourceId: 'source-rss-fsa-research' })
  const backgroundTwo = makeRawItem('raw-fsa-background-2', { sourceId: 'source-rss-fsa-research' })
  await repository.insertRawItems([processed, mockOnly, manualDone, arkDone, active, empty, cocaCola, marketTwo, backgroundOne, backgroundTwo])

  const mockBatch = makeBatch('batch-mock-completed', mockOnly.id, 'completed')
  const manualBatch = makeBatch('batch-manual-completed', manualDone.id, 'completed')
  const arkBatch = { ...makeBatch('batch-ark-completed', arkDone.id, 'completed'), provider: 'ark-doubao' as const }
  const activeBatch = makeBatch('batch-active', active.id, 'pending')
  await repository.saveAIBatch(mockBatch)
  await repository.saveAIBatch(manualBatch)
  await repository.saveAIBatch(arkBatch)
  await repository.saveAIBatch(activeBatch)
  await repository.saveAIAnalysisRecords([
    makeRecord('record-mock', mockBatch.id, mockOnly, 'mock', true),
    makeRecord('record-manual', manualBatch.id, manualDone, 'manual-doubao', false, 'confirmed'),
    makeRecord('record-ark', arkBatch.id, arkDone, 'ark-doubao', false),
  ])

  const service = new AIAnalysisService(
    repository,
    new ManualJsonAIProvider(),
    new NodeEvaluationDataLoader(
      resolve('data/evaluation/consumer-comments-v1.json'),
      resolve('data/evaluation/split-v1.json'),
    ),
  )
  const candidates = await service.getBatchCandidates()
  assert.ok(candidates.length >= 17, 'candidate catalog must expose at least 17 records')
  const byId = new Map(candidates.map((item) => [item.itemId, item]))

  assert.equal(byId.get(processed.id)?.processingStatus, 'processed')
  assert.equal(byId.get(processed.id)?.selectable, true, 'processed RawItem must remain selectable')
  assert.equal(byId.get(mockOnly.id)?.modelStatus, 'demo_result')
  assert.equal(byId.get(mockOnly.id)?.selectable, true, 'Mock result must not block real analysis')
  assert.equal(byId.get(manualDone.id)?.selectable, false)
  assert.match(byId.get(manualDone.id)?.disabledReason ?? '', /Manual Doubao/)
  assert.equal(byId.get(arkDone.id)?.selectable, false)
  assert.match(byId.get(arkDone.id)?.disabledReason ?? '', /Ark Doubao/)
  assert.equal(byId.get(active.id)?.selectable, false)
  assert.match(byId.get(active.id)?.disabledReason ?? '', /batch-active/)
  assert.equal(byId.get(empty.id)?.selectable, false)
  assert.equal(byId.get(empty.id)?.disabledReason, '原始文本为空')
  assert.equal(byId.get('R008')?.dataset, 'holdout')
  assert.equal(byId.get('R008')?.selectable, false)
  assert.match(byId.get('R008')?.disabledReason ?? '', /留出样本/)
  assert.equal(byId.get(marketTwo.id)?.roleHint, 'market_candidate')
  assert.equal(byId.get(marketTwo.id)?.selectionRole, 'market_candidate')
  assert.equal(selectionRoleLabels.market_candidate, '市场证据候选')
  assert.equal('evidenceRole' in (byId.get(marketTwo.id) ?? {}), false, 'role hint must not become a formal evidenceRole')
  assert.equal(byId.get(marketTwo.id)?.selectable, true, 'brand market candidate must remain selectable for Manual Doubao')
  assert.equal(getRoleHint(byId.get(backgroundOne.id)!), 'background_candidate')
  assert.equal(getRoleHint(byId.get('R001')!), 'consumer_candidate')
  assert.equal(selectionRoleLabels.background_candidate, '背景资料候选')

  let selection = new Set<string>()
  selection = toggleSelectedId(selection, processed.id)
  selection = toggleSelectedId(selection, 'R001')
  assert.deepEqual([...selection], [processed.id, 'R001'], 'switching data type must not clear selection')
  assert.equal(getCreateBatchLabel(6), '创建批次 · 6条')

  const mixedIds = buildB2PilotSelection(candidates)
  assert.deepEqual(new Set(mixedIds), new Set(['R001', 'R002', cocaCola.id, marketTwo.id, backgroundOne.id, backgroundTwo.id]))
  const mixedSelection = new Set(mixedIds)
  const roleOverrides = { [marketTwo.id]: 'market_candidate' as const }
  const pilotCounts = countPilotRoles(candidates, mixedSelection, roleOverrides)
  assert.deepEqual(pilotCounts, { consumer_candidate: 2, market_candidate: 2, background_candidate: 2, unknown: 0, excluded: 0 })
  assert.equal(isB2PilotDistribution(pilotCounts), true)
  const changedRoles = { ...roleOverrides, [marketTwo.id]: 'background_candidate' as const }
  assert.equal(getEffectiveSelectionRole(byId.get(marketTwo.id)!, changedRoles), 'background_candidate', 'drawer role edits must override the hint locally')
  assert.equal(getRoleHint(byId.get(marketTwo.id)!), 'market_candidate', 'editing selectionRole must not change roleHint')
  assert.equal(isB2PilotDistribution(countPilotRoles(candidates, mixedSelection, changedRoles)), false, 'invalid distribution must remain invalid instead of changing roles')
  const mixedBatch = await service.createBatch(mixedIds, { manualDoubao: true })
  assert.equal(mixedBatch.itemIds.length, 6)
  assert.equal(mixedBatch.provider, 'manual-json')
  const exported = await service.exportBatch(mixedBatch.id)
  assert.equal(exported.items.filter((item) => item.sourceKind === 'raw_item').length, 4)
  assert.equal(exported.items.filter((item) => item.sourceKind === 'consumer_comment').length, 2)
  assert.deepEqual(new Set(exported.items.map((item) => item.id)), new Set(mixedIds))
  const exportedMarket = exported.items.find((item) => item.id === marketTwo.id)
  assert.equal(exportedMarket?.dataSourceType, 'brand_news')
  assert.equal('evidenceRole' in (exportedMarket ?? {}), false, 'batch export must wait for model evidenceRole output')

  const afterCreate = new Map((await service.getBatchCandidates()).map((item) => [item.itemId, item]))
  assert.equal(afterCreate.get(marketTwo.id)?.selectable, false)
  assert.match(afterCreate.get(marketTwo.id)?.disabledReason ?? '', new RegExp(mixedBatch.id))

  const pageSource = await readFile(resolve('src/pages/AnalysisBatchesPage.tsx'), 'utf8')
  const workspaceCss = await readFile(resolve('src/styles/workspace.css'), 'utf8')
  assert.equal(pageSource.includes('filteredItems.slice(0, 8)'), false, 'page must render the full filtered list')
  assert.match(pageSource, /analysis-selected-drawer/)
  assert.match(pageSource, /setSelectedDrawerOpen\(true\)/)
  assert.match(pageSource, /getEffectiveSelectionRole\(item, selectionRoles\)/)
  assert.match(workspaceCss, /\.analysis-items-scroll\s*\{[^}]*max-height:\s*calc\(100vh - 260px\)[^}]*overflow/s)
  assert.match(workspaceCss, /\.analysis-table th\s*\{[^}]*position:\s*sticky[^}]*top:\s*0/s)
  assert.match(workspaceCss, /\.analysis-workspace-grid\s*\{[^}]*min-height:\s*0/s)
  assert.match(workspaceCss, /\.analysis-items-table\s*\{\s*min-width:\s*1168px/s, 'mobile table must remain horizontally reachable')

  assert.equal(DEFAULT_BATCH_EXPORT_FILE_NAME, 'B2-PILOT-01-input.json')
  const saveOrder: string[] = []
  const saveProbe: { options?: JsonSaveFilePickerOptions; written?: Blob; closed: boolean } = { closed: false }
  const saved = await saveJsonFile({
    getBlob: () => {
      saveOrder.push('load-export')
      return new Blob(['{"batchId":"test"}'], { type: 'application/json' })
    },
    showSaveFilePicker: async (options) => {
      saveOrder.push('open-picker')
      saveProbe.options = options
      return {
        name: 'B2-PILOT-01-input.json',
        createWritable: async () => ({
          write: async (data) => { saveProbe.written = data },
          close: async () => { saveProbe.closed = true },
        }),
      }
    },
    fallbackDownload: () => assert.fail('supported picker must not use browser download fallback'),
  })
  assert.deepEqual(saved, { fileName: 'B2-PILOT-01-input.json', mode: 'saved' })
  assert.equal(saveProbe.options?.suggestedName, 'B2-PILOT-01-input.json')
  assert.deepEqual(saveProbe.options?.types[0]?.accept, { 'application/json': ['.json'] })
  assert.equal(saveProbe.written?.type, 'application/json')
  assert.equal(saveProbe.closed, true)
  assert.deepEqual(saveOrder.slice(0, 2), ['open-picker', 'load-export'], 'picker must open before an asynchronous export load consumes user activation')

  let fallbackFileName: string | null = null
  const downloaded = await saveJsonFile({
    getBlob: () => new Blob(['{}'], { type: 'application/json' }),
    fallbackDownload: (_blob, fileName) => { fallbackFileName = fileName },
  })
  assert.deepEqual(downloaded, { fileName: 'B2-PILOT-01-input.json', mode: 'downloaded' })
  assert.equal(fallbackFileName, 'B2-PILOT-01-input.json')
  assert.match(pageSource, />下载输入JSON<\/button>/)
  assert.match(pageSource, />另存为…<\/button>/)
  assert.match(pageSource, /文件已保存/)
  assert.match(pageSource, /文件已下载到浏览器默认目录/)

  console.log('Analysis batch integration passed: eligibility, role hints, local selection roles, 2+2+2 counts, full scrolling table, drawer, and mixed batch.')
} finally {
  await rm(tempDir, { recursive: true, force: true })
}
