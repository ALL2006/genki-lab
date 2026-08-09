import { createApp } from './app.js'
import { getConfig } from './config.js'
import { bootstrapDataFile } from './storage/DataBootstrap.js'

const config = getConfig()
await bootstrapDataFile(config.mockDbPath)
const app = createApp(config)

app.listen(config.port, '0.0.0.0', () => {
  console.log(`GENKI LAB API listening on 0.0.0.0:${config.port}`)
  if (config.jobSecret === 'local-demo-secret-change-me') {
    console.warn('Using the local demo X_JOB_SECRET. Set X_JOB_SECRET before deployment.')
  }
})
