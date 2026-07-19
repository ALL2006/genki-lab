import { AbsoluteFill, interpolate } from "remotion";
import { DynamicBackdrop } from "../components/DynamicBackdrop";
import { BubbleField, LiquidField, SpeedTrail } from "../components/RemotionVisualSystem";
import { TextReveal } from "../components/TextReveal";
import type { ProductVideoConfig } from "../types/product-video";
import { useDesignFrame } from "../utils/motion";

export const OpeningScene = ({ product }: { product: ProductVideoConfig }) => {
  const frame = useDesignFrame();
  const englishX = interpolate(frame, [0, 44], [180, -70]);
  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(155deg, #FFFFFF 0%, #F6FFE9 42%, #DDF8EC 100%)",
        color: product.darkColor,
        overflow: "hidden",
      }}
    >
      <DynamicBackdrop
        base="linear-gradient(155deg, #FFFFFF 0%, #F6FFE9 42%, #DDF8EC 100%)"
        energy={1.25}
      />
      <LiquidField speed={1.9} />
      <BubbleField intensity={2.2} />
      <SpeedTrail y={1090} />
      <SpeedTrail color="#87DCC0" reverse y={1400} />
      <div
        style={{
          color: "transparent",
          fontFamily: "Impact",
          fontSize: 220,
          left: englishX,
          letterSpacing: 12,
          opacity: 0.1,
          position: "absolute",
          rotate: "-8deg",
          top: 720,
          WebkitTextStroke: "4px #2C7358",
          whiteSpace: "nowrap",
        }}
      >
        LIGHTER
      </div>
      <TextReveal
        delay={1}
        direction="left"
        duration={5}
        style={{
          fontFamily: "Noto Serif SC",
          fontSize: 146,
          left: 68,
          lineHeight: 1,
          position: "absolute",
          top: 190,
        }}
      >
        今天，
      </TextReveal>
      <TextReveal
        delay={5}
        direction="right"
        duration={5}
        style={{
          fontSize: 206,
          left: 64,
          letterSpacing: -10,
          lineHeight: 0.95,
          position: "absolute",
          top: 360,
        }}
      >
        轻一点。
      </TextReveal>
      <TextReveal
        delay={10}
        direction="left"
        duration={5}
        style={{
          bottom: 146,
          fontFamily: "Arial Narrow",
          fontSize: 32,
          left: 72,
          letterSpacing: 12,
          position: "absolute",
        }}
      >
        GRAPE · JASMINE · BUBBLES
      </TextReveal>
    </AbsoluteFill>
  );
};
