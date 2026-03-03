import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { interpolate } from "remotion";
import { GOLD, GOLD_LIGHT, GOLD_DARK, WHITE, MUTED, ease, springVal, smoothSpring } from "../utils/animation-helpers";

interface StatsCounterProps extends Record<string, unknown> {
  value: number;
  label: string;
  suffix?: string;
}

export const StatsCounter: React.FC<StatsCounterProps> = ({
  value,
  label,
  suffix = "",
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Ring animation
  const ringProgress = springVal(frame, fps, 5, {
    damping: 18,
    stiffness: 80,
    mass: 1,
  });

  // Number counter
  const countProgress = ease(frame, [8, 80], [0, 1]);
  const displayValue = Math.round(value * countProgress);

  // Label fade in
  const labelOpacity = ease(frame, [50, 75], [0, 1]);
  const labelY = ease(frame, [50, 75], [10, 0]);

  // Ring SVG parameters
  const cx = width / 2;
  const cy = height / 2 - 15;
  const radius = Math.min(width, height) * 0.35;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - ringProgress * 0.75);

  // Glow pulse after completion
  const glowOpacity = frame > 80
    ? 0.15 + 0.1 * Math.sin((frame - 80) * 0.08)
    : 0;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "100%" }}
      >
        {/* Background ring */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={GOLD_DARK}
          strokeWidth={3}
          opacity={0.2}
        />

        {/* Glow behind progress ring */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={GOLD_LIGHT}
          strokeWidth={8}
          opacity={glowOpacity}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90, ${cx}, ${cy})`}
          style={{ filter: "blur(6px)" }}
        />

        {/* Progress ring */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={GOLD}
          strokeWidth={4}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90, ${cx}, ${cy})`}
        />

        {/* Dot at ring end */}
        {ringProgress > 0.05 && (
          <circle
            cx={cx + radius * Math.cos((-90 + 270 * ringProgress) * (Math.PI / 180))}
            cy={cy + radius * Math.sin((-90 + 270 * ringProgress) * (Math.PI / 180))}
            r={6}
            fill={GOLD_LIGHT}
            opacity={Math.min(ringProgress * 2, 1)}
          />
        )}

        {/* Number */}
        <text
          x={cx}
          y={cy + 5}
          textAnchor="middle"
          dominantBaseline="central"
          fill={WHITE}
          fontSize={radius * 0.6}
          fontFamily="'Playfair Display', Georgia, serif"
          fontWeight="bold"
        >
          {displayValue}{suffix}
        </text>

        {/* Label */}
        <text
          x={cx}
          y={cy + radius + 40}
          textAnchor="middle"
          dominantBaseline="central"
          fill={MUTED}
          fontSize={22}
          fontFamily="Inter, system-ui, sans-serif"
          fontWeight="500"
          letterSpacing="0.05em"
          opacity={labelOpacity}
          transform={`translate(0, ${labelY})`}
        >
          {label.toUpperCase()}
        </text>
      </svg>
    </AbsoluteFill>
  );
};
