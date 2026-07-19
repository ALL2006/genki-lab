import { noise3D } from "@remotion/noise";
import { AbsoluteFill, interpolate } from "remotion";
import { useDesignFrame } from "../utils/motion";

export type DynamicBackdropProps = {
  base?: string;
  primary?: string;
  secondary?: string;
  dark?: string;
  energy?: number;
};

export const DynamicBackdrop = ({
  base = "#F8FFF0",
  primary = "#B9E84A",
  secondary = "#83D9BD",
  dark = "#1F7157",
  energy = 1,
}: DynamicBackdropProps) => {
  const frame = useDesignFrame();
  const driftX = noise3D("backdrop-x", frame * 0.012 * energy, 0.2, 0.7) * 150;
  const driftY = noise3D("backdrop-y", 0.4, frame * 0.01 * energy, 0.1) * 125;
  const counterX = noise3D("backdrop-x-2", 0.7, frame * 0.008 * energy, 0.3) * 190;
  const sweep = interpolate(frame % 72, [0, 71], [-760, 1440]);
  const rotation = -18 + Math.sin(frame / 28) * 7;
  const breathe = 1 + Math.sin(frame / 21) * 0.035;

  return (
    <AbsoluteFill style={{ background: base, overflow: "hidden" }}>
      <div
        style={{
          background: `radial-gradient(circle at 35% 32%, ${primary}E6 0%, ${primary}66 34%, rgba(255,255,255,0) 70%)`,
          borderRadius: "46% 54% 62% 38% / 56% 38% 62% 44%",
          filter: "blur(24px)",
          height: 1260,
          left: -420 + driftX,
          opacity: 0.56,
          position: "absolute",
          rotate: `${rotation}deg`,
          scale: breathe,
          top: -320 + driftY,
          width: 1260,
        }}
      />
      <div
        style={{
          background: `radial-gradient(circle at 58% 45%, ${secondary}D9 0%, ${secondary}55 38%, rgba(255,255,255,0) 72%)`,
          borderRadius: "62% 38% 44% 56% / 40% 58% 42% 60%",
          filter: "blur(34px)",
          height: 1380,
          opacity: 0.5,
          position: "absolute",
          right: -520 + counterX,
          rotate: `${-rotation * 0.7}deg`,
          scale: 1.04 + Math.cos(frame / 27) * 0.045,
          top: 640 - driftY * 0.7,
          width: 1380,
        }}
      />
      <div
        style={{
          background: `linear-gradient(105deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.82) 48%, ${primary}22 62%, rgba(255,255,255,0) 100%)`,
          filter: "blur(18px)",
          height: 2400,
          left: sweep,
          opacity: 0.68,
          position: "absolute",
          rotate: "18deg",
          top: -260,
          width: 330,
        }}
      />
      <svg
        viewBox="0 0 1080 1920"
        style={{ height: "100%", opacity: 0.46, position: "absolute", width: "100%" }}
      >
        {[0, 1, 2].map((index) => {
          const y = 430 + index * 470 + Math.sin(frame / (17 + index * 4)) * (36 + index * 12);
          const dash = -frame * (10 + index * 3) * energy;
          return (
            <path
              key={index}
              d={`M -180 ${y} C 180 ${y - 190}, 670 ${y + 230}, 1280 ${y - 90}`}
              fill="none"
              opacity={0.25 - index * 0.045}
              stroke={index === 1 ? dark : "#FFFFFF"}
              strokeDasharray={`${170 + index * 65} ${88 + index * 30}`}
              strokeDashoffset={dash}
              strokeLinecap="round"
              strokeWidth={18 - index * 3}
            />
          );
        })}
      </svg>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 46%, rgba(255,255,255,0) 32%, rgba(32,91,70,0.05) 76%, rgba(23,77,59,0.13) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
