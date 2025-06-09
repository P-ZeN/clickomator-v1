import React, { useState, useEffect } from 'react'
import {
  Plus,
  Upload,
  Download,
  Trash2,
  Maximize,
  Minimize
} from 'lucide-react' // Added Maximize, Minimize
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog' // Added AlertDialog
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'

interface Setlist {
  id: string
  name: string
  songs: Song[]
  createdAt: string
}

interface Song {
  id: string
  title: string
  tempo: number
  timeSignature: string
  color: string
  approach: string
}

const Index = () => {
  const [setlists, setSetlists] = useState<Setlist[]>([])
  const [newSetlistName, setNewSetlistName] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false) // Added isFullscreen state
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    loadSetlists()
  }, [])

  const loadSetlists = () => {
    const stored = localStorage.getItem('metronome-setlists')
    if (stored) {
      setSetlists(JSON.parse(stored))
    }
  }

  const saveSetlists = (newSetlists: Setlist[]) => {
    localStorage.setItem('metronome-setlists', JSON.stringify(newSetlists))
    setSetlists(newSetlists)
  }

  const createSetlist = () => {
    if (!newSetlistName.trim()) return

    const newSetlist: Setlist = {
      id: Date.now().toString(),
      name: newSetlistName,
      songs: [],
      createdAt: new Date().toISOString()
    }

    const newSetlists = [...setlists, newSetlist]
    saveSetlists(newSetlists)
    setNewSetlistName('')
    setIsCreateDialogOpen(false)
    toast({
      title: 'Setlist créée',
      description: `"${newSetlistName}" a été créée avec succès.`
    })
  }

  const deleteSetlist = (setlistIdToDelete: string) => {
    const setlistNameToDelete =
      setlists.find(s => s.id === setlistIdToDelete)?.name || 'Setlist'
    const updatedSetlists = setlists.filter(s => s.id !== setlistIdToDelete)
    saveSetlists(updatedSetlists)
    toast({
      title: 'Setlist supprimée',
      description: `"${setlistNameToDelete}" a été supprimée.`,
      variant: 'destructive'
    })
  }

  const exportSetlists = () => {
    const dataStr = JSON.stringify(setlists, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'metronome-setlists.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const importSetlists = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = e => {
      try {
        const imported = JSON.parse(e.target?.result as string)
        saveSetlists(imported)
        toast({
          title: 'Import réussi',
          description: `${imported.length} setlist(s) importée(s).`
        })
      } catch (error) {
        toast({
          title: "Erreur d'import",
          description: "Le fichier n'est pas valide.",
          variant: 'destructive'
        })
      }
    }
    reader.readAsText(file)
  }

  const openSetlist = (setlistId: string) => {
    navigate(`/setlist/${setlistId}`)
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
        setIsFullscreen(false)
      }
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  return (
    <div className='min-h-screen bg-gray-900 text-white p-4'>
      <div className='max-w-4xl mx-auto'>
        <div className='flex justify-end mb-4'>
          {' '}
          {/* Container for top-right button */}
          <Button
            variant='outline'
            size='icon'
            onClick={toggleFullscreen}
            className='text-white border-white bg-gray-800 hover:bg-gray-700'
          >
            {isFullscreen ? (
              <Minimize className='h-5 w-5' />
            ) : (
              <Maximize className='h-5 w-5' />
            )}
          </Button>
        </div>
        <div className='flex flex-col md:flex-row items-center justify-between mb-8'>
          {' '}
          {/* Changed to flex-col and md:flex-row for responsiveness */}
          <div className='flex items-center justify-center w-full md:w-auto mb-4 md:mb-0'>
            {' '}
            {/* Logo centered and takes full width on mobile, margin bottom for mobile */}
            <h1 className='text-3xl font-bold'>
              <img
                src='/logo.png'
                alt='Clickomator Logo'
                className='h-24 md:h-40 w-auto'
              />{' '}
              {/* Adjusted logo height for mobile */}
            </h1>
          </div>
          <div className='flex flex-col sm:flex-row gap-2 w-full md:w-auto text-black'>
            {' '}
            {/* Buttons stack on small screens, row on sm and up, full width on mobile */}
            <Button
              variant='outline'
              size='sm'
              onClick={exportSetlists}
              disabled={setlists.length === 0}
              className='w-full sm:w-auto' // Full width on smallest screens
            >
              <Download className='h-4 w-4 mr-2' />
              Exporter
            </Button>
            <Button variant='outline' size='sm' asChild>
              <span className='w-full sm:w-auto inline-block'>
                {' '}
                {/* Wrap label in a span. Span takes width properties. inline-block to allow sizing. */}
                <label className='cursor-pointer flex items-center justify-center w-full h-full px-3'>
                  {' '}
                  {/* Label fills span, centers content. Added px-3 to match button padding if needed, though buttonVariants should handle it on span */}
                  <Upload className='h-4 w-4 mr-2' />
                  Importer
                  <input
                    type='file'
                    accept='.json'
                    onChange={importSetlists}
                    className='hidden'
                  />
                </label>
              </span>
            </Button>
          </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6'>
          {setlists.map(setlist => (
            <Card
              key={setlist.id}
              className='bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors flex flex-col'
            >
              <CardHeader className='flex-row items-center justify-between'>
                <CardTitle
                  className='text-white cursor-pointer flex-grow hover:underline'
                  onClick={() => openSetlist(setlist.id)}
                >
                  {setlist.name}
                </CardTitle>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={e => e.stopPropagation()} // Prevent card click when clicking delete
                    >
                      <Trash2 className='h-4 w-4 text-red-400 hover:text-red-600' />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className='bg-gray-800 border-gray-700 text-white'>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Êtes-vous sûr?</AlertDialogTitle>
                      <AlertDialogDescription className='text-gray-400'>
                        Cette action est irréversible. La setlist "
                        {setlist.name}" sera définitivement supprimée.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel
                        className='bg-gray-700 hover:bg-gray-600 border-gray-600 text-white'
                        onClick={e => e.stopPropagation()}
                      >
                        Annuler
                      </AlertDialogCancel>
                      <AlertDialogAction
                        className='bg-red-600 hover:bg-red-700 text-white'
                        onClick={e => {
                          e.stopPropagation()
                          deleteSetlist(setlist.id)
                        }}
                      >
                        Supprimer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardHeader>
              <CardContent
                className='flex-grow cursor-pointer'
                onClick={() => openSetlist(setlist.id)}
              >
                <p className='text-gray-400 text-sm'>
                  {setlist.songs.length} morceau
                  {setlist.songs.length !== 1 ? 'x' : ''}
                </p>
                <p className='text-gray-500 text-xs mt-1'>
                  Créée le {new Date(setlist.createdAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className='w-full bg-green-600 hover:bg-green-700'>
              <Plus className='h-4 w-4 mr-2' />
              Nouvelle Setlist
            </Button>
          </DialogTrigger>
          <DialogContent className='bg-gray-800 border-gray-700'>
            <DialogHeader>
              <DialogTitle className='text-white'>
                Créer une nouvelle setlist
              </DialogTitle>
            </DialogHeader>
            <div className='flex gap-2'>
              <Input
                placeholder='Nom de la setlist'
                value={newSetlistName}
                onChange={e => setNewSetlistName(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && createSetlist()}
                className='bg-gray-700 border-gray-600 text-white'
              />
              <Button
                onClick={createSetlist}
                className='bg-green-600 hover:bg-green-700'
              >
                Créer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default Index
