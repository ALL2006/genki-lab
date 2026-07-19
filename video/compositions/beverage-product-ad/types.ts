export interface FlavorConfig {
  name: string
  description: string
  asset: string
  duration: number
}

export interface LifestyleConfig {
  name: string
  asset: string
}

export interface BeverageProductConfig {
  id: string
  brandName: string
  productName: string
  shortName: string
  category: string
  targetConsumer: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor: string
  flavors: FlavorConfig[]
  benefits: string[]
  scenes: LifestyleConfig[]
  openingLine: string
  sensoryLine: string
  refreshLine: string
  lifestyleLine: string
  slogan: string
  conceptLabel: string
  disclaimer: string
  assets: {
    productFront: string
    productHero: string
    productThreeView: string
    background: string
    logo: string
  }
  timeline: {
    opening: number
    productIntro: number
    bubbleExplosion: number
    lifestyle: number
    endCard: number
  }
  output: {
    width: number
    height: number
    fps: number
  }
}
