
import React, { useState, useEffect } from 'react';
import { Plus, Upload, Download, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Setlist {
  id: string;
  name: string;
  songs: Song[];
  createdAt: string;
}

interface Song {
  id: string;
  title: string;
  tempo: number;
  timeSignature: string;
  color: string;
  approach: string;
}

const Index = () => {
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [newSetlistName, setNewSetlistName] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadSetlists();
  }, []);

  const loadSetlists = () => {
    const stored = localStorage.getItem('metronome-setlists');
    if (stored) {
      setSetlists(JSON.parse(stored));
    }
  };

  const saveSetlists = (newSetlists: Setlist[]) => {
    localStorage.setItem('metronome-setlists', JSON.stringify(newSetlists));
    setSetlists(newSetlists);
  };

  const createSetlist = () => {
    if (!newSetlistName.trim()) return;
    
    const newSetlist: Setlist = {
      id: Date.now().toString(),
      name: newSetlistName,
      songs: [],
      createdAt: new Date().toISOString()
    };
    
    const newSetlists = [...setlists, newSetlist];
    saveSetlists(newSetlists);
    setNewSetlistName('');
    setIsCreateDialogOpen(false);
    toast({
      title: "Setlist créée",
      description: `"${newSetlistName}" a été créée avec succès.`
    });
  };

  const exportSetlists = () => {
    const dataStr = JSON.stringify(setlists, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'metronome-setlists.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const importSetlists = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        saveSetlists(imported);
        toast({
          title: "Import réussi",
          description: `${imported.length} setlist(s) importée(s).`
        });
      } catch (error) {
        toast({
          title: "Erreur d'import",
          description: "Le fichier n'est pas valide.",
          variant: "destructive"
        });
      }
    };
    reader.readAsText(file);
  };

  const openSetlist = (setlistId: string) => {
    navigate(`/setlist/${setlistId}`);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Music className="h-8 w-8 text-green-400" />
            <h1 className="text-3xl font-bold">Métronome Pro</h1>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportSetlists}
              disabled={setlists.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
            
            <Button variant="outline" size="sm" asChild>
              <label className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                Importer
                <input
                  type="file"
                  accept=".json"
                  onChange={importSetlists}
                  className="hidden"
                />
              </label>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {setlists.map((setlist) => (
            <Card 
              key={setlist.id} 
              className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer"
              onClick={() => openSetlist(setlist.id)}
            >
              <CardHeader>
                <CardTitle className="text-white">{setlist.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400 text-sm">
                  {setlist.songs.length} morceau{setlist.songs.length !== 1 ? 'x' : ''}
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  Créée le {new Date(setlist.createdAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle Setlist
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-800 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">Créer une nouvelle setlist</DialogTitle>
            </DialogHeader>
            <div className="flex gap-2">
              <Input
                placeholder="Nom de la setlist"
                value={newSetlistName}
                onChange={(e) => setNewSetlistName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && createSetlist()}
                className="bg-gray-700 border-gray-600 text-white"
              />
              <Button onClick={createSetlist} className="bg-green-600 hover:bg-green-700">
                Créer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Index;
