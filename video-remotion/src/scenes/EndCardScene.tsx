import { AbsoluteFill, Easing, interpolate } from "remotion";
import { DynamicBackdrop } from "../components/DynamicBackdrop";
import { ProductBottle } from "../components/ProductBottle";
import {
  BubbleField,
  HaloPulse,
  LiquidField,
  PetalField,
  SpeedTrail,
} from "../components/RemotionVisualSystem";
import { TextReveal } from "../components/TextReveal";
import type { ProductVideoConfig } from "../types/product-video";
import { useDesignFrame } from "../utils/motion";

export type EndCardSceneProps = {
  product: ProductVideoConfig;
};

export const ProductEndCard = ({ product }: EndCardSceneProps) => {
  const frame = useDesignFrame();
  const settle = interpolate(frame, [0, 17, 74], [1.08, 1, 1.025], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(155deg, #FFFFFF 0%, ${product.secondaryColor} 46%, #DDF7E9 100%)`,
        color: product.darkColor,
        overflow: "hidden",
      }}
    >
      <DynamicBackdrop
        base={`linear-gradient(155deg, #FFFFFF 0%, ${product.secondaryColor} 46%, #DDF7E9 100%)`}
        dark="#155F49"
        energy={0.92}
      />
      <LiquidField color={product.primaryColor} accent="#FFFFFF" speed={1.8} opacity={0.76} />
      <HaloPulse color={product.primaryColor} />
      <BubbleField intensity={1.8} />
      <PetalField />
      <SpeedTrail color={product.primaryColor} y={800} />

      <div
        style={{
          color: "rgba(46,112,84,0.12)",
          fontFamily: "Arial Narrow",
          fontSize: 110,
          left: 18,
          letterSpacing: 5,
          position: "absolute",
          textOrientation: "mixed",
          top: 500,
          writingMode: "vertical-rl",
        }}
      >
        GENKI FOREST
      </div>

      <div
        style={{
          alignItems: "center",
          display: "flex",
          height: 830,
          justifyContent: "center",
          left: 50,
          position: "absolute",
          top: 465,
          width: 760,
        }}
      >
        <ProductBottle product={product} height={760} enterDelay={1} style={{ scale: settle }} />
      </div>

      <TextReveal
        delay={1}
        direction="left"
        duration={5}
        style={{
          fontFamily: "Noto Serif SC",
          fontSize: 102,
          left: 62,
          letterSpacing: -5,
          lineHeight: 1,
          position: "absolute",
          top: 165,
        }}
      >
        青提茉莉
      </TextReveal>
      <TextReveal
        delay={5}
        direction="right"
        duration={5}
        style={{
          color: "#286F58",
          fontSize: 106,
          position: "absolute",
          right: 62,
          top: 280,
        }}
      >
        气泡茶
      </TextReveal>

      <TextReveal
        delay={12}
        direction="right"
        duration={6}
        style={{
          fontSize: 48,
          left: 78,
          letterSpacing: 0,
          lineHeight: 1.42,
          position: "absolute",
          right: 66,
          textAlign: "right",
          top: 1350,
        }}
      >
        {product.sloganLine1}
        <br />
        {product.sloganLine2}
      </TextReveal>
      <TextReveal
        delay={19}
        direction="left"
        duration={5}
        style={{
          bottom: 120,
          color: "#2B6D56",
          fontFamily: "Arial Narrow",
          fontSize: 30,
          left: 70,
          letterSpacing: 10,
          position: "absolute",
        }}
      >
        FRESHNESS IN EVERY SIP
      </TextReveal>
    </AbsoluteFill>
  );
};

export const EndCardScene = ProductEndCard;
