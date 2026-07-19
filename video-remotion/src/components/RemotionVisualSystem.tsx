import { Trail } from "@remotion/motion-blur";
import { noise3D } from "@remotion/noise";
import { Circle } from "@remotion/shapes";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { useDesignFrame } from "../utils/motion";

const BUBBLE_SPECS = Array.from({ length: 22 }, (_, index) => ({
  x: 50 + ((index * 173) % 980),
  y: 80 + ((index * 281) % 1760),
  radius: 12 + ((index * 17) % 48),
  speed: 2.4 + (index % 6) * 0.52,
  phase: index * 0.37,
}));

export type BubbleFieldProps = {
  intensity?: number;
  tint?: string;
};

export const BubbleField = ({
  intensity = 1,
  tint = "rgba(255,255,255,0.36)",
}: BubbleFieldProps) => {
  const frame = useDesignFrame();
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {BUBBLE_SPECS.map((bubble, index) => {
        const rise = (frame * bubble.speed * intensity + index * 83) % 2100;
        const wobble = noise3D("bubble-x", index * 0.15, frame * 0.035, bubble.phase) * 54;
        const pulse = 1 + noise3D("bubble-pulse", index * 0.2, 0, frame * 0.025) * 0.14;
        return (
          <Circle
            key={index}
            radius={bubble.radius}
            fill={tint}
            stroke="rgba(255,255,255,0.88)"
            strokeWidth={2}
            style={{
              filter: "drop-shadow(0 9px 13px rgba(96,186,164,0.18))",
              left: bubble.x + wobble,
              opacity: 0.35 + (index % 4) * 0.12,
              position: "absolute",
              scale: pulse,
              top: bubble.y - rise + 260,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

export type LiquidFieldProps = {
  color?: string;
  accent?: string;
  speed?: number;
  opacity?: number;
};

export const LiquidField = ({
  color = "#AEEBD1",
  accent = "#D8FF70",
  speed = 1,
  opacity = 1,
}: LiquidFieldProps) => {
  const frame = useDesignFrame();
  const wave = noise3D("liquid-wave", 0.2, frame * 0.018 * speed, 0.8);
  const wave2 = noise3D("liquid-wave-2", 0.7, frame * 0.014 * speed, 0.1);
  const y1 = 520 + wave * 170;
  const y2 = 1180 + wave2 * 210;
  const dash = -frame * 18 * speed;

  return (
    <AbsoluteFill style={{ opacity, overflow: "hidden" }}>
      <svg
        viewBox="0 0 1080 1920"
        style={{ height: "100%", overflow: "visible", position: "absolute", width: "100%" }}
      >
        <defs>
          <linearGradient id="liquid-main" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.12" />
            <stop offset="0.52" stopColor={color} stopOpacity="0.72" />
            <stop offset="1" stopColor={accent} stopOpacity="0.18" />
          </linearGradient>
          <filter id="soft-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
        </defs>
        <path
          d={`M -260 ${y1} C 120 ${y1 - 360}, 740 ${y1 + 470}, 1340 ${y1 - 120}`}
          fill="none"
          filter="url(#soft-glow)"
          stroke={color}
          strokeLinecap="round"
          strokeWidth="250"
          opacity="0.26"
        />
        <path
          d={`M -220 ${y1} C 180 ${y1 - 320}, 720 ${y1 + 420}, 1320 ${y1 - 100}`}
          fill="none"
          stroke="url(#liquid-main)"
          strokeDasharray="240 80 520 120"
          strokeDashoffset={dash}
          strokeLinecap="round"
          strokeWidth="128"
        />
        <path
          d={`M -180 ${y2} C 260 ${y2 + 300}, 760 ${y2 - 460}, 1290 ${y2 + 50}`}
          fill="none"
          stroke="rgba(255,255,255,0.84)"
          strokeDasharray="90 44 260 72"
          strokeDashoffset={-dash * 0.72}
          strokeLinecap="round"
          strokeWidth="54"
        />
      </svg>
    </AbsoluteFill>
  );
};

const PETALS = Array.from({ length: 18 }, (_, index) => ({
  x: (index * 197) % 1180,
  y: (index * 307) % 2040,
  size: 34 + (index % 5) * 18,
  speed: 3 + (index % 4) * 0.7,
}));

export const PetalField = () => {
  const frame = useDesignFrame();
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {PETALS.map((petal, index) => {
        const fall = (frame * petal.speed + index * 74) % 2200;
        const x = petal.x + noise3D("petal", index * 0.2, frame * 0.02, 0.4) * 170;
        return (
          <svg
            key={index}
            viewBox="0 0 100 160"
            style={{
              filter: "drop-shadow(0 12px 12px rgba(54,110,79,0.13))",
              height: petal.size * 1.6,
              left: x - 80,
              opacity: 0.5 + (index % 3) * 0.18,
              position: "absolute",
              rotate: `${frame * (index % 2 === 0 ? 2.8 : -2.2) + index * 31}deg`,
              top: petal.y + fall - 2200,
              width: petal.size,
            }}
          >
            <path
              d="M50 4 C92 34 98 104 50 156 C2 104 8 34 50 4Z"
              fill="rgba(255,255,255,0.9)"
              stroke="rgba(191,232,210,0.92)"
              strokeWidth="2"
            />
          </svg>
        );
      })}
    </AbsoluteFill>
  );
};

export type SpeedTrailProps = {
  color?: string;
  reverse?: boolean;
  y?: number;
};

export const SpeedTrail = ({ color = "#B9E84A", reverse = false, y = 940 }: SpeedTrailProps) => {
  const frame = useDesignFrame();
  const x = interpolate(frame % 34, [0, 33], reverse ? [1260, -420] : [-420, 1260]);
  return (
    <Trail layers={12} lagInFrames={0.44} trailOpacity={0.5}>
      <div
        style={{
          background: `linear-gradient(90deg, transparent, ${color})`,
          borderRadius: 999,
          filter: "blur(1px)",
          height: 30,
          left: x,
          position: "absolute",
          rotate: reverse ? "-12deg" : "12deg",
          top: y,
          width: 420,
        }}
      />
    </Trail>
  );
};

export const HaloPulse = ({ color = "#CFFF7B" }: { color?: string }) => {
  const frame = useDesignFrame();
  const pulse = 1 + Math.sin(frame / 6) * 0.035;
  return (
    <div
      style={{
        background: `radial-gradient(circle, rgba(255,255,255,0.96) 0%, ${color}88 42%, transparent 72%)`,
        borderRadius: "50%",
        height: 1120,
        left: -20,
        position: "absolute",
        scale: pulse,
        top: 430,
        width: 1120,
      }}
    />
  );
};

const GRAPE_ORBS = [
  { x: 260, y: 50, size: 164, depth: 0 },
  { x: 132, y: 148, size: 190, depth: 1 },
  { x: 338, y: 168, size: 210, depth: 2 },
  { x: 42, y: 306, size: 174, depth: 0 },
  { x: 232, y: 332, size: 226, depth: 3 },
  { x: 448, y: 342, size: 174, depth: 1 },
  { x: 120, y: 492, size: 188, depth: 2 },
  { x: 342, y: 518, size: 204, depth: 0 },
  { x: 248, y: 660, size: 178, depth: 2 },
];

export const GlassGrapeCluster = ({ x = 210, y = 560 }: { x?: number; y?: number }) => {
  const frame = useDesignFrame();
  const reveal = interpolate(frame, [0, 14], [0, 1], {
    easing: Easing.out(Easing.cubic),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const driftX = noise3D("grape-cluster", frame * 0.018, 0.2, 0.5) * 42;
  const driftY = Math.sin(frame / 9) * 24;

  return (
    <div
      style={{
        height: 850,
        left: x + driftX,
        opacity: reveal,
        position: "absolute",
        rotate: `${-8 + Math.sin(frame / 13) * 2.2}deg`,
        scale: 0.78 + reveal * 0.22,
        top: y + driftY,
        width: 680,
      }}
    >
      <div
        style={{
          background: "linear-gradient(165deg, #90B635, #4E6A24)",
          borderRadius: "100% 0 100% 0",
          height: 176,
          left: 330,
          position: "absolute",
          rotate: "-30deg",
          top: -34,
          width: 92,
        }}
      />
      {GRAPE_ORBS.map((orb, index) => (
        <div
          key={index}
          style={{
            background:
              orb.depth % 2 === 0
                ? "radial-gradient(circle at 31% 24%, #FFFFFF 0 7%, #E6FF8D 12%, #BDE936 42%, #74A621 78%, #416918 100%)"
                : "radial-gradient(circle at 31% 24%, #FFFFFF 0 7%, #ECFFB1 12%, #AEE549 46%, #669B28 82%, #355C18 100%)",
            border: "3px solid rgba(255,255,255,0.62)",
            borderRadius: "50%",
            boxShadow:
              "inset -22px -28px 34px rgba(39,83,11,0.3), inset 18px 16px 28px rgba(255,255,255,0.44), 0 30px 46px rgba(76,121,29,0.2)",
            height: orb.size,
            left: orb.x,
            position: "absolute",
            top: orb.y + Math.sin((frame + index * 4) / 8) * 9,
            width: orb.size,
            zIndex: orb.depth,
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.72)",
              borderRadius: "50%",
              filter: "blur(1px)",
              height: orb.size * 0.14,
              left: orb.size * 0.2,
              position: "absolute",
              rotate: "-28deg",
              top: orb.size * 0.16,
              width: orb.size * 0.3,
            }}
          />
        </div>
      ))}
    </div>
  );
};

const BLOSSOMS = [
  { x: 410, y: 590, size: 520, delay: 0, rotate: -5 },
  { x: 60, y: 1030, size: 340, delay: 5, rotate: 12 },
  { x: 680, y: 1210, size: 290, delay: 10, rotate: -18 },
];

export const JasmineBloomField = () => {
  const frame = useDesignFrame();
  return (
    <AbsoluteFill>
      {BLOSSOMS.map((bloom, index) => {
        const open = interpolate(frame, [bloom.delay, bloom.delay + 18], [0, 1], {
          easing: Easing.out(Easing.cubic),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <svg
            key={index}
            viewBox="0 0 500 500"
            style={{
              filter: "drop-shadow(0 34px 42px rgba(62,119,91,0.18))",
              height: bloom.size,
              left: bloom.x + Math.sin((frame + index * 7) / 12) * 26,
              opacity: open,
              position: "absolute",
              rotate: `${bloom.rotate + frame * (index % 2 === 0 ? 0.28 : -0.22)}deg`,
              scale: 0.62 + open * 0.38,
              top: bloom.y + Math.cos((frame + index * 5) / 14) * 24,
              width: bloom.size,
            }}
          >
            <defs>
              <radialGradient id={`petal-${index}`} cx="34%" cy="24%" r="78%">
                <stop offset="0" stopColor="#FFFFFF" />
                <stop offset="0.58" stopColor="#F8FFFC" />
                <stop offset="1" stopColor="#CDEBDD" />
              </radialGradient>
            </defs>
            {Array.from({ length: 7 }, (_, petal) => (
              <ellipse
                key={petal}
                cx="250"
                cy="116"
                fill={`url(#petal-${index})`}
                rx="76"
                ry="128"
                stroke="rgba(174,222,201,0.9)"
                strokeWidth="3"
                transform={`rotate(${petal * (360 / 7)} 250 250)`}
              />
            ))}
            <circle cx="250" cy="250" fill="#F5E87A" r="58" />
            <circle cx="230" cy="230" fill="rgba(255,255,255,0.88)" r="18" />
          </svg>
        );
      })}
    </AbsoluteFill>
  );
};

const BURST_SPECS = Array.from({ length: 28 }, (_, index) => ({
  angle: (index / 28) * Math.PI * 2 + (index % 3) * 0.11,
  distance: 230 + (index % 7) * 64,
  size: 18 + (index % 6) * 13,
}));

export const BubbleBurst = ({ color = "#B9E84A" }: { color?: string }) => {
  const frame = useDesignFrame();
  const blast = interpolate(frame, [0, 22], [0, 1], {
    easing: Easing.out(Easing.quad),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill>
      {BURST_SPECS.map((bubble, index) => {
        const distance = bubble.distance * blast;
        return (
          <div
            key={index}
            style={{
              background: `radial-gradient(circle at 30% 24%, #FFFFFF, ${color}66 42%, transparent 72%)`,
              border: "2px solid rgba(255,255,255,0.9)",
              borderRadius: "50%",
              boxShadow: `0 12px 24px ${color}33`,
              height: bubble.size,
              left: 540 + Math.cos(bubble.angle) * distance - bubble.size / 2,
              opacity: interpolate(blast, [0, 0.16, 1], [0, 1, 0.56]),
              position: "absolute",
              scale: 0.45 + blast * 0.7,
              top: 1040 + Math.sin(bubble.angle) * distance - bubble.size / 2,
              width: bubble.size,
            }}
          />
        );
      })}
      {[0, 1, 2].map((ring) => {
        const ringProgress = interpolate(frame, [ring * 5, 26 + ring * 5], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <div
            key={ring}
            style={{
              border: `${7 - ring * 2}px solid rgba(255,255,255,${0.72 - ring * 0.16})`,
              borderRadius: "50%",
              height: 220,
              left: 430,
              opacity: 1 - ringProgress,
              position: "absolute",
              scale: 0.2 + ringProgress * (3.4 + ring * 0.35),
              top: 930,
              width: 220,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
