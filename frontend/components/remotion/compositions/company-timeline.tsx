import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion"
import { GOLD, GOLD_LIGHT, GOLD_DARK, WHITE, MUTED, DARK, ease } from "../utils/animation-helpers"

interface Milestone {
  year: string
  title: string
  frameStart: number
  side: "left" | "right"
}

const milestones: Milestone[] = [
  { year: "2010", title: "Founded in Bangalore", frameStart: 30, side: "left" },
  { year: "2013", title: "First 50 Projects", frameStart: 110, side: "right" },
  { year: "2016", title: "Expanded to Commercial", frameStart: 190, side: "left" },
  { year: "2019", title: "100th Project & Award", frameStart: 270, side: "right" },
  { year: "2022", title: "200+ Projects, 15+ Team", frameStart: 350, side: "left" },
  { year: "2025", title: "Industry Leader", frameStart: 430, side: "right" },
]

// SVG icons scaled for 1920x1080 canvas
function MilestoneIcon({ index, cx, cy }: { index: number; cx: number; cy: number }) {
  const s = 2.2
  const iconColor = GOLD_LIGHT

  switch (index) {
    case 0: // Office
      return (
        <g transform={`translate(${cx - 10 * s}, ${cy - 10 * s})`}>
          <rect x={2 * s} y={6 * s} width={16 * s} height={14 * s} fill="none" stroke={iconColor} strokeWidth={2} />
          <polygon points={`${10 * s},${0 * s} ${0 * s},${6 * s} ${20 * s},${6 * s}`} fill="none" stroke={iconColor} strokeWidth={2} />
          <rect x={7 * s} y={12 * s} width={6 * s} height={8 * s} fill="none" stroke={iconColor} strokeWidth={1.5} />
        </g>
      )
    case 1: // Star
      return (
        <g transform={`translate(${cx}, ${cy})`}>
          {[0, 1, 2, 3, 4].map((i) => {
            const angle = (i * 72 - 90) * (Math.PI / 180)
            const innerAngle = ((i * 72 + 36) - 90) * (Math.PI / 180)
            const r = 10 * s
            const ir = 4 * s
            return (
              <line key={i} x1={Math.cos(angle) * r} y1={Math.sin(angle) * r} x2={Math.cos(innerAngle) * ir} y2={Math.sin(innerAngle) * ir} stroke={iconColor} strokeWidth={2} />
            )
          })}
        </g>
      )
    case 2: // Building
      return (
        <g transform={`translate(${cx - 10 * s}, ${cy - 12 * s})`}>
          <rect x={0} y={4 * s} width={10 * s} height={20 * s} fill="none" stroke={iconColor} strokeWidth={2} />
          <rect x={10 * s} y={0} width={10 * s} height={24 * s} fill="none" stroke={iconColor} strokeWidth={2} />
          <line x1={3 * s} y1={8 * s} x2={7 * s} y2={8 * s} stroke={iconColor} strokeWidth={1.5} />
          <line x1={3 * s} y1={14 * s} x2={7 * s} y2={14 * s} stroke={iconColor} strokeWidth={1.5} />
          <line x1={13 * s} y1={5 * s} x2={17 * s} y2={5 * s} stroke={iconColor} strokeWidth={1.5} />
          <line x1={13 * s} y1={11 * s} x2={17 * s} y2={11 * s} stroke={iconColor} strokeWidth={1.5} />
        </g>
      )
    case 3: // Trophy
      return (
        <g transform={`translate(${cx - 8 * s}, ${cy - 10 * s})`}>
          <path d={`M${3 * s},${0} L${13 * s},${0} L${11 * s},${10 * s} L${5 * s},${10 * s} Z`} fill="none" stroke={iconColor} strokeWidth={2} />
          <line x1={8 * s} y1={10 * s} x2={8 * s} y2={16 * s} stroke={iconColor} strokeWidth={2} />
          <line x1={4 * s} y1={16 * s} x2={12 * s} y2={16 * s} stroke={iconColor} strokeWidth={2} />
          <circle cx={0} cy={4 * s} r={3 * s} fill="none" stroke={iconColor} strokeWidth={1.5} />
          <circle cx={16 * s} cy={4 * s} r={3 * s} fill="none" stroke={iconColor} strokeWidth={1.5} />
        </g>
      )
    case 4: // Team
      return (
        <g transform={`translate(${cx - 12 * s}, ${cy - 8 * s})`}>
          <circle cx={8 * s} cy={3 * s} r={3 * s} fill="none" stroke={iconColor} strokeWidth={2} />
          <path d={`M${2 * s},${14 * s} Q${8 * s},${8 * s} ${14 * s},${14 * s}`} fill="none" stroke={iconColor} strokeWidth={2} />
          <circle cx={18 * s} cy={3 * s} r={3 * s} fill="none" stroke={iconColor} strokeWidth={2} />
          <path d={`M${12 * s},${14 * s} Q${18 * s},${8 * s} ${24 * s},${14 * s}`} fill="none" stroke={iconColor} strokeWidth={2} />
        </g>
      )
    case 5: // Crown
      return (
        <g transform={`translate(${cx - 10 * s}, ${cy - 8 * s})`}>
          <polygon
            points={`${0},${16 * s} ${2 * s},${4 * s} ${7 * s},${10 * s} ${10 * s},${0} ${13 * s},${10 * s} ${18 * s},${4 * s} ${20 * s},${16 * s}`}
            fill="none" stroke={iconColor} strokeWidth={2}
          />
          <line x1={0} y1={16 * s} x2={20 * s} y2={16 * s} stroke={iconColor} strokeWidth={2} />
        </g>
      )
    default:
      return null
  }
}

export const CompanyTimeline: React.FC = () => {
  const frame = useCurrentFrame()
  const { width, height } = useVideoConfig()

  const cx = width / 2
  const totalLineHeight = height * 0.72
  const lineTop = height * 0.12
  const lineBottom = lineTop + totalLineHeight

  // Line draw progress
  const lineProgress = ease(frame, [0, 480], [0, 1])
  const lineLength = totalLineHeight * lineProgress
  const currentLineY = lineTop + lineLength

  return (
    <AbsoluteFill style={{ backgroundColor: DARK }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "100%" }}>
        <defs>
          <filter id="timelineGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GOLD_LIGHT} />
            <stop offset="100%" stopColor={GOLD} />
          </linearGradient>
        </defs>

        {/* Title */}
        <text
          x={cx}
          y={65}
          textAnchor="middle"
          fill={WHITE}
          fontSize={56}
          fontFamily="'Playfair Display', Georgia, serif"
          fontWeight="bold"
          opacity={ease(frame, [0, 20], [0, 1])}
        >
          Our Journey
        </text>

        {/* Background line (dim) */}
        <line
          x1={cx}
          y1={lineTop}
          x2={cx}
          y2={lineBottom}
          stroke={GOLD_DARK}
          strokeWidth={2}
          opacity={0.15}
        />

        {/* Animated golden line */}
        <line
          x1={cx}
          y1={lineTop}
          x2={cx}
          y2={currentLineY}
          stroke="url(#lineGrad)"
          strokeWidth={4}
          strokeLinecap="round"
          filter="url(#timelineGlow)"
        />

        {/* Milestones */}
        {milestones.map((milestone, i) => {
          const nodeY = lineTop + (totalLineHeight / (milestones.length - 1)) * i
          const nodeProgress = ease(frame, [milestone.frameStart, milestone.frameStart + 30], [0, 1])
          const isReached = currentLineY >= nodeY

          const xOffset = milestone.side === "left" ? -380 : 380
          const textAnchor = milestone.side === "left" ? "end" : "start"
          const iconX = milestone.side === "left" ? cx - 200 : cx + 200

          return (
            <g key={i} opacity={nodeProgress}>
              {/* Node circle */}
              <circle
                cx={cx}
                cy={nodeY}
                r={interpolate(nodeProgress, [0, 1], [0, 22])}
                fill={DARK}
                stroke={isReached ? GOLD : GOLD_DARK}
                strokeWidth={3}
              />
              <circle
                cx={cx}
                cy={nodeY}
                r={interpolate(nodeProgress, [0, 1], [0, 9])}
                fill={isReached ? GOLD_LIGHT : GOLD_DARK}
                opacity={isReached ? 1 : 0.4}
              />

              {/* Glow on active */}
              {isReached && (
                <circle
                  cx={cx}
                  cy={nodeY}
                  r={36}
                  fill={GOLD}
                  opacity={0.08 + 0.05 * Math.sin(frame * 0.08 + i)}
                  style={{ filter: "blur(12px)" }}
                />
              )}

              {/* Connection line to text */}
              <line
                x1={cx + (milestone.side === "left" ? -24 : 24)}
                y1={nodeY}
                x2={cx + xOffset * 0.45}
                y2={nodeY}
                stroke={GOLD_DARK}
                strokeWidth={1.5}
                opacity={0.4 * nodeProgress}
                strokeDasharray="6 4"
              />

              {/* Year */}
              <text
                x={cx + xOffset}
                y={nodeY - 12}
                textAnchor={textAnchor}
                fill={GOLD}
                fontSize={46}
                fontFamily="'Playfair Display', Georgia, serif"
                fontWeight="bold"
                opacity={nodeProgress}
              >
                {milestone.year}
              </text>

              {/* Title */}
              <text
                x={cx + xOffset}
                y={nodeY + 28}
                textAnchor={textAnchor}
                fill={MUTED}
                fontSize={28}
                fontFamily="Inter, system-ui, sans-serif"
                fontWeight="400"
                letterSpacing="0.02em"
                opacity={nodeProgress * 0.8}
              >
                {milestone.title}
              </text>

              {/* Icon */}
              <g opacity={nodeProgress}>
                <MilestoneIcon index={i} cx={iconX} cy={nodeY} />
              </g>
            </g>
          )
        })}

        {/* Moving dot at line tip */}
        <circle
          cx={cx}
          cy={currentLineY}
          r={6}
          fill={GOLD_LIGHT}
          filter="url(#timelineGlow)"
        />
      </svg>
    </AbsoluteFill>
  )
}
