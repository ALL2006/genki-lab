export type DataStatus = 'placeholder' | 'pending' | 'ready' | 'archived'

export interface ResearchSource {
  id: string
  title: string
  type: string
  organization: string
  publishedAt: string
  summary: string
  imageUrl: string
  sourceUrl: string
  status: DataStatus
}

export interface UserComment {
  id: string
  platform: string
  brand: string
  product: string
  content: string
  flavorTags: string[]
  sceneTags: string[]
  healthTags: string[]
  packagingTags: string[]
  sentiment: 'positive' | 'neutral' | 'negative' | 'unknown'
  sourceUrl: string
  anonymized: boolean
}

export interface TrendOpportunity {
  id: string
  title: string
  keywords: string[]
  audience: string
  scene: string
  painPoint: string
  recommendedFlavor: string
  trendScore: number | null
  brandFitScore: number | null
  evidence: string[]
  status: DataStatus
}

export interface ProductConcept {
  id: string
  name: string
  category: string
  audience: string
  scenes: string[]
  mainFlavor: string
  secondaryFlavor: string
  benefits: string[]
  packagingDirection: string
  priceRange: string
  slogan: string
  trendScore: number | null
  brandFitScore: number | null
  differentiationScore: number | null
  visualScore: number | null
  userIntentScore: number | null
  status: DataStatus
}

export interface ContentAsset {
  id: string
  productId: string
  assetType: string
  title: string
  content: string
  platform: string
  previewUrl: string
  status: DataStatus
}

export interface ValidationResponse {
  id: string
  productId: string
  flavorInterest: string
  packagingChoice: string
  drinkingScene: string
  purchaseIntent: string
  priceRange: string
  openFeedback: string
  submittedAt: string
}
