import { useCurrentFrame, useVideoConfig } from "remotion";

export const DESIGN_FPS = 30;

/**
 * Motion is authored on a 30fps design timeline and sampled at the
 * composition fps. At 60fps this returns half-frame increments, preserving
 * the original beat timing while producing twice as many motion samples.
 */
export const useDesignFrame = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (frame * DESIGN_FPS) / fps;
};

export const toOutputFrames = (designFrames: number, fps: number) =>
  Math.round((designFrames * fps) / DESIGN_FPS);
