import type { ReactNode } from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { FontGate } from "../components/FontGate";
import {
  OcclusionTransition,
  type OcclusionVariant,
} from "../components/OcclusionTransition";
import { SoundDesign } from "../components/SoundDesign";
import { BubbleExplosionScene } from "../scenes/BubbleScene";
import { ProductEndCard } from "../scenes/EndCardScene";
import { FlavorScene } from "../scenes/FlavorScene";
import { FusionScene } from "../scenes/FusionScene";
import { OpeningScene } from "../scenes/OpeningScene";
import { ProductRevealScene } from "../scenes/ProductRevealScene";
import type { ProductVideoConfig } from "../types/product-video";

export type BeverageProductAdProps = {
  product: ProductVideoConfig;
};

const TRANSITION_FRAMES = 24;

export const BeverageProductAd = ({ product }: BeverageProductAdProps) => {
  const scenes: { key: string; duration: number; content: ReactNode }[] = [
    { key: "opening", duration: product.timings.opening, content: <OpeningScene product={product} /> },
    { key: "reveal", duration: product.timings.reveal, content: <ProductRevealScene product={product} /> },
    ...product.flavors.map((flavor, index) => ({
      key: `flavor-${index}`,
      duration: product.timings.flavor,
      content: <FlavorScene product={product} flavor={flavor} index={index} />,
    })),
    { key: "fusion", duration: product.timings.fusion, content: <FusionScene product={product} /> },
    { key: "bubble", duration: product.timings.bubble, content: <BubbleExplosionScene product={product} /> },
    { key: "end", duration: product.timings.end, content: <ProductEndCard product={product} /> },
  ];
  const transitionVariants: OcclusionVariant[] = [
    "bottle",
    "grape",
    "jasmine",
    "liquid",
    "bubble",
    "bottle",
  ];

  let cursor = 0;
  const sceneStarts = scenes.map((scene) => {
    const start = cursor;
    cursor += scene.duration;
    return start;
  });

  return (
    <FontGate>
      <AbsoluteFill style={{ backgroundColor: product.secondaryColor }}>
        {scenes.map((scene, index) => (
          <Sequence
            key={scene.key}
            from={sceneStarts[index]}
            durationInFrames={scene.duration}
            premountFor={40}
          >
            {scene.content}
          </Sequence>
        ))}
        {sceneStarts.slice(1).map((start, index) => (
          <Sequence
            key={`occlusion-${start}`}
            from={start - TRANSITION_FRAMES / 2}
            durationInFrames={TRANSITION_FRAMES}
          >
            <OcclusionTransition product={product} variant={transitionVariants[index]} />
          </Sequence>
        ))}
        <SoundDesign />
      </AbsoluteFill>
    </FontGate>
  );
};

export const VerticalVideoComposition = BeverageProductAd;
