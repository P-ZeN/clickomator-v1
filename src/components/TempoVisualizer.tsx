import React, { useEffect, useRef, useState } from 'react';

interface TempoVisualizerProps {
  isPlaying: boolean;
  currentBeat: number; // Signals the start of a new beat (0-indexed within measure)
  beatsPerMeasure: number; // Total beats in a measure
  color: string;
  approach: 'linear' | 'ease-in' | 'ease-out' | 'bounce' | 'elastic';
  tempo: number; // Beats per minute
}

// Easing functions
const easeLinear = (t: number) => t;
const easeInQuad = (t: number) => t * t;
const easeOutQuad = (t: number) => t * (2 - t);
const easeOutBounce = (t: number) => {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
};
const easeOutElastic = (t: number) => {
  const c4 = (2 * Math.PI) / 3;
  return t === 0
    ? 0
    : t === 1
    ? 1
    : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

const getEasingFunction = (approach: TempoVisualizerProps['approach']) => {
  switch (approach) {
    case 'ease-in':
      return easeInQuad;
    case 'ease-out':
      return easeOutQuad;
    case 'bounce':
      return easeOutBounce;
    case 'elastic':
      return easeOutElastic;
    case 'linear':
    default:
      return easeLinear;
  }
};

const TempoVisualizer: React.FC<TempoVisualizerProps> = ({
  isPlaying,
  currentBeat,
  color,
  approach,
  tempo,
}) => {
  const [yPosition, setYPosition] = useState(1); // 0 for top, 1 for bottom of travel. Start at bottom.
  const animationFrameId = useRef<number>();
  const beatStartTimeRef = useRef<number>(0); // Timestamp of the last beat start
  const lastProcessedBeatKeyRef = useRef<string>(''); // To detect new beats using a key

  useEffect(() => {
    // This effect resets the beat start time when a new beat occurs or playback starts/stops.
    const beatKey = `${currentBeat}-${tempo}`;

    if (isPlaying) {
      if (lastProcessedBeatKeyRef.current !== beatKey || beatStartTimeRef.current === 0) {
        beatStartTimeRef.current = performance.now();
        lastProcessedBeatKeyRef.current = beatKey;
      }
    } else {
      // Reset when not playing
      beatStartTimeRef.current = 0;
      lastProcessedBeatKeyRef.current = '';
      setYPosition(1); // Reset visual position to bottom
    }
  }, [isPlaying, currentBeat, tempo]);

  useEffect(() => {
    // This effect handles the animation loop
    if (!isPlaying || tempo <= 0) {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      setYPosition(1); // Ensure it's at the bottom when not playing
      return;
    }

    const beatDurationMs = (60 / tempo) * 1000;
    if (beatDurationMs <= 0) return;

    const easeFn = getEasingFunction(approach);

    const animate = (timestamp: number) => {
      if (!isPlaying || !beatStartTimeRef.current) {
        if (isPlaying) animationFrameId.current = requestAnimationFrame(animate);
        return;
      }

      const elapsedTimeSinceBeatStart = timestamp - beatStartTimeRef.current;

      let fullBeatProgress = elapsedTimeSinceBeatStart / beatDurationMs;

      fullBeatProgress = Math.max(0, Math.min(fullBeatProgress, 1.0));

      let newYPos;
      // Cycle: Bottom (yPos=1) on beat -> Top (yPos=0) on half-beat -> Bottom (yPos=1) on next beat
      if (fullBeatProgress < 0.5) {
        // First half of the beat: Moving from Bottom (1) to Top (0)
        const progressInFirstHalf = fullBeatProgress / 0.5; // Normalize to 0-1 for this half
        newYPos = 1 - easeFn(progressInFirstHalf);
      } else {
        // Second half of the beat: Moving from Top (0) back to Bottom (1)
        const progressInSecondHalf = (fullBeatProgress - 0.5) / 0.5; // Normalize to 0-1 for this half
        newYPos = easeFn(progressInSecondHalf);
      }

      setYPosition(newYPos);
      animationFrameId.current = requestAnimationFrame(animate);
    };

    animationFrameId.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isPlaying, tempo, approach]);

  const barHeight = 8; // Height of the bar in pixels
  const displayColor = isPlaying && currentBeat === 0 ? 'red' : color;

  const dynamicCursorStyle: React.CSSProperties = {
    position: 'absolute',
    left: '0',
    top: `calc(${yPosition * 100}% - ${yPosition * barHeight}px)`,
    width: '100%',
    height: `${barHeight}px`,
    backgroundColor: displayColor,
    // boxShadow for a subtle glow/trail effect
    boxShadow: `0px 0px 12px 3px ${displayColor}B3`, // color with ~70% opacity
  };

  return (
    <div style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: '#1f2937',
        overflow: 'hidden'
    }}>
      <div style={dynamicCursorStyle}></div>

      <div style={{
          position: 'absolute',
          top: '50%',
          left: '10%',
          right: '10%',
          height: '1px',
          backgroundColor: 'rgba(255,255,255,0.15)',
          transform: 'translateY(-50%)',
          zIndex: 0
      }}></div>
        <div style={{
            position: 'absolute',
            top: '0%',
            left: '10%',
            right: '10%',
            height: '1px',
            backgroundColor: 'rgba(255,255,255,0.1)',
            zIndex: 0
        }}></div>
        <div style={{
            position: 'absolute',
            bottom: '0%',
            left: '10%',
            right: '10%',
            height: '1px',
            backgroundColor: 'rgba(255,255,255,0.1)',
            zIndex: 0
        }}></div>
    </div>
  );
};

export default TempoVisualizer;
