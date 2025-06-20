import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Maximize, Minimize } from 'lucide-react'
import { Button } from '@/components/ui/button'
import MidiSettings from '@/components/MidiSettings'
import { assetPath } from '@/utils/assetPath'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'

// Add global type for __TAURI__ to avoid TS error
declare global {
  interface Window {
    __TAURI__?: unknown
  }
}

// --- Metronome sound config ---
const METRONOME_SOUND_PATH_KEY = 'metronomeSoundPath'
const METRONOME_FIRST_BEAT_RATE_KEY = 'metronomeFirstBeatRate'
const availableSounds = [
  { name: 'Cloche', path: assetPath('sounds/bell.wav') },
  { name: 'Click', path: assetPath('sounds/click.wav') },
  { name: 'Laser', path: assetPath('sounds/laser.wav') },
  { name: 'Click 2 (Tack)', path: assetPath('sounds/tack.wav') }
]
const DEFAULT_SOUND_PATH = availableSounds[1].path
const DEFAULT_FIRST_BEAT_RATE = 1.2

const Parameters = () => {
  const navigate = useNavigate()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isTauri, setIsTauri] = useState(false)

  // --- Metronome sound state ---
  const [selectedSoundPath, setSelectedSoundPath] = useState(
    () => localStorage.getItem(METRONOME_SOUND_PATH_KEY) || DEFAULT_SOUND_PATH
  )
  const [firstBeatPlaybackRate, setFirstBeatPlaybackRate] = useState(() => {
    const stored = localStorage.getItem(METRONOME_FIRST_BEAT_RATE_KEY)
    return stored ? parseFloat(stored) : DEFAULT_FIRST_BEAT_RATE
  })

  useEffect(() => {
    // Check if running in Tauri
    if (window.__TAURI__) {
      setIsTauri(true)
    }

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(METRONOME_SOUND_PATH_KEY, selectedSoundPath)
  }, [selectedSoundPath])
  useEffect(() => {
    localStorage.setItem(
      METRONOME_FIRST_BEAT_RATE_KEY,
      firstBeatPlaybackRate.toString()
    )
  }, [firstBeatPlaybackRate])

  const goBack = () => {
    navigate('/')
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

  return (
    <div
      className='min-h-screen text-white bg-cover bg-center flex items-center justify-center'
      style={{ backgroundImage: 'url(' + assetPath('bg-gilles.jpg') + ')' }}
    >
      <div className='max-w-4xl w-full mx-auto bg-black bg-opacity-90 p-6 rounded-lg shadow-xl'>
        <div className='flex justify-between items-center mb-6'>
          <div className='flex items-center gap-3'>
            <Button
              variant='outline'
              size='sm'
              onClick={goBack}
              className='text-white border-white bg-gray-950 hover:bg-gray-700'
            >
              <ArrowLeft className='h-4 w-4' />
            </Button>
            <h1 className='text-xl font-bold'>Settings</h1>
          </div>

          {!isTauri && (
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

        <div className='max-w-md mx-auto'>
          <section className='mb-8'>
            <h2 className='text-lg font-medium mb-4'>External Connectivity</h2>
            <MidiSettings />
          </section>

          {/* --- Metronome Sound Settings --- */}
          <section className='mb-8'>
            <h2 className='text-lg font-medium mb-4'>Metronome Sound</h2>
            <div className='rounded-lg border border-gray-700 bg-gray-800 p-4'>
              <div className='mb-4'>
                <label
                  htmlFor='metronomeSound'
                  className='block text-sm font-medium mb-1'
                >
                  Sound:
                </label>
                <Select
                  value={selectedSoundPath}
                  onValueChange={setSelectedSoundPath}
                >
                  <SelectTrigger
                    id='metronomeSound'
                    className='bg-gray-900 text-white border-gray-700 focus:ring-indigo-500 focus:border-indigo-500'
                  >
                    <SelectValue
                      placeholder='Select sound'
                      className='text-white'
                    />
                  </SelectTrigger>
                  <SelectContent className='bg-gray-900 text-white border-gray-700'>
                    {availableSounds.map(sound => (
                      <SelectItem
                        key={sound.path}
                        value={sound.path}
                        className='text-white bg-gray-900 focus:bg-gray-700'
                      >
                        {sound.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label
                  htmlFor='firstBeatRate'
                  className='block text-sm font-medium mb-1'
                >
                  First Beat Pitch Multiplier (0.5 - 2.0):{' '}
                  {firstBeatPlaybackRate.toFixed(2)}x
                </label>
                <input
                  type='range'
                  id='firstBeatRate'
                  min='0.5'
                  max='2.0'
                  step='0.05'
                  value={firstBeatPlaybackRate}
                  onChange={e =>
                    setFirstBeatPlaybackRate(parseFloat(e.target.value))
                  }
                  className='w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer'
                />
                <Input
                  type='number'
                  min='0.5'
                  max='2.0'
                  step='0.05'
                  value={firstBeatPlaybackRate}
                  onChange={e =>
                    setFirstBeatPlaybackRate(parseFloat(e.target.value))
                  }
                  className='mt-2 w-1/4 bg-gray-900 text-white border-gray-700'
                />
              </div>
            </div>
          </section>

          <div className='flex mt-8 justify-center'>
            <img
              src={assetPath('logo.png')}
              alt='Clickomator Logo'
              className='h-16 w-auto opacity-50'
            />
          </div>

          <div className='text-xs text-gray-400 mt-4 text-center'>
            <p>Clickomator v1</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Parameters
