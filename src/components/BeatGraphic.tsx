
import React, { useEffect, useState } from 'react';

interface BeatGraphicProps {
  isPlaying: boolean;
  currentBeat: number;
  timeSignature: string;
  color: string;
  approach: string;
}

const BeatGraphic: React.FC<BeatGraphicProps> = ({
  isPlaying,
  currentBeat,
  timeSignature,
  color,
  approach
}) => {
  const [beatOpacities, setBeatOpacities] = useState<number[]>([]);

  const beatsPerMeasure = parseInt(timeSignature.split('/')[0]);
  const noteValue = parseInt(timeSignature.split('/')[1]);

  useEffect(() => {
    if (!isPlaying) {
      setBeatOpacities(Array(beatsPerMeasure).fill(0.2));
      return;
    }

    const newOpacities = Array(beatsPerMeasure).fill(0.2);
    
    // Beat actuel est highlighté
    newOpacities[currentBeat] = 1;
    
    // Les beats précédents s'atténuent progressivement
    for (let i = 0; i < beatsPerMeasure; i++) {
      if (i !== currentBeat) {
        const distance = Math.min(
          Math.abs(currentBeat - i),
          beatsPerMeasure - Math.abs(currentBeat - i)
        );
        newOpacities[i] = Math.max(0.2, 1 - (distance * 0.3));
      }
    }

    setBeatOpacities(newOpacities);
  }, [isPlaying, currentBeat, beatsPerMeasure]);

  const getBeatSize = (index: number) => {
    if (index === 0) return 'large'; // Premier temps plus gros
    if (noteValue === 8 && index % 3 === 0) return 'medium'; // Temps forts en 6/8, 9/8, 12/8
    if (noteValue === 4 && index % 2 === 0) return 'medium'; // Temps forts en 4/4
    return 'small';
  };

  const getSizeClass = (size: string) => {
    switch (size) {
      case 'large': return 'w-8 h-8';
      case 'medium': return 'w-6 h-6';
      default: return 'w-4 h-4';
    }
  };

  return (
    <div className="h-full w-full flex items-center justify-center bg-gray-800 p-8">
      <div className="flex items-center gap-4">
        {Array.from({ length: beatsPerMeasure }, (_, i) => {
          const size = getBeatSize(i);
          const sizeClass = getSizeClass(size);
          const opacity = beatOpacities[i] || 0.2;
          
          return (
            <div key={i} className="flex flex-col items-center gap-2">
              <div
                className={`${sizeClass} rounded-full transition-all duration-150 shadow-lg`}
                style={{
                  backgroundColor: color,
                  opacity: opacity,
                  boxShadow: opacity > 0.5 ? `0 0 20px ${color}60` : 'none',
                  transform: currentBeat === i ? 'scale(1.2)' : 'scale(1)'
                }}
              />
              <span className="text-xs text-gray-400">
                {i + 1}
              </span>
            </div>
          );
        })}
      </div>
      
      {/* Indicateur de signature rythmique */}
      <div className="absolute top-4 right-4">
        <div className="bg-gray-700 rounded-lg px-3 py-2">
          <span className="text-lg font-bold text-white">{timeSignature}</span>
        </div>
      </div>
    </div>
  );
};

export default BeatGraphic;
