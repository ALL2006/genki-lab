import { AssetFallback } from '../components/AssetFallback.js'
import { FloatingBubbles } from '../components/FloatingBubbles.js'
import { FloatingIngredients } from '../components/FloatingIngredients.js'
import { ProductBottle } from '../components/ProductBottle.js'
import { TextReveal } from '../components/TextReveal.js'
import { escapeHtml, fixed, sceneClip } from '../utils.js'

function colorToken(value, fallback) {
  const candidate = String(value ?? '').trim()
  return /^#[0-9a-f]{3,8}$/i.test(candidate) ? candidate : fallback
}

function safeIndex(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0
}

function safeDuration(value, fallback = 4) {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback
}

export function FlavorScene({ config, flavor, flavorIndex, start, duration, assetExists }) {
  const index = safeIndex(flavorIndex)
  const ordinal = index + 1
  const prefix = `flavor-${index}`
  const sceneId = `${prefix}-scene`
  const reverse = index % 2 === 1
  const sceneStart = Number.isFinite(Number(start)) ? Number(start) : 0
  const sceneDuration = safeDuration(duration, safeDuration(flavor?.duration, 4))
  const timingScale = sceneDuration / 4
  const titleAt = sceneStart + 1.02 * timingScale
  const streakAt = sceneStart + 1.25 * timingScale
  const descriptionAt = sceneStart + 2.3 * timingScale
  const sceneEnd = sceneStart + sceneDuration

  const flavorName = String(flavor?.name ?? '').trim()
  const flavorDescription = String(flavor?.description ?? '').trim()
  const flavorAsset = String(flavor?.asset ?? '').trim()
  const productAsset = String(config?.assets?.productFront ?? '').trim()
  const conceptLabel = String(config?.conceptLabel || '概念产品演示').trim()
  const safeAssetExists = (asset) => Boolean(
    asset
    && typeof assetExists === 'function'
    && assetExists(asset),
  )
  const flavorAssetExists = safeAssetExists(flavorAsset)
  const productAssetExists = safeAssetExists(productAsset)

  const background = colorToken(config?.backgroundColor, '#F6FFF9')
  const secondary = colorToken(config?.secondaryColor, '#BFE8D0')
  const primary = colorToken(config?.primaryColor, '#2E8B62')

  const heroVisual = flavorAssetExists
    ? `<img id="${prefix}-hero-media" src="${escapeHtml(flavorAsset)}" alt="${escapeHtml(flavorName)}" draggable="false" />`
    : AssetFallback({
        id: `${prefix}-hero-fallback`,
        label: flavorName || '口味素材',
        kind: '原料素材',
        className: 'flavor-hero-fallback',
      })

  // Path-B motion-blur trail: identical deterministic layers collapse into the lead.
  // When the configured asset is missing, keep one readable shared fallback instead.
  const streakLayerCount = flavorAssetExists ? 3 : 1
  const streakMarkup = Array.from({ length: streakLayerCount }, (_, trailIndex) => FloatingIngredients({
    id: `${prefix}-streak-${trailIndex}`,
    items: [{
      name: flavorName || '口味素材',
      asset: flavorAsset,
      kind: String(flavor?.kind || 'botanical'),
    }],
    assetExists: safeAssetExists,
    className: `flavor-streak-layer flavor-streak-layer--${trailIndex}`,
    decorative: false,
  })).join('')

  const descriptionGlyphs = Array.from(flavorDescription)
  const descriptionMarkup = descriptionGlyphs.map((glyph, glyphIndex) => (
    `<span id="${prefix}-description-glyph-${glyphIndex}" style="display:inline-block">${escapeHtml(glyph)}</span>`
  )).join('')

  const copy = TextReveal({
    id: `${prefix}-title`,
    title: flavorName,
    className: 'flavor-title-card',
    align: reverse ? 'right' : 'left',
  })

  const content = `
    <div id="${prefix}-color-field" aria-hidden="true" data-layout-allow-overflow style="position:absolute;inset:0;z-index:0;background:radial-gradient(circle at ${reverse ? '30%' : '70%'} 33%,#fff 0 12%,${background} 50%,${secondary} 128%)"></div>
    <div id="${prefix}-glow" class="scene__glow" aria-hidden="true" style="z-index:1;${reverse ? 'left:16px' : 'right:16px'};top:350px;width:720px;height:720px"></div>
    <div id="${prefix}-liquid" class="scene__waterline" aria-hidden="true" data-layout-allow-overflow style="z-index:2;top:990px;height:390px;border-top-color:${primary};opacity:.42"></div>

    <div id="${prefix}-bubble-safe" aria-hidden="true" style="position:absolute;z-index:3;inset:0 0 420px;overflow:hidden">
      ${FloatingBubbles({ id: `${prefix}-bubbles`, count: 12, className: 'flavor-bubbles' })}
    </div>

    <div id="${prefix}-streak-stage" aria-hidden="true" data-layout-allow-overflow style="position:absolute;z-index:4;inset:0 0 326px;overflow:hidden">
      ${streakMarkup}
    </div>

    <div id="${prefix}-product-stage" class="flavor-stage">
      ${ProductBottle({
        id: `${prefix}-product`,
        asset: productAsset,
        exists: productAssetExists,
        conceptLabel,
      })}
    </div>

    <div id="${prefix}-hero" class="flavor-hero" style="bottom:360px">
      <div id="${prefix}-hero-idle" style="position:absolute;inset:0;display:grid;place-items:center;will-change:transform">
        ${heroVisual}
      </div>
    </div>

    <div id="${prefix}-copy" class="flavor-copy">
      <span id="${prefix}-index" class="flavor-index" aria-label="第 ${ordinal} 重口味">${String(ordinal).padStart(2, '0')}</span>
      ${copy}
      <p id="${prefix}-description" aria-label="${escapeHtml(flavorDescription)}">${descriptionMarkup}</p>
    </div>
  `

  const markup = sceneClip({
    id: sceneId,
    start: fixed(sceneStart),
    duration: fixed(sceneDuration),
    track: 1,
    className: `flavor-scene${reverse ? ' flavor-scene--reverse' : ''}`,
    content,
  })

  const descriptionWindow = Math.max(0.58 * timingScale, sceneEnd - descriptionAt - 0.3 * timingScale)
  const glyphDuration = Math.min(0.38 * timingScale, Math.max(0.22, descriptionWindow * 0.34))
  const glyphStagger = descriptionGlyphs.length > 1
    ? Math.min(0.115 * timingScale, Math.max(0.035, (descriptionWindow - glyphDuration) / (descriptionGlyphs.length - 1)))
    : 0
  const descriptionTimeline = descriptionGlyphs.map((_, glyphIndex) => {
    const glyphStart = descriptionAt + glyphIndex * glyphStagger
    return `
    tl.fromTo(
      document.getElementById('${prefix}-description-glyph-${glyphIndex}'),
      { opacity: 0, y: 18, x: ${reverse ? 8 : -8}, filter: 'blur(6px)' },
      { opacity: 1, y: 0, x: 0, filter: 'blur(0px)', duration: ${fixed(glyphDuration, 3)}, ease: 'power3.out' },
      ${fixed(glyphStart, 3)},
    )`
  }).join('\n')

  const streakDirection = reverse ? 1 : -1
  const streakRestX = reverse ? 690 : 12
  const streakRestY = reverse ? 250 : 270
  const streakTimeline = Array.from({ length: streakLayerCount }, (_, trailIndex) => {
    const layerId = `${prefix}-streak-${trailIndex}`
    const trailOpacity = trailIndex === 0 ? 0 : 0.42 / trailIndex
    const settledOpacity = trailIndex === 0 ? 0.9 : 0
    const fromX = streakRestX + streakDirection * (610 + trailIndex * 34)
    return `
    tl.fromTo(
      document.getElementById('${layerId}'),
      { x: ${fixed(fromX)}, y: ${fixed(streakRestY + trailIndex * 7)}, opacity: ${fixed(trailOpacity, 3)} },
      { x: ${fixed(streakRestX)}, y: ${fixed(streakRestY)}, opacity: ${fixed(settledOpacity, 3)}, duration: ${fixed(0.44 * timingScale, 3)}, ease: 'power4.out' },
      ${fixed(streakAt, 3)},
    )`
  }).join('\n')

  const timeline = `
  {
    const ${prefix.replaceAll('-', '_')}Start = ${fixed(sceneStart, 3)}
    const ${prefix.replaceAll('-', '_')}Scale = ${fixed(timingScale, 4)}
    const ${prefix.replaceAll('-', '_')}End = ${fixed(sceneEnd, 3)}
    const ${prefix.replaceAll('-', '_')}Product = document.getElementById('${prefix}-product')
    const ${prefix.replaceAll('-', '_')}Hero = document.getElementById('${prefix}-hero')
    const ${prefix.replaceAll('-', '_')}HeroIdle = document.getElementById('${prefix}-hero-idle')

    tl.fromTo(
      document.getElementById('${prefix}-color-field'),
      { opacity: 0.76, scale: 1.035 },
      { opacity: 1, scale: 1, duration: 0.82 * ${prefix.replaceAll('-', '_')}Scale, ease: 'sine.inOut', transformOrigin: '50% 50%' },
      ${prefix.replaceAll('-', '_')}Start,
    )
    tl.fromTo(
      document.getElementById('${prefix}-liquid'),
      { opacity: 0, y: 220, scaleY: 0.78 },
      { opacity: 0.42, y: 0, scaleY: 1, duration: 0.94 * ${prefix.replaceAll('-', '_')}Scale, ease: 'sine.inOut', transformOrigin: '50% 50%' },
      ${prefix.replaceAll('-', '_')}Start,
    )
    tl.fromTo(
      ${prefix.replaceAll('-', '_')}Product,
      { opacity: 0, y: 38, scale: 0.965 },
      { opacity: 1, y: 0, scale: 1, duration: 0.8 * ${prefix.replaceAll('-', '_')}Scale, ease: 'power3.out' },
      ${prefix.replaceAll('-', '_')}Start + 0.08 * ${prefix.replaceAll('-', '_')}Scale,
    )
    tl.fromTo(
      ${prefix.replaceAll('-', '_')}Hero,
      { opacity: 0, x: ${reverse ? 126 : -126}, y: -58, rotation: ${reverse ? 4 : -4}, scale: 0.9 },
      { opacity: 1, x: 0, y: 0, rotation: 0, scale: 1, duration: 0.88 * ${prefix.replaceAll('-', '_')}Scale, ease: 'power3.out' },
      ${prefix.replaceAll('-', '_')}Start + 0.04 * ${prefix.replaceAll('-', '_')}Scale,
    )

    tl.fromTo(
      document.getElementById('${prefix}-index'),
      { opacity: 0, y: 18, scale: 0.94 },
      { opacity: 1, y: 0, scale: 1, duration: 0.42 * ${prefix.replaceAll('-', '_')}Scale, ease: 'power3.out' },
      ${prefix.replaceAll('-', '_')}Start + 0.78 * ${prefix.replaceAll('-', '_')}Scale,
    )
    tl.fromTo(
      document.querySelector('#${prefix}-title h2'),
      { opacity: 0, y: 30, scale: 0.96, filter: 'blur(12px)' },
      { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.76 * ${prefix.replaceAll('-', '_')}Scale, ease: 'power3.out', transformOrigin: '${reverse ? '100%' : '0%'} 50%' },
      ${fixed(titleAt, 3)},
    )

${streakTimeline}
${descriptionTimeline}

    const ${prefix.replaceAll('-', '_')}IdleStart = ${prefix.replaceAll('-', '_')}Start + 1.02 * ${prefix.replaceAll('-', '_')}Scale
    const ${prefix.replaceAll('-', '_')}IdleDuration = Math.max(0.36, ${prefix.replaceAll('-', '_')}End - ${prefix.replaceAll('-', '_')}IdleStart - 0.24 * ${prefix.replaceAll('-', '_')}Scale)
    const ${prefix.replaceAll('-', '_')}IdleSegment = ${prefix.replaceAll('-', '_')}IdleDuration / 3
    tl.fromTo(
      ${prefix.replaceAll('-', '_')}HeroIdle,
      { y: 0, rotation: 0 },
      { y: -1.6, rotation: ${reverse ? -0.18 : 0.18}, duration: ${prefix.replaceAll('-', '_')}IdleSegment, ease: 'sine.inOut', overwrite: 'auto' },
      ${prefix.replaceAll('-', '_')}IdleStart,
    )
    tl.fromTo(
      ${prefix.replaceAll('-', '_')}HeroIdle,
      { y: -1.6, rotation: ${reverse ? -0.18 : 0.18} },
      { y: 1.3, rotation: ${reverse ? 0.14 : -0.14}, duration: ${prefix.replaceAll('-', '_')}IdleSegment, ease: 'sine.inOut', overwrite: 'auto' },
      ${prefix.replaceAll('-', '_')}IdleStart + ${prefix.replaceAll('-', '_')}IdleSegment,
    )
    tl.fromTo(
      ${prefix.replaceAll('-', '_')}HeroIdle,
      { y: 1.3, rotation: ${reverse ? 0.14 : -0.14} },
      { y: 0, rotation: 0, duration: ${prefix.replaceAll('-', '_')}IdleSegment, ease: 'sine.inOut', overwrite: 'auto' },
      ${prefix.replaceAll('-', '_')}IdleStart + ${prefix.replaceAll('-', '_')}IdleSegment * 2,
    )

    const ${prefix.replaceAll('-', '_')}Bubbles = Array.from(document.querySelectorAll('#${prefix}-bubbles .floating-bubble'))
    ${prefix.replaceAll('-', '_')}Bubbles.forEach((${prefix.replaceAll('-', '_')}Bubble, ${prefix.replaceAll('-', '_')}BubbleIndex) => {
      const ${prefix.replaceAll('-', '_')}BubbleStart = ${fixed(descriptionAt - 0.18 * timingScale, 3)}
        + ((${prefix.replaceAll('-', '_')}BubbleIndex * 7) % 9) * 0.045 * ${prefix.replaceAll('-', '_')}Scale
      const ${prefix.replaceAll('-', '_')}BubbleDuration = Math.max(0.42, ${prefix.replaceAll('-', '_')}End - ${prefix.replaceAll('-', '_')}BubbleStart - 0.25 * ${prefix.replaceAll('-', '_')}Scale)
      const ${prefix.replaceAll('-', '_')}BubblePhaseMax = Math.PI * 2 * (0.52 + ((${prefix.replaceAll('-', '_')}BubbleIndex * 5) % 4) * 0.11)
      const ${prefix.replaceAll('-', '_')}BubblePhase = { p: 0 }
      const ${prefix.replaceAll('-', '_')}BubbleTravel = 430 + ((${prefix.replaceAll('-', '_')}BubbleIndex * 83) % 510)
      const ${prefix.replaceAll('-', '_')}BubbleDrift = 7 + ((${prefix.replaceAll('-', '_')}BubbleIndex * 19) % 17)

      tl.fromTo(
        ${prefix.replaceAll('-', '_')}Bubble,
        { opacity: 0 },
        { opacity: 0.46 + ((${prefix.replaceAll('-', '_')}BubbleIndex * 11) % 18) / 100, duration: 0.24 * ${prefix.replaceAll('-', '_')}Scale, ease: 'power2.out' },
        ${prefix.replaceAll('-', '_')}BubbleStart,
      )
      tl.to(
        ${prefix.replaceAll('-', '_')}BubblePhase,
        {
          p: ${prefix.replaceAll('-', '_')}BubblePhaseMax,
          duration: ${prefix.replaceAll('-', '_')}BubbleDuration,
          ease: 'none',
          onUpdate: () => {
            const ${prefix.replaceAll('-', '_')}BubbleProgress = ${prefix.replaceAll('-', '_')}BubblePhase.p / ${prefix.replaceAll('-', '_')}BubblePhaseMax
            const ${prefix.replaceAll('-', '_')}BubbleX = Math.sin(${prefix.replaceAll('-', '_')}BubblePhase.p + ${prefix.replaceAll('-', '_')}BubbleIndex * 0.67) * ${prefix.replaceAll('-', '_')}BubbleDrift
            const ${prefix.replaceAll('-', '_')}BubbleY = -${prefix.replaceAll('-', '_')}BubbleTravel * ${prefix.replaceAll('-', '_')}BubbleProgress
            gsap.set(${prefix.replaceAll('-', '_')}Bubble, { x: ${prefix.replaceAll('-', '_')}BubbleX, y: ${prefix.replaceAll('-', '_')}BubbleY })
          },
        },
        ${prefix.replaceAll('-', '_')}BubbleStart,
      )
    })
  }
  `

  return { id: sceneId, markup, timeline }
}
