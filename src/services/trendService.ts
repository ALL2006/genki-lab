import { trends } from '../data/trends'

export const trendService = {
  getAll: async () => trends,
}

// Extension point: call an AI model here after a reviewed prompt and data
// governance process have been defined.
