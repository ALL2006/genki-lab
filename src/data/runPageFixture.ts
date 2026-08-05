import type { DashboardSummary, JobRun, RawItem } from '../../shared/types'

const fixtureRuns: JobRun[] = [
  {
    id: 'fixture-run-collect-live', jobType: 'collect', sourceId: 'source-brand-coca-media',
    startedAt: '2026-08-05T07:59:34.000Z', finishedAt: '2026-08-05T07:59:36.000Z', status: 'success',
    fetchedCount: 12, newCount: 11, duplicateCount: 1, processedCount: 12, failedCount: 0,
    errorMessage: null, durationMs: 1810, collectionMode: 'live', sourceResults: [], isDemo: false,
  },
  {
    id: 'fixture-run-analyze', jobType: 'analyze', sourceId: null,
    startedAt: '2026-08-05T07:54:12.000Z', finishedAt: '2026-08-05T07:54:12.460Z', status: 'success',
    fetchedCount: 0, newCount: 8, duplicateCount: 0, processedCount: 8, failedCount: 0,
    errorMessage: null, durationMs: 460, collectionMode: null, sourceResults: [], isDemo: true,
  },
  {
    id: 'fixture-run-collect-demo', jobType: 'collect', sourceId: 'source-demo-industry',
    startedAt: '2026-08-05T07:48:03.000Z', finishedAt: '2026-08-05T07:48:03.041Z', status: 'success',
    fetchedCount: 5, newCount: 0, duplicateCount: 5, processedCount: 5, failedCount: 0,
    errorMessage: null, durationMs: 41, collectionMode: 'demo', sourceResults: [], isDemo: true,
  },
  {
    id: 'fixture-run-weekly', jobType: 'weekly-report', sourceId: null,
    startedAt: '2026-08-05T07:42:18.000Z', finishedAt: '2026-08-05T07:42:18.019Z', status: 'success',
    fetchedCount: 0, newCount: 0, duplicateCount: 0, processedCount: 17, failedCount: 0,
    errorMessage: null, durationMs: 19, collectionMode: null, sourceResults: [], isDemo: true,
  },
  {
    id: 'fixture-run-collect-partial', jobType: 'collect', sourceId: 'source-rss-fsa-research',
    startedAt: '2026-08-05T07:31:06.000Z', finishedAt: '2026-08-05T07:31:09.670Z', status: 'success',
    fetchedCount: 1, newCount: 1, duplicateCount: 0, processedCount: 1, failedCount: 2,
    errorMessage: '部分来源未返回可用内容', durationMs: 3670, collectionMode: 'live', sourceResults: [], isDemo: false,
  },
]

const fixtureRawItems: RawItem[] = [
  {
    id: 'fixture-raw-001', sourceId: 'source-brand-coca-media', title: 'Coca-Cola 250th anniversary product and packaging update',
    rawText: 'Public company newsroom material.', summary: '品牌公开资料，包含产品与包装信息。',
    publishedAt: '2026-08-05T07:20:00.000Z', fetchedAt: '2026-08-05T07:59:34.000Z', originalUrl: 'https://www.coca-colacompany.com/media-center',
    normalizedUrl: 'https://www.coca-colacompany.com/media-center', contentHash: 'fixture-hash-001', rawPayload: {}, status: 'processed',
    collectorType: 'configurable_list', httpStatus: 200, contentLength: 2640, qualityStatus: 'good', failureReason: null, isDemo: false,
  },
  {
    id: 'fixture-raw-002', sourceId: 'source-rss-fsa-research', title: 'Small and Micro Food Business Operator tracking survey',
    rawText: 'Public research material.', summary: '公开研究资料，作为市场背景证据。',
    publishedAt: '2026-08-05T06:50:00.000Z', fetchedAt: '2026-08-05T07:59:33.000Z', originalUrl: 'https://www.food.gov.uk/research',
    normalizedUrl: 'https://www.food.gov.uk/research', contentHash: 'fixture-hash-002', rawPayload: {}, status: 'processed',
    collectorType: 'rss', httpStatus: 200, contentLength: 1940, qualityStatus: 'good', failureReason: null, isDemo: false,
  },
  {
    id: 'fixture-raw-003', sourceId: 'source-rss-fsa-research', title: 'Measuring the unseen: the multiple data challenge',
    rawText: 'Public research article.', summary: '公开研究文章，等待模型分析。',
    publishedAt: '2026-08-05T06:30:00.000Z', fetchedAt: '2026-08-05T07:59:33.000Z', originalUrl: 'https://www.food.gov.uk/research',
    normalizedUrl: 'https://www.food.gov.uk/research#data-challenge', contentHash: 'fixture-hash-003', rawPayload: {}, status: 'pending',
    collectorType: 'rss', httpStatus: 200, contentLength: 1720, qualityStatus: 'good', failureReason: null, isDemo: false,
  },
  {
    id: 'fixture-raw-004', sourceId: 'source-demo-industry', title: '清爽气泡与冰镇场景模拟资料',
    rawText: '模拟资料，仅用于演示数据链路。', summary: '模拟饮料行业资料。', publishedAt: null,
    fetchedAt: '2026-08-05T07:48:03.000Z', originalUrl: 'https://example.com/demo/refreshing-sparkling', normalizedUrl: 'https://example.com/demo/refreshing-sparkling',
    contentHash: 'fixture-hash-004', rawPayload: {}, status: 'processed', collectorType: 'mock', httpStatus: 200,
    contentLength: 820, qualityStatus: 'good', failureReason: null, isDemo: true,
  },
]

export const runPageFixture: { summary: DashboardSummary; rawItems: RawItem[] } = {
  summary: {
    weeklyFetched: 18, weeklyNew: 12, weeklyDuplicate: 6, weeklyFailed: 2,
    liveItemCount: 12, demoItemCount: 5, successRate: 100, pendingTrendCount: 6,
    productCount: 3, pendingLiveAnalysisCount: 4, analyzedLiveCount: 8, aiCallSuccessRate: 96,
    schemaSuccessRate: 100, quoteValidationRate: 92, humanModificationRate: 25,
    aiDirectApprovalCount: 5, aiModifiedApprovalCount: 2, aiRejectedCount: 1, aiEditedFieldCount: 4,
    averageAnalysisDurationMs: 460, recentAIError: null, latestRuns: fixtureRuns,
    failedRuns: [fixtureRuns[4]], isDemo: true,
  },
  rawItems: fixtureRawItems,
}
