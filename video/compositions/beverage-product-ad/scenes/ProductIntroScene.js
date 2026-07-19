import { FloatingBubbles } from '../components/FloatingBubbles.js'
import { FloatingIngredients } from '../components/FloatingIngredients.js'
import { ProductBottle } from '../components/ProductBottle.js'
import { TextReveal } from '../components/TextReveal.js'
import { escapeHtml, fixed, sceneClip } from '../utils.js'

function colorToken(value, fallback) {
  const candidate = String(value ?? '').trim()
  return /^#[0-9a-f]{3,8}$/i.test(candidate) ? candidate : fallback
}

function copyDuration(value, timingScale) {
  const characters = Array.from(String(value ?? '')).length
  return Math.max(0.5, Math.min(0.86, 0.42 + characters * 0.035)) * timingScale
}

export function ProductIntroScene({ config, start, duration, assetExists }) {
  const sceneId = 'product-intro-scene'
  const sceneStart = Number.isFinite(Number(start)) ? Number(start) : 0
  const sceneDuration = Number.isFinite(Number(duration)) ? Number(duration) : 4
  const timingScale = sceneDuration / 4
  const sceneEnd = sceneStart + sceneDuration

  const brandName = String(config?.brandName || '').trim()
  const productName = String(config?.shortName || config?.productName || '').trim()
  const conceptLabel = String(config?.conceptLabel || '概念产品演示').trim()
  const primary = colorToken(config?.primaryColor, '#2E8B62')
  const secondary = colorToken(config?.secondaryColor, '#BFE8D0')
  const background = colorToken(config?.backgroundColor, '#F6FFF9')
  const accent = colorToken(config?.accentColor, '#E9544D')

  const safeAssetExists = (asset) => Boolean(
    asset
    && typeof assetExists === 'function'
    && assetExists(asset),
  )

  const configuredFlavors = Array.isArray(config?.flavors)
    ? config.flavors
    : [config?.flavorOne, config?.flavorTwo].filter(Boolean)
  const introIngredients = configuredFlavors.slice(0, 2).map((flavor, index) => ({
    name: flavor?.name || `口味素材 ${index + 1}`,
    asset: flavor?.asset || '',
    kind: index === 0 ? 'grape' : 'jasmine',
  }))

  const productAsset = config?.assets?.productFront || config?.assets?.productHero || ''
  const product = ProductBottle({
    id: 'product-intro-bottle',
    asset: productAsset,
    exists: safeAssetExists(productAsset),
    className: 'product-intro-bottle',
  })

  const productCopy = TextReveal({
    id: 'product-intro-copy-reveal',
    eyebrow: brandName,
    title: productName,
    className: 'product-intro-text',
    align: 'center',
  })

  const content = `
    <div
      id="product-intro-color-field"
      aria-hidden="true"
      style="position:absolute;inset:0;z-index:0;background:radial-gradient(circle at 50% 42%,#fff 0 17%,${background} 49%,${secondary} 118%)"
    ></div>

    <div
      id="product-intro-camera"
      data-layout-allow-overflow
      style="position:absolute;inset:0;z-index:2;overflow:hidden;transform-origin:50% 46%;will-change:transform"
    >
      <div
        id="product-intro-halo"
        class="scene__glow"
        aria-hidden="true"
        style="z-index:1;left:124px;top:346px;width:832px;height:832px;background:radial-gradient(circle,rgba(255,255,255,.98),${secondary}66 42%,transparent 72%)"
      ></div>
      <div
        id="product-intro-fog-left"
        data-layout-allow-overflow
        aria-hidden="true"
        style="position:absolute;z-index:2;left:-120px;top:550px;width:620px;height:620px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.9),rgba(255,255,255,.22) 48%,transparent 72%);filter:blur(26px)"
      ></div>
      <div
        id="product-intro-fog-right"
        data-layout-allow-overflow
        aria-hidden="true"
        style="position:absolute;z-index:2;right:-150px;top:470px;width:650px;height:650px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.92),rgba(231,248,244,.2) 50%,transparent 74%);filter:blur(30px)"
      ></div>
      <div
        id="product-intro-waterline"
        data-layout-allow-overflow
        class="scene__waterline"
        aria-hidden="true"
        style="z-index:4;top:1065px"
      ></div>
      <div
        id="product-intro-reflection"
        class="product-intro-reflection"
        aria-hidden="true"
      ></div>

      <div
        id="product-intro-bubble-stage"
        aria-hidden="true"
        style="position:absolute;z-index:6;inset:0 0 326px;overflow:hidden"
      >
        ${FloatingBubbles({
          id: 'product-intro-bubbles',
          count: 12,
          className: 'product-intro-bubble-ring',
          large: false,
        })}
      </div>

      ${FloatingIngredients({
        id: 'product-intro-ingredients',
        items: introIngredients,
        assetExists: safeAssetExists,
        className: 'product-intro-ingredient-ring',
        decorative: false,
      })}

      <div id="product-intro-stage" class="product-intro-stage">
        ${product}
      </div>

      <div id="product-intro-copy" class="product-intro-copy">
        ${productCopy}
      </div>

      <div
        id="product-intro-concept"
        style="position:absolute;z-index:35;left:72px;right:72px;top:1478px;text-align:center"
      >
        <span style="display:inline-block;padding:12px 24px;border:2px solid ${accent}40;border-radius:999px;color:${accent};background:rgba(255,255,255,.86);font-size:22px;font-weight:700;letter-spacing:.08em;box-shadow:0 14px 34px rgba(46,139,98,.08)">${escapeHtml(conceptLabel)}</span>
      </div>
    </div>
  `

  const markup = sceneClip({
    id: sceneId,
    start: fixed(sceneStart),
    duration: fixed(sceneDuration),
    track: 1,
    className: 'product-intro-scene',
    content,
  })

  const brandAt = sceneStart + 1.55 * timingScale
  const productNameAt = sceneStart + 2.7 * timingScale
  const conceptAt = sceneStart + 3.18 * timingScale
  const brandDuration = copyDuration(brandName, timingScale)
  const productNameDuration = copyDuration(productName, timingScale)

  const timeline = `
  {
    const introStart = ${fixed(sceneStart, 3)}
    const introEnd = ${fixed(sceneEnd, 3)}
    const introScale = ${fixed(timingScale, 4)}
    const introCamera = document.getElementById('product-intro-camera')
    const introBottle = document.getElementById('product-intro-bottle')
    const introHalo = document.getElementById('product-intro-halo')
    const introFogLeft = document.getElementById('product-intro-fog-left')
    const introFogRight = document.getElementById('product-intro-fog-right')
    const introWaterline = document.getElementById('product-intro-waterline')
    const introReflection = document.getElementById('product-intro-reflection')

    tl.fromTo(
      introCamera,
      { scale: 0.97, x: -2, y: 8 },
      { scale: 1.015, x: 2, y: 0, duration: 1.2 * introScale, ease: 'power2.inOut' },
      introStart,
    )
    tl.to(
      introCamera,
      { scale: 1.035, x: -1, y: -4, duration: 1.5 * introScale, ease: 'power3.out' },
      introStart + 1.2 * introScale,
    )
    tl.to(
      introCamera,
      { scale: 1.025, x: 0, y: -2, duration: 1.3 * introScale, ease: 'power2.inOut' },
      introStart + 2.7 * introScale,
    )

    tl.fromTo(
      introHalo,
      { opacity: 0.18, scale: 0.82 },
      { opacity: 1, scale: 1, duration: 1.1 * introScale, ease: 'sine.inOut' },
      introStart,
    )
    tl.fromTo(
      introFogLeft,
      { opacity: 0, x: -54, scale: 0.86 },
      { opacity: 0.84, x: 0, scale: 1, duration: 1.05 * introScale, ease: 'sine.inOut' },
      introStart,
    )
    tl.fromTo(
      introFogRight,
      { opacity: 0, x: 58, scale: 0.84 },
      { opacity: 0.78, x: 0, scale: 1, duration: 1.16 * introScale, ease: 'sine.inOut' },
      introStart + 0.06 * introScale,
    )
    tl.fromTo(
      introWaterline,
      { opacity: 0, y: 94, scaleX: 0.72 },
      { opacity: 1, y: 0, scaleX: 1, duration: 0.95 * introScale, ease: 'power3.out' },
      introStart,
    )
    tl.fromTo(
      introReflection,
      { opacity: 0, scaleX: 0.54, scaleY: 0.72 },
      { opacity: 1, scaleX: 1, scaleY: 1, duration: 1.08 * introScale, ease: 'power3.out' },
      introStart + 0.12 * introScale,
    )
    tl.fromTo(
      introBottle,
      { opacity: 0.16, y: 248, scale: 0.9, filter: 'blur(12px)' },
      { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 1.15 * introScale, ease: 'power3.out' },
      introStart,
    )

    const introIngredients = Array.from(document.querySelectorAll('#product-intro-ingredients .floating-ingredient'))
    const introIngredientOrigins = [
      { x: 362, y: 356, rotation: -8 },
      { x: -397, y: 142, rotation: 8 },
      { x: 330, y: -270, rotation: -6 },
      { x: -320, y: -240, rotation: 6 },
    ]
    introIngredients.forEach((introIngredient, introIndex) => {
      const introOrigin = introIngredientOrigins[introIndex % introIngredientOrigins.length]
      tl.fromTo(
        introIngredient,
        {
          opacity: 0,
          x: introOrigin.x,
          y: introOrigin.y,
          rotation: introOrigin.rotation,
          scale: 0.42,
        },
        {
          opacity: 1,
          x: 0,
          y: 0,
          rotation: introIndex % 2 === 0 ? -2 : 2,
          scale: 1,
          duration: 1.18 * introScale,
          ease: 'power3.out',
        },
        introStart + (1.2 + introIndex * 0.08) * introScale,
      )
    })

    const introBubbles = Array.from(document.querySelectorAll('#product-intro-bubbles .floating-bubble'))
    introBubbles.forEach((introBubble, introIndex) => {
      const introBaseX = 1080 * (5 + ((introIndex * 37) % 91)) / 100
      const introBaseY = 1684
      const introAngle = -Math.PI / 2 + introIndex * (Math.PI * 2 / Math.max(1, introBubbles.length))
      const introTargetX = 540 + Math.cos(introAngle) * (314 + (introIndex % 3) * 28)
      const introTargetY = 900 + Math.sin(introAngle) * (472 + (introIndex % 4) * 24)
      const introBubbleAt = introStart + (1.3 + introIndex * 0.045) * introScale
      tl.fromTo(
        introBubble,
        {
          opacity: 0,
          x: 540 - introBaseX,
          y: 900 - introBaseY,
          scale: 0.44,
        },
        {
          opacity: 0.42 + (introIndex % 4) * 0.09,
          x: introTargetX - introBaseX,
          y: introTargetY - introBaseY,
          scale: 0.74 + (introIndex % 3) * 0.1,
          duration: 1.12 * introScale,
          ease: 'power3.out',
        },
        introBubbleAt,
      )
    })

    tl.fromTo(
      document.querySelector('#product-intro-copy-reveal .text-reveal__eyebrow'),
      { opacity: 0, y: 28, filter: 'blur(8px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: ${fixed(brandDuration, 3)}, ease: 'power3.out' },
      ${fixed(brandAt, 3)},
    )
    tl.fromTo(
      document.querySelector('#product-intro-copy-reveal h2'),
      { opacity: 0, y: 36, filter: 'blur(10px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: ${fixed(productNameDuration, 3)}, ease: 'power3.out' },
      ${fixed(productNameAt, 3)},
    )
    tl.fromTo(
      document.getElementById('product-intro-concept'),
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.56 * introScale, ease: 'power3.out' },
      ${fixed(conceptAt, 3)},
    )
  }
  `

  return { id: sceneId, markup, timeline }
}
