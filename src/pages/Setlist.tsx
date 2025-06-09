
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, ChevronUp, ChevronDown, Trash2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
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

const Setlist = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  
  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newSongTitle, setNewSongTitle] = useState('');

  useEffect(() => {
    loadSetlist();
  }, [id]);

  const loadSetlist = () => {
    const stored = localStorage.getItem('metronome-setlists');
    if (stored) {
      const setlists = JSON.parse(stored);
      const found = setlists.find((s: Setlist) => s.id === id);
      if (found) {
        setSetlist(found);
        if (found.songs.length > 0 && !isMobile) {
          setSelectedSongId(found.songs[0].id);
        }
      }
    }
  };

  const saveSetlist = (updatedSetlist: Setlist) => {
    const stored = localStorage.getItem('metronome-setlists');
    if (stored) {
      const setlists = JSON.parse(stored);
      const updatedSetlists = setlists.map((s: Setlist) => 
        s.id === updatedSetlist.id ? updatedSetlist : s
      );
      localStorage.setItem('metronome-setlists', JSON.stringify(updatedSetlists));
      setSetlist(updatedSetlist);
    }
  };

  const createSong = () => {
    if (!newSongTitle.trim() || !setlist) return;
    
    const newSong: Song = {
      id: Date.now().toString(),
      title: newSongTitle,
      tempo: 120,
      timeSignature: '4/4',
      color: '#00FF00',
      approach: 'linear'
    };
    
    const updatedSetlist = {
      ...setlist,
      songs: [...setlist.songs, newSong]
    };
    
    saveSetlist(updatedSetlist);
    setNewSongTitle('');
    setIsCreateDialogOpen(false);
    
    if (!isMobile) {
      setSelectedSongId(newSong.id);
    }
    
    toast({
      title: "Morceau créé",
      description: `"${newSongTitle}" a été ajouté à la setlist.`
    });
  };

  const moveSong = (songId: string, direction: 'up' | 'down') => {
    if (!setlist) return;
    
    const songIndex = setlist.songs.findIndex(s => s.id === songId);
    if (songIndex === -1) return;
    
    const newIndex = direction === 'up' ? songIndex - 1 : songIndex + 1;
    if (newIndex < 0 || newIndex >= setlist.songs.length) return;
    
    const newSongs = [...setlist.songs];
    [newSongs[songIndex], newSongs[newIndex]] = [newSongs[newIndex], newSongs[songIndex]];
    
    const updatedSetlist = { ...setlist, songs: newSongs };
    saveSetlist(updatedSetlist);
  };

  const deleteSong = (songId: string) => {
    if (!setlist) return;
    
    const updatedSetlist = {
      ...setlist,
      songs: setlist.songs.filter(s => s.id !== songId)
    };
    
    saveSetlist(updatedSetlist);
    
    if (selectedSongId === songId) {
      setSelectedSongId(updatedSetlist.songs.length > 0 ? updatedSetlist.songs[0].id : null);
    }
  };

  const openSong = (songId: string) => {
    if (isMobile) {
      navigate(`/song/${songId}?setlistId=${id}`);
    } else {
      setSelectedSongId(songId);
    }
  };

  const updateSong = (updatedSong: Song) => {
    if (!setlist) return;
    
    const updatedSetlist = {
      ...setlist,
      songs: setlist.songs.map(s => s.id === updatedSong.id ? updatedSong : s)
    };
    
    saveSetlist(updatedSetlist);
  };

  if (!setlist) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
      Setlist non trouvée
    </div>;
  }

  const selectedSong = selectedSongId ? setlist.songs.find(s => s.id === selectedSongId) : null;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className={`${isMobile ? 'p-4' : 'flex h-screen'}`}>
        {/* Sidebar des morceaux */}
        <div className={`${isMobile ? 'w-full' : 'w-1/3 border-r border-gray-700 p-4'}`}>
          <div className="flex items-center gap-3 mb-6">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold truncate">{setlist.name}</h1>
          </div>

          <div className="space-y-2 mb-4">
            {setlist.songs.map((song, index) => (
              <Card 
                key={song.id} 
                className={`bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer ${
                  !isMobile && selectedSongId === song.id ? 'ring-2 ring-green-400' : ''
                }`}
                onClick={() => openSong(song.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div 
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: song.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{song.title}</p>
                        <p className="text-sm text-gray-400">
                          {song.tempo} BPM • {song.timeSignature}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 ml-2">
                      {isMobile && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/song/${song.id}?setlistId=${id}`);
                          }}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveSong(song.id, 'up');
                        }}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveSong(song.id, 'down');
                        }}
                        disabled={index === setlist.songs.length - 1}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSong(song.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau morceau
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-800 border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-white">Créer un nouveau morceau</DialogTitle>
              </DialogHeader>
              <div className="flex gap-2">
                <Input
                  placeholder="Titre du morceau"
                  value={newSongTitle}
                  onChange={(e) => setNewSongTitle(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && createSong()}
                  className="bg-gray-700 border-gray-600 text-white"
                />
                <Button onClick={createSong} className="bg-green-600 hover:bg-green-700">
                  Créer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Vue morceau (desktop uniquement) */}
        {!isMobile && (
          <div className="flex-1 p-4">
            {selectedSong ? (
              <SongView 
                song={selectedSong} 
                setlist={setlist}
                onUpdateSong={updateSong}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                Sélectionnez un morceau pour commencer
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Setlist;
