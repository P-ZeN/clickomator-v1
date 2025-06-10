import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Maximize, Minimize } from 'lucide-react'
import { Button } from '@/components/ui/button'
import MidiSettings from '@/components/MidiSettings'

// Add global type for __TAURI__ to avoid TS error
declare global {
  interface Window {
    __TAURI__?: unknown
  }
}

const Parameters = () => {
  const navigate = useNavigate()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isTauri, setIsTauri] = useState(false)

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
      style={{ backgroundImage: 'url(/bg-gilles.jpg)' }}
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

          {/* Add more settings sections in future if needed */}
          <div className='flex mt-8 justify-center'>
            <img
              src='/logo.png'
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
