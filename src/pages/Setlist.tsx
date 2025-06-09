import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  ChevronUp,
  ChevronDown,
  Trash2,
  Play
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useIsMobile } from '@/hooks/use-mobile'
import SongView from '@/components/SongView'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle
} from '@/components/ui/resizable'

interface Song {
  id: string
  title: string
  tempo: number
  timeSignature: string
  color: string
  approach: string
}

interface Setlist {
  id: string
  name: string
  songs: Song[]
  createdAt: string
}

const Setlist = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { toast } = useToast()

  const [setlist, setSetlist] = useState<Setlist | null>(null)
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null)
  const [playingSongId, setPlayingSongId] = useState<string | null>(null) // New state for playing song
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newSongTitle, setNewSongTitle] = useState('')

  const loadSetlist = React.useCallback(() => {
    const stored = localStorage.getItem('metronome-setlists')
    if (stored) {
      const setlists = JSON.parse(stored)
      const found = setlists.find((s: Setlist) => s.id === id)
      if (found) {
        setSetlist(found)
        if (found.songs.length > 0 && !isMobile) {
          setSelectedSongId(found.songs[0].id)
        }
      }
    }
  }, [id, isMobile])

  useEffect(() => {
    loadSetlist()
  }, [loadSetlist])

  const saveSetlist = (updatedSetlist: Setlist) => {
    const stored = localStorage.getItem('metronome-setlists')
    if (stored) {
      const setlists = JSON.parse(stored)
      const updatedSetlists = setlists.map((s: Setlist) =>
        s.id === updatedSetlist.id ? updatedSetlist : s
      )
      localStorage.setItem(
        'metronome-setlists',
        JSON.stringify(updatedSetlists)
      )
      setSetlist(updatedSetlist)
    }
  }

  const createSong = () => {
    if (!newSongTitle.trim() || !setlist) return

    const newSong: Song = {
      id: Date.now().toString(),
      title: newSongTitle,
      tempo: 120,
      timeSignature: '4/4',
      color: '#00FF00',
      approach: 'linear'
    }

    const updatedSetlist = {
      ...setlist,
      songs: [...setlist.songs, newSong]
    }

    saveSetlist(updatedSetlist)
    setNewSongTitle('')
    setIsCreateDialogOpen(false)

    if (!isMobile) {
      setSelectedSongId(newSong.id)
    }

    toast({
      title: 'Morceau créé',
      description: `"${newSongTitle}" a été ajouté à la setlist.`
    })
  }

  const moveSong = (songId: string, direction: 'up' | 'down') => {
    if (!setlist) return

    const songIndex = setlist.songs.findIndex(s => s.id === songId)
    if (songIndex === -1) return

    const newIndex = direction === 'up' ? songIndex - 1 : songIndex + 1
    if (newIndex < 0 || newIndex >= setlist.songs.length) return

    const newSongs = [...setlist.songs]
    ;[newSongs[songIndex], newSongs[newIndex]] = [
      newSongs[newIndex],
      newSongs[songIndex]
    ]

    const updatedSetlist = { ...setlist, songs: newSongs }
    saveSetlist(updatedSetlist)
  }

  const deleteSong = (songId: string) => {
    if (!setlist) return

    // Stop playback if the deleted song was playing
    if (playingSongId === songId) {
      setPlayingSongId(null)
    }

    const updatedSetlist = {
      ...setlist,
      songs: setlist.songs.filter(s => s.id !== songId)
    }

    saveSetlist(updatedSetlist)

    if (selectedSongId === songId) {
      setSelectedSongId(
        updatedSetlist.songs.length > 0 ? updatedSetlist.songs[0].id : null
      )
    }
  }

  const openSong = (songId: string) => {
    // If a song is currently playing, stop it.
    if (playingSongId !== null && playingSongId !== songId) {
      setPlayingSongId(null)
    }

    if (isMobile) {
      navigate(`/song/${songId}?setlistId=${id}`)
    } else {
      setSelectedSongId(songId)
      // Single click selects but does not start playback on desktop
    }
  }

  const handleDoubleClickSong = (songId: string) => {
    if (isMobile) {
      // For mobile, navigate and tell the song page to autoplay
      // Stop any playback controlled by this page first if it's a different song
      if (playingSongId !== null && playingSongId !== songId) {
        setPlayingSongId(null)
      }
      setPlayingSongId(songId) // Set intent to play this song
      navigate(`/song/${songId}?setlistId=${id}&autoPlay=true`)
    } else {
      // For desktop, control SongView directly
      // If a different song is playing, stop it
      if (playingSongId !== null && playingSongId !== songId) {
        setPlayingSongId(null)
      }
      setSelectedSongId(songId) // Ensure the song is selected
      setPlayingSongId(songId) // Start playing the new song
    }
  }

  const updateSong = (newOrUpdatedSong: Song) => {
    if (!setlist) {
      console.error('Setlist.tsx: updateSong called but setlist is null')
      return
    }
    console.log(
      `Setlist.tsx: updateSong received song: ${newOrUpdatedSong.title} (ID: ${newOrUpdatedSong.id}). Current selectedSongId: ${selectedSongId}`
    )

    const updatedSongsArray = setlist.songs.map(s =>
      s.id === newOrUpdatedSong.id ? newOrUpdatedSong : s
    )
    const newSetlistState = { ...setlist, songs: updatedSongsArray }

    saveSetlist(newSetlistState) // This calls setSetlist(newSetlistState)

    if (selectedSongId !== newOrUpdatedSong.id) {
      console.log(
        `Setlist.tsx: Click order to change song received. Current song ID was ${selectedSongId}, selecting next song ID ${newOrUpdatedSong.id}`
      )
      setSelectedSongId(newOrUpdatedSong.id)
    } else {
      console.log(
        `Setlist.tsx: Properties updated for currently selected song ${selectedSongId}. No change in selectedSongId, relying on setSetlist to refresh selectedSong object.`
      )
    }
  }

  if (!setlist) {
    return (
      <div className='min-h-screen bg-gray-900 flex items-center justify-center text-white'>
        Setlist non trouvée
      </div>
    )
  }

  const selectedSong = selectedSongId
    ? setlist.songs.find(s => s.id === selectedSongId)
    : null

  return (
    <div className='min-h-0 bg-gray-900 text-white flex flex-col flex-1 overflow-hidden'>
      {isMobile ? (
        // Mobile layout
        <div className='p-4 flex-1 flex flex-col overflow-hidden'>
          {/* Header */}
          <div className='mb-6'>
            <div className='flex items-center justify-between mb-2'>
              <Button variant='ghost' size='sm' onClick={() => navigate('/')}>
                <ArrowLeft className='h-4 w-4' />
              </Button>
              <img
                src='/logo.png'
                alt='Clickomator Logo'
                className='h-12 w-auto'
              />
            </div>
            <div className='flex flex-col items-center'>
              <h1 className='text-2xl font-bold truncate text-center'>
                {setlist.name}
              </h1>
            </div>
          </div>
          {/* Song List */}
          <div className='space-y-2 mb-4 overflow-y-auto flex-1'>
            {setlist.songs.map((song, index) => (
              <Card
                key={song.id}
                className={`bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer`}
                onClick={() => openSong(song.id)}
                onDoubleClick={() => handleDoubleClickSong(song.id)}
              >
                <CardContent className='p-3'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3 flex-1 min-w-0'>
                      <div
                        className='w-4 h-4 rounded-full flex-shrink-0'
                        style={{ backgroundColor: song.color }}
                      />
                      <div className='min-w-0 flex-1'>
                        <p className='font-medium truncate text-white'>
                          {song.title}
                        </p>
                        <p className='text-sm text-gray-400'>
                          {song.tempo} BPM • {song.timeSignature}
                        </p>
                      </div>
                    </div>
                    {/* Mobile action buttons ... */}
                    <div className='flex items-center gap-1 ml-2'>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={e => {
                          e.stopPropagation()
                          moveSong(song.id, 'up')
                        }}
                        disabled={index === 0}
                      >
                        <ChevronUp className='h-4 w-4 text-gray-300' />
                      </Button>

                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={e => {
                          e.stopPropagation()
                          moveSong(song.id, 'down')
                        }}
                        disabled={index === setlist.songs.length - 1}
                      >
                        <ChevronDown className='h-4 w-4 text-gray-300' />
                      </Button>

                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={e => {
                          e.stopPropagation()
                          deleteSong(song.id)
                        }}
                      >
                        <Trash2 className='h-4 w-4 text-red-400' />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {/* New Song Dialog Trigger */}
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button className='w-full bg-green-600 hover:bg-green-700 mt-auto'>
                <Plus className='h-4 w-4 mr-2' />
                Nouveau morceau
              </Button>
            </DialogTrigger>
            {/* ... DialogContent ... */}
            <DialogContent className='bg-gray-800 border-gray-700'>
              <DialogHeader>
                <DialogTitle className='text-white'>
                  Créer un nouveau morceau
                </DialogTitle>
              </DialogHeader>
              <div className='flex gap-2'>
                <Input
                  placeholder='Titre du morceau'
                  value={newSongTitle}
                  onChange={e => setNewSongTitle(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && createSong()}
                  className='bg-gray-700 border-gray-600 text-white'
                />
                <Button
                  onClick={createSong}
                  className='bg-green-600 hover:bg-green-700'
                >
                  Créer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        // Desktop layout with resizable panels
        <ResizablePanelGroup direction='horizontal' className='flex-1 min-h-0'>
          <ResizablePanel
            defaultSize={33}
            minSize={20}
            className='flex flex-col min-h-0'
          >
            <div className='p-4 flex flex-col overflow-hidden flex-1'>
              {/* Header */}
              <div className='mb-6'>
                <div className='flex items-center justify-between mb-2'>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => navigate('/')}
                  >
                    <ArrowLeft className='h-4 w-4' />
                  </Button>
                  <img
                    src='/logo.png'
                    alt='Clickomator Logo'
                    className='h-12 w-auto'
                  />
                </div>
                <div className='flex flex-col items-center'>
                  <h1 className='text-2xl font-bold truncate text-center'>
                    {setlist.name}
                  </h1>
                </div>
              </div>
              {/* Song List */}
              <div className='space-y-2 mb-4 overflow-y-auto flex-1'>
                {setlist.songs.map((song, index) => (
                  <Card
                    key={song.id}
                    className={`bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer ${
                      selectedSongId === song.id ? 'ring-2 ring-green-400' : ''
                    }`}
                    onClick={() => openSong(song.id)}
                    onDoubleClick={() => handleDoubleClickSong(song.id)}
                  >
                    {/* ... CardContent from above ... */}
                    <CardContent className='p-3'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-3 flex-1 min-w-0'>
                          <div
                            className='w-4 h-4 rounded-full flex-shrink-0'
                            style={{ backgroundColor: song.color }}
                          />
                          <div className='min-w-0 flex-1'>
                            <p className='font-medium truncate text-white'>
                              {song.title}
                            </p>
                            <p className='text-sm text-gray-400'>
                              {song.tempo} BPM • {song.timeSignature}
                            </p>
                          </div>
                        </div>
                        {/* Desktop action buttons (no mobile play button) ... */}
                        <div className='flex items-center gap-1 ml-2'>
                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={e => {
                              e.stopPropagation()
                              moveSong(song.id, 'up')
                            }}
                            disabled={index === 0}
                          >
                            <ChevronUp className='h-4 w-4 text-gray-300' />
                          </Button>

                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={e => {
                              e.stopPropagation()
                              moveSong(song.id, 'down')
                            }}
                            disabled={index === setlist.songs.length - 1}
                          >
                            <ChevronDown className='h-4 w-4 text-gray-300' />
                          </Button>

                          <Button
                            variant='ghost'
                            size='sm'
                            onClick={e => {
                              e.stopPropagation()
                              deleteSong(song.id)
                            }}
                          >
                            <Trash2 className='h-4 w-4 text-red-400' />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {/* New Song Dialog Trigger */}
              <Dialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button className='w-full bg-green-600 hover:bg-green-700 mt-auto'>
                    <Plus className='h-4 w-4 mr-2' />
                    Nouveau morceau
                  </Button>
                </DialogTrigger>
                {/* ... DialogContent from above ... */}
                <DialogContent className='bg-gray-800 border-gray-700'>
                  <DialogHeader>
                    <DialogTitle className='text-white'>
                      Créer un nouveau morceau
                    </DialogTitle>
                  </DialogHeader>
                  <div className='flex gap-2'>
                    <Input
                      placeholder='Titre du morceau'
                      value={newSongTitle}
                      onChange={e => setNewSongTitle(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && createSong()}
                      className='bg-gray-700 border-gray-600 text-white'
                    />
                    <Button
                      onClick={createSong}
                      className='bg-green-600 hover:bg-green-700'
                    >
                      Créer
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={67} className='min-h-0 flex flex-col'>
            <div className='flex-1 p-4 overflow-hidden h-full'>
              {selectedSong ? (
                <SongView
                  song={selectedSong}
                  setlist={setlist}
                  onUpdateSong={updateSong}
                  isPlaying={selectedSong.id === playingSongId}
                  onSetPlayingId={setPlayingSongId}
                />
              ) : (
                <div className='flex items-center justify-center h-full text-gray-400'>
                  Sélectionnez un morceau pour commencer
                </div>
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </div>
  )
}

export default Setlist
