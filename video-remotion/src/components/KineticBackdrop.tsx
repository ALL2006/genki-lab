import { Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import type { CreativeAssetKey } from "../config/creative-asset-manifest";
import { creativeAssets } from "../config/creative-asset-manifest";

export type KineticBackdropProps = {
  asset: CreativeAssetKey;
  duration: number;
  fromScale?: number;
  toScale?: number;
  fromX?: number;
  toX?: number;
  fromY?: number;
  toY?: number;
  fromRotate?: number;
  toRotate?: number;
  opacity?: number;
  blur?: number;
};

export const KineticBackdrop = ({
  asset,
  duration,
  fromScale = 1.12,
  toScale = 1.3,
  fromX = 0,
  toX = 0,
  fromY = 0,
  toY = 0,
  fromRotate = 0,
  toRotate = 0,
  opacity = 1,
  blur = 0,
}: KineticBackdropProps) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, Math.max(1, duration - 1)], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Img
      src={staticFile(creativeAssets[asset])}
      style={{
        filter: blur > 0 ? `blur(${blur}px)` : undefined,
        height: "116%",
        left: "-8%",
        objectFit: "cover",
        opacity,
        position: "absolute",
        rotate: `${interpolate(progress, [0, 1], [fromRotate, toRotate])}deg`,
        scale: interpolate(progress, [0, 1], [fromScale, toScale]),
        top: "-8%",
        translate: `${interpolate(progress, [0, 1], [fromX, toX])}px ${interpolate(progress, [0, 1], [fromY, toY])}px`,
        width: "116%",
      }}
    />
  );
};
