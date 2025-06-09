
import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, SkipBack, SkipForward, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TempoVisualizer from './TempoVisualizer';
import BeatGraphic from './BeatGraphic';

interface Song {
  id: string;
  title: string;
  tempo: number;
  timeSignature: string;
  color: string;
  approach: string;
}

interface Setlist {
  id: string;
  name: string;
  songs: Song[];
  createdAt: string;
}

interface SongViewProps {
  song: Song;
  setlist: Setlist;
  onUpdateSong: (song: Song) => void;
}

const SongView: React.FC<SongViewProps> = ({ song, setlist, onUpdateSong }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingTempo, setEditingTempo] = useState(false);
  const [titleValue, setTitleValue] = useState(song.title);
  const [tempoValue, setTempoValue] = useState(song.tempo.toString());
  
  const intervalRef = useRef<NodeJS.Timeout>();
  const audioContextRef = useRef<AudioContext>();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const tempoInputRef = useRef<HTMLInputElement>(null);

  const timeSignatures = ['4/4', '3/4', '2/4', '6/8', '9/8', '12/8', '5/4', '7/8'];
  const approaches = [
    { value: 'linear', label: 'Linear' },
    { value: 'ease-in', label: 'Ease In' },
    { value: 'ease-out', label: 'Ease Out' },
    { value: 'bounce', label: 'Bounce' },
    { value: 'elastic', label: 'Elastic' }
  ];

  useEffect(() => {
    setTitleValue(song.title);
    setTempoValue(song.tempo.toString());
  }, [song]);

  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingTitle]);

  useEffect(() => {
    if (editingTempo && tempoInputRef.current) {
      tempoInputRef.current.focus();
      tempoInputRef.current.select();
    }
  }, [editingTempo]);

  const beatsPerMeasure = parseInt(song.timeSignature.split('/')[0]);

  const startMetronome = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    setIsPlaying(true);
    setCurrentBeat(0);
    
    const interval = 60000 / song.tempo; // milliseconds per beat
    
    intervalRef.current = setInterval(() => {
      playClick();
      setCurrentBeat((prev) => (prev + 1) % beatsPerMeasure);
    }, interval);
  };

  const stopMetronome = () => {
    setIsPlaying(false);
    setCurrentBeat(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const playClick = () => {
    if (!audioContextRef.current) return;
    
    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);
    
    // Premier temps plus aigu
    oscillator.frequency.setValueAtTime(
      currentBeat === 0 ? 1000 : 800, 
      audioContextRef.current.currentTime
    );
    
    gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.1);
    
    oscillator.start(audioContextRef.current.currentTime);
    oscillator.stop(audioContextRef.current.currentTime + 0.1);
  };

  const updateTempo = (delta: number) => {
    const newTempo = Math.max(30, Math.min(300, song.tempo + delta));
    onUpdateSong({ ...song, tempo: newTempo });
    
    if (isPlaying) {
      stopMetronome();
      setTimeout(() => startMetronome(), 100);
    }
  };

  const handleTitleSave = () => {
    if (titleValue.trim()) {
      onUpdateSong({ ...song, title: titleValue.trim() });
    } else {
      setTitleValue(song.title);
    }
    setEditingTitle(false);
  };

  const handleTempoSave = () => {
    const newTempo = parseInt(tempoValue);
    if (newTempo >= 30 && newTempo <= 300) {
      onUpdateSong({ ...song, tempo: newTempo });
      if (isPlaying) {
        stopMetronome();
        setTimeout(() => startMetronome(), 100);
      }
    } else {
      setTempoValue(song.tempo.toString());
    }
    setEditingTempo(false);
  };

  const getCurrentSongIndex = () => {
    return setlist.songs.findIndex(s => s.id === song.id);
  };

  const goToPreviousSong = () => {
    const currentIndex = getCurrentSongIndex();
    if (currentIndex > 0) {
      const prevSong = setlist.songs[currentIndex - 1];
      onUpdateSong(prevSong);
      if (isPlaying) {
        stopMetronome();
      }
    }
  };

  const goToNextSong = () => {
    const currentIndex = getCurrentSongIndex();
    if (currentIndex < setlist.songs.length - 1) {
      const nextSong = setlist.songs[currentIndex + 1];
      onUpdateSong(nextSong);
      if (isPlaying) {
        stopMetronome();
      }
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const currentIndex = getCurrentSongIndex();

  return (
    <div className="h-full flex flex-col">
      {/* Titre du morceau - 15% */}
      <div 
        className="h-[15%] flex items-center justify-center border-b border-gray-700 transition-colors duration-150"
        style={{ 
          backgroundColor: isPlaying && currentBeat === 0 ? song.color : '#000000'
        }}
      >
        {editingTitle ? (
          <Input
            ref={titleInputRef}
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleTitleSave}
            onKeyPress={(e) => e.key === 'Enter' && handleTitleSave()}
            className="text-center text-2xl font-bold bg-transparent border-gray-600 text-white"
          />
        ) : (
          <h1 
            className="text-2xl md:text-4xl font-bold text-center cursor-pointer px-4"
            onClick={() => setEditingTitle(true)}
          >
            {song.title}
          </h1>
        )}
      </div>

      {/* Contrôles de tempo - 10% */}
      <div className="h-[10%] flex items-center justify-between px-4 border-b border-gray-700">
        <Button
          variant="outline"
          size="sm"
          className="w-[10%] aspect-square"
          onClick={() => updateTempo(-1)}
        >
          <Minus className="h-4 w-4" />
        </Button>

        <div className="flex-1 flex items-center justify-center px-4">
          {editingTempo ? (
            <Input
              ref={tempoInputRef}
              value={tempoValue}
              onChange={(e) => setTempoValue(e.target.value)}
              onBlur={handleTempoSave}
              onKeyPress={(e) => e.key === 'Enter' && handleTempoSave()}
              className="text-center text-lg font-bold bg-gray-800 border-gray-600 text-white w-24"
            />
          ) : (
            <span 
              className="text-2xl font-bold cursor-pointer"
              onClick={() => setEditingTempo(true)}
            >
              {song.tempo} BPM
            </span>
          )}
        </div>

        <Select
          value={song.approach}
          onValueChange={(value) => onUpdateSong({ ...song, approach: value })}
        >
          <SelectTrigger className="w-[25%] bg-gray-800 border-gray-600">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-600">
            {approaches.map((approach) => (
              <SelectItem key={approach.value} value={approach.value}>
                {approach.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          className="w-[10%] aspect-square ml-2"
          onClick={() => updateTempo(1)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Zone de visualisation - 60% */}
      <div className="h-[60%] flex">
        <div className="w-1/4 border-r border-gray-700">
          <TempoVisualizer 
            isPlaying={isPlaying}
            currentBeat={currentBeat}
            beatsPerMeasure={beatsPerMeasure}
            color={song.color}
            approach={song.approach}
            tempo={song.tempo}
          />
        </div>
        
        <div className="flex-1 flex flex-col">
          <div className="flex-1">
            <BeatGraphic 
              isPlaying={isPlaying}
              currentBeat={currentBeat}
              timeSignature={song.timeSignature}
              color={song.color}
              approach={song.approach}
            />
          </div>
          
          <div className="p-4">
            <Select
              value={song.timeSignature}
              onValueChange={(value) => onUpdateSong({ ...song, timeSignature: value })}
            >
              <SelectTrigger className="w-32 bg-gray-800 border-gray-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                {timeSignatures.map((sig) => (
                  <SelectItem key={sig} value={sig}>
                    {sig}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Contrôles de navigation - 15% */}
      <div className="h-[15%] flex items-center justify-center gap-4 border-t border-gray-700">
        <Button
          variant="outline"
          onClick={goToPreviousSong}
          disabled={currentIndex === 0}
        >
          <SkipBack className="h-5 w-5" />
        </Button>

        <Button
          onClick={isPlaying ? stopMetronome : startMetronome}
          className={`px-8 ${isPlaying ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
        >
          {isPlaying ? <Square className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>

        <Button
          variant="outline"
          onClick={goToNextSong}
          disabled={currentIndex === setlist.songs.length - 1}
        >
          <SkipForward className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default SongView;
