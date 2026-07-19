import { researchSources } from '../data/researchSources'
import { comments } from '../data/comments'

export const researchService = {
  getSources: async () => researchSources,
  getComments: async () => comments,
}

// Extension points: Feishu-exported CSV files and a real database can replace
// the local arrays here when the research workflow is ready.
