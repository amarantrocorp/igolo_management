import { interpolate, spring as remotionSpring } from "remotion";

// ── Brand Colors ──
export const GOLD = "#CBB282";
export const GOLD_LIGHT = "#E8D5B7";
export const GOLD_DARK = "#A8956E";
export const DARK = "#0F172A";
export const DARK_CARD = "#1E293B";
export const WHITE = "#FAFAFA";
export const MUTED = "#94A3B8";

// ── Spring Configs ──
export const goldSpring = { damping: 14, stiffness: 180, mass: 1 };
export const smoothSpring = { damping: 20, stiffness: 120, mass: 1 };
export const bouncySpring = { damping: 8, stiffness: 200, mass: 0.8 };
export const gentleSpring = { damping: 30, stiffness: 80, mass: 1.2 };

// ── SVG Path Draw ──
// Returns a strokeDashoffset value (1 → 0) for drawing SVG paths
export function drawProgress(
  frame: number,
  startFrame: number,
  duration: number
): number {
  return interpolate(frame, [startFrame, startFrame + duration], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

// ── Sweep Reveal (clipPath) ──
// Returns a CSS clipPath string for directional reveals
export function sweepReveal(
  frame: number,
  startFrame: number,
  duration: number,
  direction: "left" | "right" | "up" | "down" = "right"
): string {
  const progress = interpolate(
    frame,
    [startFrame, startFrame + duration],
    [0, 100],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  switch (direction) {
    case "right":
      return `inset(0 ${100 - progress}% 0 0)`;
    case "left":
      return `inset(0 0 0 ${100 - progress}%)`;
    case "down":
      return `inset(0 0 ${100 - progress}% 0)`;
    case "up":
      return `inset(${100 - progress}% 0 0 0)`;
  }
}

// ── Fade + Slide ──
export function fadeSlide(
  frame: number,
  startFrame: number,
  duration: number = 20,
  distance: number = 30
): { opacity: number; transform: string } {
  const opacity = interpolate(
    frame,
    [startFrame, startFrame + duration],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const y = interpolate(
    frame,
    [startFrame, startFrame + duration],
    [distance, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  return { opacity, transform: `translateY(${y}px)` };
}

// ── Seeded Random (deterministic for Remotion) ──
export function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ── Generate particle positions ──
export function generateParticles(
  count: number,
  width: number,
  height: number,
  seed: number = 42
) {
  const rng = seededRandom(seed);
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: rng() * width,
    y: rng() * height,
    size: 2 + rng() * 4,
    speed: 0.5 + rng() * 1.5,
    phase: rng() * Math.PI * 2,
  }));
}

// ── Eased interpolation shorthand ──
export function ease(
  frame: number,
  inputRange: [number, number],
  outputRange: [number, number]
): number {
  return interpolate(frame, inputRange, outputRange, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

// ── Spring shorthand ──
export function springVal(
  frame: number,
  fps: number,
  delay: number = 0,
  config = smoothSpring
): number {
  return remotionSpring({
    frame: frame - delay,
    fps,
    config,
  });
}
