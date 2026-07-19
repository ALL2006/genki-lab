import { Trail } from "@remotion/motion-blur";
import { AbsoluteFill, Easing, Img, interpolate, staticFile } from "remotion";
import type { ProductVideoConfig } from "../types/product-video";
import { useDesignFrame } from "../utils/motion";

export type OcclusionVariant = "bottle" | "grape" | "jasmine" | "bubble" | "liquid";

export const OcclusionTransition = ({
  product,
  variant,
}: {
  product: ProductVideoConfig;
  variant: OcclusionVariant;
}) => {
  const frame = useDesignFrame();
  const rush = interpolate(frame, [0, 5, 11], [0, 0.5, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const blur = interpolate(frame, [0, 5, 11], [10, 3, 14], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  if (variant === "bubble") {
    const scale = interpolate(frame, [0, 6, 11], [0.08, 7.8, 12], {
      easing: Easing.in(Easing.cubic),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const opacity = interpolate(frame, [0, 7, 11], [0.78, 1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return (
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <div
          style={{
            background:
              "radial-gradient(circle at 31% 26%, #FFFFFF 0 7%, #DFFFA0 18%, #82D9B9 64%, #2D745B 100%)",
            border: "12px solid rgba(255,255,255,0.9)",
            borderRadius: "50%",
            boxShadow: "0 0 70px rgba(112,220,177,0.55)",
            height: 300,
            left: 390,
            opacity,
            position: "absolute",
            scale,
            top: 810,
            width: 300,
          }}
        />
      </AbsoluteFill>
    );
  }

  if (variant === "liquid") {
    const x = interpolate(rush, [0, 0.5, 1], [-1500, -120, 1350]);
    return (
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <Trail layers={10} lagInFrames={0.3} trailOpacity={0.5}>
          <div
            style={{
              background:
                "linear-gradient(100deg, rgba(255,255,255,0.98), #B9E84A 42%, #8DE1C3 78%, rgba(255,255,255,0.98))",
              borderRadius: 999,
              filter: `blur(${blur * 0.55}px)`,
              height: 650,
              left: x,
              position: "absolute",
              rotate: "-23deg",
              top: 620,
              width: 1500,
            }}
          />
        </Trail>
      </AbsoluteFill>
    );
  }

  const fromLeft = variant !== "jasmine";
  const x = interpolate(
    rush,
    [0, 0.5, 1],
    fromLeft ? [-1320, -80, 1240] : [1320, -60, -1380],
  );
  const source =
    variant === "bottle"
      ? product.assets.productFront
      : variant === "grape"
        ? product.assets.grapeMotionPlate
        : product.assets.jasmineMotionPlate;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <Trail layers={9} lagInFrames={0.34} trailOpacity={0.38}>
        <Img
          src={staticFile(source)}
          style={{
            borderRadius: variant === "bottle" ? "44%" : "50%",
            clipPath:
              variant === "bottle"
                ? "ellipse(31% 49% at 50% 50%)"
                : "ellipse(47% 43% at 50% 53%)",
            filter: `blur(${blur}px) saturate(1.08)`,
            height: 2140,
            left: x,
            objectFit: "cover",
            position: "absolute",
            rotate: `${fromLeft ? -12 : 12}deg`,
            scale: variant === "bottle" ? 1.18 : 1.04,
            top: -110,
            width: 1260,
          }}
        />
      </Trail>
    </AbsoluteFill>
  );
};
