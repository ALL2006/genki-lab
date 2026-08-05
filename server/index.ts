import { createApp } from './app.js'
import { getConfig } from './config.js'

const config = getConfig()
const app = createApp(config)

app.listen(config.port, () => {
  console.log(`GENKI LAB API listening on http://localhost:${config.port}`)
  if (config.jobSecret === 'local-demo-secret-change-me') {
    console.warn('Using the local demo X_JOB_SECRET. Set X_JOB_SECRET before deployment.')
  }
})
