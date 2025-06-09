
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
  const [beatProgress, setBeatProgress] = useState(0);

  useEffect(() => {
    if (!isPlaying) {
      setPosition(0);
      setOpacity(0.3);
      setBeatProgress(0);
      return;
    }

    // Calculer la progression dans le beat actuel
    const beatInterval = 60000 / tempo; // durée d'un beat en ms
    let startTime = Date.now();
    
    const updateProgress = () => {
      if (!isPlaying) return;
      
      const elapsed = Date.now() - startTime;
      const progress = (elapsed % beatInterval) / beatInterval;
      setBeatProgress(progress);
      
      // Position basée sur l'approche sélectionnée
      let newPosition;
      
      switch (approach) {
        case 'ease-in':
          newPosition = 1 - Math.pow(1 - progress, 2);
          break;
        case 'ease-out':
          newPosition = 1 - Math.pow(progress, 2);
          break;
        case 'bounce':
          if (progress < 0.5) {
            newPosition = 1 - (2 * Math.pow(progress, 2));
          } else {
            newPosition = 1 - (1 - Math.pow(-2 * progress + 2, 2) / 2);
          }
          break;
        case 'elastic':
          const c4 = (2 * Math.PI) / 3;
          if (progress === 0) {
            newPosition = 0;
          } else if (progress === 1) {
            newPosition = 1;
          } else {
            newPosition = 1 - (Math.pow(2, -10 * progress) * Math.sin((progress * 10 - 0.75) * c4) + 1);
          }
          break;
        default: // linear
          newPosition = 1 - progress;
      }
      
      setPosition(Math.max(0, Math.min(1, newPosition)));
      
      // Flash sur le beat (début du cycle)
      if (progress < 0.1) {
        setOpacity(1);
      } else {
        setOpacity(0.7);
      }
      
      requestAnimationFrame(updateProgress);
    };
    
    const animationId = requestAnimationFrame(updateProgress);
    
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isPlaying, approach, tempo]);

  // Reset quand on change de beat
  useEffect(() => {
    if (isPlaying) {
      setBeatProgress(0);
    }
  }, [currentBeat]);

  return (
    <div className="h-full w-full relative bg-gray-800 p-4">
      <div className="h-full w-full relative">
        {/* Piste du curseur */}
        <div className="absolute left-1/2 transform -translate-x-1/2 w-2 h-full bg-gray-600 rounded-full" />
        
        {/* Curseur */}
        <div
          className="absolute left-1/2 transform -translate-x-1/2 w-8 h-8 rounded-lg transition-opacity duration-75 shadow-lg"
          style={{
            backgroundColor: color,
            top: `${position * 85}%`,
            opacity: opacity,
            boxShadow: `0 0 20px ${color}40`
          }}
        />
        
        {/* Marqueurs de position */}
        <div className="absolute left-0 w-full h-px bg-gray-600" style={{ top: '0%' }}>
          <span className="absolute right-0 text-xs text-gray-400 -mt-2">Beat</span>
        </div>
        <div className="absolute left-0 w-full h-px bg-gray-600" style={{ top: '85%' }}>
          <span className="absolute right-0 text-xs text-gray-400 -mt-2">Rest</span>
        </div>
        
        {/* Indicateur du beat actuel */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
          <span className="text-sm text-gray-300 bg-gray-700 px-2 py-1 rounded">
            Beat {currentBeat + 1}/{beatsPerMeasure}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TempoVisualizer;
