import { Img, interpolate, spring, staticFile } from "remotion";
import type { ProductVideoConfig } from "../types/product-video";
import { DESIGN_FPS, useDesignFrame } from "../utils/motion";

export type ProductBottleProps = {
  product: ProductVideoConfig;
  height?: number;
  enterDelay?: number;
  blendMode?: React.CSSProperties["mixBlendMode"];
  style?: React.CSSProperties;
};

export const ProductBottle = ({
  product,
  height = 1240,
  enterDelay = 0,
  blendMode = "normal",
  style,
}: ProductBottleProps) => {
  const frame = useDesignFrame();
  const entrance = spring({
    fps: DESIGN_FPS,
    frame: frame - enterDelay,
    config: { damping: 25, stiffness: 150, mass: 0.85 },
    durationInFrames: 26,
  });
  const floatX = Math.sin((frame + 7) / 17) * 6;
  const floatY = Math.sin(frame / 13) * 10;
  const tilt = Math.sin(frame / 19) * 0.65;
  const sheenX = interpolate(frame % 58, [0, 57], [-420, 650]);
  const width = height * 0.62;

  return (
    <div
      style={{
        height,
        opacity: interpolate(entrance, [0, 1], [0, 1]),
        position: "relative",
        rotate: `${tilt}deg`,
        scale: interpolate(entrance, [0, 1], [0.9, 1]),
        translate: `${floatX}px ${interpolate(entrance, [0, 1], [82, 0]) + floatY}px`,
        width,
        ...style,
      }}
    >
      <div
        style={{
          background:
            "radial-gradient(ellipse, rgba(21,105,77,0.48) 0%, rgba(91,176,82,0.24) 38%, rgba(255,255,255,0) 72%)",
          filter: "blur(22px)",
          height: "78%",
          left: "2%",
          opacity: 0.72 + Math.sin(frame / 16) * 0.08,
          position: "absolute",
          scale: 1.08 + Math.sin(frame / 22) * 0.025,
          top: "10%",
          width: "96%",
        }}
      />
      <div
        style={{
          background: "rgba(23,70,51,0.28)",
          borderRadius: "50%",
          bottom: "5.2%",
          filter: "blur(20px)",
          height: "3.8%",
          left: "21%",
          position: "absolute",
          scale: 1 + Math.sin(frame / 13) * 0.04,
          width: "58%",
        }}
      />
      <Img
        src={staticFile(product.assets.productFront)}
        style={{
          display: "block",
          filter:
            "brightness(1.02) contrast(1.09) saturate(1.09) drop-shadow(0 28px 28px rgba(23,66,48,0.28))",
          height: "100%",
          left: 0,
          maskImage:
            "radial-gradient(ellipse 48% 51% at 50% 50%, #000 69%, rgba(0,0,0,0.94) 78%, rgba(0,0,0,0) 100%)",
          mixBlendMode: blendMode,
          objectFit: "contain",
          position: "absolute",
          top: 0,
          WebkitMaskImage:
            "radial-gradient(ellipse 48% 51% at 50% 50%, #000 69%, rgba(0,0,0,0.94) 78%, rgba(0,0,0,0) 100%)",
          width: "100%",
        }}
      />
      <div
        style={{
          background:
            "linear-gradient(105deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.66) 48%, rgba(255,255,255,0) 100%)",
          filter: "blur(7px)",
          height: "72%",
          left: sheenX,
          maskImage: "linear-gradient(#000, #000)",
          mixBlendMode: "screen",
          opacity: 0.44,
          position: "absolute",
          rotate: "8deg",
          top: "13%",
          width: "18%",
        }}
      />
    </div>
  );
};
