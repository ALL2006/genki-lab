import { AbsoluteFill, interpolate } from "remotion";
import { DynamicBackdrop } from "../components/DynamicBackdrop";
import {
  BubbleBurst,
  BubbleField,
  HaloPulse,
  LiquidField,
  SpeedTrail,
} from "../components/RemotionVisualSystem";
import { ProductBottle } from "../components/ProductBottle";
import { TextReveal } from "../components/TextReveal";
import type { ProductVideoConfig } from "../types/product-video";
import { useDesignFrame } from "../utils/motion";

export const BubbleExplosionScene = ({ product }: { product: ProductVideoConfig }) => {
  const frame = useDesignFrame();
  const x = interpolate(frame, [0, 14, 89], [150, 0, -55], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #CFF4E4 0%, #FFFFFF 50%, #EFFFCE 100%)",
        color: product.darkColor,
        overflow: "hidden",
      }}
    >
      <DynamicBackdrop
        base="linear-gradient(180deg, #CFF4E4 0%, #FFFFFF 50%, #EFFFCE 100%)"
        primary="#9EE73E"
        secondary="#52C99F"
        energy={1.85}
      />
      <LiquidField color="#8EE2C4" accent="#CFFF68" speed={3} />
      <HaloPulse color="#B9E84A" />
      <BubbleBurst color={product.primaryColor} />
      <BubbleField intensity={4.2} />
      <SpeedTrail color="#FFFFFF" y={760} />
      <SpeedTrail color="#B9E84A" reverse y={1330} />
      <div
        style={{
          bottom: 170,
          color: "transparent",
          fontFamily: "Impact",
          fontSize: 155,
          left: -30,
          letterSpacing: 5,
          opacity: 0.12,
          position: "absolute",
          rotate: "-8deg",
          WebkitTextStroke: "3px #26785E",
        }}
      >
        BUBBLES
      </div>
      <TextReveal
        delay={1}
        direction="left"
        duration={5}
        exitAt={27}
        exitDuration={5}
        style={{
          fontFamily: "Arial Narrow",
          fontSize: 56,
          left: 58,
          letterSpacing: 2,
          position: "absolute",
          top: 172,
        }}
      >
        果香 × 茶香 × 气泡感
      </TextReveal>
      <TextReveal
        delay={30}
        direction="right"
        duration={6}
        style={{
          color: "#276F57",
          fontFamily: "Noto Serif SC",
          fontSize: 118,
          left: 58,
          letterSpacing: -7,
          lineHeight: 0.94,
          position: "absolute",
          top: 165,
        }}
      >
        清爽
        <br />
        刚刚好
      </TextReveal>
      <ProductBottle
        product={product}
        height={820}
        enterDelay={0}
        style={{
          left: 350 + x,
          position: "absolute",
          rotate: `${Math.sin(frame / 11) * 1.8}deg`,
          top: 650,
        }}
      />
    </AbsoluteFill>
  );
};

export const BubbleScene = BubbleExplosionScene;
