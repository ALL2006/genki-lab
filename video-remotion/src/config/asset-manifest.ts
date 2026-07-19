import type { ProductAssetKey } from "../types/product-video";

export const productAssets = {
  background: "assets/products/qingti-jasmine/background.png",
  grapeCluster: "assets/products/qingti-jasmine/grape-cluster.png",
  grapeMotionPlate: "assets/generated/qingti-jasmine/grape-water-cgi-v2.png",
  grapeSingle: "assets/products/qingti-jasmine/grape-single.png",
  jasmineFlower: "assets/products/qingti-jasmine/jasmine-flower.png",
  jasmineMotionPlate: "assets/generated/qingti-jasmine/jasmine-water-cgi-v2.png",
  jasminePetals: "assets/products/qingti-jasmine/jasmine-petals.png",
  logo: "assets/products/qingti-jasmine/logo.png",
  productFront: "assets/products/qingti-jasmine/product-front.png",
  productHero: "assets/products/qingti-jasmine/product-hero.png",
  productThreeView: "assets/products/qingti-jasmine/product-three-view.png",
  waterSplash: "assets/products/qingti-jasmine/water-splash.png",
} as const satisfies Record<ProductAssetKey, string>;

export const transparentAssetKeys = [
  "grapeCluster",
  "grapeSingle",
  "jasmineFlower",
  "jasminePetals",
  "waterSplash",
] as const satisfies readonly ProductAssetKey[];

export const assetUrl = (key: ProductAssetKey): string => productAssets[key];
