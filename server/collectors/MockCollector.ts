import type { DataSource } from '../../shared/types.js'
import type { CollectedItem, Collector } from './Collector.js'

const samples: Omit<CollectedItem, 'publishedAt'>[] = [
  {
    title: 'DEMO｜清爽与细密气泡成为夏季饮用体验信号',
    rawText: '模拟资料显示：用户更常把“清爽、气泡感强、冰镇后更好喝”放在同一段体验描述中，下午与通勤是适合进一步验证的场景。',
    summary: '清爽、气泡与冰镇体验形成组合信号。',
    originalUrl: 'https://demo.genki-lab.local/articles/sparkling-refresh?utm_source=scheduler',
    rawPayload: { generator: 'MockCollector', category: 'scene' },
    collectorType: 'mock',
    httpStatus: null,
    contentLength: 58,
    qualityStatus: 'good',
    failureReason: null,
    isDemo: true,
  },
  {
    title: 'DEMO｜葡萄果味关注上升但自然感决定复购',
    rawText: '模拟资料显示：葡萄类风味有尝鲜基础，消费者同时担心香精感与人工甜味。更自然的青提酸甜平衡值得进入概念测试。',
    summary: '葡萄风味机会需要以真实自然感为前提。',
    originalUrl: 'https://demo.genki-lab.local/articles/grape-naturalness#overview',
    rawPayload: { generator: 'MockCollector', category: 'flavor' },
    collectorType: 'mock',
    httpStatus: null,
    contentLength: 55,
    qualityStatus: 'good',
    failureReason: null,
    isDemo: true,
  },
  {
    title: 'DEMO｜零糖表达从功能口号转向低负担体验',
    rawText: '模拟资料显示：消费者不只关注零糖标签，也会评价代糖后味、配料可理解性与是否牺牲口感。传播应先讲好喝清爽，再解释低负担。',
    summary: '零糖需要与好喝、自然和透明配料共同表达。',
    originalUrl: 'https://demo.genki-lab.local/articles/zero-sugar-burden?utm_campaign=demo',
    rawPayload: { generator: 'MockCollector', category: 'health' },
    collectorType: 'mock',
    httpStatus: null,
    contentLength: 62,
    qualityStatus: 'good',
    failureReason: null,
    isDemo: true,
  },
  {
    title: 'DEMO｜轻花香与果味复合适合下午放松场景',
    rawText: '模拟资料显示：轻盈花香可延长果味回味，但花香过重可能带来香水感。青提与茉莉的组合需要测试两档花香强度。',
    summary: '花果复合风味具有差异化，同时存在花香过重风险。',
    originalUrl: 'https://demo.genki-lab.local/articles/floral-fruit-balance/',
    rawPayload: { generator: 'MockCollector', category: 'flavor' },
    collectorType: 'mock',
    httpStatus: null,
    contentLength: 58,
    qualityStatus: 'good',
    failureReason: null,
    isDemo: true,
  },
  {
    title: 'DEMO｜竞品新品强化场景化包装与小步验证',
    rawText: '模拟资料显示：竞品新品更常用通勤、学习和轻社交场景解释产品价值，并通过小范围概念测试决定包装与文案迭代。',
    summary: '场景化表达和低成本验证成为新品方法信号。',
    originalUrl: 'https://demo.genki-lab.local/articles/competitor-scene-testing?ref=home',
    rawPayload: { generator: 'MockCollector', category: 'competitor' },
    collectorType: 'mock',
    httpStatus: null,
    contentLength: 55,
    qualityStatus: 'good',
    failureReason: null,
    isDemo: true,
  },
]

export class MockCollector implements Collector {
  async collect(_source: DataSource): Promise<CollectedItem[]> {
    const publishedAt = '2026-08-01T00:00:00.000Z'
    return samples.map((sample) => ({ ...sample, publishedAt }))
  }
}
