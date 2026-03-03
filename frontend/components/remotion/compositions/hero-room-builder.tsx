import { AbsoluteFill, useCurrentFrame, useVideoConfig, Sequence } from "remotion";
import { interpolate } from "remotion";
import {
  GOLD,
  GOLD_LIGHT,
  GOLD_DARK,
  DARK,
  MUTED,
  drawProgress,
  sweepReveal,
  ease,
  springVal,
  seededRandom,
} from "../utils/animation-helpers";

// ── SVG Furniture Components ──

function Sofa({ progress, fill }: { progress: number; fill: number }) {
  return (
    <g transform="translate(280, 520)" opacity={progress}>
      {/* Base */}
      <rect
        x={0} y={20} width={260} height={80} rx={8}
        stroke={GOLD} strokeWidth={2} fill={DARK}
        fillOpacity={fill}
        strokeDasharray={700}
        strokeDashoffset={700 * (1 - progress)}
      />
      {/* Back */}
      <rect
        x={10} y={0} width={240} height={30} rx={6}
        stroke={GOLD} strokeWidth={2} fill={DARK}
        fillOpacity={fill}
        strokeDasharray={540}
        strokeDashoffset={540 * (1 - progress)}
      />
      {/* Cushions */}
      <rect x={20} y={30} width={110} height={60} rx={4}
        stroke={GOLD_LIGHT} strokeWidth={1} fill={GOLD_DARK} fillOpacity={fill * 0.3}
        strokeDasharray={340} strokeDashoffset={340 * (1 - progress)}
      />
      <rect x={140} y={30} width={110} height={60} rx={4}
        stroke={GOLD_LIGHT} strokeWidth={1} fill={GOLD_DARK} fillOpacity={fill * 0.3}
        strokeDasharray={340} strokeDashoffset={340 * (1 - progress)}
      />
    </g>
  );
}

function CoffeeTable({ progress, fill }: { progress: number; fill: number }) {
  return (
    <g transform="translate(340, 640)" opacity={progress}>
      <rect
        x={0} y={0} width={140} height={60} rx={4}
        stroke={GOLD} strokeWidth={2} fill={DARK}
        fillOpacity={fill}
        strokeDasharray={400}
        strokeDashoffset={400 * (1 - progress)}
      />
      {/* Table legs */}
      <line x1={10} y1={60} x2={10} y2={80} stroke={GOLD} strokeWidth={2}
        strokeDasharray={20} strokeDashoffset={20 * (1 - progress)} />
      <line x1={130} y1={60} x2={130} y2={80} stroke={GOLD} strokeWidth={2}
        strokeDasharray={20} strokeDashoffset={20 * (1 - progress)} />
    </g>
  );
}

function Lamp({ progress, fill, glowOpacity }: { progress: number; fill: number; glowOpacity: number }) {
  return (
    <g transform="translate(160, 420)" opacity={progress}>
      {/* Glow */}
      <circle cx={30} cy={40} r={80} fill={GOLD}
        opacity={glowOpacity * 0.12} />
      <circle cx={30} cy={40} r={40} fill={GOLD_LIGHT}
        opacity={glowOpacity * 0.2} />
      {/* Shade */}
      <polygon
        points="10,50 50,50 40,20 20,20"
        stroke={GOLD} strokeWidth={2} fill={GOLD_DARK}
        fillOpacity={fill}
        strokeDasharray={200}
        strokeDashoffset={200 * (1 - progress)}
      />
      {/* Stand */}
      <line x1={30} y1={50} x2={30} y2={120} stroke={GOLD} strokeWidth={2}
        strokeDasharray={70} strokeDashoffset={70 * (1 - progress)} />
      {/* Base */}
      <ellipse cx={30} cy={120} rx={20} ry={5}
        stroke={GOLD} strokeWidth={2} fill={DARK} fillOpacity={fill}
        strokeDasharray={80} strokeDashoffset={80 * (1 - progress)} />
    </g>
  );
}

function Bookshelf({ progress, fill }: { progress: number; fill: number }) {
  return (
    <g transform="translate(740, 340)" opacity={progress}>
      {/* Frame */}
      <rect x={0} y={0} width={120} height={200} rx={2}
        stroke={GOLD} strokeWidth={2} fill={DARK} fillOpacity={fill}
        strokeDasharray={640} strokeDashoffset={640 * (1 - progress)} />
      {/* Shelves */}
      {[50, 100, 150].map((y, i) => (
        <line key={i} x1={5} y1={y} x2={115} y2={y}
          stroke={GOLD_LIGHT} strokeWidth={1.5}
          strokeDasharray={110} strokeDashoffset={110 * (1 - progress)} />
      ))}
      {/* Books */}
      {[10, 22, 32, 45, 58].map((x, i) => (
        <rect key={i} x={x} y={10} width={8} height={35} rx={1}
          fill={GOLD} fillOpacity={fill * (0.3 + i * 0.12)}
          strokeDasharray={86} strokeDashoffset={86 * (1 - progress)} />
      ))}
    </g>
  );
}

function Rug({ progress, fill }: { progress: number; fill: number }) {
  return (
    <g transform="translate(260, 720)" opacity={progress}>
      <ellipse cx={160} cy={30} rx={180} ry={40}
        stroke={GOLD_DARK} strokeWidth={2} fill={GOLD} fillOpacity={fill * 0.1}
        strokeDasharray={700} strokeDashoffset={700 * (1 - progress)} />
      <ellipse cx={160} cy={30} rx={130} ry={25}
        stroke={GOLD_LIGHT} strokeWidth={1} fill="none"
        strokeDasharray={500} strokeDashoffset={500 * (1 - progress)} />
    </g>
  );
}

// ── Sparkle Particle ──

function Sparkle({ x, y, scale, opacity }: { x: number; y: number; scale: number; opacity: number }) {
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`} opacity={opacity}>
      <circle cx={0} cy={0} r={3} fill={GOLD_LIGHT} />
      <line x1={-6} y1={0} x2={6} y2={0} stroke={GOLD_LIGHT} strokeWidth={1} />
      <line x1={0} y1={-6} x2={0} y2={6} stroke={GOLD_LIGHT} strokeWidth={1} />
    </g>
  );
}

// ── Main Composition ──

export const HeroRoomBuilder: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // ── Phase: Floor Grid (0–45) ──
  const gridProgress = ease(frame, [0, 45], [0, 1]);

  // ── Phase: Walls (30–75) ──
  const wallProgress = ease(frame, [30, 75], [0, 1]);

  // ── Phase: Window + Light (60–100) ──
  const windowProgress = ease(frame, [60, 100], [0, 1]);
  const lightRayOpacity = ease(frame, [80, 110], [0, 0.4]);

  // ── Phase: Furniture (90–150) ──
  const sofaProgress = ease(frame, [90, 120], [0, 1]);
  const tableProgress = ease(frame, [105, 130], [0, 1]);
  const lampProgress = ease(frame, [115, 140], [0, 1]);
  const shelfProgress = ease(frame, [100, 135], [0, 1]);
  const rugProgress = ease(frame, [125, 150], [0, 1]);

  // ── Phase: Color fill (140–200) ──
  const fillProgress = ease(frame, [140, 200], [0, 1]);

  // ── Phase: Ambient glow (190–240) ──
  const glowProgress = ease(frame, [190, 240], [0, 1]);

  // ── Phase: Sparkles (230–270) ──
  const sparklePhase = ease(frame, [230, 250], [0, 1]);

  // ── Phase: Fade to wireframe (260–300) ──
  const fadeOutFill = ease(frame, [260, 295], [1, 0]);
  const finalFill = fillProgress * fadeOutFill;

  // ── Sparkle positions ──
  const rng = seededRandom(42);
  const sparkles = Array.from({ length: 20 }, (_, i) => ({
    x: 100 + rng() * (width - 200),
    y: 100 + rng() * (height - 300),
    delay: i * 2,
  }));

  return (
    <AbsoluteFill style={{ backgroundColor: DARK }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "100%" }}
      >
        <defs>
          {/* Golden light gradient */}
          <linearGradient id="lightRay" x1="0.3" y1="0" x2="0.8" y2="1">
            <stop offset="0%" stopColor={GOLD_LIGHT} stopOpacity={0.6} />
            <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
          </linearGradient>
          {/* Glow filter */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Floor Grid ── */}
        <g opacity={gridProgress}>
          {/* Perspective grid lines (horizontal) */}
          {Array.from({ length: 12 }, (_, i) => {
            const y = 550 + i * 30;
            const lineProgress = ease(frame, [i * 3, i * 3 + 20], [0, 1]);
            return (
              <line
                key={`h${i}`}
                x1={100}
                y1={y}
                x2={width - 100}
                y2={y}
                stroke={GOLD_DARK}
                strokeWidth={0.5}
                opacity={lineProgress * 0.4}
              />
            );
          })}
          {/* Vertical grid lines */}
          {Array.from({ length: 16 }, (_, i) => {
            const x = 100 + i * ((width - 200) / 15);
            const lineProgress = ease(frame, [i * 2 + 5, i * 2 + 25], [0, 1]);
            return (
              <line
                key={`v${i}`}
                x1={x}
                y1={550}
                x2={x}
                y2={height - 50}
                stroke={GOLD_DARK}
                strokeWidth={0.5}
                opacity={lineProgress * 0.3}
              />
            );
          })}
        </g>

        {/* ── Walls ── */}
        <g>
          {/* Back wall */}
          <rect
            x={100}
            y={interpolate(wallProgress, [0, 1], [550, 200])}
            width={width - 200}
            height={interpolate(wallProgress, [0, 1], [0, 350])}
            fill={DARK}
            fillOpacity={finalFill * 0.3}
            stroke={GOLD}
            strokeWidth={2}
            opacity={wallProgress}
          />
          {/* Left wall */}
          <polygon
            points={`100,200 100,550 50,${interpolate(wallProgress, [0, 1], [550, 600])} 50,${interpolate(wallProgress, [0, 1], [550, 150])}`}
            fill={DARK}
            fillOpacity={finalFill * 0.15}
            stroke={GOLD}
            strokeWidth={1.5}
            opacity={wallProgress}
          />
          {/* Right wall */}
          <polygon
            points={`${width - 100},200 ${width - 100},550 ${width - 50},${interpolate(wallProgress, [0, 1], [550, 600])} ${width - 50},${interpolate(wallProgress, [0, 1], [550, 150])}`}
            fill={DARK}
            fillOpacity={finalFill * 0.15}
            stroke={GOLD}
            strokeWidth={1.5}
            opacity={wallProgress}
          />
        </g>

        {/* ── Color sweep on back wall ── */}
        {finalFill > 0 && (
          <rect
            x={100}
            y={200}
            width={width - 200}
            height={350}
            fill={GOLD_DARK}
            opacity={finalFill * 0.08}
            style={{ clipPath: sweepReveal(frame, 140, 60, "right") }}
          />
        )}

        {/* ── Window ── */}
        <g opacity={windowProgress}>
          <rect
            x={width / 2 - 120}
            y={260}
            width={240}
            height={160}
            rx={4}
            stroke={GOLD_LIGHT}
            strokeWidth={2.5}
            fill="none"
          />
          {/* Window panes */}
          <line x1={width / 2} y1={260} x2={width / 2} y2={420}
            stroke={GOLD_LIGHT} strokeWidth={1.5} />
          <line x1={width / 2 - 120} y1={340} x2={width / 2 + 120} y2={340}
            stroke={GOLD_LIGHT} strokeWidth={1.5} />

          {/* Light ray through window */}
          <polygon
            points={`${width / 2 - 100},420 ${width / 2 + 100},420 ${width / 2 + 200},750 ${width / 2 - 200},750`}
            fill="url(#lightRay)"
            opacity={lightRayOpacity * fadeOutFill}
          />
        </g>

        {/* ── Furniture ── */}
        <Sofa progress={sofaProgress} fill={finalFill} />
        <CoffeeTable progress={tableProgress} fill={finalFill} />
        <Lamp progress={lampProgress} fill={finalFill} glowOpacity={glowProgress * fadeOutFill} />
        <Bookshelf progress={shelfProgress} fill={finalFill} />
        <Rug progress={rugProgress} fill={finalFill} />

        {/* ── Sparkles ── */}
        {sparkles.map((s, i) => {
          const sparkleScale = springVal(frame, fps, 230 + s.delay, {
            damping: 10,
            stiffness: 200,
            mass: 0.5,
          });
          const sparkleOpacity = ease(
            frame,
            [230 + s.delay, 240 + s.delay],
            [0, 1]
          ) * ease(frame, [265, 285], [1, 0]);

          return (
            <Sparkle
              key={i}
              x={s.x}
              y={s.y}
              scale={sparkleScale}
              opacity={sparkleOpacity}
            />
          );
        })}

        {/* ── Subtle vignette ── */}
        <rect
          x={0} y={0} width={width} height={height}
          fill="none"
          style={{
            filter: "url(#glow)",
          }}
        />
      </svg>
    </AbsoluteFill>
  );
};
