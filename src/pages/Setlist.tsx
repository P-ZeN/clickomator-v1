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
import { assetPath } from '@/utils/assetPath'

interface Song {
  id: string
  title: string
  tempo: number
  timeSignature: string
  color: string
  approach: string
  order: number // Added: for drag-and-drop ordering
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
  const [playingSongId, setPlayingSongId] = useState<string | null>(null)
  const [draggedSongId, setDraggedSongId] = useState<string | null>(null) // Added for drag-and-drop
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newSongTitle, setNewSongTitle] = useState('')
  const [songListFontSize, setSongListFontSize] = useState(() => {
    const stored = localStorage.getItem('songListFontSize')
    return stored ? parseFloat(stored) : 1.1 // rem, default
  })

  // For desktop panel size persistence
  const PANEL_SIZE_KEY = 'setlist-panel-sizes'
  const DEFAULT_PANEL_SIZES = [30, 70]
  const [panelSizes, setPanelSizes] = useState(() => {
    const stored = localStorage.getItem(PANEL_SIZE_KEY)
    if (stored) {
      try {
        const arr = JSON.parse(stored)
        if (
          Array.isArray(arr) &&
          arr.length === 2 &&
          arr.every(
            v => typeof v === 'number' && v >= 20 && v <= 80 && !isNaN(v)
          )
        ) {
          return arr
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }
    return DEFAULT_PANEL_SIZES
  })

  const loadSetlist = React.useCallback(() => {
    const stored = localStorage.getItem('metronome-setlists')
    if (stored) {
      const setlists = JSON.parse(stored)
      const found = setlists.find((s: Setlist) => s.id === id)
      if (found) {
        let orderChanged = false
        const songsWithOrder = found.songs.map((song: Song, index: number) => {
          if (typeof song.order !== 'number') {
            // Check if order is missing or not a number
            orderChanged = true
            return { ...song, order: index }
          }
          return song
        })

        songsWithOrder.sort((a: Song, b: Song) => a.order - b.order)

        // If orders were missing/corrected and assigned, re-save the setlist with new order info
        if (orderChanged) {
          const storedSetlistsForUpdate =
            localStorage.getItem('metronome-setlists')
          if (storedSetlistsForUpdate) {
            const allSetlists = JSON.parse(storedSetlistsForUpdate)
            const updatedSetlists = allSetlists.map((s: Setlist) =>
              s.id === found.id ? { ...found, songs: songsWithOrder } : s
            )
            localStorage.setItem(
              'metronome-setlists',
              JSON.stringify(updatedSetlists)
            )
          }
        }

        setSetlist({ ...found, songs: songsWithOrder })
        if (songsWithOrder.length > 0 && !isMobile) {
          setSelectedSongId(songsWithOrder[0].id)
        }
      }
    }
  }, [id, isMobile])

  useEffect(() => {
    loadSetlist()
  }, [loadSetlist])

  useEffect(() => {
    localStorage.setItem('songListFontSize', songListFontSize.toString())
  }, [songListFontSize])

  // Save panel sizes to localStorage when they change
  const handlePanelResize = (sizes: number[]) => {
    // Clamp sizes for safety
    const clamped = [
      Math.max(20, Math.min(80, sizes[0])),
      Math.max(20, Math.min(80, sizes[1]))
    ]
    setPanelSizes(clamped)
    localStorage.setItem(PANEL_SIZE_KEY, JSON.stringify(clamped))
  }

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
      approach: 'linear',
      order: setlist.songs.length // Assign order based on current song count
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

    const newSongsArray = [...setlist.songs] // Operate on a mutable copy

    // Determine the target index for the move
    const targetIndex = direction === 'up' ? songIndex - 1 : songIndex + 1

    // Ensure targetIndex is within bounds
    if (targetIndex < 0 || targetIndex >= newSongsArray.length) return

    // Perform the move
    const [movedSong] = newSongsArray.splice(songIndex, 1)
    newSongsArray.splice(targetIndex, 0, movedSong)

    // Update order for all songs based on their new position in the array
    const songsWithUpdatedOrder = newSongsArray.map((song, index) => ({
      ...song,
      order: index
    }))

    const updatedSetlist = { ...setlist, songs: songsWithUpdatedOrder }
    saveSetlist(updatedSetlist)
  }

  const deleteSong = (songId: string) => {
    if (!setlist) return

    // Stop playback if the deleted song was playing
    if (playingSongId === songId) {
      setPlayingSongId(null)
    }

    const updatedSongs = setlist.songs
      .filter(s => s.id !== songId)
      .map((song, index) => ({ ...song, order: index })) // Re-assign order after deletion

    const updatedSetlist = {
      ...setlist,
      songs: updatedSongs
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

  // Drag and Drop Handlers
  const handleDragStart = (songId: string) => {
    setDraggedSongId(songId)
  }

  const handleDrop = (targetSongId: string) => {
    if (!draggedSongId || !setlist || draggedSongId === targetSongId) {
      setDraggedSongId(null)
      return
    }

    const currentSongs = [...setlist.songs]
    const draggedItemIndex = currentSongs.findIndex(
      song => song.id === draggedSongId
    )
    let targetItemIndex = currentSongs.findIndex(
      song => song.id === targetSongId
    )

    if (draggedItemIndex === -1 || targetItemIndex === -1) {
      setDraggedSongId(null)
      return
    }

    // Remove dragged item
    const [draggedItem] = currentSongs.splice(draggedItemIndex, 1)

    // Adjust targetItemIndex if draggedItem was before targetItem in the array
    if (draggedItemIndex < targetItemIndex) {
      targetItemIndex--
    }

    // Insert dragged item at the updated target's original position
    currentSongs.splice(targetItemIndex, 0, draggedItem)

    // Update order for all songs
    const reorderedSongs = currentSongs.map((song, index) => ({
      ...song,
      order: index
    }))

    saveSetlist({ ...setlist, songs: reorderedSongs })
    setDraggedSongId(null)
  }

  const handleDragEnd = () => {
    setDraggedSongId(null)
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
                src={assetPath('logo.png')}
                alt='Clickomator Logo'
                className='h-12 w-auto'
              />
              {/* Font size controls */}
              <div className='flex flex-col ml-2'>
                <Button
                  variant='outline'
                  size='icon'
                  className='p-1 mb-1 h-6 w-6 text-xs bg-black'
                  onClick={() => setSongListFontSize(f => Math.min(f + 0.1, 2))}
                  aria-label='Augmenter la taille des titres'
                >
                  <ChevronUp className='h-3 w-3' />
                </Button>
                <Button
                  variant='outline'
                  size='icon'
                  className='p-1 h-6 w-6 text-xs bg-black'
                  onClick={() =>
                    setSongListFontSize(f => Math.max(f - 0.1, 0.7))
                  }
                  aria-label='Diminuer la taille des titres'
                >
                  <ChevronDown className='h-3 w-3' />
                </Button>
              </div>
            </div>
            <div className='flex flex-col items-center'>
              <h1 className='text-2xl font-bold truncate text-center'>
                {setlist.name}
              </h1>
            </div>
          </div>
          {/* Song List */}
          <div
            className='space-y-2 mb-4 overflow-y-auto flex-1 pr-2'
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#4B5563 #111827'
            }}
          >
            {setlist.songs.map((song, index) => (
              <Card
                key={song.id}
                className={`bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer ${
                  draggedSongId === song.id ? 'opacity-50' : ''
                }`}
                onClick={() => openSong(song.id)}
                onDoubleClick={() => handleDoubleClickSong(song.id)}
                draggable={true}
                onDragStart={() => handleDragStart(song.id)}
                onDragOver={e => e.preventDefault()} // Allow drop
                onDrop={() => handleDrop(song.id)}
                onDragEnd={handleDragEnd}
              >
                <CardContent className='p-3'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3 flex-1 min-w-0'>
                      <div
                        className='w-4 h-4 rounded-full flex-shrink-0'
                        style={{ backgroundColor: song.color }}
                      />
                      <div className='min-w-0 flex-1'>
                        <p
                          className='font-medium truncate text-white'
                          style={{ fontSize: songListFontSize + 'rem' }}
                        >
                          {song.order + 1}. {song.title}
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
        <ResizablePanelGroup
          direction='horizontal'
          className='flex-1 min-h-0'
          onLayout={handlePanelResize}
          autoSaveId={PANEL_SIZE_KEY}
        >
          <ResizablePanel
            minSize={20}
            maxSize={80}
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
                    src={assetPath('logo.png')}
                    alt='Clickomator Logo'
                    className='h-12 w-auto'
                  />
                  {/* Font size controls */}
                  <div className='flex flex-col ml-2'>
                    <Button
                      variant='outline'
                      size='icon'
                      className='p-1 mb-1 h-6 w-6 text-xs bg-black'
                      onClick={() =>
                        setSongListFontSize(f => Math.min(f + 0.1, 2))
                      }
                      aria-label='Augmenter la taille des titres'
                    >
                      <ChevronUp className='h-3 w-3' />
                    </Button>
                    <Button
                      variant='outline'
                      size='icon'
                      className='p-1 h-6 w-6 text-xs bg-black'
                      onClick={() =>
                        setSongListFontSize(f => Math.max(f - 0.1, 0.7))
                      }
                      aria-label='Diminuer la taille des titres'
                    >
                      <ChevronDown className='h-3 w-3' />
                    </Button>
                  </div>
                </div>
                <div className='flex flex-col items-center'>
                  <h1 className='text-2xl font-bold truncate text-center'>
                    {setlist.name}
                  </h1>
                </div>
              </div>
              {/* Song List */}
              <div
                className='space-y-2 mb-4 overflow-y-auto flex-1 p-1 pr-2'
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#4B5563 #111827'
                }}
              >
                {setlist.songs.map((song, index) => (
                  <Card
                    key={song.id}
                    className={`bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer ${
                      selectedSongId === song.id ? 'ring-2 ring-green-400' : ''
                    } ${draggedSongId === song.id ? 'opacity-50' : ''}`}
                    onClick={() => openSong(song.id)}
                    onDoubleClick={() => handleDoubleClickSong(song.id)}
                    draggable={true}
                    onDragStart={() => handleDragStart(song.id)}
                    onDragOver={e => e.preventDefault()} // Allow drop
                    onDrop={() => handleDrop(song.id)}
                    onDragEnd={handleDragEnd}
                  >
                    {/* ... CardContent from above ... */}
                    <CardContent className='p-3 pr-0'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-3 flex-1 min-w-0'>
                          <div
                            className='w-4 h-14 flex-shrink-0'
                            style={{ backgroundColor: song.color }}
                          />
                          <div className='min-w-0 flex-1'>
                            <p
                              className='font-medium truncate text-white'
                              style={{ fontSize: songListFontSize + 'rem' }}
                            >
                              {song.order + 1}. {song.title}
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
          <ResizablePanel className='min-h-0 flex flex-col'>
            <div className='flex-1 p-4 overflow-hidden h-full'>
              {selectedSong ? (
                <SongView
                  song={selectedSong}
                  setlist={setlist}
                  onUpdateSong={updateSong}
                  isPlaying={selectedSong.id === playingSongId}
                  onSetPlayingId={setPlayingSongId}
                  panelKey={panelSizes[0]} // Pass left panel width as key
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
