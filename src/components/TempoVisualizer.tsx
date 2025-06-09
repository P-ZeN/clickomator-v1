
import React, { useEffect, useState } from 'react';

interface TempoVisualizerProps {
  isPlaying: boolean;
  currentBeat: number;
  beatsPerMeasure: number;
  color: string;
  approach: string;
  tempo: number;
}

const TempoVisualizer: React.FC<TempoVisualizerProps> = ({
  isPlaying,
  currentBeat,
  beatsPerMeasure,
  color,
  approach,
  tempo
}) => {
  const [position, setPosition] = useState(0);
  const [opacity, setOpacity] = useState(0.3);

  useEffect(() => {
    if (!isPlaying) {
      setPosition(0);
      setOpacity(0.3);
      return;
    }

    const beatProgress = currentBeat / beatsPerMeasure;
    let newPosition;

    switch (approach) {
      case 'ease-in':
        newPosition = Math.pow(beatProgress, 2);
        break;
      case 'ease-out':
        newPosition = 1 - Math.pow(1 - beatProgress, 2);
        break;
      case 'bounce':
        if (beatProgress < 0.5) {
          newPosition = 2 * Math.pow(beatProgress, 2);
        } else {
          newPosition = 1 - Math.pow(-2 * beatProgress + 2, 2) / 2;
        }
        break;
      case 'elastic':
        const c4 = (2 * Math.PI) / 3;
        newPosition = beatProgress === 0
          ? 0
          : beatProgress === 1
          ? 1
          : Math.pow(2, -10 * beatProgress) * Math.sin((beatProgress * 10 - 0.75) * c4) + 1;
        break;
      default: // linear
        newPosition = beatProgress;
    }

    setPosition(newPosition);
    
    // Flash sur le beat principal
    if (currentBeat === 0) {
      setOpacity(1);
      setTimeout(() => setOpacity(0.7), 100);
    } else {
      setOpacity(0.7);
    }
  }, [isPlaying, currentBeat, beatsPerMeasure, approach]);

  return (
    <div className="h-full w-full relative bg-gray-800 p-4">
      <div className="h-full w-full relative">
        {/* Piste du curseur */}
        <div className="absolute left-1/2 transform -translate-x-1/2 w-2 h-full bg-gray-600 rounded-full" />
        
        {/* Curseur */}
        <div
          className="absolute left-1/2 transform -translate-x-1/2 w-8 h-8 rounded-lg transition-all duration-150 shadow-lg"
          style={{
            backgroundColor: color,
            top: `${position * 85}%`,
            opacity: opacity,
            boxShadow: `0 0 20px ${color}40`
          }}
        />
        
        {/* Marqueurs de temps */}
        {Array.from({ length: beatsPerMeasure + 1 }, (_, i) => (
          <div
            key={i}
            className="absolute left-0 w-full h-px bg-gray-600"
            style={{ top: `${(i / beatsPerMeasure) * 85}%` }}
          >
            <span className="absolute right-0 text-xs text-gray-400 -mt-2">
              {i === 0 ? 'Start' : i === beatsPerMeasure ? 'End' : i}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TempoVisualizer;
