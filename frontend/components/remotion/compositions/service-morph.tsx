import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion"
import { GOLD, GOLD_LIGHT, GOLD_DARK, DARK, ease } from "../utils/animation-helpers"

// Room type definitions as SVG point arrays
function getBedroomPoints(cx: number, cy: number, s: number) {
  return [
    // Bed frame
    { x: cx - 60 * s, y: cy - 20 * s }, { x: cx + 60 * s, y: cy - 20 * s },
    { x: cx + 60 * s, y: cy + 40 * s }, { x: cx - 60 * s, y: cy + 40 * s },
    // Headboard
    { x: cx - 60 * s, y: cy - 20 * s }, { x: cx - 60 * s, y: cy - 45 * s },
    { x: cx + 60 * s, y: cy - 45 * s }, { x: cx + 60 * s, y: cy - 20 * s },
    // Pillow left
    { x: cx - 45 * s, y: cy - 35 * s }, { x: cx - 10 * s, y: cy - 35 * s },
    { x: cx - 10 * s, y: cy - 22 * s }, { x: cx - 45 * s, y: cy - 22 * s },
    // Pillow right
    { x: cx + 10 * s, y: cy - 35 * s }, { x: cx + 45 * s, y: cy - 35 * s },
    { x: cx + 45 * s, y: cy - 22 * s }, { x: cx + 10 * s, y: cy - 22 * s },
    // Nightstand left
    { x: cx - 90 * s, y: cy - 30 * s }, { x: cx - 68 * s, y: cy - 30 * s },
    { x: cx - 68 * s, y: cy + 10 * s }, { x: cx - 90 * s, y: cy + 10 * s },
    // Nightstand right
    { x: cx + 68 * s, y: cy - 30 * s }, { x: cx + 90 * s, y: cy - 30 * s },
    { x: cx + 90 * s, y: cy + 10 * s }, { x: cx + 68 * s, y: cy + 10 * s },
    // Wardrobe
    { x: cx - 90 * s, y: cy - 80 * s }, { x: cx - 50 * s, y: cy - 80 * s },
    { x: cx - 50 * s, y: cy - 50 * s }, { x: cx - 90 * s, y: cy - 50 * s },
    // Lamp
    { x: cx + 79 * s, y: cy - 45 * s }, { x: cx + 79 * s, y: cy - 32 * s },
  ]
}

function getKitchenPoints(cx: number, cy: number, s: number) {
  return [
    // Counter top
    { x: cx - 80 * s, y: cy - 10 * s }, { x: cx + 80 * s, y: cy - 10 * s },
    { x: cx + 80 * s, y: cy + 10 * s }, { x: cx - 80 * s, y: cy + 10 * s },
    // Counter base
    { x: cx - 80 * s, y: cy + 10 * s }, { x: cx - 80 * s, y: cy + 50 * s },
    { x: cx + 80 * s, y: cy + 50 * s }, { x: cx + 80 * s, y: cy + 10 * s },
    // Island
    { x: cx - 40 * s, y: cy - 60 * s }, { x: cx + 40 * s, y: cy - 60 * s },
    { x: cx + 40 * s, y: cy - 40 * s }, { x: cx - 40 * s, y: cy - 40 * s },
    // Stove burners
    { x: cx + 30 * s, y: cy - 2 * s }, { x: cx + 50 * s, y: cy - 2 * s },
    { x: cx + 50 * s, y: cy + 2 * s }, { x: cx + 30 * s, y: cy + 2 * s },
    // Sink
    { x: cx - 50 * s, y: cy - 5 * s }, { x: cx - 20 * s, y: cy - 5 * s },
    { x: cx - 20 * s, y: cy + 5 * s }, { x: cx - 50 * s, y: cy + 5 * s },
    // Cabinet 1
    { x: cx - 80 * s, y: cy - 80 * s }, { x: cx - 40 * s, y: cy - 80 * s },
    { x: cx - 40 * s, y: cy - 55 * s }, { x: cx - 80 * s, y: cy - 55 * s },
    // Cabinet 2
    { x: cx - 35 * s, y: cy - 80 * s }, { x: cx + 5 * s, y: cy - 80 * s },
    { x: cx + 5 * s, y: cy - 55 * s }, { x: cx - 35 * s, y: cy - 55 * s },
    // Fridge
    { x: cx + 60 * s, y: cy - 80 * s }, { x: cx + 60 * s, y: cy - 50 * s },
  ]
}

function getLivingRoomPoints(cx: number, cy: number, s: number) {
  return [
    // Sofa back
    { x: cx - 70 * s, y: cy + 10 * s }, { x: cx + 70 * s, y: cy + 10 * s },
    { x: cx + 70 * s, y: cy + 45 * s }, { x: cx - 70 * s, y: cy + 45 * s },
    // Sofa seat
    { x: cx - 70 * s, y: cy + 10 * s }, { x: cx - 70 * s, y: cy - 10 * s },
    { x: cx + 70 * s, y: cy - 10 * s }, { x: cx + 70 * s, y: cy + 10 * s },
    // Coffee table
    { x: cx - 35 * s, y: cy - 30 * s }, { x: cx + 35 * s, y: cy - 30 * s },
    { x: cx + 35 * s, y: cy - 15 * s }, { x: cx - 35 * s, y: cy - 15 * s },
    // TV unit
    { x: cx - 60 * s, y: cy - 75 * s }, { x: cx + 60 * s, y: cy - 75 * s },
    { x: cx + 60 * s, y: cy - 55 * s }, { x: cx - 60 * s, y: cy - 55 * s },
    // TV screen
    { x: cx - 50 * s, y: cy - 73 * s }, { x: cx + 50 * s, y: cy - 73 * s },
    { x: cx + 50 * s, y: cy - 57 * s }, { x: cx - 50 * s, y: cy - 57 * s },
    // Side table left
    { x: cx - 90 * s, y: cy - 5 * s }, { x: cx - 75 * s, y: cy - 5 * s },
    { x: cx - 75 * s, y: cy + 15 * s }, { x: cx - 90 * s, y: cy + 15 * s },
    // Side table right
    { x: cx + 75 * s, y: cy - 5 * s }, { x: cx + 90 * s, y: cy - 5 * s },
    { x: cx + 90 * s, y: cy + 15 * s }, { x: cx + 75 * s, y: cy + 15 * s },
    // Rug (ellipse approximation)
    { x: cx - 45 * s, y: cy - 50 * s }, { x: cx + 45 * s, y: cy - 50 * s },
  ]
}

export const ServiceMorph: React.FC = () => {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()

  const cx = width / 2
  const cy = height / 2
  const s = 2.2

  const bedroom = getBedroomPoints(cx, cy, s)
  const kitchen = getKitchenPoints(cx, cy, s)
  const living = getLivingRoomPoints(cx, cy, s)

  // Morph between 3 rooms (each 100 frames)
  const pointCount = Math.min(bedroom.length, kitchen.length, living.length)

  const points = Array.from({ length: pointCount }, (_, i) => {
    // Phase 1: bedroom → kitchen (0-100)
    // Phase 2: kitchen → living (100-200)
    // Phase 3: living → bedroom (200-300)
    let x: number, y: number

    if (frame < 100) {
      const t = ease(frame, [10, 90], [0, 1])
      x = interpolate(t, [0, 1], [bedroom[i].x, kitchen[i].x])
      y = interpolate(t, [0, 1], [bedroom[i].y, kitchen[i].y])
    } else if (frame < 200) {
      const t = ease(frame, [110, 190], [0, 1])
      x = interpolate(t, [0, 1], [kitchen[i].x, living[i].x])
      y = interpolate(t, [0, 1], [kitchen[i].y, living[i].y])
    } else {
      const t = ease(frame, [210, 290], [0, 1])
      x = interpolate(t, [0, 1], [living[i].x, bedroom[i].x])
      y = interpolate(t, [0, 1], [living[i].y, bedroom[i].y])
    }

    return { x, y }
  })

  // Draw lines connecting every 4 points (rectangles)
  const lines: { x1: number; y1: number; x2: number; y2: number }[] = []
  for (let i = 0; i < pointCount - 1; i += 4) {
    const end = Math.min(i + 4, pointCount)
    for (let j = i; j < end - 1; j++) {
      lines.push({ x1: points[j].x, y1: points[j].y, x2: points[j + 1].x, y2: points[j + 1].y })
    }
    if (end - i === 4) {
      lines.push({ x1: points[end - 1].x, y1: points[end - 1].y, x2: points[i].x, y2: points[i].y })
    }
  }

  // Label
  const labelOpacity = 0.6
  let label = "Bedroom"
  if (frame >= 50 && frame < 150) label = frame < 100 ? "Bedroom" : "Kitchen"
  if (frame >= 150 && frame < 250) label = frame < 200 ? "Kitchen" : "Living Room"
  if (frame >= 250) label = frame < 300 ? "Living Room" : "Bedroom"

  // Subtle pulsing glow
  const glowPulse = 0.05 + 0.03 * Math.sin(frame * 0.06)

  return (
    <AbsoluteFill style={{ backgroundColor: DARK }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "100%" }}>
        <defs>
          <filter id="morphGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background glow */}
        <circle
          cx={cx}
          cy={cy}
          r={250}
          fill={GOLD}
          opacity={glowPulse}
          style={{ filter: "blur(80px)" }}
        />

        {/* Points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={3}
            fill={GOLD_LIGHT}
            opacity={0.8}
            filter="url(#morphGlow)"
          />
        ))}

        {/* Lines */}
        {lines.map((l, i) => (
          <line
            key={i}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke={GOLD}
            strokeWidth={1.5}
            opacity={0.5}
          />
        ))}

        {/* Label */}
        <text
          x={cx}
          y={height - 80}
          textAnchor="middle"
          fill={GOLD_DARK}
          fontSize={24}
          fontFamily="Inter, system-ui, sans-serif"
          fontWeight="500"
          letterSpacing="0.15em"
          opacity={labelOpacity}
        >
          {label.toUpperCase()}
        </text>
      </svg>
    </AbsoluteFill>
  )
}
