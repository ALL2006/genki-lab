import { Trail } from "@remotion/motion-blur";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { DynamicBackdrop } from "../components/DynamicBackdrop";
import { BubbleBurst, BubbleField, LiquidField, SpeedTrail } from "../components/RemotionVisualSystem";
import { TextReveal } from "../components/TextReveal";
import type { ProductVideoConfig } from "../types/product-video";
import { useDesignFrame } from "../utils/motion";

const StreakWord = ({
  word,
  start,
  y,
  target,
  color,
  fontFamily,
}: {
  word: string;
  start: number;
  y: number;
  target: number;
  color: string;
  fontFamily?: string;
}) => {
  const frame = useDesignFrame();
  const x = interpolate(frame, [start, start + 7, start + 46, start + 57], [-980, target, target, 1280], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(frame, [start, start + 2, start + 48, start + 58], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <Trail layers={13} lagInFrames={0.28} trailOpacity={0.46}>
      <div
        style={{
          color,
          fontFamily,
          fontSize: 174,
          left: x,
          letterSpacing: -9,
          opacity,
          position: "absolute",
          textShadow: "0 24px 52px rgba(40,75,24,0.14)",
          top: y,
          whiteSpace: "nowrap",
        }}
      >
        {word}
      </div>
    </Trail>
  );
};

export const FusionScene = ({ product }: { product: ProductVideoConfig }) => (
  <AbsoluteFill
    style={{
      background: "linear-gradient(150deg, #FFFFFF, #E9FFD0 46%, #C9F4E3)",
      color: product.darkColor,
      overflow: "hidden",
    }}
  >
    <DynamicBackdrop
      base="linear-gradient(150deg, #FFFFFF, #E9FFD0 46%, #C9F4E3)"
      energy={1.6}
    />
    <LiquidField speed={2.6} opacity={0.7} />
    <BubbleBurst color={product.primaryColor} />
    <BubbleField intensity={3} />
    <SpeedTrail y={480} />
    <SpeedTrail color="#78D9B7" reverse y={1520} />
    <StreakWord word="青提" start={0} y={280} target={84} color="#547D18" />
    <StreakWord
      word="茉莉"
      start={9}
      y={715}
      target={340}
      color="#2D6753"
      fontFamily="Noto Serif SC"
    />
    <StreakWord word="气泡感" start={18} y={1120} target={90} color="#2A8066" />
    <TextReveal
      delay={34}
      duration={5}
      style={{
        bottom: 130,
        fontFamily: "Arial Narrow",
        fontSize: 34,
        left: 70,
        letterSpacing: 8,
        position: "absolute",
        right: 70,
        textAlign: "center",
      }}
    >
      FRUIT × TEA × BUBBLES
    </TextReveal>
  </AbsoluteFill>
);
