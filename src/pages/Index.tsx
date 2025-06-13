import React, { useState, useEffect } from 'react'
import {
  Plus,
  Upload,
  Download,
  Trash2,
  Maximize,
  Minimize,
  LogOut,
  X, // Added X icon for quit button
  Settings // Added Settings icon
} from 'lucide-react' // Added icons
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
import { assetPath } from '@/utils/assetPath'

// Add global type for __TAURI__ to avoid TS error
declare global {
  interface Window {
    __TAURI__?: unknown
  }
}

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
  const [isTauri, setIsTauri] = useState(false) // Added isTauri state
  const [showDownloadSection, setShowDownloadSection] = useState(false) // State for download section visibility
  const [importData, setImportData] = useState<Setlist[] | null>(null)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null) // State for PWA install prompt event
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    loadSetlists()
    // Check if running in Tauri
    const tauriEnv = !!window.__TAURI__
    setIsTauri(tauriEnv)

    // Determine if download section should be shown
    const isDev = process.env.NODE_ENV === 'development'
    const isWebDeploy = window.location.href.startsWith(
      'https://ehpad-break.net/clickomator/'
    )

    if (!tauriEnv && (isDev || isWebDeploy)) {
      setShowDownloadSection(true)
    } else {
      setShowDownloadSection(false)
    }
  }, [])

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault()
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e)
      // Optionally, update UI to notify the user they can add to home screen
      // console.log('PWA install prompt stashed');
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      )
    }
  }, [])

  const handlePwaInstallClick = async () => {
    if (deferredPrompt) {
      // Show the install prompt
      deferredPrompt.prompt()
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice
      // Optionally, send analytics event with outcome of userChoice
      console.log(`User response to the install prompt: ${outcome}`)
      // We've used the prompt, and can't use it again, discard it
      setDeferredPrompt(null)
    } else {
      toast({
        title: 'Installation PWA',
        description:
          "L'application est déjà installée ou le navigateur ne supporte pas l'installation manuelle.",
        variant: 'default'
      })
    }
  }

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
    link.download = 'clickomator-setlists.json'
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
        // Instead of saving directly, set the import data and open the dialog
        setImportData(imported)
        setIsImportDialogOpen(true)
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

  const handleImport = (mode: 'replace' | 'merge') => {
    if (!importData) return

    if (mode === 'replace') {
      // Replace all existing setlists
      saveSetlists(importData)
    } else {
      // Merge with existing setlists
      // Generate new IDs for imported setlists to avoid ID conflicts
      const importedWithNewIds = importData.map(setlist => ({
        ...setlist,
        id: `import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }))
      const merged = [...setlists, ...importedWithNewIds]
      saveSetlists(merged)
    }

    toast({
      title: 'Import réussi',
      description: `${importData.length} setlist(s) importée(s) (${
        mode === 'replace' ? 'remplacement' : 'ajout'
      }).`
    })

    // Reset import data and close dialog
    setImportData(null)
    setIsImportDialogOpen(false)
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

  // Function to close the app (Tauri specific)
  const quitApp = async () => {
    if (window.__TAURI__) {
      try {
        console.log(
          'Attempting to dynamically import @tauri-apps/api/process...'
        )
        const { exit } = await import('@tauri-apps/api/process')
        console.log('Successfully imported. Calling exit(0)...')
        await exit(0) // Use dynamically imported exit function
        console.log('exit(0) called successfully.')
      } catch (error) {
        console.error(
          'Failed to exit Tauri application using dynamic import:',
          error
        )
        let errorDetails = 'Erreur inconnue lors de la tentative de fermeture.'
        if (error instanceof Error) {
          errorDetails = error.message // Original error message
          if (
            errorDetails.toLowerCase().includes('resolve module specifier') ||
            errorDetails.includes(
              'Failed to fetch dynamically imported module'
            ) ||
            errorDetails.toLowerCase().includes('cannot find module') // Broader check
          ) {
            errorDetails +=
              " (Problème avec l'API Tauri. Vérifiez l'installation de @tauri-apps/api, la allowlist, et la configuration de build.)"
          }
        } else if (typeof error === 'string') {
          errorDetails = error
        } else {
          errorDetails = `Erreur non-standard capturée. Type: ${typeof error}. Veuillez vérifier la console pour plus de détails.`
        }
        toast({
          title: 'Erreur de fermeture',
          description: `Impossible de quitter l'application: ${errorDetails}`,
          variant: 'destructive',
          duration: 9000 // Increased duration for potentially longer messages
        })
      }
    } else {
      // This case should ideally not be reached if the button's visibility is controlled by isTauri
      console.warn('QuitApp called outside of Tauri environment.')
      toast({
        title: 'Information',
        description: "Cette fonction est réservée à l'application de bureau.",
        variant: 'default'
      })
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
    <div
      className='min-h-dvh text-white bg-cover bg-center flex justify-center items-center py-8' // Changed min-h-screen to min-h-dvh and added items-center
      style={{ backgroundImage: 'url(' + assetPath('bg-gilles.jpg') + ')' }}
    >
      {' '}
      {/* This outer div might need to be adjusted if the download box is outside of it */}
      <div className='flex flex-col items-center w-full'>
        {' '}
        {/* Added flex-col and items-center */}
        <div className='max-w-4xl w-full mx-auto bg-black bg-opacity-90 p-6 rounded-lg shadow-xl mb-6'>
          {' '}
          {/* Added mb-6 */}{' '}
          <div className='flex justify-end mb-4 gap-2'>
            {/* Settings button */}
            <Button
              variant='outline'
              size='icon'
              onClick={() => navigate('/parameters')}
              className='text-white border-white bg-gray-950 hover:bg-gray-700'
            >
              <Settings className='h-5 w-5' />
            </Button>

            {/* Container for top-right button */}
            {isTauri ? (
              <Button
                variant='outline'
                size='icon'
                onClick={quitApp}
                className='text-white border-white bg-gray-950 hover:bg-gray-700'
              >
                <X className='h-5 w-5' />
              </Button>
            ) : (
              <Button
                variant='outline'
                size='icon'
                onClick={toggleFullscreen}
                className='text-white border-white bg-gray-950 hover:bg-gray-700'
              >
                {isFullscreen ? (
                  <Minimize className='h-5 w-5' />
                ) : (
                  <Maximize className='h-5 w-5' />
                )}
              </Button>
            )}
          </div>
          {/* Changed to flex-col and md:flex-row for responsiveness */}
          <div className='flex items-center justify-center w-full md:w-auto mb-4 md:mb-0'>
            {' '}
            {/* Logo centered and takes full width on mobile, margin bottom for mobile */}
            <h1 className='text-3xl font-bold'>
              <img
                src={assetPath('logo.png')}
                alt='Clickomator Logo'
                className='h-24 md:h-40 w-auto'
              />{' '}
              {/* Adjusted logo height for mobile */}
            </h1>
          </div>{' '}
          <div className='flex flex-col sm:flex-row gap-2 w-full md:w-auto text-black p-4 justify-center mb-6'>
            {' '}
            {/* Buttons stack on small screens, row on sm and up, full width on mobile */}
            <Button
              variant='outline'
              size='sm'
              onClick={exportSetlists}
              disabled={setlists.length === 0}
              className='w-full sm:w-auto border border-white text-white bg-black hover:text-black hover:bg-white' // Full width on smallest screens
            >
              <Download className='h-4 w-4 mr-2' />
              Exporter
            </Button>
            <Button
              variant='outline'
              size='sm'
              className=' border border-white text-white bg-black hover:text-black hover:bg-white'
              asChild
            >
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
          </div>{' '}
          <div
            className='overflow-y-auto max-h-[250px] mb-6 pr-2' // Reduced max-h from 400px to 250px
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#4B5563 #111827'
            }}
          >
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              {setlists.map(setlist => (
                <Card
                  key={setlist.id}
                  className='bg-gray-950 border-gray-800 hover:bg-gray-750 transition-colors flex flex-col'
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
                      Créée le{' '}
                      {new Date(setlist.createdAt).toLocaleDateString()}
                    </p>{' '}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button className='w-full bg-green-600 hover:bg-green-700'>
                <Plus className='h-4 w-4 mr-2' />
                Nouvelle Setlist
              </Button>
            </DialogTrigger>
            <DialogContent className='bg-gray-800 border-gray-700'>
              <DialogHeader>
                <DialogTitle className='text-white'>
                  Créer une nouvelle Set-liste
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
              </div>{' '}
            </DialogContent>
          </Dialog>
          {/* Import Dialog for choosing replace or merge */}
          <Dialog
            open={isImportDialogOpen}
            onOpenChange={setIsImportDialogOpen}
          >
            <DialogContent className='bg-gray-800 border-gray-700'>
              <DialogHeader>
                <DialogTitle className='text-white'>
                  Importer des setlists
                </DialogTitle>
              </DialogHeader>
              <div className='text-white'>
                {importData?.length ? (
                  <p>
                    Le fichier contient {importData.length} setlist
                    {importData.length > 1 ? 's' : ''}. Comment voulez-vous
                    procéder?
                  </p>
                ) : (
                  <p>Comment voulez-vous importer les setlists?</p>
                )}
              </div>
              <div className='flex flex-col sm:flex-row gap-2 mt-2'>
                <Button
                  onClick={() => handleImport('replace')}
                  className='bg-yellow-600 hover:bg-yellow-700 w-full'
                >
                  Remplacer les setlists existantes
                </Button>
                <Button
                  onClick={() => handleImport('merge')}
                  className='bg-blue-600 hover:bg-blue-700 w-full'
                >
                  Ajouter aux setlists existantes
                </Button>
              </div>
            </DialogContent>
          </Dialog>{' '}
          {/* Removed the always-visible quit button since it's now in the top-right */}
        </div>
        {/* Download Links Box */}
        {showDownloadSection && (
          <div className='max-w-4xl w-full mx-auto bg-gray-950 bg-opacity-90 p-6 rounded-lg shadow-xl text-center'>
            <h2 className='text-xl font-semibold text-white mb-4'>
              Téléchargements
            </h2>
            <div className='flex flex-col sm:flex-row gap-4 justify-center'>
              <Button
                variant='outline'
                size='lg'
                className='border border-white text-white bg-gray-700 hover:text-black hover:bg-white w-full sm:w-auto'
                asChild
              >
                <a
                  href={assetPath('Clickomator_V1.1_0.1.1_x64_en-US.msi')}
                  download
                >
                  <Download className='h-5 w-5 mr-2' />
                  Windows Installer (.msi)
                </a>
              </Button>
              <Button
                variant='outline'
                size='lg'
                className='border border-white text-white bg-gray-700 hover:text-black hover:bg-white w-full sm:w-auto'
                asChild
              >
                <a href={assetPath('Clickomator_V1.1.exe')} download>
                  <Download className='h-5 w-5 mr-2' />
                  Windows Exécutable (.exe)
                </a>
              </Button>
              {/* PWA Install Button */}
              {deferredPrompt && (
                <Button
                  variant='outline'
                  size='lg'
                  className='border border-white text-white bg-purple-600 hover:bg-purple-700 w-full sm:w-auto'
                  onClick={handlePwaInstallClick}
                >
                  <Download className='h-5 w-5 mr-2' />{' '}
                  {/* Or a more specific PWA icon */}
                  Installer l'app (PWA)
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Index
