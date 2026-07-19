import { productAssets } from "../config/asset-manifest";
import type { ProductVideoConfig } from "../types/product-video";

export const qingtiJasmineProduct: ProductVideoConfig = {
  brandName: "元气森林",
  productName: "青提茉莉气泡茶",
  fullProductName: "元气森林青提茉莉气泡茶",
  category: "花果香气泡茶概念产品",
  conceptLabel: "概念产品演示",
  sloganLine1: "一口青提，一缕茉莉，",
  sloganLine2: "让今天轻一点。",
  primaryColor: "#B9E84A",
  secondaryColor: "#F7FFE9",
  accentColor: "#2A8066",
  darkColor: "#203414",
  flavors: [
    {
      title: "青提果香",
      description: "清甜鲜活，入口清爽",
      assetKey: "grapeCluster",
      motionPlateKey: "grapeMotionPlate",
      secondaryAssetKey: "grapeSingle",
    },
    {
      title: "茉莉茶香",
      description: "花香轻盈，余味舒展",
      assetKey: "jasmineFlower",
      motionPlateKey: "jasmineMotionPlate",
      secondaryAssetKey: "jasminePetals",
    },
  ],
  keywords: ["清爽", "花果香", "细密气泡感"],
  scenes: ["午后学习", "日常通勤", "轻松休息"],
  disclaimer:
    "本产品为概念演示，具体配方、营养信息及上市计划需经研发与合规确认。",
  assets: productAssets,
  timings: {
    opening: 90,
    reveal: 120,
    flavor: 120,
    fusion: 120,
    bubble: 180,
    end: 150,
  },
};
