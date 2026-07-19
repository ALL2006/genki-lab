import { Easing, interpolate } from "remotion";
import type { ReactNode } from "react";
import { useDesignFrame } from "../utils/motion";

export type TextRevealProps = {
  children: ReactNode;
  delay?: number;
  duration?: number;
  exitAt?: number;
  exitDuration?: number;
  direction?: "up" | "left" | "right";
  kinetic?: boolean;
  style?: React.CSSProperties;
};

export const TextReveal = ({
  children,
  delay = 0,
  duration = 12,
  exitAt,
  exitDuration = 8,
  direction = "up",
  kinetic = true,
  style,
}: TextRevealProps) => {
  const frame = useDesignFrame();
  const progress = interpolate(frame, [delay, delay + duration], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exit =
    exitAt === undefined
      ? 0
      : interpolate(frame, [exitAt, exitAt + exitDuration], [0, 1], {
          easing: Easing.in(Easing.cubic),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
  const offset = interpolate(progress, [0, 1], [42, 0]);
  const exitOffset = interpolate(exit, [0, 1], [0, -28]);
  const translate =
    direction === "left"
      ? `${offset + exitOffset}px 0`
      : direction === "right"
        ? `${-offset - exitOffset}px 0`
        : `0 ${offset + exitOffset}px`;

  return (
    <div
      style={{
        opacity: progress * (1 - exit),
        filter: kinetic ? `blur(${interpolate(progress, [0, 1], [12, 0]) + exit * 8}px)` : undefined,
        scale: kinetic
          ? interpolate(progress, [0, 0.72, 1], [0.84, 1.045, 1]) * (1 - exit * 0.04)
          : undefined,
        translate,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
