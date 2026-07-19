import { Img, staticFile, useCurrentFrame } from "remotion";
import type { ProductAssetKey, ProductVideoConfig } from "../types/product-video";

export type FloatingIngredient = {
  assetKey: ProductAssetKey;
  x: number;
  y: number;
  size: number;
  rotate?: number;
  drift?: number;
  phase?: number;
  opacity?: number;
};

export type FloatingIngredientsProps = {
  product: ProductVideoConfig;
  items: readonly FloatingIngredient[];
};

export const FloatingIngredients = ({ product, items }: FloatingIngredientsProps) => {
  const frame = useCurrentFrame();

  return (
    <>
      {items.map((item, index) => {
        const phase = item.phase ?? index * 19;
        const drift = item.drift ?? 18;
        return (
          <Img
            key={`${item.assetKey}-${index}`}
            src={staticFile(product.assets[item.assetKey])}
            style={{
              height: item.size,
              left: item.x + Math.sin((frame + phase) / 34) * drift,
              objectFit: "contain",
              opacity: item.opacity ?? 1,
              position: "absolute",
              rotate: `${(item.rotate ?? 0) + Math.sin((frame + phase) / 46) * 4}deg`,
              top: item.y + Math.cos((frame + phase) / 38) * drift,
              width: item.size,
            }}
          />
        );
      })}
    </>
  );
};
