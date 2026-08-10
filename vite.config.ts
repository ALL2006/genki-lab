import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(() => {
  const localJobSecret = process.env.X_JOB_SECRET || 'local-demo-secret-change-me'
  const localAIImportSecret = process.env.AI_IMPORT_SECRET || 'local-ai-import-secret-change-me'

  return {
    base: './',
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:8787',
          headers: {
            'X-JOB-SECRET': localJobSecret,
            'X-AI-IMPORT-SECRET': localAIImportSecret,
          },
        },
      },
    },
  }
})
