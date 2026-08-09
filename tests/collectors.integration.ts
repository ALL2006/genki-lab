import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import type { DataSource } from '../shared/types.js'
import { CollectorRouter } from '../server/collectors/CollectorRouter.js'
import { ConfigurableListCollector } from '../server/collectors/ConfigurableListCollector.js'
import { GenericArticleCollector } from '../server/collectors/GenericArticleCollector.js'
import type { HttpFetcher, HttpResponseData } from '../server/collectors/http/LiveHttpClient.js'
import { LiveHttpClient } from '../server/collectors/http/LiveHttpClient.js'
import { MockCollector } from '../server/collectors/MockCollector.js'
import { RSSCollector } from '../server/collectors/RSSCollector.js'
import { normalizePublishedAt } from '../server/collectors/content.js'
import { MockAIProvider } from '../server/providers/MockAIProvider.js'
import { MockRepository } from '../server/repositories/MockRepository.js'
import { defaultDataSources } from '../server/repositories/seed.js'
import { JobService } from '../server/services/JobService.js'
import { createContentHash, normalizeUrl } from '../server/utils/content.js'

const fixturePath = (name: string) => resolve(process.cwd(), 'tests/fixtures', name)
const fixture = (name: string) => readFile(fixturePath(name), 'utf8')

class FixtureHttpFetcher implements HttpFetcher {
  constructor(private readonly responses: Map<string, string>) {}
  async get(url: string): Promise<HttpResponseData> {
    const body = this.responses.get(url)
    if (body === undefined) throw new Error(`fixture unavailable: ${url}`)
    return { url, status: 200, contentType: url.endsWith('.xml') ? 'application/xml' : 'text/html', body, contentLength: body.length, attempts: 1 }
  }
}

function source(patch: Partial<DataSource>): DataSource {
  return {
    id: 'fixture-source', name: 'Fixture source', type: 'rss', entryUrl: 'https://fixture.local/feed.xml',
    crawlMethod: 'RSSCollector', keywords: [], schedule: 'manual', enabled: true,
    collectionMode: 'live', collectorType: 'rss', collectorConfig: { maxItems: 10 },
    lastSuccessAt: null, failureCount: 0, lastError: null, lastRunNewCount: 0, notes: 'local fixture',
    ...patch,
  }
}

async function testParsers() {
  const responses = new Map<string, string>([
    ['https://fixture.local/feed.xml', await fixture('feed-rss.xml')],
    ['https://fixture.local/atom.xml', await fixture('feed-atom.xml')],
    ['https://fixture.local/article', await fixture('article.html')],
    ['https://fixture.local/news', await fixture('list.html')],
    ['https://fixture.local/news/grape?utm_campaign=list', await fixture('list-article-grape.html')],
    ['https://fixture.local/news/jasmine', await fixture('list-article-jasmine.html')],
    ['https://www.pepsico.com/newsroom/press-releases/2025/pepsico-launches-first-ever-prebiotic-cola-in-traditional-cola-category', '<html><head><meta property="article:published_time" content="2025-07-21"></head><body><main><article><h1>PepsiCo launches first ever Prebiotic Cola in traditional cola category</h1><p>PepsiCo officially introduced Pepsi Prebiotic Cola with five grams of sugar, thirty calories, no artificial sweeteners and prebiotic fiber as a new product launch.</p></article></main></body></html>'],
  ])
  const http = new FixtureHttpFetcher(responses)
  const rss = await new RSSCollector(http).collect(source({}))
  assert.equal(rss.length, 2)
  assert.equal(rss[0].originalUrl, 'https://fixture.local/articles/sparkling-tea?utm_source=test')
  assert.equal(rss[0].isDemo, false)

  const atom = await new RSSCollector(http).collect(source({ entryUrl: 'https://fixture.local/atom.xml' }))
  assert.equal(atom.length, 1)
  assert.equal(atom[0].originalUrl, 'https://fixture.local/research/tea-fruit')

  const article = await new GenericArticleCollector(http).collect(source({
    entryUrl: 'https://fixture.local/article', collectorType: 'generic_article', collectorConfig: null,
  }))
  assert.equal(article[0].qualityStatus, 'good')
  assert.equal(article[0].publishedAt, '2026-08-02T01:30:00.000Z')

  const listSource = source({
    id: 'fixture-list', entryUrl: 'https://fixture.local/news', type: 'brand_news', collectorType: 'configurable_list',
    collectorConfig: { itemSelector: '.news-card', linkSelector: 'a', titleSelector: 'h2', dateSelector: 'time', contentSelector: '.story-body' },
  })
  const list = await new ConfigurableListCollector(http).collect(listSource)
  assert.equal(list.length, 2)
  assert.equal(list[0].originalUrl, 'https://fixture.local/news/grape?utm_campaign=list')
  assert.equal(list[1].qualityStatus, 'good')

  const pepsicoSource = defaultDataSources.find((item) => item.id === 'source-brand-pepsico-prebiotic-cola')
  assert.ok(pepsicoSource)
  const router = new CollectorRouter({
    mock: new MockCollector(), rss: new RSSCollector(http), generic_article: new GenericArticleCollector(http), configurable_list: new ConfigurableListCollector(http),
  })
  const pepsico = await router.collect(pepsicoSource)
  assert.equal(pepsico[0].title, 'PepsiCo launches first ever Prebiotic Cola in traditional cola category')
  assert.equal(pepsico[0].isDemo, false)
  assert.equal(pepsicoSource.roleHint, 'market_candidate')
  assert.equal(pepsicoSource.selectionRole, 'market_candidate')
  assert.equal('evidenceRole' in pepsicoSource, false)
}

async function testNormalizationAndJobs() {
  assert.equal(normalizePublishedAt('02/18/2026'), '2026-02-18T00:00:00.000Z')
  assert.equal(normalizePublishedAt('2026-02-18'), '2026-02-18T00:00:00.000Z')
  const pepsicoSource = defaultDataSources.find((item) => item.id === 'source-brand-pepsico-prebiotic-cola')
  const fallbackSource = defaultDataSources.find((item) => item.id === 'source-brand-kdp-innovation-2026')
  assert.equal(pepsicoSource?.collectorType, 'generic_article')
  assert.equal(pepsicoSource?.collectionMode, 'live')
  assert.equal(pepsicoSource?.roleHint, 'market_candidate')
  assert.equal(pepsicoSource?.selectionRole, 'market_candidate')
  assert.equal(fallbackSource?.collectorConfig?.dateSelector, '.post-single__date')
  assert.equal(fallbackSource?.roleHint, 'market_candidate')
  assert.equal(
    normalizeUrl('HTTPS://Fixture.Local/news/grape/?utm_source=x&b=2&a=1#top'),
    'https://fixture.local/news/grape?a=1&b=2',
  )
  assert.equal(createContentHash(' 相同  正文\n内容 '), createContentHash('相同 正文 内容'))

  const listHtml = await fixture('list.html')
  const responses = new Map<string, string>([
    ['https://fixture.local/news', listHtml],
    ['https://fixture.local/news/grape?utm_campaign=list', await fixture('list-article-grape.html')],
    ['https://fixture.local/news/jasmine', await fixture('list-article-jasmine.html')],
  ])
  const http = new FixtureHttpFetcher(responses)
  const router = new CollectorRouter({
    mock: new MockCollector(), rss: new RSSCollector(http), generic_article: new GenericArticleCollector(http), configurable_list: new ConfigurableListCollector(http),
  })
  const testTempRoot = resolve('tmp', 'test-runs')
  await mkdir(testTempRoot, { recursive: true })
  const directory = await mkdtemp(join(testTempRoot, 'genki-collectors-'))
  try {
    const repository = new MockRepository(join(directory, 'db.json'))
    const good = source({
      id: 'fixture-good', entryUrl: 'https://fixture.local/news', type: 'brand_news', collectorType: 'configurable_list',
      collectorConfig: { itemSelector: '.news-card', linkSelector: 'a', titleSelector: 'h2', contentSelector: '.story-body' },
    })
    const bad = source({ id: 'fixture-bad', entryUrl: 'https://fixture.local/missing.xml' })
    await repository.saveDataSource(good)
    await repository.saveDataSource(bad)
    const jobs = new JobService(repository, router, new MockAIProvider(), true)
    const first = await jobs.collect({ mode: 'live', sourceIds: [good.id, bad.id] })
    assert.equal(first.run.status, 'success')
    assert.equal(first.run.newCount, 2)
    assert.equal(first.run.failedCount, 1)
    assert.equal(first.run.sourceResults.find((item) => item.sourceId === bad.id)?.status, 'failed')
    assert.ok(first.result.inserted.every((item) => item.isDemo === false))
    assert.ok(first.run.durationMs >= 1)

    const second = await jobs.collect({ mode: 'live', sourceIds: [good.id] })
    assert.equal(second.run.newCount, 0)
    assert.equal(second.run.duplicateCount, 2)
    assert.equal((await repository.getRawItems()).length, 2)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

async function testHttpSafety() {
  let retryCount = 0
  const server = createServer((request, response) => {
    if (request.url === '/retry') {
      retryCount += 1
      if (retryCount === 1) { response.statusCode = 503; response.end('retry'); return }
      response.end('ok after retry'); return
    }
    if (request.url === '/slow') { setTimeout(() => response.end('late'), 120); return }
    response.end('')
  })
  await new Promise<void>((resolvePromise) => server.listen(0, '127.0.0.1', resolvePromise))
  const address = server.address()
  assert.ok(address && typeof address === 'object')
  const base = `http://127.0.0.1:${address.port}`
  try {
    const retryClient = new LiveHttpClient({ userAgent: 'GENKI-LAB-Test/1.0', timeoutMs: 500, maxRetries: 1, requestIntervalMs: 0 })
    assert.equal((await retryClient.get(`${base}/retry`)).attempts, 2)
    assert.equal(retryCount, 2)
    await assert.rejects(() => retryClient.get(`${base}/empty`), /响应正文为空/)
    const timeoutClient = new LiveHttpClient({ userAgent: 'GENKI-LAB-Test/1.0', timeoutMs: 30, maxRetries: 1, requestIntervalMs: 0 })
    await assert.rejects(() => timeoutClient.get(`${base}/slow`), /超时/)
  } finally {
    await new Promise<void>((resolvePromise, reject) => server.close((error) => error ? reject(error) : resolvePromise()))
  }
}

await testParsers()
await testNormalizationAndJobs()
await testHttpSafety()
console.log('collector integration passed')
