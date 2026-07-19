import { interpolate, useCurrentFrame } from "remotion";

const BUBBLES = [
  { x: 92, y: 1710, size: 28, speed: 2.2, drift: 18 },
  { x: 206, y: 1810, size: 54, speed: 3.1, drift: -24 },
  { x: 328, y: 1660, size: 22, speed: 2.6, drift: 28 },
  { x: 462, y: 1870, size: 40, speed: 3.7, drift: -18 },
  { x: 590, y: 1740, size: 68, speed: 2.8, drift: 20 },
  { x: 728, y: 1830, size: 30, speed: 4.1, drift: -30 },
  { x: 852, y: 1680, size: 46, speed: 3.3, drift: 16 },
  { x: 980, y: 1790, size: 24, speed: 2.4, drift: -22 },
  { x: 144, y: 1510, size: 18, speed: 3.9, drift: 14 },
  { x: 394, y: 1580, size: 32, speed: 2.9, drift: -20 },
  { x: 680, y: 1490, size: 20, speed: 3.5, drift: 24 },
  { x: 912, y: 1550, size: 58, speed: 2.7, drift: -16 },
] as const;

export type FloatingBubblesProps = {
  intensity?: number;
  color?: string;
};

export const FloatingBubbles = ({
  intensity = 1,
  color = "rgba(255,255,255,0.82)",
}: FloatingBubblesProps) => {
  const frame = useCurrentFrame();

  return (
    <div style={{ inset: 0, overflow: "hidden", position: "absolute" }}>
      {BUBBLES.map((bubble, index) => {
        const travel = ((frame * bubble.speed * intensity + index * 47) % 1880) - 120;
        const x = bubble.x + Math.sin((frame + index * 13) / 30) * bubble.drift;
        const opacity = interpolate(travel, [-120, 40, 1580, 1760], [0, 0.75, 0.55, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <div
            key={`${bubble.x}-${bubble.y}`}
            style={{
              background: `radial-gradient(circle at 32% 28%, ${color} 0 14%, rgba(255,255,255,0.16) 18%, rgba(122,201,217,0.18) 62%, rgba(255,255,255,0.76) 76%, rgba(255,255,255,0.08) 82%)`,
              border: "2px solid rgba(255,255,255,0.72)",
              borderRadius: "50%",
              boxShadow: "inset -5px -8px 12px rgba(74,155,176,0.18)",
              height: bubble.size,
              left: x,
              opacity,
              position: "absolute",
              top: bubble.y - travel,
              width: bubble.size,
            }}
          />
        );
      })}
    </div>
  );
};
