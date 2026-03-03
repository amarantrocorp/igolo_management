import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { interpolate } from "remotion";
import { GOLD, GOLD_LIGHT, GOLD_DARK, DARK, seededRandom, ease } from "../utils/animation-helpers";

// ── House outline target positions ──
function getHouseTargets(cx: number, cy: number, scale: number = 1) {
  const s = scale;
  const points: { x: number; y: number }[] = [];

  // Roof (triangle)
  const roofLeft = { x: cx - 80 * s, y: cy - 40 * s };
  const roofPeak = { x: cx, y: cy - 100 * s };
  const roofRight = { x: cx + 80 * s, y: cy - 40 * s };

  // Distribute points along roof lines
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    points.push({
      x: roofLeft.x + (roofPeak.x - roofLeft.x) * t,
      y: roofLeft.y + (roofPeak.y - roofLeft.y) * t,
    });
  }
  for (let i = 1; i <= 8; i++) {
    const t = i / 8;
    points.push({
      x: roofPeak.x + (roofRight.x - roofPeak.x) * t,
      y: roofPeak.y + (roofRight.y - roofPeak.y) * t,
    });
  }

  // Walls (rectangle)
  const wallTop = cy - 40 * s;
  const wallBottom = cy + 50 * s;
  const wallLeft = cx - 65 * s;
  const wallRight = cx + 65 * s;

  // Left wall
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    points.push({ x: wallLeft, y: wallTop + (wallBottom - wallTop) * t });
  }
  // Right wall
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    points.push({ x: wallRight, y: wallTop + (wallBottom - wallTop) * t });
  }
  // Bottom wall
  for (let i = 1; i < 6; i++) {
    const t = i / 6;
    points.push({ x: wallLeft + (wallRight - wallLeft) * t, y: wallBottom });
  }

  // Door
  const doorLeft = cx - 15 * s;
  const doorRight = cx + 15 * s;
  const doorTop = cy + 10 * s;
  for (let i = 0; i <= 3; i++) {
    const t = i / 3;
    points.push({ x: doorLeft, y: doorTop + (wallBottom - doorTop) * t });
    points.push({ x: doorRight, y: doorTop + (wallBottom - doorTop) * t });
  }
  points.push({ x: doorLeft + (doorRight - doorLeft) * 0.5, y: doorTop });

  // Window (left)
  const winCx = cx - 40 * s;
  const winCy = cy - 5 * s;
  points.push({ x: winCx - 12 * s, y: winCy - 12 * s });
  points.push({ x: winCx + 12 * s, y: winCy - 12 * s });
  points.push({ x: winCx - 12 * s, y: winCy + 12 * s });
  points.push({ x: winCx + 12 * s, y: winCy + 12 * s });
  points.push({ x: winCx, y: winCy }); // Cross

  // Window (right)
  const win2Cx = cx + 40 * s;
  points.push({ x: win2Cx - 12 * s, y: winCy - 12 * s });
  points.push({ x: win2Cx + 12 * s, y: winCy - 12 * s });
  points.push({ x: win2Cx - 12 * s, y: winCy + 12 * s });
  points.push({ x: win2Cx + 12 * s, y: winCy + 12 * s });
  points.push({ x: win2Cx, y: winCy });

  return points;
}

export const ParticleField: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const cx = width / 2;
  const cy = height / 2;
  const targets = getHouseTargets(cx, cy, 2.5);

  const particleCount = 80;
  const rng = seededRandom(99);

  // Generate initial random positions
  const particles = Array.from({ length: particleCount }, (_, i) => {
    const targetIdx = i % targets.length;
    return {
      id: i,
      startX: rng() * width,
      startY: rng() * height,
      targetX: targets[targetIdx].x,
      targetY: targets[targetIdx].y,
      size: 2 + rng() * 3.5,
      phase: rng() * Math.PI * 2,
      speed: 0.3 + rng() * 0.7,
    };
  });

  // Phase timings
  const gatherProgress = ease(frame, [100, 200], [0, 1]);
  const holdPulse = frame >= 180 && frame <= 240;
  const disperseProgress = ease(frame, [230, 300], [0, 1]);

  // Combine: gather then disperse
  const effectiveGather = gatherProgress * (1 - disperseProgress);

  return (
    <AbsoluteFill style={{ backgroundColor: DARK }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "100%" }}
      >
        <defs>
          <filter id="particleGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="particleFade">
            <stop offset="0%" stopColor={GOLD_LIGHT} stopOpacity={1} />
            <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
          </radialGradient>
        </defs>

        {/* Ambient background glow */}
        <circle
          cx={cx}
          cy={cy}
          r={200}
          fill={GOLD}
          opacity={effectiveGather * 0.06}
          style={{ filter: "blur(60px)" }}
        />

        {/* Particles */}
        {particles.map((p) => {
          // Floating motion (always active)
          const floatX = Math.sin(frame * 0.02 * p.speed + p.phase) * 15;
          const floatY = Math.cos(frame * 0.015 * p.speed + p.phase * 1.5) * 10;

          // Interpolate position between random and target
          const currentX = interpolate(
            effectiveGather,
            [0, 1],
            [p.startX + floatX, p.targetX]
          );
          const currentY = interpolate(
            effectiveGather,
            [0, 1],
            [p.startY + floatY, p.targetY]
          );

          // Pulse when holding shape
          const pulseScale = holdPulse
            ? 1 + 0.3 * Math.sin((frame - 180) * 0.15 + p.phase)
            : 1;

          // Opacity: dim when scattered, bright when gathered
          const opacity = interpolate(effectiveGather, [0, 0.5, 1], [0.3, 0.6, 0.9]);

          return (
            <circle
              key={p.id}
              cx={currentX}
              cy={currentY}
              r={p.size * pulseScale}
              fill={GOLD_LIGHT}
              opacity={opacity}
              filter="url(#particleGlow)"
            />
          );
        })}

        {/* Connection lines when gathered (form house outline) */}
        {effectiveGather > 0.7 && (
          <g opacity={(effectiveGather - 0.7) * 3.33 * 0.15}>
            {targets.slice(0, -1).map((t, i) => {
              const next = targets[i + 1];
              if (!next) return null;
              const dist = Math.sqrt(
                (t.x - next.x) ** 2 + (t.y - next.y) ** 2
              );
              if (dist > 100) return null; // Only connect nearby points
              return (
                <line
                  key={i}
                  x1={t.x}
                  y1={t.y}
                  x2={next.x}
                  y2={next.y}
                  stroke={GOLD_DARK}
                  strokeWidth={0.8}
                />
              );
            })}
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
};
