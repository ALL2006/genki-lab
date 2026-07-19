import { escapeHtml, fixed } from './utils.js'
import { OpeningScene } from './scenes/OpeningScene.js'
import { ProductIntroScene } from './scenes/ProductIntroScene.js'
import { FlavorScene } from './scenes/FlavorScene.js'
import { BubbleExplosionScene } from './scenes/BubbleExplosionScene.js'
import { LifestyleScene } from './scenes/LifestyleScene.js'
import { ProductEndCard } from './scenes/ProductEndCard.js'

function scriptJson(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c')
}

function cssVariable(name, value) {
  return `--${name}:${escapeHtml(value)}`
}

export function VerticalVideoComposition({ config, styles, assetExists }) {
  const scenes = []
  let cursor = 0

  scenes.push(OpeningScene({
    config,
    start: cursor,
    duration: config.timeline.opening,
    assetExists,
  }))
  cursor += config.timeline.opening

  scenes.push(ProductIntroScene({
    config,
    start: cursor,
    duration: config.timeline.productIntro,
    assetExists,
  }))
  cursor += config.timeline.productIntro

  config.flavors.forEach((flavor, index) => {
    scenes.push(FlavorScene({
      config,
      flavor,
      index,
      flavorIndex: index,
      start: cursor,
      duration: flavor.duration,
      assetExists,
    }))
    cursor += flavor.duration
  })

  scenes.push(BubbleExplosionScene({
    config,
    start: cursor,
    duration: config.timeline.bubbleExplosion,
    assetExists,
  }))
  cursor += config.timeline.bubbleExplosion

  scenes.push(LifestyleScene({
    config,
    start: cursor,
    duration: config.timeline.lifestyle,
    assetExists,
  }))
  cursor += config.timeline.lifestyle

  scenes.push(ProductEndCard({
    config,
    start: cursor,
    duration: config.timeline.endCard,
    assetExists,
  }))
  cursor += config.timeline.endCard

  const totalDuration = fixed(cursor, 3)
  const variables = [
    cssVariable('primary', config.primaryColor),
    cssVariable('secondary', config.secondaryColor),
    cssVariable('accent', config.accentColor),
    cssVariable('canvas', config.backgroundColor),
  ].join(';')
  const timelines = scenes.map((scene) => scene.timeline).join('\n')

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <meta name="color-scheme" content="light" />
    <title>${escapeHtml(config.productName)}｜概念产品演示</title>
    <script src="./node_modules/gsap/dist/gsap.min.js"></script>
    <style>${styles}</style>
  </head>
  <body>
    <div
      id="root"
      data-composition-id="beverage-product-ad"
      data-start="0"
      data-width="${config.output.width}"
      data-height="${config.output.height}"
      data-fps="${config.output.fps}"
      data-duration="${totalDuration}"
      style="${variables}"
    >
      ${scenes.map((scene) => scene.markup).join('\n')}
    </div>
    <script id="beverage-product-config" type="application/json">${scriptJson(config)}</script>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      ${timelines}
      window.__timelines["beverage-product-ad"] = tl;
    </script>
  </body>
</html>
`
}
