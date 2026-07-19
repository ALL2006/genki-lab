import { AbsoluteFill, interpolate } from "remotion";
import { DynamicBackdrop } from "../components/DynamicBackdrop";
import { BubbleField, HaloPulse, LiquidField } from "../components/RemotionVisualSystem";
import { ProductBottle } from "../components/ProductBottle";
import { TextReveal } from "../components/TextReveal";
import type { ProductVideoConfig } from "../types/product-video";
import { useDesignFrame } from "../utils/motion";

export const ProductRevealScene = ({ product }: { product: ProductVideoConfig }) => {
  const frame = useDesignFrame();
  const bottleX = interpolate(frame, [0, 12, 59], [160, 0, -28], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ background: "#FFFFFF", color: product.darkColor, overflow: "hidden" }}>
      <DynamicBackdrop
        base="linear-gradient(150deg, #FFFFFF 0%, #F0FFD7 48%, #D6F3E7 100%)"
        dark="#17664E"
        energy={1.08}
      />
      <LiquidField color="#CDEFA8" accent="#8FE1C5" speed={1.3} opacity={0.7} />
      <HaloPulse color="#C8F56D" />
      <BubbleField intensity={1.8} />
      <div
        style={{
          color: "rgba(45,111,82,0.13)",
          fontFamily: "Arial Narrow",
          fontSize: 96,
          left: 44,
          letterSpacing: 6,
          lineHeight: 0.9,
          position: "absolute",
          top: 670,
          transform: "rotate(-90deg) translateX(-100%)",
          transformOrigin: "left top",
          whiteSpace: "nowrap",
        }}
      >
        GRAPE JASMINE
      </div>
      <TextReveal
        delay={1}
        direction="left"
        duration={5}
        style={{ fontSize: 34, left: 68, letterSpacing: 12, position: "absolute", top: 168 }}
      >
        {product.brandName}
      </TextReveal>
      <TextReveal
        delay={5}
        direction="right"
        duration={6}
        style={{
          fontFamily: "Noto Serif SC",
          fontSize: 106,
          left: 66,
          lineHeight: 1.02,
          position: "absolute",
          top: 250,
        }}
      >
        青提茉莉
      </TextReveal>
      <TextReveal
        delay={9}
        duration={5}
        style={{ fontSize: 118, left: 62, letterSpacing: -4, position: "absolute", top: 370 }}
      >
        气泡茶
      </TextReveal>
      <ProductBottle
        product={product}
        height={930}
        enterDelay={1}
        style={{ left: 375 + bottleX, position: "absolute", top: 610 }}
      />
      <TextReveal
        delay={14}
        direction="left"
        duration={5}
        style={{
          bottom: 135,
          color: "#2D7358",
          fontFamily: "Arial Narrow",
          fontSize: 32,
          left: 70,
          letterSpacing: 10,
          position: "absolute",
        }}
      >
        FRESH / LIGHT / CLEAR
      </TextReveal>
    </AbsoluteFill>
  );
};

export const ProductIntroScene = ProductRevealScene;
