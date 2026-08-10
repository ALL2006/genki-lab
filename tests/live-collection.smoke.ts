import { getConfig } from '../server/config.js'
import { createDependencies } from '../server/dependencies.js'

const config = getConfig()
if (!config.enableLiveCollection) {
  throw new Error('实时冒烟测试未运行：请显式设置 ENABLE_LIVE_COLLECTION=true。')
}
const sourceIds = process.env.LIVE_COLLECTION_SOURCE_IDS?.split(',').map((value) => value.trim()).filter(Boolean)
const { jobs } = createDependencies(config)
const result = await jobs.collect({ mode: 'live', sourceIds })
console.log(JSON.stringify({ run: result.run, insertedIds: result.result.inserted.map((item) => item.id) }, null, 2))
