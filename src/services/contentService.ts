import { contentAssets } from '../data/contentAssets'

export const contentService = {
  getAll: async () => contentAssets,
  getByProductId: async (productId: string) =>
    contentAssets.filter((asset) => asset.productId === productId),
}

// Extension point: connect approved AI content-generation services later.
