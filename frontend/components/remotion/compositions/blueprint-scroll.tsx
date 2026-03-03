import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import {
  GOLD,
  GOLD_LIGHT,
  GOLD_DARK,
  DARK,
  DARK_CARD,
  MUTED,
  WHITE,
  ease,
  drawProgress,
  springVal,
} from "../utils/animation-helpers";

// ── Room definitions for the floor plan ──
const ROOMS = {
  living: { x: 100, y: 120, w: 400, h: 300, label: "Living Room" },
  kitchen: { x: 500, y: 120, w: 280, h: 180, label: "Kitchen" },
  dining: { x: 500, y: 300, w: 280, h: 120, label: "Dining" },
  master: { x: 100, y: 420, w: 300, h: 250, label: "Master Bedroom" },
  bath1: { x: 400, y: 420, w: 160, h: 130, label: "Bath 1" },
  bedroom2: { x: 560, y: 420, w: 220, h: 250, label: "Bedroom 2" },
  bath2: { x: 400, y: 550, w: 160, h: 120, label: "Bath 2" },
};

// ── Furniture SVG groups ──
function FurnitureIcons({ frame }: { frame: number }) {
  const furnitureProgress = ease(frame, [280, 400], [0, 1]);
  if (furnitureProgress <= 0) return null;

  const items = [
    // Living room — sofa
    { x: 150, y: 250, delay: 0, element: (
      <g>
        <rect x={0} y={0} width={80} height={25} rx={3} stroke={GOLD} strokeWidth={1.5} fill="none" />
        <rect x={5} y={-8} width={70} height={12} rx={2} stroke={GOLD_DARK} strokeWidth={1} fill="none" />
      </g>
    )},
    // Living room — coffee table
    { x: 260, y: 280, delay: 15, element: (
      <rect x={0} y={0} width={40} height={20} rx={2} stroke={GOLD} strokeWidth={1.5} fill="none" />
    )},
    // Living room — TV
    { x: 280, y: 150, delay: 20, element: (
      <rect x={0} y={0} width={60} height={5} rx={1} stroke={GOLD_LIGHT} strokeWidth={1.5} fill="none" />
    )},
    // Kitchen — counter
    { x: 520, y: 140, delay: 30, element: (
      <g>
        <rect x={0} y={0} width={100} height={15} rx={2} stroke={GOLD} strokeWidth={1.5} fill="none" />
        {/* Stove burners */}
        <circle cx={25} cy={30} r={6} stroke={GOLD_DARK} strokeWidth={1} fill="none" />
        <circle cx={50} cy={30} r={6} stroke={GOLD_DARK} strokeWidth={1} fill="none" />
      </g>
    )},
    // Kitchen — sink
    { x: 680, y: 145, delay: 40, element: (
      <rect x={0} y={0} width={25} height={18} rx={4} stroke={GOLD} strokeWidth={1.5} fill="none" />
    )},
    // Dining — table
    { x: 580, y: 330, delay: 45, element: (
      <g>
        <ellipse cx={30} cy={15} rx={35} ry={18} stroke={GOLD} strokeWidth={1.5} fill="none" />
        {/* Chairs */}
        {[0, 60, 120, 180, 240, 300].map((angle, i) => (
          <circle
            key={i}
            cx={30 + 45 * Math.cos((angle * Math.PI) / 180)}
            cy={15 + 28 * Math.sin((angle * Math.PI) / 180)}
            r={5}
            stroke={GOLD_DARK}
            strokeWidth={1}
            fill="none"
          />
        ))}
      </g>
    )},
    // Master — bed
    { x: 170, y: 480, delay: 55, element: (
      <g>
        <rect x={0} y={0} width={100} height={130} rx={3} stroke={GOLD} strokeWidth={1.5} fill="none" />
        {/* Pillows */}
        <rect x={10} y={10} width={35} height={20} rx={3} stroke={GOLD_DARK} strokeWidth={1} fill="none" />
        <rect x={55} y={10} width={35} height={20} rx={3} stroke={GOLD_DARK} strokeWidth={1} fill="none" />
      </g>
    )},
    // Master — wardrobe
    { x: 110, y: 480, delay: 65, element: (
      <rect x={0} y={0} width={40} height={80} rx={2} stroke={GOLD} strokeWidth={1.5} fill="none" />
    )},
    // Bedroom 2 — bed
    { x: 620, y: 500, delay: 70, element: (
      <g>
        <rect x={0} y={0} width={80} height={100} rx={3} stroke={GOLD} strokeWidth={1.5} fill="none" />
        <rect x={10} y={8} width={25} height={15} rx={2} stroke={GOLD_DARK} strokeWidth={1} fill="none" />
        <rect x={45} y={8} width={25} height={15} rx={2} stroke={GOLD_DARK} strokeWidth={1} fill="none" />
      </g>
    )},
    // Bath 1 — tub
    { x: 420, y: 440, delay: 80, element: (
      <ellipse cx={20} cy={10} rx={25} ry={12} stroke={GOLD} strokeWidth={1.5} fill="none" />
    )},
    // Bath 2 — shower
    { x: 430, y: 570, delay: 85, element: (
      <rect x={0} y={0} width={30} height={30} rx={15} stroke={GOLD} strokeWidth={1.5} fill="none" />
    )},
  ];

  return (
    <g>
      {items.map((item, i) => {
        const itemProgress = ease(frame, [280 + item.delay, 320 + item.delay], [0, 1]);
        return (
          <g key={i} transform={`translate(${item.x}, ${item.y})`} opacity={itemProgress}>
            {item.element}
          </g>
        );
      })}
    </g>
  );
}

// ── Main Composition ──
export const BlueprintScroll: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // ── Phase 1: Outer walls (0–100) ──
  const outerWallProgress = ease(frame, [0, 100], [0, 1]);

  // ── Phase 2: Interior walls (80–200) ──
  const interiorProgress = ease(frame, [80, 200], [0, 1]);

  // ── Phase 3: Doors & Windows (180–300) ──
  const doorWindowProgress = ease(frame, [180, 300], [0, 1]);

  // ── Phase 5: Dimensions (380–480) ──
  const dimProgress = ease(frame, [380, 480], [0, 1]);

  // ── Phase 6: Labels (460–540) ──
  const labelProgress = ease(frame, [460, 540], [0, 1]);

  // ── Phase 7: Color wash (520–600) ──
  const colorProgress = ease(frame, [520, 600], [0, 1]);

  // Grid background lines
  const gridOpacity = ease(frame, [0, 30], [0, 0.08]);

  return (
    <AbsoluteFill style={{ backgroundColor: DARK }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "100%" }}
      >
        <defs>
          <filter id="blueprintGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Blueprint Grid ── */}
        <g opacity={gridOpacity}>
          {Array.from({ length: 40 }, (_, i) => (
            <line
              key={`gh${i}`}
              x1={0} y1={i * 25} x2={width} y2={i * 25}
              stroke={GOLD_DARK} strokeWidth={0.3}
            />
          ))}
          {Array.from({ length: 50 }, (_, i) => (
            <line
              key={`gv${i}`}
              x1={i * 25} y1={0} x2={i * 25} y2={height}
              stroke={GOLD_DARK} strokeWidth={0.3}
            />
          ))}
        </g>

        {/* Center the floor plan */}
        <g transform={`translate(${(width - 700) / 2}, ${(height - 570) / 2})`}>

          {/* ── Color fill (phase 7) ── */}
          {colorProgress > 0 && Object.values(ROOMS).map((room, i) => (
            <rect
              key={`fill-${i}`}
              x={room.x + 2}
              y={room.y + 2}
              width={room.w - 4}
              height={room.h - 4}
              fill={i % 2 === 0 ? GOLD : GOLD_DARK}
              opacity={colorProgress * 0.06}
              rx={2}
            />
          ))}

          {/* ── Outer Walls ── */}
          <rect
            x={100} y={120}
            width={680} height={550}
            fill="none"
            stroke={GOLD}
            strokeWidth={4}
            strokeDasharray={2460}
            strokeDashoffset={2460 * (1 - outerWallProgress)}
            filter="url(#blueprintGlow)"
          />

          {/* ── Interior Walls ── */}
          <g>
            {/* Living / Kitchen divider (vertical) */}
            <line x1={500} y1={120} x2={500} y2={420}
              stroke={GOLD} strokeWidth={3}
              strokeDasharray={300} strokeDashoffset={300 * (1 - ease(frame, [80, 130], [0, 1]))}
            />
            {/* Kitchen / Dining divider (horizontal) */}
            <line x1={500} y1={300} x2={780} y2={300}
              stroke={GOLD} strokeWidth={2.5}
              strokeDasharray={280} strokeDashoffset={280 * (1 - ease(frame, [100, 150], [0, 1]))}
            />
            {/* Living / Master divider (horizontal) */}
            <line x1={100} y1={420} x2={560} y2={420}
              stroke={GOLD} strokeWidth={3}
              strokeDasharray={460} strokeDashoffset={460 * (1 - ease(frame, [120, 170], [0, 1]))}
            />
            {/* Master / Bath1 divider (vertical) */}
            <line x1={400} y1={420} x2={400} y2={670}
              stroke={GOLD} strokeWidth={2.5}
              strokeDasharray={250} strokeDashoffset={250 * (1 - ease(frame, [140, 180], [0, 1]))}
            />
            {/* Bath1 / Bedroom2 divider (vertical) */}
            <line x1={560} y1={420} x2={560} y2={670}
              stroke={GOLD} strokeWidth={2.5}
              strokeDasharray={250} strokeDashoffset={250 * (1 - ease(frame, [150, 190], [0, 1]))}
            />
            {/* Bath1 / Bath2 divider (horizontal) */}
            <line x1={400} y1={550} x2={560} y2={550}
              stroke={GOLD} strokeWidth={2}
              strokeDasharray={160} strokeDashoffset={160 * (1 - ease(frame, [170, 200], [0, 1]))}
            />
          </g>

          {/* ── Doors (arcs) ── */}
          <g opacity={doorWindowProgress}>
            {/* Living room entrance */}
            <path d="M 100 350 A 40 40 0 0 1 100 310" fill="none" stroke={GOLD_LIGHT} strokeWidth={1.5} strokeDasharray="63" strokeDashoffset={63 * (1 - doorWindowProgress)} />
            <line x1={100} y1={310} x2={60} y2={310} stroke={GOLD_LIGHT} strokeWidth={1} opacity={doorWindowProgress} />

            {/* Kitchen door */}
            <path d="M 500 220 A 30 30 0 0 1 530 220" fill="none" stroke={GOLD_LIGHT} strokeWidth={1.5} strokeDasharray="47" strokeDashoffset={47 * (1 - doorWindowProgress)} />

            {/* Master bedroom door */}
            <path d="M 300 420 A 35 35 0 0 0 300 455" fill="none" stroke={GOLD_LIGHT} strokeWidth={1.5} strokeDasharray="55" strokeDashoffset={55 * (1 - doorWindowProgress)} />

            {/* Bath doors */}
            <path d="M 420 420 A 25 25 0 0 1 445 420" fill="none" stroke={GOLD_LIGHT} strokeWidth={1.5} strokeDasharray="39" strokeDashoffset={39 * (1 - doorWindowProgress)} />
            <path d="M 420 550 A 25 25 0 0 0 445 550" fill="none" stroke={GOLD_LIGHT} strokeWidth={1.5} strokeDasharray="39" strokeDashoffset={39 * (1 - doorWindowProgress)} />

            {/* Bedroom 2 door */}
            <path d="M 560 520 A 30 30 0 0 0 560 550" fill="none" stroke={GOLD_LIGHT} strokeWidth={1.5} strokeDasharray="47" strokeDashoffset={47 * (1 - doorWindowProgress)} />
          </g>

          {/* ── Windows (double lines on outer walls) ── */}
          <g opacity={doorWindowProgress}>
            {/* Living room windows (top) */}
            <g>
              <line x1={200} y1={118} x2={350} y2={118} stroke={GOLD_LIGHT} strokeWidth={2} />
              <line x1={200} y1={122} x2={350} y2={122} stroke={GOLD_LIGHT} strokeWidth={2} />
            </g>
            {/* Kitchen window (top) */}
            <g>
              <line x1={580} y1={118} x2={700} y2={118} stroke={GOLD_LIGHT} strokeWidth={2} />
              <line x1={580} y1={122} x2={700} y2={122} stroke={GOLD_LIGHT} strokeWidth={2} />
            </g>
            {/* Master bedroom window (left) */}
            <g>
              <line x1={98} y1={480} x2={98} y2={600} stroke={GOLD_LIGHT} strokeWidth={2} />
              <line x1={102} y1={480} x2={102} y2={600} stroke={GOLD_LIGHT} strokeWidth={2} />
            </g>
            {/* Bedroom 2 window (right) */}
            <g>
              <line x1={778} y1={500} x2={778} y2={620} stroke={GOLD_LIGHT} strokeWidth={2} />
              <line x1={782} y1={500} x2={782} y2={620} stroke={GOLD_LIGHT} strokeWidth={2} />
            </g>
          </g>

          {/* ── Furniture ── */}
          <FurnitureIcons frame={frame} />

          {/* ── Dimension Lines ── */}
          <g opacity={dimProgress}>
            {/* Top dimension */}
            <line x1={100} y1={95} x2={780} y2={95} stroke={MUTED} strokeWidth={1} />
            <line x1={100} y1={90} x2={100} y2={100} stroke={MUTED} strokeWidth={1} />
            <line x1={780} y1={90} x2={780} y2={100} stroke={MUTED} strokeWidth={1} />
            <text x={440} y={88} textAnchor="middle" fill={MUTED} fontSize={14} fontFamily="Inter, sans-serif">
              45 ft
            </text>

            {/* Left dimension */}
            <line x1={75} y1={120} x2={75} y2={670} stroke={MUTED} strokeWidth={1} />
            <line x1={70} y1={120} x2={80} y2={120} stroke={MUTED} strokeWidth={1} />
            <line x1={70} y1={670} x2={80} y2={670} stroke={MUTED} strokeWidth={1} />
            <text x={60} y={400} textAnchor="middle" fill={MUTED} fontSize={14} fontFamily="Inter, sans-serif"
              transform="rotate(-90, 60, 400)">
              36 ft
            </text>

            {/* Living room width */}
            <line x1={100} y1={435} x2={500} y2={435} stroke={MUTED} strokeWidth={0.8} strokeDasharray="4 4" />
            <text x={300} y={450} textAnchor="middle" fill={MUTED} fontSize={11} fontFamily="Inter, sans-serif">
              26 ft
            </text>

            {/* Master height */}
            <line x1={385} y1={420} x2={385} y2={670} stroke={MUTED} strokeWidth={0.8} strokeDasharray="4 4" />
            <text x={388} y={548} fill={MUTED} fontSize={11} fontFamily="Inter, sans-serif"
              transform="rotate(-90, 388, 548)">
              16 ft
            </text>
          </g>

          {/* ── Room Labels ── */}
          <g opacity={labelProgress}>
            {Object.values(ROOMS).map((room, i) => {
              const labelDelay = i * 8;
              const labelOp = ease(frame, [460 + labelDelay, 500 + labelDelay], [0, 1]);
              return (
                <text
                  key={room.label}
                  x={room.x + room.w / 2}
                  y={room.y + room.h / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={GOLD_LIGHT}
                  fontSize={15}
                  fontFamily="'Playfair Display', Georgia, serif"
                  fontWeight="600"
                  letterSpacing="0.05em"
                  opacity={labelOp}
                >
                  {room.label}
                </text>
              );
            })}
          </g>

          {/* ── Compass indicator ── */}
          <g transform="translate(820, 150)" opacity={ease(frame, [400, 440], [0, 1])}>
            <circle cx={0} cy={0} r={25} stroke={GOLD_DARK} strokeWidth={1} fill="none" />
            <line x1={0} y1={-20} x2={0} y2={-8} stroke={GOLD} strokeWidth={2} />
            <text x={0} y={-28} textAnchor="middle" fill={GOLD} fontSize={12} fontFamily="Inter, sans-serif" fontWeight="bold">
              N
            </text>
            <polygon points="0,-18 -4,-10 4,-10" fill={GOLD} />
          </g>
        </g>
      </svg>
    </AbsoluteFill>
  );
};
