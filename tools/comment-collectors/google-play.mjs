// Google Play public review collector.
// Designed to run on GitHub Actions runners (international network) or any
// machine with direct access to play.google.com. No login, no proxy required.
//
// Output: ../../data/comments/google-play/google-play-reviews.jsonl
// Raw HTML fallback: ../../tmp/gp-raw/ (uploaded as artifact for debugging)
import { writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import * as cheerio from 'cheerio'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const OUT = process.env.OUTPUT_JSONL ?? join(ROOT, 'data/comments/google-play/google-play-reviews.jsonl')
const RAW_DIR = process.env.RAW_DIR ?? join(ROOT, 'tmp/gp-raw')

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
const MAX_PAGES = Number(process.env.MAX_PAGES ?? 6)

const APPS = [
  { pkg: 'com.luckin.client.i', name: 'luckin coffee 瑞幸咖啡(国际)' },
  { pkg: 'com.heytea.overseago', name: 'HEYTEA 喜茶(海外)' },
  { pkg: 'com.mxbc.mxos', name: 'My MIXUE 蜜雪冰城(门店)' },
  { pkg: 'com.lucky.luckyclient', name: '瑞幸咖啡(国内版)' },
]

const cookieJar = new Map()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function captureCookies(headers) {
  const raw = headers.getSetCookie?.() ?? []
  for (const line of raw) {
    const pair = line.split(';')[0]
    const idx = pair.indexOf('=')
    if (idx > 0) cookieJar.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim())
  }
}
const cookieHeader = () => [...cookieJar].map(([k, v]) => `${k}=${v}`).join('; ')

async function request(url, { referer, post } = {}) {
  const res = await fetch(url, {
    method: post ? 'POST' : 'GET',
    redirect: 'follow',
    headers: {
      'User-Agent': UA,
      'Accept-Language': 'zh-CN,zh;q=0.9',
      Accept: '*/*',
      ...(referer ? { Referer: referer } : {}),
      ...(cookieJar.size ? { Cookie: cookieHeader() } : {}),
      ...(post ? { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' } : {}),
    },
    ...(post ? { body: post } : {}),
    signal: AbortSignal.timeout(30000),
  })
  captureCookies(res.headers)
  return res
}

function parseReviews(html) {
  const $ = cheerio.load(html)
  const reviews = []
  // Review text spans are the anchor; walk up to the nearest card container.
  $('span[jsname="fbQN7e"]').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim()
    if (!text) return
    const card = $(el).closest('div[jscontroller], .d15Mdf, .g1UuNb, .RZNBme').first()
      .add($(el).closest('div').first()) // fallback: direct parent div
      .first()
    const ratingLabel = card.find('div[role="img"][aria-label]').first().attr('aria-label') ?? ''
    const ratingMatch = ratingLabel.match(/([0-9.]+)/)
    reviews.push({
      user: card.find('.X5PpBb').first().text().trim(),
      title: card.find('span[jsname="bVqjv"]').first().text().trim(),
      rating: ratingMatch ? Number(ratingMatch[1]) : 0,
      date: card.find('.bp9Aid').first().text().trim(),
      content: text,
    })
  })
  return reviews
}

async function collectApp(app) {
  const detailsUrl = `https://play.google.com/store/apps/details?id=${app.pkg}&hl=zh_CN`
  const details = await request(detailsUrl)
  const detailsHtml = await details.text()
  console.log(`[${app.name}] details page: ${details.status} ${detailsHtml.length} bytes`)
  await sleep(1500)

  const seen = new Set()
  const rows = []
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await request('https://play.google.com/store/getreviews', {
      referer: detailsUrl,
      post: `id=${app.pkg}&reviewSortOrder=NEWEST&reviewType=0&pageNum=${page}&hl=zh_CN&xhr=1`,
    })
    const html = await res.text()
    await mkdir(join(RAW_DIR, app.pkg), { recursive: true })
    await writeFile(join(RAW_DIR, app.pkg, `page-${page}.html`), html, 'utf8')

    const reviews = parseReviews(html)
    let added = 0
    for (const r of reviews) {
      const key = `${r.user}|${r.date}|${r.content}`
      if (seen.has(key)) continue
      seen.add(key)
      rows.push({ platform: 'google_play', packageName: app.pkg, appName: app.name, ...r, collectedAt: new Date().toISOString() })
      added++
    }
    console.log(`  page ${page}: parsed=${reviews.length} added=${added}`)
    if (reviews.length === 0) {
      // likely consent/captcha interstitial; keep raw HTML for debugging
      if (/consent|unusual traffic|captcha/i.test(html)) {
        console.log('  !! got consent/captcha/risk page, stopping for this app')
      }
      break
    }
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
