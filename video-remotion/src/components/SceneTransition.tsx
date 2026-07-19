import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { creativeAssets } from "../config/creative-asset-manifest";
import type { ProductAssetKey, ProductVideoConfig } from "../types/product-video";

export type SceneTransitionVariant =
  | "grape-swipe"
  | "petal-swipe"
  | "bubble-wipe"
  | "liquid-slash"
  | "flash";

export type SceneTransitionProps = {
  product: ProductVideoConfig;
  variant: SceneTransitionVariant;
};

const TRANSITION_DURATION = 12;

const OcclusionSwipe = ({
  product,
  assetKey,
  reverse = false,
}: {
  product: ProductVideoConfig;
  assetKey: ProductAssetKey;
  reverse?: boolean;
}) => {
  const frame = useCurrentFrame();
  const travel = interpolate(frame, [0, TRANSITION_DURATION - 1], [-1250, 1250], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const direction = reverse ? -1 : 1;

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Img
        src={staticFile(
          reverse ? creativeAssets.jasmineWaterSpiral : creativeAssets.grapeRefraction,
        )}
        style={{
          height: 2380,
          left: -660 + direction * travel,
          objectFit: "cover",
          position: "absolute",
          rotate: reverse ? "-18deg" : "18deg",
          top: -230,
          width: 2400,
        }}
      />
      <Img
        src={staticFile(product.assets[assetKey])}
        style={{
          filter: "drop-shadow(0 34px 34px rgba(55,85,25,0.2))",
          height: 1220,
          left: -120 + direction * travel,
          objectFit: "contain",
          position: "absolute",
          rotate: `${reverse ? -26 : 22}deg`,
          top: 330,
          width: 1220,
        }}
      />
    </AbsoluteFill>
  );
};

const BubbleWipe = ({ product }: { product: ProductVideoConfig }) => {
  const frame = useCurrentFrame();
  const growth = interpolate(frame, [0, 6, 11], [0.25, 1.18, 2.25], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fade = interpolate(frame, [7, 11], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const bubbles = [
    { x: 150, y: 1380, size: 130 },
    { x: 770, y: 1120, size: 180 },
    { x: 500, y: 520, size: 230 },
    { x: 120, y: 210, size: 160 },
    { x: 850, y: 140, size: 120 },
  ];

  return (
    <AbsoluteFill style={{ opacity: fade, overflow: "hidden" }}>
      <Img
        src={staticFile(creativeAssets.bubbleShockwave)}
        style={{
          height: "120%",
          left: "-10%",
          objectFit: "cover",
          position: "absolute",
          rotate: `${interpolate(frame, [0, 11], [-5, 6])}deg`,
          scale: growth,
          top: "-10%",
          width: "120%",
        }}
      />
      {bubbles.map((bubble, index) => (
        <div
          key={`${bubble.x}-${bubble.y}`}
          style={{
            background:
              index % 2 === 0
                ? product.primaryColor
                : "rgba(255,255,255,0.98)",
            border: "5px solid rgba(255,255,255,0.88)",
            borderRadius: "50%",
            height: bubble.size,
            left: bubble.x,
            position: "absolute",
            scale: growth * (1 + index * 0.05),
            top: bubble.y,
            width: bubble.size,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

const LiquidSlash = ({ product }: { product: ProductVideoConfig }) => {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [0, 11], [-1450, 1450], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Img
        src={staticFile(creativeAssets.liquidVortex)}
        style={{
          clipPath: "polygon(8% 0, 100% 0, 92% 100%, 0 100%)",
          height: 2300,
          left: x - 860,
          objectFit: "cover",
          position: "absolute",
          rotate: "12deg",
          top: -180,
          width: 1760,
        }}
      />
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          style={{
            background:
              index === 1
                ? "rgba(255,255,255,0.98)"
                : index === 0
                  ? product.primaryColor
                  : "rgba(205,247,229,0.98)",
            clipPath: "polygon(12% 0, 100% 0, 88% 100%, 0 100%)",
            height: 2300,
            left: x - 540 - index * 220,
            position: "absolute",
            rotate: "12deg",
            top: -180,
            width: index === 1 ? 900 : 520,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

export const SceneTransition = ({ product, variant }: SceneTransitionProps) => {
  const frame = useCurrentFrame();
  if (variant === "grape-swipe") {
    return <OcclusionSwipe product={product} assetKey="grapeCluster" />;
  }
  if (variant === "petal-swipe") {
    return <OcclusionSwipe product={product} assetKey="jasmineFlower" reverse />;
  }
  if (variant === "bubble-wipe") {
    return <BubbleWipe product={product} />;
  }
  if (variant === "liquid-slash") {
    return <LiquidSlash product={product} />;
  }

  const opacity = interpolate(frame, [0, 3, 5, 7, 11], [0, 0.24, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ backgroundColor: "#FFFFFF", opacity, overflow: "hidden" }}>
      <Img
        src={staticFile(creativeAssets.bubbleShockwave)}
        style={{
          height: "116%",
          left: "-8%",
          objectFit: "cover",
          position: "absolute",
          rotate: `${interpolate(frame, [0, 11], [-4, 5])}deg`,
          scale: interpolate(frame, [0, 11], [0.38, 2.05]),
          top: "-8%",
          width: "116%",
        }}
      />
    </AbsoluteFill>
  );
};
