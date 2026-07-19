import { AssetFallback } from '../components/AssetFallback.js'
import { ProductBottle } from '../components/ProductBottle.js'
import { escapeHtml, fixed, sceneClip } from '../utils.js'

export function LifestyleScene({ config, start, duration, assetExists }) {
  const configuredScenes = Array.isArray(config.scenes) ? config.scenes : []
  const scenes = configuredScenes.length > 0
    ? configuredScenes
    : [{ name: '生活场景', asset: '' }]
  const sliceDuration = duration / scenes.length
  const productAsset = config.assets?.productFront || ''

  const cards = scenes.map((scene, index) => {
    const cardId = `lifestyle-card-${index}`
    const hasAsset = Boolean(scene.asset && assetExists(scene.asset))
    const media = hasAsset
      ? `<img src="${escapeHtml(scene.asset)}" alt="${escapeHtml(scene.name)}" />`
      : AssetFallback({
          id: `${cardId}-fallback`,
          label: scene.name || '生活场景',
          kind: '场景图片',
          className: 'lifestyle-card__fallback',
        })

    return `<article id="${cardId}" class="lifestyle-card" style="z-index: ${index + 1}" aria-label="${escapeHtml(scene.name || '生活场景')}">
      ${media}
      <span class="lifestyle-card__shade" aria-hidden="true"></span>
      <strong class="lifestyle-card__name">${escapeHtml(scene.name || '生活场景')}</strong>
    </article>`
  }).join('')

  const markup = sceneClip({
    id: 'lifestyle-scene',
    start,
    duration,
    className: 'lifestyle-scene',
    content: `<div class="lifestyle-card-stack" aria-label="饮用场景">
        ${cards}
      </div>
      ${ProductBottle({
        id: 'lifestyle-product',
        asset: productAsset,
        exists: Boolean(productAsset && assetExists(productAsset)),
        className: 'lifestyle-product',
      })}
      <div id="lifestyle-copy" class="lifestyle-copy">
        <h2>${escapeHtml(config.lifestyleLine || '')}</h2>
      </div>
      <span id="lifestyle-concept" class="scene__concept-label">${escapeHtml(config.conceptLabel || '')}</span>`,
  })

  const cardTweens = scenes.map((_, index) => {
    const cardStart = fixed(start + index * sliceDuration, 3)
    const entranceDuration = fixed(Math.min(0.34, Math.max(0.18, sliceDuration * 0.34)), 3)

    return `tl.fromTo('#lifestyle-card-${index}',
  { autoAlpha: 0, x: 120, scale: 1.025 },
  { autoAlpha: 1, x: 0, scale: 1, duration: ${entranceDuration}, ease: 'power3.out' },
  ${cardStart}
);`
  }).join('\n')

  const productEntrance = fixed(Math.min(0.46, Math.max(0.24, duration * 0.16)), 3)
  const copyStart = fixed(start + duration * 0.64, 3)
  const copyDuration = fixed(Math.min(0.46, Math.max(0.24, duration * 0.16)), 3)
  const conceptStart = fixed(start + 0.12, 3)

  const timeline = `${cardTweens}
tl.fromTo('#lifestyle-product',
  { autoAlpha: 0, y: 72, scale: 0.96 },
  { autoAlpha: 1, y: 0, scale: 1, duration: ${productEntrance}, ease: 'power3.out' },
  ${fixed(start, 3)}
);
tl.fromTo('#lifestyle-concept',
  { autoAlpha: 0, y: -16 },
  { autoAlpha: 1, y: 0, duration: 0.32, ease: 'power2.out' },
  ${conceptStart}
);
tl.fromTo('#lifestyle-copy',
  { autoAlpha: 0, y: -24, filter: 'blur(8px)' },
  { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: ${copyDuration}, ease: 'power3.out' },
  ${copyStart}
);`

  return { id: 'lifestyle-scene', markup, timeline }
}
