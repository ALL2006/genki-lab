import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, isAbsolute, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(scriptDirectory, '..')

function readArgument(name, fallback) {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback
}

function projectPath(value) {
  return isAbsolute(value) ? value : resolve(projectRoot, value)
}

function assertConfiguration(config) {
  const requiredStrings = [
    'id',
    'brandName',
    'productName',
    'shortName',
    'category',
    'primaryColor',
    'secondaryColor',
    'accentColor',
    'backgroundColor',
    'openingLine',
    'sensoryLine',
    'refreshLine',
    'lifestyleLine',
    'slogan',
    'conceptLabel',
    'disclaimer',
  ]

  for (const key of requiredStrings) {
    if (typeof config[key] !== 'string' || !config[key].trim()) {
      throw new Error(`配置字段 ${key} 必须是非空字符串。`)
    }
  }

  if (!Array.isArray(config.flavors) || config.flavors.length === 0) {
    throw new Error('配置至少需要一个 flavors 项。')
  }
  if (!Array.isArray(config.scenes) || config.scenes.length === 0) {
    throw new Error('配置至少需要一个 scenes 项。')
  }
  if (!config.assets || typeof config.assets.productFront !== 'string') {
    throw new Error('配置必须提供 assets.productFront。')
  }
  if (config.output?.width !== 1080 || config.output?.height !== 1920 || config.output?.fps !== 30) {
    throw new Error('当前模板固定输出 1080×1920、30fps。')
  }

  const totalDuration =
    config.timeline.opening +
    config.timeline.productIntro +
    config.flavors.reduce((total, flavor) => total + flavor.duration, 0) +
    config.timeline.bubbleExplosion +
    config.timeline.lifestyle +
    config.timeline.endCard

  if (totalDuration < 22 || totalDuration > 30) {
    throw new Error(`场景总时长为 ${totalDuration} 秒，必须控制在 22—30 秒。`)
  }

  return totalDuration
}

const configPath = projectPath(readArgument('config', 'data/qingti-jasmine.json'))
const outputPath = projectPath(readArgument('output', 'index.html'))
const config = JSON.parse(await readFile(configPath, 'utf8'))
const totalDuration = assertConfiguration(config)
const styles = await readFile(resolve(projectRoot, 'compositions/beverage-product-ad/styles.css'), 'utf8')
const { VerticalVideoComposition } = await import(
  pathToFileURL(resolve(projectRoot, 'compositions/beverage-product-ad/composition.js')).href
)

const configuredAssets = [
  ...Object.values(config.assets),
  ...config.flavors.map((flavor) => flavor.asset),
  ...config.scenes.map((scene) => scene.asset),
].filter(Boolean)
const missingAssets = configuredAssets.filter((asset) => !existsSync(projectPath(asset)))
const assetExists = (asset) => Boolean(asset) && existsSync(projectPath(asset))

const html = VerticalVideoComposition({ config, styles, assetExists })
await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, html, 'utf8')
await mkdir(resolve(projectRoot, '.hyperframes'), { recursive: true })
await writeFile(
  resolve(projectRoot, '.hyperframes/asset-report.json'),
  `${JSON.stringify({ config: config.id, totalDuration, missingAssets }, null, 2)}\n`,
  'utf8',
)

console.log(`已生成 ${outputPath}`)
console.log(`规格：1080×1920 / 30fps / ${totalDuration}秒`)
console.log(missingAssets.length ? `缺少 ${missingAssets.length} 个素材，已启用开发占位。` : '所有配置素材均可用。')
