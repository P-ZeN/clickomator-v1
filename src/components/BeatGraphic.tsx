import React, { useEffect, useState, useRef } from 'react'

// Add a new prop to BeatGraphic for panelKey
interface BeatGraphicProps {
  isPlaying: boolean
  currentBeat: number // 0-indexed
  timeSignature: string
  color: string
  approach: string
  tempo?: number // Optional: BPM, for more accurate animation
  panelKey?: number // New: triggers redraw on panel resize
}

const PADDING = 20 // Padding around the graph

// Helper function to calculate a point on a quadratic Bézier curve
const getPointOnQuadraticBezier = (
  p0: { x: number; y: number },
  p1: { x: number; y: number }, // control point
  p2: { x: number; y: number },
  t: number // progress along the curve (0 to 1)
): { x: number; y: number } => {
  const tInv = 1 - t
  const tInvSq = tInv * tInv
  const tSq = t * t

  const x = tInvSq * p0.x + 2 * tInv * t * p1.x + tSq * p2.x
  const y = tInvSq * p0.y + 2 * tInv * t * p1.y + tSq * p2.y
  return { x, y }
}

// Helper function to generate SVG path data based on approach
const getCurvePathData = (
  beatIndex: number,
  currentApproach: string,
  beatWidth: number,
  graphHeight: number,
  svgClientWidth: number, // Pass actual SVG clientWidth
  svgClientHeight: number // Pass actual SVG clientHeight
) => {
  if (svgClientWidth === 0 || svgClientHeight === 0) return '' // Prevent drawing if dimensions are not ready

  const startX = PADDING + beatIndex * beatWidth
  const midX = startX + beatWidth / 2
  const endX = startX + beatWidth
  const bottomY = PADDING + graphHeight
  const topY = PADDING

  switch (currentApproach) {
    case 'ease-in':
      return `M ${startX},${bottomY} Q ${midX},${bottomY} ${midX},${topY} Q ${endX},${topY} ${endX},${bottomY}`
    case 'ease-out':
      return `M ${startX},${bottomY} Q ${startX},${topY} ${midX},${topY} Q ${midX},${bottomY} ${endX},${bottomY}`
    case 'linear':
    // case 'bounce': // TODO: Implement distinct bounce path visualization
    // case 'elastic': // TODO: Implement distinct elastic path visualization
    // Fallthrough to default for linear, or if bounce/elastic were uncommented and not handled
    default:
      return `M ${startX},${bottomY} L ${midX},${topY} L ${endX},${bottomY}`
  }
}

const BeatGraphic: React.FC<BeatGraphicProps> = ({
  isPlaying,
  currentBeat,
  timeSignature,
  color,
  approach,
  tempo,
  panelKey // New prop
}) => {
  const beatsPerMeasure = parseInt(timeSignature.split('/')[0])
  const svgRef = useRef<SVGSVGElement>(null)
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })
  const animationFrameId = useRef<number | null>(null)
  const beatStartTimeRef = useRef<number>(0)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  const beatDuration = tempo ? 60000 / tempo : 500

  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current) {
        setDimensions({
          width: svgRef.current.clientWidth,
          height: svgRef.current.clientHeight
        })
      }
    }

    updateDimensions() // Initial call
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, []) // Empty dependency array, runs once on mount and cleans up on unmount

  useEffect(() => {
    // When panelKey changes, update dimensions (force recalculation)
    if (svgRef.current) {
      setDimensions({
        width: svgRef.current.clientWidth,
        height: svgRef.current.clientHeight
      })
    }
  }, [panelKey])

  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || dimensions.height === 0) {
      // If dimensions are not ready, or SVG ref is not set, reset cursor to a default position
      // or ensure no animation is running.
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current)
        animationFrameId.current = null
      }
      // Optionally set a default cursor position if needed when not playing / dimensions not ready
      // For now, we let the initial state of cursorPos handle this or the else block below.
      return
    }

    const graphHeight = dimensions.height - 2 * PADDING
    const beatWidth = (dimensions.width - 2 * PADDING) / beatsPerMeasure

    if (isPlaying) {
      beatStartTimeRef.current = performance.now()

      const animateCursor = (timestamp: number) => {
        const elapsedTimeInBeat = timestamp - beatStartTimeRef.current
        let progress = elapsedTimeInBeat / beatDuration
        if (progress > 1) progress = 1
        if (progress < 0) progress = 0

        const segmentProgress =
          progress < 0.5 ? progress * 2 : (progress - 0.5) * 2
        const isUpward = progress < 0.5

        const currentBeatStartX = PADDING + currentBeat * beatWidth
        const currentBeatMidX = currentBeatStartX + beatWidth / 2
        const currentBeatEndX = currentBeatStartX + beatWidth

        const pathTopY = PADDING
        const pathBottomY = PADDING + graphHeight

        let calculatedPos: { x: number; y: number }

        if (
          approach ===
          'linear' /* || approach === 'bounce' || approach === 'elastic' */
        ) {
          let y
          if (isUpward) {
            y = pathBottomY - segmentProgress * graphHeight
          } else {
            y = pathTopY + segmentProgress * graphHeight
          }
          const x = currentBeatStartX + progress * beatWidth
          calculatedPos = { x, y }
        } else {
          let p0: { x: number; y: number }
          let c1: { x: number; y: number }
          let p2: { x: number; y: number }

          if (isUpward) {
            p0 = { x: currentBeatStartX, y: pathBottomY }
            p2 = { x: currentBeatMidX, y: pathTopY }
            if (approach === 'ease-in') {
              c1 = { x: currentBeatMidX, y: pathBottomY }
            } else {
              // ease-out
              c1 = { x: currentBeatStartX, y: pathTopY }
            }
          } else {
            // Downward
            p0 = { x: currentBeatMidX, y: pathTopY }
            p2 = { x: currentBeatEndX, y: pathBottomY }
            if (approach === 'ease-in') {
              c1 = { x: currentBeatEndX, y: pathTopY }
            } else {
              // ease-out
              c1 = { x: currentBeatMidX, y: pathBottomY }
            }
          }
          calculatedPos = getPointOnQuadraticBezier(p0, c1, p2, segmentProgress)
        }

        setCursorPos(calculatedPos)
        animationFrameId.current = requestAnimationFrame(animateCursor)
      }

      animationFrameId.current = requestAnimationFrame(animateCursor)
    } else {
      // Reset cursor to the start of the current (or first) beat when not playing
      // Ensure dimensions are available before calculating initial position
      if (dimensions.width > 0 && dimensions.height > 0) {
        const initialX = PADDING + currentBeat * beatWidth
        const initialY = PADDING + graphHeight
        setCursorPos({ x: initialX, y: initialY })
      }
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current)
        animationFrameId.current = null
      }
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current)
        animationFrameId.current = null
      }
    }
  }, [
    isPlaying,
    currentBeat,
    beatsPerMeasure,
    beatDuration,
    approach,
    dimensions.width, // Now correctly scoped
    dimensions.height,
    color // Added color to dependencies as good practice, though not directly used in calculations here
  ])

  const svgWidth = '100%'
  const svgHeight = '100%'

  // Conditional rendering for SVG content based on dimensions
  let svgContent = null
  if (dimensions.width > 0 && dimensions.height > 0) {
    const graphHeight = dimensions.height - 2 * PADDING
    const beatWidth = (dimensions.width - 2 * PADDING) / beatsPerMeasure
    svgContent = (
      <>
        {/* Vertical beat lines */}
        {Array.from({ length: beatsPerMeasure + 1 }).map((_, i) => (
          <line
            key={`vline-${i}`}
            x1={PADDING + i * beatWidth}
            y1={PADDING}
            x2={PADDING + i * beatWidth}
            y2={PADDING + graphHeight}
            stroke={
              i === 0 || i === beatsPerMeasure
                ? 'rgba(200, 200, 200, 0.8)'
                : 'rgba(100, 100, 100, 0.5)'
            }
            strokeWidth='1'
          />
        ))}

        {/* Baseline */}
        <line
          key='baseline'
          x1={PADDING}
          y1={PADDING + graphHeight}
          x2={PADDING + beatsPerMeasure * beatWidth}
          y2={PADDING + graphHeight}
          stroke='rgba(200, 200, 200, 0.8)' /* Same as main vertical lines */
          strokeWidth='1'
        />

        {/* Horizontal subdivision line (1 line at midpoint) */}
        <line
          key='subdivision-line-midpoint'
          x1={PADDING}
          y1={PADDING + graphHeight / 2} /* Midpoint of graphHeight */
          x2={PADDING + beatsPerMeasure * beatWidth}
          y2={PADDING + graphHeight / 2}
          stroke='rgba(100, 100, 100, 0.3)' /* Dimmed color */
          strokeWidth='1'
        />

        {/* Beat paths (V-shapes or curves) */}
        {Array.from({ length: beatsPerMeasure }).map((_, i) => {
          const pathData = getCurvePathData(
            i,
            approach,
            beatWidth,
            graphHeight,
            dimensions.width,
            dimensions.height
          )
          if (!pathData) return null // Don't render path if data is empty
          return (
            <path
              key={`beat-path-${i}`}
              d={pathData}
              stroke={'#888'} // Use neutral gray for beat lines
              strokeOpacity={0.3}
              strokeWidth='2'
              fill='none'
            />
          )
        })}

        {/* Beat numbers */}
        {Array.from({ length: beatsPerMeasure }).map((_, i) => (
          <text
            key={`beat-number-${i}`}
            x={PADDING + i * beatWidth}
            y={PADDING + graphHeight + 15}
            fill='lightgray'
            fontSize='10'
            textAnchor='start'
          >
            {i + 1}
          </text>
        ))}

        {/* Cursor */}
        {isPlaying && (
          <circle
            cx={cursorPos.x}
            cy={cursorPos.y}
            r='20'
            fill={currentBeat === 0 ? 'red' : color}
            filter={currentBeat === 0 ? 'url(#glow)' : 'none'}
          >
            <animate
              attributeName='r'
              values={currentBeat === 0 ? '20;28;20' : '20;20'}
              dur={currentBeat === 0 ? `${beatDuration / 1000}s` : '0.1s'}
              repeatCount={currentBeat === 0 ? 'indefinite' : '0'}
            />
          </circle>
        )}
        <defs>
          <filter id='glow'>
            <feGaussianBlur stdDeviation='3.5' result='coloredBlur' />
            <feMerge>
              <feMergeNode in='coloredBlur' />
              <feMergeNode in='SourceGraphic' />
            </feMerge>
          </filter>
        </defs>
      </>
    )
  }

  return (
    <div className='h-full w-full flex flex-col items-center justify-center bg-gray-800 p-2 relative'>
      <svg
        ref={svgRef}
        width={svgWidth}
        height={svgHeight}
        className='flex-grow'
      >
        {svgContent}
      </svg>

      {/* Indicateur de signature rythmique */}
      <div className='absolute top-4 right-4'>
        <div className='bg-gray-700 rounded-lg px-3 py-2'>
          <span className='text-lg font-bold text-white'>{timeSignature}</span>
        </div>
      </div>
    </div>
  )
}

export default BeatGraphic
