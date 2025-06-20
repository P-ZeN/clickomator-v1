import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import midiService from '@/utils/midiService'

interface MidiSettingsProps {
  tempo?: number
  isPlaying?: boolean
}

const MidiSettings: React.FC<MidiSettingsProps> = ({
  tempo = 120,
  isPlaying = false
}) => {
  const [isMidiEnabled, setIsMidiEnabled] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [midiOutputs, setMidiOutputs] = useState<WebMidi.MIDIOutput[]>([])
  const [selectedOutputId, setSelectedOutputId] = useState<string>('')

  // Initialize MIDI on component mount
  useEffect(() => {
    const initMidi = async () => {
      const success = await midiService.initialize()
      if (success) {
        setIsInitialized(true)
        setMidiOutputs(midiService.getOutputs())
      }
    }

    initMidi()

    // Clean up when component unmounts
    return () => {
      if (isMidiEnabled) {
        midiService.stopClock()
      }
    }
  }, [])

  // Handle tempo changes
  useEffect(() => {
    if (isMidiEnabled && tempo) {
      midiService.setTempo(tempo)
    }
  }, [tempo, isMidiEnabled])

  // Handle play/stop state changes
  useEffect(() => {
    if (!isMidiEnabled || !midiService.hasSelectedOutput()) return

    if (isPlaying) {
      midiService.startClock()
    } else {
      midiService.stopClock()
    }
  }, [isPlaying, isMidiEnabled])

  const handleMidiToggle = (checked: boolean) => {
    setIsMidiEnabled(checked)

    // Save the setting to localStorage
    localStorage.setItem('midi-enabled', checked.toString())

    if (!checked) {
      midiService.stopClock()
    } else if (isPlaying && midiService.hasSelectedOutput()) {
      midiService.startClock()
    }
  }

  const handleOutputChange = (value: string) => {
    setSelectedOutputId(value)

    // Save the selected output to localStorage
    localStorage.setItem('midi-output-id', value)

    const success = midiService.selectOutput(value)

    // If successfully selected an output and we're enabled and playing, start the clock
    if (success && isMidiEnabled && isPlaying) {
      midiService.startClock()
    }
  }

  // Load saved settings on component mount
  useEffect(() => {
    const savedMidiEnabled = localStorage.getItem('midi-enabled') === 'true'
    const savedOutputId = localStorage.getItem('midi-output-id')

    setIsMidiEnabled(savedMidiEnabled)

    if (savedOutputId) {
      setSelectedOutputId(savedOutputId)
      midiService.selectOutput(savedOutputId)
    }
  }, [isInitialized])
  if (!isInitialized) {
    return (
      <div className='p-5 bg-gray-800 border border-gray-700 rounded-lg mb-4 shadow-lg'>
        <h3 className='text-lg font-medium mb-4 border-b border-gray-700 pb-2'>
          MIDI Clock Output
        </h3>
        <div className='bg-gray-900 p-4 rounded border border-gray-700'>
          <p className='text-yellow-400 font-medium mb-1'>Not Available</p>
          <p className='text-gray-400 text-sm'>
            Web MIDI API is not supported in this browser
          </p>
        </div>
      </div>
    )
  }
  return (
    <div className='p-5 bg-gray-800 border border-gray-700 rounded-lg mb-4 shadow-lg'>
      <h3 className='text-lg font-medium mb-4 border-b border-gray-700 pb-2'>
        MIDI Clock Output
      </h3>

      <div className='flex items-center justify-between mb-6'>
        <Label htmlFor='midi-enabled' className='text-sm font-medium'>
          Enable MIDI Clock
        </Label>
        <Switch
          id='midi-enabled'
          checked={isMidiEnabled}
          onCheckedChange={handleMidiToggle}
          className='data-[state=checked]:bg-green-500'
        />
      </div>

      <div className='mb-6'>
        <Label htmlFor='midi-output' className='text-sm font-medium block mb-2'>
          MIDI Output Device
        </Label>
        <Select
          value={selectedOutputId}
          onValueChange={handleOutputChange}
          disabled={!isMidiEnabled}
        >
          <SelectTrigger
            id='midi-output'
            className='w-full bg-gray-900 border-gray-700'
          >
            <SelectValue placeholder='Select MIDI output' />
          </SelectTrigger>
          <SelectContent className='bg-gray-900 border-gray-700 focus:text-gray-100 text-gray-200'>
            {midiOutputs.length === 0 ? (
              <SelectItem value='none' disabled>
                No MIDI outputs found
              </SelectItem>
            ) : (
              midiOutputs.map(output => (
                <SelectItem key={output.id} value={output.id}>
                  {output.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      <div className='bg-gray-900 p-3 rounded border border-gray-700 flex items-center justify-between'>
        <span className='text-sm'>Status</span>
        <span
          className={`text-sm font-medium ${
            isMidiEnabled ? 'text-green-400' : 'text-gray-400'
          }`}
        >
          {isMidiEnabled ? `Active - ${tempo} BPM` : 'Disabled'}
        </span>
      </div>
    </div>
  )
}

export default MidiSettings
