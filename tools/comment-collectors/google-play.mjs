// Google Play public review collector (via google-play-scraper, batchexecute RPC).
// Designed to run on GitHub Actions runners (international network) or any
// machine with direct access to play.google.com. No login, no proxy required.
//
// Output: ../../data/comments/google-play/google-play-reviews.jsonl
import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import gplay from 'google-play-scraper'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const OUT = process.env.OUTPUT_JSONL ?? join(ROOT, 'data/comments/google-play/google-play-reviews.jsonl')

const MAX_PAGES = Number(process.env.MAX_PAGES ?? 6)
const NUM_PER_PAGE = Number(process.env.NUM_PER_PAGE ?? 150)
const LANG = process.env.LANG ?? 'zh_CN'
const COUNTRY = process.env.COUNTRY ?? 'cn'

const APPS = [
  { pkg: 'com.luckin.client.i', name: 'luckin coffee 瑞幸咖啡(国际)' },
  { pkg: 'com.heytea.overseago', name: 'HEYTEA 喜茶(海外)' },
  { pkg: 'com.mxbc.mxos', name: 'My MIXUE 蜜雪冰城(门店)' },
  { pkg: 'com.lucky.luckyclient', name: '瑞幸咖啡(国内版)' },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function collectApp(app) {
  const seen = new Set()
  const rows = []
  let token = null
  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await gplay.reviews({
      appId: app.pkg,
      sort: gplay.sort.NEWEST,
      num: NUM_PER_PAGE,
      lang: LANG,
      country: COUNTRY,
      paginate: true,
      nextPaginationToken: token,
    })
    const reviews = result.data ?? []
    let added = 0
    for (const r of reviews) {
      const content = (r.text ?? '').trim()
      if (!content) continue
      const key = `${r.userName}|${r.date}|${content}`
      if (seen.has(key)) continue
      seen.add(key)
      rows.push({
        platform: 'google_play',
        packageName: app.pkg,
        appName: app.name,
        reviewId: r.id ?? '',
        user: r.userName ?? '',
        rating: Number(r.score ?? 0),
        title: (r.title ?? '').trim(),
        content,
        version: r.version ?? '',
        thumbsUp: r.thumbsUp ?? 0,
        date: r.date ?? '',
        collectedAt: new Date().toISOString(),
      })
      added++
    }
    token = result.nextPaginationToken ?? null
    console.log(`  page ${page}: fetched=${reviews.length} added=${added} token=${token ? 'yes' : 'no'}`)
    if (!token || reviews.length === 0) break
    await sleep(1800)
  }
  return rows
}

const all = []
for (const app of APPS) {
  try {
    all.push(...await collectApp(app))
  } catch (e) {
    console.log(`[${app.name}] ERROR: ${e.message}`)
  }
}

// dedup across apps and write
const unique = new Map()
for (const r of all) {
  const key = `${r.packageName}|${r.user}|${r.date}|${r.content}`
  if (!unique.has(key)) unique.set(key, r)
}
const finalRows = [...unique.values()]
await mkdir(dirname(OUT), { recursive: true })
await writeFile(OUT, finalRows.map((r) => JSON.stringify(r)).join('\n') + (finalRows.length ? '\n' : ''), 'utf8')
console.log(`\n共采集 ${finalRows.length} 条 Google Play 评论 -> ${OUT}`)
if (finalRows.length) console.log(`样例: ${finalRows[0].content.slice(0, 80)}`)
