export type ProductAssetKey =
  | "background"
  | "grapeCluster"
  | "grapeMotionPlate"
  | "grapeSingle"
  | "jasmineFlower"
  | "jasmineMotionPlate"
  | "jasminePetals"
  | "logo"
  | "productFront"
  | "productHero"
  | "productThreeView"
  | "waterSplash";

export type FlavorConfig = {
  title: string;
  description: string;
  assetKey: ProductAssetKey;
  motionPlateKey: ProductAssetKey;
  secondaryAssetKey?: ProductAssetKey;
};

export type ProductVideoTimings = {
  opening: number;
  reveal: number;
  flavor: number;
  fusion: number;
  bubble: number;
  end: number;
};

export type ProductVideoConfig = {
  brandName: string;
  productName: string;
  fullProductName: string;
  category: string;
  conceptLabel: string;
  sloganLine1: string;
  sloganLine2: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  darkColor: string;
  flavors: FlavorConfig[];
  keywords: string[];
  scenes: string[];
  disclaimer: string;
  assets: Record<ProductAssetKey, string>;
  timings: ProductVideoTimings;
};

export const getProductDuration = (product: ProductVideoConfig): number =>
  product.timings.opening +
  product.timings.reveal +
  product.flavors.length * product.timings.flavor +
  product.timings.fusion +
  product.timings.bubble +
  product.timings.end;
