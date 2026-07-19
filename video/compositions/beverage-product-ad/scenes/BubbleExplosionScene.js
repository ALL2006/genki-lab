import { FloatingBubbles } from '../components/FloatingBubbles.js'
import { FloatingIngredients } from '../components/FloatingIngredients.js'
import { ProductBottle } from '../components/ProductBottle.js'
import { TextReveal } from '../components/TextReveal.js'
import { escapeHtml, fixed, sceneClip } from '../utils.js'

function safeDuration(value, fallback = 4) {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback
}

function splitSensoryLine(value) {
  const source = String(value || '果香 × 茶香 × 气泡感').trim()
  const phrases = source.split('×').map((part) => part.trim()).filter(Boolean)
  return phrases.length ? phrases : [source]
}

export function BubbleExplosionScene({ config, start, duration, assetExists }) {
  const sceneId = 'bubble-explosion-scene'
  const prefix = 'bubble-explosion'
  const sceneStart = Number.isFinite(Number(start)) ? Number(start) : 0
  const sceneDuration = safeDuration(duration, safeDuration(config?.timeline?.bubbleExplosion, 4))
  const timingScale = sceneDuration / 4
  const sceneEnd = sceneStart + sceneDuration
  const safeAssetExists = (asset) => Boolean(
    asset
    && typeof assetExists === 'function'
    && assetExists(asset),
  )

  const productAsset = String(config?.assets?.productFront || '').trim()
  const productExists = safeAssetExists(productAsset)
  const conceptLabel = String(config?.conceptLabel || '概念产品演示').trim()
  const flavorItems = (Array.isArray(config?.flavors) ? config.flavors : [])
    .slice(0, 2)
    .map((flavor, index) => ({
      name: String(flavor?.name || `口味 ${index + 1}`).trim(),
      asset: String(flavor?.asset || '').trim(),
      kind: index === 0 ? 'grape' : index === 1 ? 'jasmine' : 'botanical',
    }))
  const sensoryPhrases = splitSensoryLine(config?.sensoryLine)
  const refreshLine = String(config?.refreshLine || '清爽刚刚好').trim()
  const payoffMarkup = TextReveal({
    id: `${prefix}-payoff`,
    title: refreshLine,
    className: 'bubble-payoff',
    align: 'center',
  })

  const phraseMarkup = sensoryPhrases.map((phrase, index) => (
    `<span id="${prefix}-phrase-${index}" style="display:inline-flex;align-items:center;gap:18px;will-change:transform,filter,opacity">${index ? '<em style="font-style:normal;color:var(--accent);font-weight:500">×</em>' : ''}<b style="font:inherit;font-weight:760">${escapeHtml(phrase)}</b></span>`
  )).join('')

  const productLayers = [2, 1, 0].map((trailIndex) => {
    const isLead = trailIndex === 0
    return `<div id="${prefix}-product-layer-${trailIndex}" class="${isLead ? 'bubble-product-lead' : 'bubble-product-ghost'}" ${isLead ? '' : 'aria-hidden="true"'} style="position:absolute;inset:0;display:grid;place-items:center;z-index:${isLead ? 8 : 6 - trailIndex};pointer-events:none;will-change:transform,opacity">
      ${ProductBottle({
        id: `${prefix}-product-${trailIndex}`,
        asset: productAsset,
        exists: productExists,
        conceptLabel: '',
      })}
    </div>`
  }).join('')

  const content = `
    <div id="${prefix}-field" aria-hidden="true" style="position:absolute;inset:0;z-index:0;background:radial-gradient(circle at 50% 47%,#fff 0 16%,#dff7eb 48%,#9bdab9 100%);will-change:transform,opacity"></div>
    <div id="${prefix}-payoff-glow" class="scene__glow" aria-hidden="true" style="z-index:1;left:180px;top:520px;width:720px;height:720px;opacity:0;will-change:transform,opacity"></div>

    <div id="${prefix}-bubble-safe" aria-hidden="true" style="position:absolute;z-index:3;inset:0 0 310px;overflow:hidden">
      ${FloatingBubbles({ id: `${prefix}-bubbles`, count: 28, className: 'bubble-burst', large: true })}
    </div>

    <div id="${prefix}-ice" class="bubble-ice" aria-hidden="true" style="position:absolute;z-index:5;inset:0 0 310px;overflow:hidden">
      <i id="${prefix}-ice-0" class="ice-cube"></i>
      <i id="${prefix}-ice-1" class="ice-cube"></i>
      <i id="${prefix}-ice-2" class="ice-cube"></i>
      <i id="${prefix}-ice-3" class="ice-cube"></i>
      <i id="${prefix}-splash" class="water-splash"></i>
    </div>

    <div id="${prefix}-stage" class="bubble-stage">
      ${productLayers}
    </div>

    ${flavorItems.length ? FloatingIngredients({
      id: `${prefix}-ingredients`,
      items: flavorItems,
      assetExists: safeAssetExists,
      className: 'bubble-ingredients',
      decorative: false,
    }) : ''}

    <div id="${prefix}-copy" class="bubble-copy">
      <h2 id="${prefix}-sensory" aria-label="${escapeHtml(String(config?.sensoryLine || '果香 × 茶香 × 气泡感'))}" style="display:flex;justify-content:center;align-items:center;gap:18px;white-space:nowrap">${phraseMarkup}</h2>
      ${payoffMarkup}
      <i id="${prefix}-underline" aria-hidden="true" style="display:block;width:220px;height:5px;margin:18px auto 0;border-radius:999px;background:var(--accent);transform-origin:50% 50%;will-change:transform,opacity"></i>
    </div>

    <span id="${prefix}-concept" class="scene__concept-label">${escapeHtml(conceptLabel)}</span>
  `

  const markup = sceneClip({
    id: sceneId,
    start: fixed(sceneStart),
    duration: fixed(sceneDuration),
    track: 1,
    className: 'bubble-scene',
    content,
  })

  const beatTimes = sensoryPhrases.map((_, index) => (
    sceneStart + (1.02 + index * (1.42 / Math.max(1, sensoryPhrases.length - 1))) * timingScale
  ))
  const beatEases = ['power4.out', 'expo.out', 'circ.out']
  const phraseTimeline = sensoryPhrases.map((_, index) => {
    const entrance = index % 3
    const fromState = entrance === 0
      ? "{ scale: 1.42, filter: 'blur(16px)', opacity: 0 }"
      : entrance === 1
        ? "{ x: -170, filter: 'blur(8px)', opacity: 0 }"
        : "{ y: 68, rotation: 5, filter: 'blur(8px)', opacity: 0 }"
    const toState = entrance === 0
      ? `{ scale: 1, filter: 'blur(0px)', opacity: 1, duration: ${fixed(0.48 * timingScale, 3)}, ease: '${beatEases[entrance]}' }`
      : entrance === 1
        ? `{ x: 0, filter: 'blur(0px)', opacity: 1, duration: ${fixed(0.44 * timingScale, 3)}, ease: '${beatEases[entrance]}' }`
        : `{ y: 0, rotation: 0, filter: 'blur(0px)', opacity: 1, duration: ${fixed(0.52 * timingScale, 3)}, ease: '${beatEases[entrance]}' }`
    return `
    tl.fromTo(
      document.getElementById('${prefix}-phrase-${index}'),
      ${fromState},
      ${toState},
      bubbleExplosionBeats[${index}],
    )`
  }).join('\n')

  const ingredientTimeline = flavorItems.map((_, index) => {
    const fromX = index % 2 === 0 ? -230 : 230
    const rotation = index % 2 === 0 ? -7 : 7
    return `
    tl.fromTo(
      document.getElementById('${prefix}-ingredients-item-${index}'),
      { x: ${fromX}, y: 76, rotation: ${rotation}, opacity: 0, scale: 0.86 },
      { x: 0, y: 0, rotation: 0, opacity: 1, scale: 1, duration: ${fixed(0.72 * timingScale, 3)}, ease: 'power3.out' },
      ${fixed(sceneStart + (1.34 + index * 0.38) * timingScale, 3)},
    )`
  }).join('\n')

  const timeline = `
  {
    const bubbleExplosionStart = ${fixed(sceneStart, 3)}
    const bubbleExplosionScale = ${fixed(timingScale, 4)}
    const bubbleExplosionEnd = ${fixed(sceneEnd, 3)}
    const bubbleExplosionBeats = [${beatTimes.map((time) => fixed(time, 3)).join(', ')}]

    tl.fromTo(
      document.getElementById('${prefix}-field'),
      { opacity: 0.82, scale: 1.055 },
      { opacity: 1, scale: 1, duration: 1.05 * bubbleExplosionScale, ease: 'power3.out', transformOrigin: '50% 47%' },
      bubbleExplosionStart,
    )

    const bubbleExplosionLead = document.getElementById('${prefix}-product-layer-0')
    tl.fromTo(
      bubbleExplosionLead,
      { y: 690, scale: 0.91, opacity: 0 },
      { y: 0, scale: 1, opacity: 1, duration: 0.54 * bubbleExplosionScale, ease: 'power4.out' },
      bubbleExplosionStart + 0.08 * bubbleExplosionScale,
    )
    ;[1, 2].forEach((bubbleExplosionGhostIndex) => {
      const bubbleExplosionGhost = document.getElementById('${prefix}-product-layer-' + bubbleExplosionGhostIndex)
      tl.fromTo(
        bubbleExplosionGhost,
        {
          y: 690 + bubbleExplosionGhostIndex * 46,
          scale: 0.91,
          opacity: 0.42 / bubbleExplosionGhostIndex,
        },
        { y: 0, scale: 1, opacity: 0, duration: 0.54 * bubbleExplosionScale, ease: 'power4.out' },
        bubbleExplosionStart + 0.08 * bubbleExplosionScale,
      )
    })

    const bubbleExplosionIceStates = [
      { y: 390, rotation: -10, scale: 0.88, restRotation: -18, restScale: 1 },
      { y: 410, rotation: 15, scale: 0.72, restRotation: 25, restScale: 0.84 },
      { y: 320, rotation: 4, scale: 0.5, restRotation: 10, restScale: 0.62 },
      { y: 340, rotation: -6, scale: 0.55, restRotation: -12, restScale: 0.7 },
    ]
    bubbleExplosionIceStates.forEach((bubbleExplosionIceState, bubbleExplosionIceIndex) => {
      tl.fromTo(
        document.getElementById('${prefix}-ice-' + bubbleExplosionIceIndex),
        {
          y: bubbleExplosionIceState.y,
          rotation: bubbleExplosionIceState.rotation,
          scale: bubbleExplosionIceState.scale,
          opacity: 0,
        },
        {
          y: 0,
          rotation: bubbleExplosionIceState.restRotation,
          scale: bubbleExplosionIceState.restScale,
          opacity: 0.88,
          duration: (0.72 + bubbleExplosionIceIndex * 0.06) * bubbleExplosionScale,
          ease: 'power3.out',
        },
        bubbleExplosionStart + (0.04 + bubbleExplosionIceIndex * 0.07) * bubbleExplosionScale,
      )
    })
    tl.fromTo(
      document.getElementById('${prefix}-splash'),
      { y: 170, scale: 0.32, opacity: 0 },
      { y: 0, scale: 1, opacity: 0.72, duration: 0.84 * bubbleExplosionScale, ease: 'power4.out' },
      bubbleExplosionStart + 0.02 * bubbleExplosionScale,
    )

    const bubbleExplosionBubbles = Array.from(document.querySelectorAll('#${prefix}-bubbles .floating-bubble'))
    bubbleExplosionBubbles.forEach((bubbleExplosionBubble, bubbleExplosionBubbleIndex) => {
      const bubbleExplosionBubbleStart = bubbleExplosionStart
        + (((bubbleExplosionBubbleIndex * 7) % 11) * 0.045 + 0.04) * bubbleExplosionScale
      const bubbleExplosionBubbleDuration = (1.08 + ((bubbleExplosionBubbleIndex * 5) % 8) * 0.095) * bubbleExplosionScale
      const bubbleExplosionTravel = 520 + ((bubbleExplosionBubbleIndex * 83) % 720)
      const bubbleExplosionDrift = ((bubbleExplosionBubbleIndex * 37) % 101) - 50
      tl.fromTo(
        bubbleExplosionBubble,
        { x: 0, y: 0, scale: 0.46, opacity: 0 },
        {
          x: bubbleExplosionDrift,
          y: -bubbleExplosionTravel,
          scale: 1,
          opacity: 0.74,
          duration: bubbleExplosionBubbleDuration,
          ease: 'power3.out',
        },
        bubbleExplosionBubbleStart,
      )
    })

${ingredientTimeline}
${phraseTimeline}

    const bubbleExplosionPayoffAt = bubbleExplosionStart + 2.5 * bubbleExplosionScale
    tl.fromTo(
      document.getElementById('${prefix}-payoff-glow'),
      { opacity: 0, scale: 0.42 },
      { opacity: 0.92, scale: 1, duration: 0.82 * bubbleExplosionScale, ease: 'power3.out' },
      bubbleExplosionPayoffAt,
    )
    tl.fromTo(
      document.getElementById('${prefix}-payoff'),
      { scale: 1.36, filter: 'blur(18px)', opacity: 0 },
      { scale: 1, filter: 'blur(0px)', opacity: 1, duration: 0.56 * bubbleExplosionScale, ease: 'power4.out' },
      bubbleExplosionPayoffAt,
    )
    tl.fromTo(
      document.getElementById('${prefix}-underline'),
      { scaleX: 0, opacity: 0 },
      { scaleX: 1, opacity: 1, duration: 0.52 * bubbleExplosionScale, ease: 'power3.out' },
      bubbleExplosionPayoffAt + 0.28 * bubbleExplosionScale,
    )
    tl.fromTo(
      bubbleExplosionLead,
      { scale: 1 },
      { scale: 1.025, duration: Math.max(0.38, bubbleExplosionEnd - bubbleExplosionPayoffAt), ease: 'sine.inOut' },
      bubbleExplosionPayoffAt,
    )
  }
  `

  return { id: sceneId, markup, timeline }
}
