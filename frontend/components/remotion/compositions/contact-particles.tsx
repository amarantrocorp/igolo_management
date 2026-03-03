import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion"
import { GOLD, GOLD_LIGHT, GOLD_DARK, DARK, seededRandom, ease } from "../utils/animation-helpers"

// Envelope shape target positions
function getEnvelopeTargets(cx: number, cy: number, scale: number = 1) {
  const s = scale
  const points: { x: number; y: number }[] = []

  // Envelope body (rectangle)
  const bodyLeft = cx - 80 * s
  const bodyRight = cx + 80 * s
  const bodyTop = cy - 35 * s
  const bodyBottom = cy + 45 * s

  // Top edge
  for (let i = 0; i <= 8; i++) {
    const t = i / 8
    points.push({ x: bodyLeft + (bodyRight - bodyLeft) * t, y: bodyTop })
  }
  // Right edge
  for (let i = 1; i <= 5; i++) {
    const t = i / 5
    points.push({ x: bodyRight, y: bodyTop + (bodyBottom - bodyTop) * t })
  }
  // Bottom edge
  for (let i = 1; i <= 8; i++) {
    const t = i / 8
    points.push({ x: bodyRight - (bodyRight - bodyLeft) * t, y: bodyBottom })
  }
  // Left edge
  for (let i = 1; i < 5; i++) {
    const t = i / 5
    points.push({ x: bodyLeft, y: bodyBottom - (bodyBottom - bodyTop) * t })
  }

  // Flap (triangle on top)
  for (let i = 0; i <= 6; i++) {
    const t = i / 6
    points.push({
      x: bodyLeft + (cx - bodyLeft) * t,
      y: bodyTop - (50 * s - 0) * Math.sin(t * Math.PI) * 0.6 + bodyTop * 0 - bodyTop * 0,
    })
  }
  // Correct: flap goes from top-left corner to peak (center, above) to top-right corner
  for (let i = 0; i <= 5; i++) {
    const t = i / 5
    // Left to peak
    points.push({
      x: bodyLeft + (cx - bodyLeft) * t,
      y: bodyTop - (40 * s) * t,
    })
  }
  for (let i = 1; i <= 5; i++) {
    const t = i / 5
    // Peak to right
    points.push({
      x: cx + (bodyRight - cx) * t,
      y: bodyTop - (40 * s) * (1 - t),
    })
  }

  // Inner fold lines (V shape inside envelope)
  for (let i = 0; i <= 4; i++) {
    const t = i / 4
    points.push({
      x: bodyLeft + (cx - bodyLeft) * t,
      y: bodyTop + (bodyBottom - bodyTop) * 0.6 * t,
    })
  }
  for (let i = 1; i <= 4; i++) {
    const t = i / 4
    points.push({
      x: cx + (bodyRight - cx) * t,
      y: bodyTop + (bodyBottom - bodyTop) * 0.6 * (1 - t),
    })
  }

  return points
}

export const ContactParticles: React.FC = () => {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()

  const cx = width / 2
  const cy = height / 2
  const targets = getEnvelopeTargets(cx, cy, 2.5)

  const particleCount = 60
  const rng = seededRandom(42)

  const particles = Array.from({ length: particleCount }, (_, i) => {
    const targetIdx = i % targets.length
    return {
      id: i,
      startX: rng() * width,
      startY: rng() * height,
      targetX: targets[targetIdx].x,
      targetY: targets[targetIdx].y,
      size: 2 + rng() * 3,
      phase: rng() * Math.PI * 2,
      speed: 0.3 + rng() * 0.7,
    }
  })

  // Phase timings
  const gatherProgress = ease(frame, [100, 200], [0, 1])
  const holdPulse = frame >= 180 && frame <= 240
  const disperseProgress = ease(frame, [230, 300], [0, 1])
  const effectiveGather = gatherProgress * (1 - disperseProgress)

  return (
    <AbsoluteFill style={{ backgroundColor: DARK }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "100%" }}
      >
        <defs>
          <filter id="envelopeGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ambient glow */}
        <circle
          cx={cx}
          cy={cy}
          r={200}
          fill={GOLD}
          opacity={effectiveGather * 0.05}
          style={{ filter: "blur(60px)" }}
        />

        {/* Particles */}
        {particles.map((p) => {
          const floatX = Math.sin(frame * 0.02 * p.speed + p.phase) * 15
          const floatY = Math.cos(frame * 0.015 * p.speed + p.phase * 1.5) * 10

          const currentX = interpolate(
            effectiveGather,
            [0, 1],
            [p.startX + floatX, p.targetX]
          )
          const currentY = interpolate(
            effectiveGather,
            [0, 1],
            [p.startY + floatY, p.targetY]
          )

          const pulseScale = holdPulse
            ? 1 + 0.3 * Math.sin((frame - 180) * 0.15 + p.phase)
            : 1

          const opacity = interpolate(effectiveGather, [0, 0.5, 1], [0.25, 0.5, 0.85])

          return (
            <circle
              key={p.id}
              cx={currentX}
              cy={currentY}
              r={p.size * pulseScale}
              fill={GOLD_LIGHT}
              opacity={opacity}
              filter="url(#envelopeGlow)"
            />
          )
        })}

        {/* Connection lines when gathered */}
        {effectiveGather > 0.7 && (
          <g opacity={(effectiveGather - 0.7) * 3.33 * 0.12}>
            {targets.slice(0, -1).map((t, i) => {
              const next = targets[i + 1]
              if (!next) return null
              const dist = Math.sqrt(
                (t.x - next.x) ** 2 + (t.y - next.y) ** 2
              )
              if (dist > 120) return null
              return (
                <line
                  key={i}
                  x1={t.x}
                  y1={t.y}
                  x2={next.x}
                  y2={next.y}
                  stroke={GOLD_DARK}
                  strokeWidth={0.6}
                />
              )
            })}
          </g>
        )}
      </svg>
    </AbsoluteFill>
  )
}
