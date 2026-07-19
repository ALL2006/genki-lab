import { AssetFallback } from '../components/AssetFallback.js'
import { FloatingBubbles } from '../components/FloatingBubbles.js'
import { FloatingIngredients } from '../components/FloatingIngredients.js'
import { escapeHtml, fixed, sceneClip } from '../utils.js'

function colorToken(value, fallback) {
  const candidate = String(value ?? '').trim()
  return /^#[0-9a-f]{3,8}$/i.test(candidate) ? candidate : fallback
}

function openingWords(value) {
  const text = String(value || '\u4eca\u5929\uff0c\u8f7b\u4e00\u70b9\u3002').trim()
  const phrases = text.match(/[^，。！？、]+[，。！？、]?/gu)
  return phrases?.length ? phrases : [text]
}

export function OpeningScene({ config, start, duration, assetExists }) {
  const sceneId = 'opening-scene'
  const sceneStart = Number.isFinite(Number(start)) ? Number(start) : 0
  const sceneDuration = Number.isFinite(Number(duration)) ? Number(duration) : 3
  const timingScale = sceneDuration / 3
  const impactAt = sceneStart + 0.7 * timingScale
  const copyAt = sceneStart + 1.8 * timingScale
  const sceneEnd = sceneStart + sceneDuration

  const configuredFlavors = Array.isArray(config?.flavors)
    ? config.flavors
    : [config?.flavorOne, config?.flavorTwo].filter(Boolean)
  const grape = configuredFlavors[0] ?? { name: '\u9752\u63d0', asset: '' }
  const jasmine = configuredFlavors[1] ?? { name: '\u8309\u8389\u82b1', asset: '' }
  const safeAssetExists = (asset) => Boolean(
    asset
    && typeof assetExists === 'function'
    && assetExists(asset),
  )
  const grapeExists = safeAssetExists(grape.asset)
  const jasmineExists = safeAssetExists(jasmine.asset)
  const backgroundAsset = String(config?.assets?.background || '').trim()
  const backgroundExists = safeAssetExists(backgroundAsset)

  const background = colorToken(config?.backgroundColor, '#F6FFF9')
  const secondary = colorToken(config?.secondaryColor, '#BFE8D0')
  const primary = colorToken(config?.primaryColor, '#2E8B62')
  const line = String(config?.openingLine || '\u4eca\u5929\uff0c\u8f7b\u4e00\u70b9\u3002').trim()
  const words = openingWords(line)

  const copyEntries = []
  let copyCursor = copyAt
  words.forEach((word, index) => {
    const readingTime = (0.16 + word.length * 0.035) * timingScale
    copyEntries.push({
      id: `opening-copy-word-${index}`,
      start: copyCursor,
      duration: Math.max(0.3 * timingScale, Math.min(0.56 * timingScale, readingTime + 0.18 * timingScale)),
    })
    copyCursor += readingTime
  })

  const grapeVisual = grapeExists
    ? `<img src="${escapeHtml(grape.asset)}" alt="${escapeHtml(grape.name)}" draggable="false" style="display:block;width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 24px 30px rgba(24,91,65,.18))" />`
    : AssetFallback({
      id: 'opening-grape-fallback',
      label: grape.name || '\u9752\u63d0\u7d20\u6750',
      kind: '\u539f\u6599\u7d20\u6750',
      className: 'opening-grape-fallback',
    })

  const jasmineItems = Array.from({ length: jasmineExists ? 4 : 1 }, () => ({
    name: jasmine.name || '\u8309\u8389\u82b1',
    asset: jasmine.asset || '',
    kind: 'jasmine',
  }))

  const content = `
    <div id="opening-color-field" aria-hidden="true" style="position:absolute;inset:0;z-index:0;background:radial-gradient(circle at 50% 30%,#fff 0 15%,${background} 48%,${secondary} 118%)"></div>
    ${backgroundExists ? `<img id="opening-background-asset" src="${escapeHtml(backgroundAsset)}" alt="" aria-hidden="true" style="position:absolute;inset:0;z-index:0;width:100%;height:100%;object-fit:cover;opacity:.2;mix-blend-mode:multiply" />` : ''}
    <div id="opening-soft-glow" class="scene__glow" aria-hidden="true" style="z-index:1;left:112px;top:82px;width:856px;height:856px"></div>
    <div id="opening-water" class="opening-water" aria-hidden="true" data-layout-allow-overflow style="z-index:3"></div>

    <svg id="opening-ripple-svg" viewBox="0 0 1000 360" aria-hidden="true" style="position:absolute;z-index:9;left:40px;top:565px;width:1000px;height:360px;overflow:visible">
      <ellipse id="opening-ripple-path-0" cx="500" cy="180" rx="156" ry="45" fill="none" stroke="rgba(255,255,255,.96)" stroke-width="6" stroke-linecap="round"></ellipse>
      <ellipse id="opening-ripple-path-1" cx="500" cy="180" rx="260" ry="76" fill="none" stroke="${primary}" stroke-opacity=".34" stroke-width="4" stroke-linecap="round"></ellipse>
      <ellipse id="opening-ripple-path-2" cx="500" cy="180" rx="380" ry="111" fill="none" stroke="rgba(255,255,255,.76)" stroke-width="3" stroke-linecap="round"></ellipse>
    </svg>

    <div id="opening-impact-glow" aria-hidden="true" style="position:absolute;z-index:8;left:50%;top:670px;width:320px;height:96px;margin-left:-160px;border-radius:50%;background:radial-gradient(ellipse,rgba(255,255,255,.94),rgba(114,198,155,.16) 54%,transparent 74%);filter:blur(9px)"></div>

    <div id="opening-grape-hero" class="opening-grape" style="${grapeExists ? '' : 'width:240px;height:240px;margin-left:-120px;'}">
      ${grapeVisual}
    </div>

    <div id="opening-bubble-stage" aria-hidden="true" style="position:absolute;z-index:10;inset:0 0 326px;overflow:hidden">
      ${FloatingBubbles({ id: 'opening-bubble-field', count: 16, className: 'opening-bubbles' })}
    </div>

    ${FloatingIngredients({
      id: 'opening-petal-field',
      items: jasmineItems,
      assetExists: safeAssetExists,
      className: 'opening-petals',
      decorative: false,
    })}

    <div id="opening-copy" class="opening-copy" aria-label="${escapeHtml(line)}">
      <h1>${words.map((word, index) => `<span id="opening-copy-word-${index}">${escapeHtml(word)}</span>`).join('')}</h1>
    </div>
  `

  const markup = sceneClip({
    id: sceneId,
    start: fixed(sceneStart),
    duration: fixed(sceneDuration),
    track: 1,
    className: 'opening-scene',
    content,
  })

  const timeline = (tl) => {
    const openingGrape = document.getElementById('opening-grape-hero')
    const openingWater = document.getElementById('opening-water')
    const openingImpactGlow = document.getElementById('opening-impact-glow')

    tl.fromTo(
      openingWater,
      { opacity: 0, scaleY: 0.9 },
      { opacity: 1, scaleY: 1, duration: 0.62 * timingScale, ease: 'sine.inOut', transformOrigin: '50% 50%' },
      sceneStart,
    )
    tl.fromTo(
      openingGrape,
      { opacity: 0, y: -360, rotation: -7, scale: 0.88 },
      { opacity: 1, y: 300, rotation: 0, scale: 1, duration: 0.7 * timingScale, ease: 'sine.inOut' },
      sceneStart,
    )
    tl.fromTo(
      openingImpactGlow,
      { opacity: 0, scale: 0.58 },
      { opacity: 0.68, scale: 1.2, duration: 0.48 * timingScale, ease: 'power2.out' },
      impactAt,
    )

    const openingRipplePaths = Array.from(document.querySelectorAll('#opening-ripple-svg ellipse'))
    openingRipplePaths.forEach((openingPath, openingIndex) => {
      const openingRippleLength = openingPath.getTotalLength()
      const openingRippleStart = impactAt + openingIndex * 0.09 * timingScale
      const openingRippleDuration = (0.54 + openingIndex * 0.12) * timingScale
      tl.fromTo(
        openingPath,
        {
          opacity: 0,
          strokeDasharray: openingRippleLength,
          strokeDashoffset: openingRippleLength,
          scale: 0.82,
          transformOrigin: '50% 50%',
        },
        {
          opacity: 0.82 - openingIndex * 0.12,
          strokeDashoffset: 0,
          scale: 1,
          duration: openingRippleDuration,
          ease: 'power2.out',
        },
        openingRippleStart,
      )
      tl.to(
        openingPath,
        {
          opacity: 0.4 - openingIndex * 0.06,
          scale: 1.07 + openingIndex * 0.025,
          duration: Math.max(0.28, sceneEnd - copyAt - openingIndex * 0.06),
          ease: 'sine.inOut',
        },
        copyAt + openingIndex * 0.04 * timingScale,
      )
    })

    const openingBubbles = Array.from(document.querySelectorAll('#opening-bubble-field .floating-bubble'))
    openingBubbles.forEach((openingBubble, openingIndex) => {
      const openingBubbleStart = impactAt + ((openingIndex * 7) % 10) * 0.045 * timingScale
      const openingBubbleDuration = Math.max(0.42, sceneEnd - openingBubbleStart)
      const openingBubbleCycles = 0.72 + ((openingIndex * 5) % 4) * 0.17
      const openingBubblePhaseMax = Math.PI * 2 * openingBubbleCycles
      const openingBubblePhase = { p: 0 }
      const openingBubbleTravel = 620 + ((openingIndex * 83) % 690)
      const openingBubbleDrift = 8 + ((openingIndex * 19) % 24)
      const openingBubbleOpacity = 0.38 + ((openingIndex * 11) % 28) / 100
      const openingBubbleScale = 0.72 + ((openingIndex * 13) % 24) / 100

      tl.fromTo(
        openingBubble,
        { opacity: 0 },
        { opacity: openingBubbleOpacity, duration: 0.26 * timingScale, ease: 'power2.out' },
        openingBubbleStart,
      )
      tl.to(
        openingBubblePhase,
        {
          p: openingBubblePhaseMax,
          duration: openingBubbleDuration,
          ease: 'none',
          onUpdate: () => {
            const openingBubbleProgress = openingBubblePhase.p / openingBubblePhaseMax
            const openingBubbleX = Math.sin(openingBubblePhase.p + openingIndex * 0.71) * openingBubbleDrift
            const openingBubbleY = -openingBubbleTravel * openingBubbleProgress
            gsap.set(openingBubble, { x: openingBubbleX, y: openingBubbleY, scale: openingBubbleScale })
          },
        },
        openingBubbleStart,
      )
    })

    const openingPetals = Array.from(document.querySelectorAll('#opening-petal-field .floating-ingredient'))
    openingPetals.forEach((openingPetal, openingIndex) => {
      const openingPetalStart = impactAt + openingIndex * 0.12 * timingScale
      const openingPetalDuration = Math.max(0.5, sceneEnd - openingPetalStart)
      const openingPetalCycles = 0.48 + openingIndex * 0.08
      const openingPetalPhaseMax = Math.PI * 2 * openingPetalCycles
      const openingPetalPhase = { p: 0 }
      const openingPetalSide = openingIndex % 2 === 0 ? -1 : 1
      const openingPetalScale = jasmineExists ? 0.42 + openingIndex * 0.035 : 0.78

      tl.fromTo(
        openingPetal,
        { opacity: 0 },
        { opacity: 0.88, duration: 0.44 * timingScale, ease: 'power2.out' },
        openingPetalStart,
      )
      tl.to(
        openingPetalPhase,
        {
          p: openingPetalPhaseMax,
          duration: openingPetalDuration,
          ease: 'none',
          onUpdate: () => {
            const openingPetalProgress = openingPetalPhase.p / openingPetalPhaseMax
            const openingPetalX = openingPetalSide * (175 * (1 - openingPetalProgress))
              + Math.sin(openingPetalPhase.p + openingIndex * 0.9) * (14 + openingIndex * 3)
            const openingPetalY = -90 + openingPetalProgress * (225 + openingIndex * 24)
              + Math.sin(openingPetalPhase.p * 0.72) * 7
            const openingPetalRotation = openingPetalSide * (16 + openingIndex * 5)
              + Math.sin(openingPetalPhase.p + Math.PI / 2) * 3
            gsap.set(openingPetal, {
              x: openingPetalX,
              y: openingPetalY,
              rotation: openingPetalRotation,
              scale: openingPetalScale,
            })
          },
        },
        openingPetalStart,
      )
    })

    copyEntries.forEach((entry) => {
      tl.fromTo(
        document.getElementById(entry.id),
        { opacity: 0, y: 28, filter: 'blur(10px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: entry.duration, ease: 'power3.out' },
        entry.start,
      )
    })
  }

  return { id: sceneId, markup, timeline }
}
