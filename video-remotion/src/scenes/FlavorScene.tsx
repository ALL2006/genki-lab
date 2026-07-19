import { AbsoluteFill, Easing, Img, interpolate, staticFile } from "remotion";
import { DynamicBackdrop } from "../components/DynamicBackdrop";
import {
  BubbleField,
  LiquidField,
  PetalField,
  SpeedTrail,
} from "../components/RemotionVisualSystem";
import { TextReveal } from "../components/TextReveal";
import type { FlavorConfig, ProductVideoConfig } from "../types/product-video";
import { useDesignFrame } from "../utils/motion";

export const FlavorScene = ({
  product,
  flavor,
  index,
}: {
  product: ProductVideoConfig;
  flavor: FlavorConfig;
  index: number;
}) => {
  const frame = useDesignFrame();
  const isGrape = index % 2 === 0;
  const plateReveal = interpolate(frame, [0, 9], [0.82, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const plateScale = interpolate(frame, [0, 59], [1.13, 1.025], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        background: isGrape
          ? "linear-gradient(145deg, #FFFFFF 0%, #F6FFDD 48%, #D9F7C1 100%)"
          : "linear-gradient(145deg, #FFFFFF 0%, #F0FFF9 46%, #D6F4E8 100%)",
        color: product.darkColor,
        overflow: "hidden",
      }}
    >
      <DynamicBackdrop
        base={
          isGrape
            ? "linear-gradient(145deg, #FFFFFF 0%, #F6FFDD 48%, #D9F7C1 100%)"
            : "linear-gradient(145deg, #FFFFFF 0%, #F0FFF9 46%, #D6F4E8 100%)"
        }
        primary={isGrape ? "#B9E84A" : "#B8F2DC"}
        secondary={isGrape ? "#87D8A9" : "#79D7B8"}
        energy={1.2}
      />
      <Img
        src={staticFile(product.assets[flavor.motionPlateKey])}
        style={{
          filter: `saturate(${isGrape ? 1.08 : 0.93}) contrast(1.02) brightness(1.03)`,
          height: "100%",
          objectFit: "cover",
          opacity: plateReveal * 0.88,
          scale: plateScale,
          translate: `${isGrape ? -20 + frame * 0.42 : 18 - frame * 0.38}px ${isGrape ? 18 : -12}px`,
          width: "100%",
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.58) 19%, rgba(255,255,255,0.04) 42%, rgba(244,255,238,0.04) 70%, rgba(244,255,238,0.78) 100%)",
        }}
      />
      <LiquidField color={isGrape ? "#B9E84A" : "#A9E7D0"} speed={1.9} opacity={0.23} />
      {!isGrape && <PetalField />}
      <BubbleField intensity={isGrape ? 1.55 : 1.05} />
      <SpeedTrail color={isGrape ? "#B9E84A" : "#8DE1C3"} reverse={!isGrape} y={1280} />
      <SpeedTrail color="#FFFFFF" reverse={isGrape} y={1040} />

      <div
        style={{
          color: "rgba(255,255,255,0.42)",
          fontFamily: "Arial Narrow",
          fontSize: 116,
          letterSpacing: 5,
          position: "absolute",
          right: isGrape ? 20 : undefined,
          left: isGrape ? undefined : 18,
          textOrientation: "mixed",
          top: 520,
          WebkitTextStroke: "2px rgba(45,110,82,0.35)",
          writingMode: "vertical-rl",
        }}
      >
        {isGrape ? "GRAPE" : "JASMINE"}
      </div>

      <div
        style={{
          alignItems: isGrape ? "flex-end" : "flex-start",
          display: "flex",
          flexDirection: "column",
          left: 66,
          position: "absolute",
          right: 66,
          top: 166,
        }}
      >
        <TextReveal
          delay={1}
          direction={isGrape ? "right" : "left"}
          duration={6}
          style={{
            fontFamily: "Noto Serif SC",
            fontSize: 112,
            letterSpacing: -5,
            textAlign: isGrape ? "right" : "left",
          }}
        >
          {flavor.title}
        </TextReveal>
        <TextReveal
          delay={8}
          duration={6}
          style={{
            background: "rgba(255,255,255,0.82)",
            border: "2px solid rgba(255,255,255,0.94)",
            borderRadius: 999,
            boxShadow: "0 20px 50px rgba(73,119,61,0.1)",
            fontSize: 36,
            marginTop: 14,
            padding: "12px 25px 15px",
          }}
        >
          {flavor.description}
        </TextReveal>
      </div>

      <TextReveal
        delay={17}
        direction={isGrape ? "left" : "right"}
        duration={6}
        style={{
          bottom: 135,
          fontFamily: "Arial Narrow",
          fontSize: 30,
          left: 70,
          letterSpacing: 7,
          position: "absolute",
          right: 70,
          textAlign: "center",
        }}
      >
        {isGrape ? "JUICY / CRISP / FRESH" : "FLORAL / AIRY / CLEAR"}
      </TextReveal>
    </AbsoluteFill>
  );
};
