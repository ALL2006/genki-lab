import { useState } from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { AssetFallback } from "../components/AssetFallback";
import { FontGate, useSourceHanFont } from "../components/FontGate";
import { productAssets, transparentAssetKeys } from "../config/asset-manifest";
import type { ProductAssetKey } from "../types/product-video";

const ASSET_LABELS: Record<ProductAssetKey, string> = {
  background: "背景",
  grapeCluster: "青提簇",
  grapeMotionPlate: "青提水光动态底板",
  grapeSingle: "单颗青提",
  jasmineFlower: "茉莉花",
  jasmineMotionPlate: "茉莉水光动态底板",
  jasminePetals: "茉莉花瓣",
  logo: "品牌Logo（仅检查）",
  productFront: "产品正面",
  productHero: "产品主视觉",
  productThreeView: "产品三视图（仅检查）",
  waterSplash: "透明水花",
};

const assetKeys = Object.keys(productAssets) as ProductAssetKey[];
const transparentSet = new Set<ProductAssetKey>(transparentAssetKeys);

const AssetCheckGrid = () => {
  const fontFamily = useSourceHanFont();
  const [failed, setFailed] = useState<Set<ProductAssetKey>>(() => new Set());

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(160deg, #F7FFF4 0%, #E8F7ED 100%)",
        color: "#203414",
        overflow: "hidden",
        padding: "56px 62px 54px",
      }}
    >
      <div style={{ alignItems: "flex-start", display: "flex", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 48, letterSpacing: 1 }}>AssetCheck · 十二项素材预检</div>
          <div style={{ color: "#52704A", fontSize: 26, marginTop: 8 }}>
            实际命中字体：{fontFamily} · 700
          </div>
        </div>
        <div style={{ color: "#52704A", fontSize: 22, lineHeight: 1.45, textAlign: "right" }}>
          元气森林青提茉莉气泡茶
          <br />
          一口青提，一缕茉莉
          <br />
          让今天轻一点
          <br />
          清爽果香与轻盈茶香
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gap: "12px 16px",
          gridTemplateColumns: "1fr 1fr",
          marginTop: 34,
        }}
      >
        {assetKeys.map((key) => {
          const relativePath = `public/${productAssets[key]}`;
          const isTransparent = transparentSet.has(key);
          return (
            <div
              key={key}
              style={{
                backgroundColor: "rgba(255,255,255,0.88)",
                border: "2px solid rgba(52,100,61,0.15)",
                borderRadius: 22,
                boxShadow: "0 10px 28px rgba(44,90,60,0.08)",
                display: "grid",
                gridTemplateColumns: "156px 1fr",
                height: 232,
                overflow: "hidden",
                padding: 14,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: 8 }}>
                <div style={{ color: "#6E8A60", fontSize: 18 }}>{key}</div>
                <div style={{ fontSize: 28, lineHeight: 1.16, marginTop: 6 }}>{ASSET_LABELS[key]}</div>
                <div style={{ color: "#61735C", fontSize: 15, lineHeight: 1.2, marginTop: 10, wordBreak: "break-all" }}>
                  {productAssets[key].split("/").slice(-1)[0]}
                </div>
              </div>
              <div
                style={{
                  background: isTransparent
                    ? "linear-gradient(90deg, #292D32 0%, #292D32 50%, #FF00FF 50%, #FF00FF 100%)"
                    : "linear-gradient(145deg, #FFFFFF 0%, #EEF4EA 100%)",
                  borderRadius: 15,
                  minWidth: 0,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {failed.has(key) ? (
                  <AssetFallback relativePath={relativePath} />
                ) : (
                  <Img
                    onError={() =>
                      setFailed((current) => {
                        const next = new Set(current);
                        next.add(key);
                        return next;
                      })
                    }
                    src={staticFile(productAssets[key])}
                    style={{ height: "100%", objectFit: "contain", width: "100%" }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const AssetCheck = () => (
  <FontGate>
    <AssetCheckGrid />
  </FontGate>
);
