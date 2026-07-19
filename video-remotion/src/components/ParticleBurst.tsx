import { interpolate, useCurrentFrame } from "remotion";

const PARTICLES = [
  { angle: -2.8, distance: 760, size: 22, delay: 0 },
  { angle: -2.35, distance: 940, size: 48, delay: 3 },
  { angle: -1.95, distance: 810, size: 30, delay: 6 },
  { angle: -1.55, distance: 1050, size: 58, delay: 1 },
  { angle: -1.12, distance: 900, size: 20, delay: 5 },
  { angle: -0.7, distance: 1080, size: 42, delay: 2 },
  { angle: -0.28, distance: 840, size: 28, delay: 7 },
  { angle: 0.18, distance: 980, size: 62, delay: 0 },
  { angle: 0.62, distance: 890, size: 25, delay: 4 },
  { angle: 1.03, distance: 1110, size: 52, delay: 6 },
  { angle: 1.48, distance: 820, size: 34, delay: 1 },
  { angle: 1.9, distance: 1000, size: 19, delay: 5 },
  { angle: 2.34, distance: 880, size: 44, delay: 2 },
  { angle: 2.75, distance: 1060, size: 26, delay: 7 },
] as const;

export type ParticleBurstProps = {
  start?: number;
  originX?: number;
  originY?: number;
  color?: string;
  speed?: number;
};

export const ParticleBurst = ({
  start = 0,
  originX = 540,
  originY = 1040,
  color = "rgba(255,255,255,0.9)",
  speed = 1,
}: ParticleBurstProps) => {
  const frame = useCurrentFrame();

  return (
    <div style={{ inset: 0, overflow: "hidden", position: "absolute" }}>
      {PARTICLES.map((particle, index) => {
        const local = Math.max(0, (frame - start - particle.delay) * speed);
        const progress = interpolate(local, [0, 32], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const x = originX + Math.cos(particle.angle) * particle.distance * progress;
        const y = originY + Math.sin(particle.angle) * particle.distance * progress;
        const opacity = interpolate(progress, [0, 0.12, 0.72, 1], [0, 1, 0.75, 0]);
        const stretch = interpolate(progress, [0, 1], [0.7, 2.4]);
        return (
          <div
            key={`${particle.angle}-${index}`}
            style={{
              background: `radial-gradient(circle at 32% 28%, #FFFFFF 0 12%, ${color} 18%, rgba(109,202,190,0.22) 66%, rgba(255,255,255,0.76) 82%)`,
              border: "2px solid rgba(255,255,255,0.78)",
              borderRadius: "50%",
              boxShadow: "0 0 20px rgba(255,255,255,0.62)",
              height: particle.size * stretch,
              left: x,
              opacity,
              position: "absolute",
              rotate: `${(particle.angle * 180) / Math.PI + 90}deg`,
              top: y,
              width: particle.size,
            }}
          />
        );
      })}
    </div>
  );
};
