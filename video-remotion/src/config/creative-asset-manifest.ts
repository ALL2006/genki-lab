export type CreativeAssetKey =
  | "liquidVortex"
  | "grapeRefraction"
  | "jasmineWaterSpiral"
  | "bubbleShockwave";

export const creativeAssets = {
  liquidVortex: "assets/generated/qingti-jasmine/liquid-vortex.png",
  grapeRefraction: "assets/generated/qingti-jasmine/grape-refraction.png",
  jasmineWaterSpiral: "assets/generated/qingti-jasmine/jasmine-water-spiral.png",
  bubbleShockwave: "assets/generated/qingti-jasmine/bubble-shockwave.png",
} as const satisfies Record<CreativeAssetKey, string>;
