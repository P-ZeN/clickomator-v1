import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Play,
  Square,
  SkipBack,
  SkipForward,
  Minus,
  Plus,
  Maximize,
  Minimize
} from 'lucide-react' // Added Maximize, Minimize
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import TempoVisualizer from './TempoVisualizer'
import BeatGraphic from './BeatGraphic'

// Add this interface for better type checking with vendor prefixes
interface WindowWithAudioContext extends Window {
  AudioContext: typeof AudioContext // Ensure AudioContext is part of the extended interface
  webkitAudioContext?: typeof AudioContext
}

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

interface SongViewProps {
  song: Song
  setlist: Setlist
  onUpdateSong: (song: Song) => void
  isPlaying: boolean
  onSetPlayingId: (id: string | null) => void
}

const SongView: React.FC<SongViewProps> = ({
  song,
  setlist,
  onUpdateSong,
  isPlaying,
  onSetPlayingId
}) => {
  // Removed local isPlaying state
  const [currentBeat, setCurrentBeat] = useState(0)
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingTempo, setEditingTempo] = useState(false)
  const [titleValue, setTitleValue] = useState(song.title)
  const [tempoValue, setTempoValue] = useState(song.tempo.toString())
  const [titleBgColor, setTitleBgColor] = useState('#000000') // State for title background flash
  const [isFullscreen, setIsFullscreen] = useState(false) // Added isFullscreen state
  const [isTauri, setIsTauri] = useState(false) // Added isTauri state

  const intervalRef = useRef<NodeJS.Timeout>()
  const audioContextRef = useRef<AudioContext>()
  const titleInputRef = useRef<HTMLInputElement>(null)
  const tempoInputRef = useRef<HTMLInputElement>(null)
  const titleFlashTimeoutRef = useRef<NodeJS.Timeout | null>(null) // Ref for flash timeout

  // Refs for double press detection
  const altKeyTimerRef = useRef<NodeJS.Timeout | null>(null)
  const altGrKeyTimerRef = useRef<NodeJS.Timeout | null>(null)
  const prevButtonDoubleClickTimerRef = useRef<NodeJS.Timeout | null>(null)
  const nextButtonDoubleClickTimerRef = useRef<NodeJS.Timeout | null>(null)

  const DOUBLE_PRESS_TIMEOUT = 300 // ms for double press

  const timeSignatures = [
    '4/4',
    '3/4',
    '2/4',
    '6/8',
    '9/8',
    '12/8',
    '5/4',
    '7/8'
  ]
  const approaches = [
    { value: 'linear', label: 'Linear' },
    { value: 'ease-in', label: 'Ease In' },
    { value: 'ease-out', label: 'Ease Out' }
    // { value: 'bounce', label: 'Bounce' },
    // { value: 'elastic', label: 'Elastic' }
  ]

  const beatsPerMeasure = parseInt(song.timeSignature.split('/')[0])

  // Moved startMetronome and stopMetronome definitions earlier
  const playClick = useCallback((beatToPlay: number) => {
    if (!audioContextRef.current) return

    const oscillator = audioContextRef.current.createOscillator()
    const gainNode = audioContextRef.current.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContextRef.current.destination)

    oscillator.frequency.setValueAtTime(
      beatToPlay === 0 ? 1100 : 900,
      audioContextRef.current.currentTime
    )

    gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContextRef.current.currentTime + 0.1
    )

    oscillator.start(audioContextRef.current.currentTime)
    oscillator.stop(audioContextRef.current.currentTime + 0.1)
  }, []) // playClick typically doesn't need dependencies unless it uses props/state not passed directly

  const startMetronome = useCallback(() => {
    if (!audioContextRef.current) {
      const global = window as WindowWithAudioContext
      audioContextRef.current = new (global.AudioContext ||
        global.webkitAudioContext)()
    }
    setCurrentBeat(0)
    playClick(0) // playClick is now defined
    const intervalTime = 60000 / song.tempo
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    intervalRef.current = setInterval(() => {
      setCurrentBeat(prevBeat => {
        const nextBeat = (prevBeat + 1) % beatsPerMeasure
        playClick(nextBeat)
        return nextBeat
      })
    }, intervalTime)
  }, [song.tempo, beatsPerMeasure, playClick])

  const stopMetronome = useCallback(() => {
    setCurrentBeat(0)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
  }, [])

  useEffect(() => {
    setTitleValue(song.title)
    setTempoValue(song.tempo.toString())
    // Check if running in Tauri
    if (window.__TAURI__) {
      setIsTauri(true)
    }
    if (isPlaying) {
      startMetronome()
    } else {
      stopMetronome()
    }
    // Cleanup function for this effect instance
    return () => {
      stopMetronome() // Ensure metronome is stopped when song changes or component unmounts
    }
  }, [song, isPlaying, startMetronome, stopMetronome]) // Include startMetronome and stopMetronome

  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [editingTitle])

  useEffect(() => {
    if (editingTempo && tempoInputRef.current) {
      tempoInputRef.current.focus()
      tempoInputRef.current.select()
    }
  }, [editingTempo])

  const updateTempo = (delta: number) => {
    const newTempo = Math.max(30, Math.min(300, song.tempo + delta))
    const updatedSong = { ...song, tempo: newTempo }
    onUpdateSong(updatedSong)
    setTempoValue(newTempo.toString())
    // No need to directly call stop/startMetronome here,
    // the useEffect [song, isPlaying] will handle it when props update.
  }

  const handleTitleSave = () => {
    if (titleValue.trim()) {
      onUpdateSong({ ...song, title: titleValue.trim() })
    } else {
      setTitleValue(song.title)
    }
    setEditingTitle(false)
  }

  const handleTempoSave = () => {
    const newTempo = parseInt(tempoValue)
    if (newTempo >= 30 && newTempo <= 300) {
      const updatedSong = { ...song, tempo: newTempo }
      onUpdateSong(updatedSong)
      // No need to directly call stopMetronome here
    } else {
      setTempoValue(song.tempo.toString())
    }
    setEditingTempo(false)
  }

  const getCurrentSongIndex = useCallback(() => {
    return setlist.songs.findIndex(s => s.id === song.id)
  }, [setlist.songs, song.id])

  const goToPreviousSong = useCallback(() => {
    console.log('goToPreviousSong function called (single action)')
    const currentIndex = getCurrentSongIndex()
    if (currentIndex > 0) {
      const prevSong = setlist.songs[currentIndex - 1]
      console.log(
        'goToPreviousSong: updating to song:',
        prevSong,
        'and ensuring it is stopped'
      )
      onUpdateSong(prevSong)
      onSetPlayingId(null) // Ensure song is stopped for single action
    }
  }, [getCurrentSongIndex, setlist.songs, onUpdateSong, onSetPlayingId]) // Removed isPlaying from deps as it's no longer used here

  const goToNextSong = useCallback(() => {
    console.log('goToNextSong function called (single action)')
    const currentIdx = getCurrentSongIndex()
    if (currentIdx < setlist.songs.length - 1) {
      const nextSong = setlist.songs[currentIdx + 1]
      console.log(
        'goToNextSong: updating to song:',
        nextSong,
        'and ensuring it is stopped'
      )
      onUpdateSong(nextSong)
      onSetPlayingId(null) // Ensure song is stopped for single action
    }
  }, [getCurrentSongIndex, setlist.songs, onUpdateSong, onSetPlayingId]) // Removed isPlaying from deps as it's no longer used here

  const handlePrevButtonClick = useCallback(() => {
    console.log('Previous button clicked')
    if (prevButtonDoubleClickTimerRef.current) {
      clearTimeout(prevButtonDoubleClickTimerRef.current)
      prevButtonDoubleClickTimerRef.current = null
      console.log('Previous button double-click detected')
      const currentIndex = getCurrentSongIndex()
      if (currentIndex > 0) {
        const prevSong = setlist.songs[currentIndex - 1]
        console.log(
          'Previous button double-click: updating to song:',
          prevSong,
          'and playing'
        )
        onUpdateSong(prevSong)
        onSetPlayingId(prevSong.id)
      }
    } else {
      console.log('Previous button single-click registered, setting timer.')
      prevButtonDoubleClickTimerRef.current = setTimeout(() => {
        console.log(
          'Previous button single-click timeout: calling goToPreviousSong'
        )
        goToPreviousSong()
        prevButtonDoubleClickTimerRef.current = null
      }, DOUBLE_PRESS_TIMEOUT)
    }
  }, [
    getCurrentSongIndex,
    setlist.songs,
    onUpdateSong,
    onSetPlayingId,
    goToPreviousSong
  ])

  const handleNextButtonClick = useCallback(() => {
    console.log('Next button clicked')
    if (nextButtonDoubleClickTimerRef.current) {
      clearTimeout(nextButtonDoubleClickTimerRef.current)
      nextButtonDoubleClickTimerRef.current = null
      console.log('Next button double-click detected')
      const currentIdx = getCurrentSongIndex()
      if (currentIdx < setlist.songs.length - 1) {
        const nextSong = setlist.songs[currentIdx + 1]
        console.log(
          'Next button double-click: updating to song:',
          nextSong,
          'and playing'
        )
        onUpdateSong(nextSong)
        onSetPlayingId(nextSong.id)
      }
    } else {
      console.log('Next button single-click registered, setting timer.')
      nextButtonDoubleClickTimerRef.current = setTimeout(() => {
        console.log('Next button single-click timeout: calling goToNextSong')
        goToNextSong()
        nextButtonDoubleClickTimerRef.current = null
      }, DOUBLE_PRESS_TIMEOUT)
    }
  }, [
    getCurrentSongIndex,
    setlist.songs,
    onUpdateSong,
    onSetPlayingId,
    goToNextSong
  ])

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      // Clear title flash timeout on component unmount
      if (titleFlashTimeoutRef.current) {
        clearTimeout(titleFlashTimeoutRef.current)
      }
    }
  }, [])

  // Effect for title background flash
  useEffect(() => {
    if (titleFlashTimeoutRef.current) {
      clearTimeout(titleFlashTimeoutRef.current)
    }

    if (isPlaying) {
      const flashColor = currentBeat === 0 ? 'red' : 'green'
      setTitleBgColor(flashColor)

      titleFlashTimeoutRef.current = setTimeout(() => {
        setTitleBgColor('#000000') // Revert to base color after flash
      }, 150) // Flash duration in ms (should match transition duration)
    } else {
      setTitleBgColor('#000000') // Default color when not playing
    }

    // Cleanup function for this effect instance
    return () => {
      if (titleFlashTimeoutRef.current) {
        clearTimeout(titleFlashTimeoutRef.current)
      }
    }
  }, [isPlaying, currentBeat, song.color])

  // Keyboard shortcuts effect
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      console.log('handleKeyDown triggered:', event.code) // Basic log for any keydown
      const targetElement = event.target as HTMLElement
      if (
        targetElement.tagName === 'INPUT' ||
        targetElement.tagName === 'TEXTAREA' ||
        targetElement.tagName === 'SELECT'
      ) {
        return // Don't interfere with text input
      }

      // const DOUBLE_PRESS_TIMEOUT = 300 // ms // Defined above class now

      switch (
        event.code // Changed from event.key to event.code
      ) {
        case 'Space': // event.code for space is 'Space'
          event.preventDefault()
          console.log(
            'Space pressed, current song id:',
            song.id,
            'isPlaying:',
            isPlaying
          )
          onSetPlayingId(isPlaying ? null : song.id)
          break
        case 'AltLeft': // Changed from event.key === 'Alt' to event.code === 'AltLeft'
          event.preventDefault()
          console.log('AltLeft pressed')
          if (event.repeat) return

          if (altKeyTimerRef.current) {
            clearTimeout(altKeyTimerRef.current)
            altKeyTimerRef.current = null
            console.log('AltLeft double press detected')
            // Double press: previous song and play
            const currentIndex = getCurrentSongIndex()
            if (currentIndex > 0) {
              const prevSong = setlist.songs[currentIndex - 1]
              console.log(
                'AltLeft double press: updating to song:',
                prevSong,
                'and playing'
              )
              onUpdateSong(prevSong) // Ensure this song becomes current
              onSetPlayingId(prevSong.id) // And play it
            }
          } else {
            console.log(
              'AltLeft single press registered, setting timer for double press check'
            )
            altKeyTimerRef.current = setTimeout(() => {
              console.log(
                'AltLeft single press timeout: calling goToPreviousSong'
              )
              goToPreviousSong()
              altKeyTimerRef.current = null
            }, DOUBLE_PRESS_TIMEOUT)
          }
          break
        case 'AltRight': // Changed from event.key === 'AltGraph' to event.code === 'AltRight'
          event.preventDefault()
          console.log(
            'AltRight pressed, event.repeat:',
            event.repeat,
            'activeElement:',
            document.activeElement?.tagName
          ) // Added activeElement log
          if (event.repeat) return

          if (altGrKeyTimerRef.current) {
            clearTimeout(altGrKeyTimerRef.current)
            altGrKeyTimerRef.current = null
            console.log('AltRight double press detected')
            // Double press: next song and play
            const currentIdx = getCurrentSongIndex()
            if (currentIdx < setlist.songs.length - 1) {
              const nextSong = setlist.songs[currentIdx + 1]
              console.log(
                'AltRight double press: updating to song:',
                nextSong,
                'and playing'
              )
              onUpdateSong(nextSong) // Ensure this song becomes current
              onSetPlayingId(nextSong.id) // And play it
            }
          } else {
            console.log(
              'AltRight single press registered, setting timer for double press check'
            )
            altGrKeyTimerRef.current = setTimeout(() => {
              console.log('AltRight single press timeout: calling goToNextSong')
              goToNextSong()
              altGrKeyTimerRef.current = null
            }, DOUBLE_PRESS_TIMEOUT)
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (altKeyTimerRef.current) {
        clearTimeout(altKeyTimerRef.current)
      }
      if (altGrKeyTimerRef.current) {
        clearTimeout(altGrKeyTimerRef.current)
      }
    }
  }, [
    song.id,
    isPlaying,
    onSetPlayingId,
    onUpdateSong,
    setlist.songs,
    getCurrentSongIndex,
    goToPreviousSong,
    goToNextSong,
    song // Add song as dependency for onUpdateSong calls inside handler
  ])

  const currentSongDisplayIndex = getCurrentSongIndex() // Renamed for clarity

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
    <div className='h-screen flex flex-col bg-gray-900 text-white overflow-y-auto'>
      <div className='absolute top-4 right-4 z-10'>
        {/* Container for top-right button */}
        {!isTauri && ( // Conditionally render fullscreen button
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
        )}
      </div>
      {/* Titre du morceau - flex-shrink-0, specific height e.g., h-[15%] or h-20 */}
      <div
        className='h-[15vh] md:h-[15%] flex items-center justify-center border border-gray-700 flex-shrink-0' // Changed to vh for mobile, kept % for md and up
        style={{
          backgroundColor: titleBgColor // Use state for dynamic background color
        }}
      >
        {editingTitle ? (
          <Input
            ref={titleInputRef}
            value={titleValue}
            onChange={e => setTitleValue(e.target.value)}
            onBlur={handleTitleSave}
            onKeyPress={e => e.key === 'Enter' && handleTitleSave()}
            className='text-center text-2xl font-bold bg-transparent border-gray-600 text-white'
          />
        ) : (
          <h1
            className='text-2xl md:text-4xl font-bold text-center cursor-pointer px-4'
            onClick={() => setEditingTitle(true)}
          >
            {song.title}
          </h1>
        )}
      </div>
      {/* Contrôles de tempo - flex-shrink-0, specific height e.g., h-[10%] or h-16 */}
      <div className='h-[10vh] md:h-[10%] flex items-center justify-between px-4 border-b border-gray-700 text-white flex-shrink-0'>
        {' '}
        {/* Changed to vh for mobile */}
        <Button
          variant='outline'
          size='sm'
          className='w-[10%] text-xl aspect-square border-white  bg-black text-white hover:text-black'
          onClick={() => updateTempo(-1)}
        >
          <Minus className='h-4 w-4' />
        </Button>
        <div className='flex-1 flex items-center justify-center px-4'>
          {editingTempo ? (
            <Input
              ref={tempoInputRef}
              value={tempoValue}
              onChange={e => setTempoValue(e.target.value)}
              onBlur={handleTempoSave}
              onKeyPress={e => e.key === 'Enter' && handleTempoSave()}
              className='text-center text-lg font-bold bg-gray-800 border-gray-600 text-white w-24'
            />
          ) : (
            <span
              className='text-2xl font-bold cursor-pointer'
              onClick={() => setEditingTempo(true)}
            >
              {song.tempo} BPM
            </span>
          )}
        </div>
        <Button
          variant='outline'
          size='sm'
          className='w-[10%] aspect-square ml-2 border-white  bg-black text-white hover:text-black'
          onClick={() => updateTempo(1)}
        >
          <Plus className='h-4 w-4' />
        </Button>
      </div>
      {/* Zone de visualisation - flex-1, min-h-0 to allow shrinking */}
      <div className='h-[34vh] md:flex-1 flex flex-row min-h-0'>
        {' '}
        {/* Reduced mobile height from 45vh to 34vh */}
        {/* TempoVisualizer container: Adjusted width for mobile, full height of parent */}
        <div className='w-[15%] md:w-1/4 h-full border-r border-gray-700 overflow-y-auto flex-shrink-0'>
          <TempoVisualizer
            isPlaying={isPlaying}
            currentBeat={currentBeat}
            beatsPerMeasure={beatsPerMeasure}
            color={song.color}
            approach={
              song.approach as
                | 'linear'
                | 'ease-in'
                | 'ease-out'
                | 'bounce'
                | 'elastic'
            }
            tempo={song.tempo}
          />
        </div>
        {/* BeatGraphic and Selects container: Takes remaining width, full height */}
        <div className='flex-1 flex flex-col min-h-0 h-full'>
          {/* BeatGraphic container: Takes most of the height, allows internal scroll */}
          <div className='flex-1 overflow-y-auto min-h-0'>
            <BeatGraphic
              isPlaying={isPlaying}
              currentBeat={currentBeat}
              timeSignature={song.timeSignature}
              color={song.color}
              approach={song.approach}
              tempo={song.tempo} // Pass the tempo prop here
            />
          </div>

          {/* Selects container: Auto height based on content, flex-shrink-0 */}
          <div className='p-4 flex flex-col sm:flex-row items-center justify-end border-t border-gray-700 bg-gray-800 flex-shrink-0'>
            <div className='mr-4'>
              <Select
                value={song.timeSignature}
                onValueChange={value =>
                  onUpdateSong({ ...song, timeSignature: value })
                }
              >
                <SelectTrigger className='w-full sm:w-32 bg-gray-800 border-gray-600 mb-2 sm:mb-0 mr-4 sm:mr-0'>
                  {' '}
                  {/* Full width on small, margin bottom */}
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className='bg-gray-800 border-gray-600 text-white'>
                  {timeSignatures.map(sig => (
                    <SelectItem key={sig} value={sig}>
                      {sig}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Select
              value={song.approach}
              onValueChange={value =>
                onUpdateSong({ ...song, approach: value })
              }
            >
              <SelectTrigger className='w-full sm:w-32 bg-gray-800 border-gray-600 mb-2 sm:mb-0'>
                {' '}
                {/* Full width on small */}
                <SelectValue />
              </SelectTrigger>
              <SelectContent className='bg-gray-800 border-gray-600 text-white'>
                {approaches.map(approach => (
                  <SelectItem key={approach.value} value={approach.value}>
                    {approach.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      {/* Contrôles de navigation - Adjusted for new mobile layout */}
      <div className='min-h-[20vh] md:h-[15%] gap-8 px-4 py-8 flex flex-col md:flex-row items-stretch md:items-center md:justify-center gap-2 md:gap-4 border-t border-gray-700 flex-shrink-0'>
        {/* Play/Stop Button - Full width on mobile, order-first. Desktop: order-2, specific width */}
        <Button
          onClick={() => {
            console.log(
              'Play/Stop button clicked, current song id:',
              song.id,
              'isPlaying:',
              isPlaying
            )
            onSetPlayingId(isPlaying ? null : song.id)
          }}
          className={`w-full h-20 md:h-[80%] md:w-[60%] order-first md:order-2 py-4 text-lg ${
            isPlaying
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {isPlaying ? (
            <Square className='h-full w-6 mx-auto' />
          ) : (
            <Play className='h-full w-6 mx-auto' />
          )}
        </Button>

        {/* Previous Button - Desktop: order-1, flex-1. Hidden on mobile. */}
        <Button
          variant='outline'
          onClick={handlePrevButtonClick}
          disabled={currentSongDisplayIndex === 0}
          className='hidden md:h-[80%] md:flex md:order-1 md:flex-1 text-xl aspect-square border-white bg-black text-white items-center justify-center'
        >
          <SkipBack className='h-20 w-[20%]' />
        </Button>

        {/* Next Button - Desktop: order-3, flex-1. Hidden on mobile. */}
        <Button
          variant='outline'
          onClick={handleNextButtonClick}
          disabled={currentSongDisplayIndex === setlist.songs.length - 1}
          className='hidden md:h-[80%] md:flex md:order-3 md:flex-1 text-xl aspect-square border-white bg-black text-white items-center justify-center'
        >
          <SkipForward className='h-20 w-[20%]' />
        </Button>

        {/* Mobile Only: Row for Previous and Next Buttons - order-last */}
        <div className='w-full flex flex-row gap-2 md:hidden order-last h-20'>
          <Button
            variant='outline'
            onClick={handlePrevButtonClick}
            disabled={currentSongDisplayIndex === 0}
            className='w-1/2 py-3 text-xl border-white bg-black text-white flex items-center justify-center h-[100%]'
          >
            <SkipBack className='h-10 w-5' />
          </Button>
          <Button
            variant='outline'
            onClick={handleNextButtonClick}
            disabled={currentSongDisplayIndex === setlist.songs.length - 1}
            className='w-1/2 py-3 text-xl border-white bg-black text-white flex items-center justify-center h-[100%]'
          >
            <SkipForward className='h-10 w-5' />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default SongView
