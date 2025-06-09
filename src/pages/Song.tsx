
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SongView from '@/components/SongView';

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

const Song = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setlistId = searchParams.get('setlistId');
  
  const [song, setSong] = useState<Song | null>(null);
  const [setlist, setSetlist] = useState<Setlist | null>(null);

  useEffect(() => {
    loadSong();
  }, [id, setlistId]);

  const loadSong = () => {
    const stored = localStorage.getItem('metronome-setlists');
    if (stored && setlistId) {
      const setlists = JSON.parse(stored);
      const foundSetlist = setlists.find((s: Setlist) => s.id === setlistId);
      if (foundSetlist) {
        setSetlist(foundSetlist);
        const foundSong = foundSetlist.songs.find((s: Song) => s.id === id);
        if (foundSong) {
          setSong(foundSong);
        }
      }
    }
  };

  const updateSong = (updatedSong: Song) => {
    if (!setlist) return;
    
    const updatedSetlist = {
      ...setlist,
      songs: setlist.songs.map(s => s.id === updatedSong.id ? updatedSong : s)
    };
    
    const stored = localStorage.getItem('metronome-setlists');
    if (stored) {
      const setlists = JSON.parse(stored);
      const updatedSetlists = setlists.map((s: Setlist) => 
        s.id === updatedSetlist.id ? updatedSetlist : s
      );
      localStorage.setItem('metronome-setlists', JSON.stringify(updatedSetlists));
      setSetlist(updatedSetlist);
      setSong(updatedSong);
    }
  };

  const goBack = () => {
    if (setlistId) {
      navigate(`/setlist/${setlistId}`);
    } else {
      navigate('/');
    }
  };

  if (!song || !setlist) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        Morceau non trouvé
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="sm" onClick={goBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <p className="text-sm text-gray-400">{setlist.name}</p>
            <h1 className="text-xl font-bold">{song.title}</h1>
          </div>
        </div>
        
        <SongView 
          song={song} 
          setlist={setlist}
          onUpdateSong={updateSong}
        />
      </div>
    </div>
  );
};

export default Song;
