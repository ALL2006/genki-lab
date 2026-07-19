import { Disclaimer } from '../components/Disclaimer.js'
import { FloatingBubbles } from '../components/FloatingBubbles.js'
import { FloatingIngredients } from '../components/FloatingIngredients.js'
import { ProductBottle } from '../components/ProductBottle.js'
import { escapeHtml, fixed, sceneClip, splitSlogan } from '../utils.js'

function safeDuration(value, fallback = 5) {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback
}

export function ProductEndCard({ config, start, duration, assetExists }) {
  const id = 'product-end-card'
  const sceneStart = Number.isFinite(Number(start)) ? Number(start) : 0
  const sceneDuration = safeDuration(duration)
  const timingScale = sceneDuration / 5
  const motionStop = sceneStart + Math.max(0.5, sceneDuration - 2)
  const safeAssetExists = (asset) => Boolean(
    asset
    && typeof assetExists === 'function'
    && assetExists(asset),
  )

  const productAsset = String(config?.assets?.productFront || config?.assets?.productHero || '').trim()
  const logoAsset = String(config?.assets?.logo || '').trim()
  const hasLogo = safeAssetExists(logoAsset)
  const flavors = Array.isArray(config?.flavors) ? config.flavors.slice(0, 2) : []
  const ingredients = flavors.map((flavor, index) => ({
    name: String(flavor?.name || `口味素材 ${index + 1}`),
    asset: String(flavor?.asset || ''),
    kind: index === 0 ? 'grape' : 'jasmine',
  }))
  const sloganLines = splitSlogan(String(config?.slogan || ''))

  const logo = hasLogo
    ? `<img id="end-card-logo" src="${escapeHtml(logoAsset)}" alt="${escapeHtml(config?.brandName || '品牌标识')}" style="display:block;width:220px;height:72px;margin:0 auto 24px;object-fit:contain" />`
    : ''

  const markup = sceneClip({
    id,
    start: fixed(sceneStart),
    duration: fixed(sceneDuration),
    track: 1,
    className: 'end-card-scene',
    content: `
      <div id="end-card-color-field" aria-hidden="true" data-layout-allow-overflow style="position:absolute;inset:0;z-index:0;background:radial-gradient(circle at 50% 40%,#ffffff 0 12%,#e5f8ee 42%,#a8dfc1 100%)"></div>
      <div id="end-card-halo" class="end-card-halo" aria-hidden="true"></div>

      <div id="end-card-bubble-safe" aria-hidden="true" style="position:absolute;z-index:3;inset:0 0 320px;overflow:hidden">
        ${FloatingBubbles({ id: 'end-card-bubbles', count: 16, className: 'end-card-bubble-field', large: true })}
      </div>

      ${FloatingIngredients({
        id: 'end-card-ingredients',
        items: ingredients,
        assetExists: safeAssetExists,
        className: 'end-card-ingredients',
        decorative: false,
      })}

      <div id="end-card-ice" aria-hidden="true" style="position:absolute;inset:0;z-index:7;pointer-events:none">
        <i id="end-card-ice-0" class="ice-cube" style="left:178px;top:1372px"></i>
        <i id="end-card-ice-1" class="ice-cube" style="left:348px;top:1420px;width:92px;height:92px"></i>
        <i id="end-card-ice-2" class="ice-cube" style="left:644px;top:1410px;width:96px;height:96px"></i>
        <i id="end-card-ice-3" class="ice-cube" style="left:792px;top:1360px"></i>
      </div>

      ${ProductBottle({
        id: 'end-card-product',
        asset: productAsset,
        exists: safeAssetExists(productAsset),
        className: 'end-card-product',
      })}

      <div id="end-card-copy" class="end-card-copy">
        ${logo}
        <h1 id="end-card-title">${escapeHtml(config?.shortName || config?.productName || '')}</h1>
      </div>

      <p id="end-card-slogan" class="end-card-slogan" aria-label="${escapeHtml(config?.slogan || '')}">
        ${sloganLines.map((line, index) => `<span id="end-card-slogan-line-${index}" style="display:block">${escapeHtml(line)}</span>`).join('')}
      </p>
      <span id="end-card-concept" class="end-card-concept" style="top:1445px">${escapeHtml(config?.conceptLabel || '概念产品演示')}</span>
      ${Disclaimer({ id: 'end-card-disclaimer', text: String(config?.disclaimer || '') })}
    `,
  })

  const logoTimeline = hasLogo
    ? `
    tl.fromTo(
      document.getElementById('end-card-logo'),
      { opacity: 0, y: 18, filter: 'blur(7px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.48 * endCardScale, ease: 'power3.out' },
      endCardStart + 1.3 * endCardScale,
    )`
    : ''

  const timeline = `
  {
    const endCardStart = ${fixed(sceneStart, 3)}
    const endCardScale = ${fixed(timingScale, 4)}
    const endCardMotionStop = ${fixed(motionStop, 3)}
    const endCardProduct = document.getElementById('end-card-product')
    const endCardDisclaimer = document.getElementById('end-card-disclaimer')

    tl.fromTo(
      document.getElementById('end-card-color-field'),
      { opacity: 0.7, scale: 1.035 },
      { opacity: 1, scale: 1, duration: 0.72 * endCardScale, ease: 'sine.inOut', transformOrigin: '50% 50%' },
      endCardStart,
    )
    tl.fromTo(
      document.getElementById('end-card-halo'),
      { opacity: 0.18, scale: 0.72 },
      { opacity: 1, scale: 1, duration: 1.08 * endCardScale, ease: 'power3.out', transformOrigin: '50% 50%' },
      endCardStart,
    )
    tl.fromTo(
      endCardProduct,
      { opacity: 0.24, y: 136, scale: 0.92, filter: 'blur(12px)' },
      { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 1.14 * endCardScale, ease: 'power3.out' },
      endCardStart,
    )

    const endCardIngredients = Array.from(document.querySelectorAll('#end-card-ingredients .floating-ingredient'))
    const endCardIngredientOrigins = [
      { x: 390, y: -160 },
      { x: -410, y: -160 },
    ]
    endCardIngredients.forEach((endCardIngredient, endCardIngredientIndex) => {
      const endCardOrigin = endCardIngredientOrigins[endCardIngredientIndex % endCardIngredientOrigins.length]
      tl.fromTo(
        endCardIngredient,
        { opacity: 0, x: endCardOrigin.x, y: endCardOrigin.y, scale: 0.48, rotation: endCardIngredientIndex % 2 === 0 ? -7 : 7 },
        { opacity: 1, x: 0, y: -320, scale: 1, rotation: 0, duration: 1.16 * endCardScale, ease: 'power3.out' },
        endCardStart + (0.12 + endCardIngredientIndex * 0.07) * endCardScale,
      )
    })

    const endCardIceOrigins = [
      { x: 304, y: 2, rotation: -16 },
      { x: 146, y: -52, rotation: 12 },
      { x: -152, y: -42, rotation: -10 },
      { x: -310, y: 14, rotation: 17 },
    ]
    endCardIceOrigins.forEach((endCardOrigin, endCardIceIndex) => {
      tl.fromTo(
        document.getElementById('end-card-ice-' + endCardIceIndex),
        { opacity: 0, x: endCardOrigin.x, y: endCardOrigin.y, scale: 0.46, rotation: 0 },
        { opacity: 0.92, x: 0, y: 0, scale: 1, rotation: endCardOrigin.rotation, duration: 1.12 * endCardScale, ease: 'power3.out' },
        endCardStart + (0.18 + endCardIceIndex * 0.055) * endCardScale,
      )
    })

    const endCardBubbles = Array.from(document.querySelectorAll('#end-card-bubbles .floating-bubble'))
    endCardBubbles.forEach((endCardBubble, endCardBubbleIndex) => {
      const endCardBubbleStart = endCardStart + (0.22 + ((endCardBubbleIndex * 5) % 8) * 0.045) * endCardScale
      const endCardBubbleDuration = Math.max(0.24, endCardMotionStop - endCardBubbleStart)
      const endCardBubbleTravel = 340 + ((endCardBubbleIndex * 83) % 640)
      const endCardBubbleDrift = -34 + ((endCardBubbleIndex * 37) % 69)
      tl.fromTo(
        endCardBubble,
        { opacity: 0, x: 0, y: 0, scale: 0.62 },
        { opacity: 0.54, x: endCardBubbleDrift, y: -endCardBubbleTravel, scale: 0.86 + (endCardBubbleIndex % 3) * 0.08, duration: endCardBubbleDuration, ease: 'sine.out' },
        endCardBubbleStart,
      )
    })

${logoTimeline}
    tl.fromTo(
      document.getElementById('end-card-title'),
      { opacity: 0, y: 30, filter: 'blur(9px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.58 * endCardScale, ease: 'power3.out' },
      endCardStart + 1.4 * endCardScale,
    )
    tl.fromTo(
      document.getElementById('end-card-slogan'),
      { opacity: 0, y: 24, filter: 'blur(8px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.62 * endCardScale, ease: 'power3.out' },
      endCardStart + 2.02 * endCardScale,
    )
    tl.fromTo(
      document.getElementById('end-card-concept'),
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.4 * endCardScale, ease: 'power3.out' },
      endCardStart + 2.52 * endCardScale,
    )

    tl.set(endCardDisclaimer, { opacity: 0, y: -80 }, endCardStart)
    tl.fromTo(
      endCardDisclaimer,
      { opacity: 0, y: -68 },
      { opacity: 1, y: -80, duration: 0.3 * endCardScale, ease: 'power2.out' },
      endCardMotionStop - 0.3 * endCardScale,
    )
  }
  `

  return { id, markup, timeline }
}
