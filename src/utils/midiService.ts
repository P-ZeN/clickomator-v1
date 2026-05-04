import { isTauriRuntime } from '@/hooks/use-escape-fullscreen-toggle'

// Unified MIDI service: in the deployed PWA we use the browser's Web MIDI
// API; in Tauri we forward calls to the native Rust commands implemented in
// `src-tauri/src/midi.rs` (cross-platform via the `midir` crate). The same
// React component (`MidiSettings`) talks to this service either way.

export interface MidiOutputInfo {
  id: string
  name: string
}

interface MidiBackend {
  initialize(): Promise<boolean>
  getOutputs(): MidiOutputInfo[]
  selectOutput(id: string): Promise<boolean>
  setTempo(bpm: number): void
  startClock(): Promise<void>
  stopClock(): Promise<void>
  hasSelectedOutput(): boolean
  isInitialized(): boolean
  refreshOutputs(): Promise<MidiOutputInfo[]>
}

// ── Web MIDI backend (browsers / PWA) ───────────────────────────────────

class WebMidiBackend implements MidiBackend {
  private midiAccess: WebMidi.MIDIAccess | null = null
  private midiOutput: WebMidi.MIDIOutput | null = null
  private clockIntervalId: number | null = null
  private pulsesPerQuarterNote = 24
  private isRunning = false
  private tempo = 120

  async initialize (): Promise<boolean> {
    try {
      if ((navigator as Navigator).requestMIDIAccess) {
        this.midiAccess = await (navigator as Navigator).requestMIDIAccess()
        return true
      }
      console.warn('Web MIDI API not supported in this browser')
      return false
    } catch (error) {
      console.error('Failed to initialize MIDI:', error)
      return false
    }
  }

  async refreshOutputs (): Promise<MidiOutputInfo[]> {
    return this.getOutputs()
  }

  getOutputs (): MidiOutputInfo[] {
    if (!this.midiAccess) return []
    return Array.from(this.midiAccess.outputs.values()).map(o => ({
      id: o.id,
      name: o.name ?? o.id
    }))
  }

  async selectOutput (id: string): Promise<boolean> {
    if (!this.midiAccess) return false
    const output = this.midiAccess.outputs.get(id)
    if (output) {
      this.midiOutput = output
      return true
    }
    return false
  }

  setTempo (bpm: number): void {
    this.tempo = bpm
    if (this.isRunning) {
      this.stopClockSilently()
      this.startClockSilently()
    }
  }

  private startClockSilently (): void {
    if (this.isRunning || !this.midiOutput) return
    const ms = 60000 / this.tempo / this.pulsesPerQuarterNote
    this.clockIntervalId = window.setInterval(() => {
      this.midiOutput?.send([0xf8])
    }, ms)
    this.isRunning = true
  }

  private stopClockSilently (): void {
    if (!this.isRunning) return
    if (this.clockIntervalId !== null) {
      clearInterval(this.clockIntervalId)
      this.clockIntervalId = null
    }
    this.isRunning = false
  }

  async startClock (): Promise<void> {
    if (this.isRunning || !this.midiOutput) return
    this.midiOutput.send([0xfa])
    this.startClockSilently()
  }

  async stopClock (): Promise<void> {
    if (!this.isRunning || !this.midiOutput) return
    this.stopClockSilently()
    this.midiOutput.send([0xfc])
  }

  isInitialized (): boolean {
    return this.midiAccess !== null
  }

  hasSelectedOutput (): boolean {
    return this.midiOutput !== null
  }
}

// ── Tauri (native) backend ──────────────────────────────────────────────

class TauriMidiBackend implements MidiBackend {
  private outputs: MidiOutputInfo[] = []
  private selectedId: string | null = null
  private initialized = false
  private tempo = 120
  private running = false

  private async invoke<T> (cmd: string, args?: Record<string, unknown>): Promise<T> {
    // Imported dynamically because @tauri-apps/api dereferences the Tauri
    // internals at module-load time, which throws in a plain browser.
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke<T>(cmd, args)
  }

  async initialize (): Promise<boolean> {
    try {
      this.outputs = await this.invoke<MidiOutputInfo[]>('midi_list_outputs')
      this.initialized = true
      return true
    } catch (e) {
      console.error('Tauri MIDI init failed:', e)
      return false
    }
  }

  async refreshOutputs (): Promise<MidiOutputInfo[]> {
    try {
      this.outputs = await this.invoke<MidiOutputInfo[]>('midi_list_outputs')
    } catch (e) {
      console.error('Tauri MIDI refresh failed:', e)
    }
    return this.outputs
  }

  getOutputs (): MidiOutputInfo[] {
    return this.outputs
  }

  async selectOutput (id: string): Promise<boolean> {
    try {
      await this.invoke('midi_select_output', { id })
      this.selectedId = id
      return true
    } catch (e) {
      console.error('Tauri MIDI selectOutput failed:', e)
      return false
    }
  }

  setTempo (bpm: number): void {
    this.tempo = bpm
    // Fire-and-forget: tempo changes are atomic on the Rust side.
    this.invoke('midi_set_tempo', { bpm }).catch(e =>
      console.error('Tauri MIDI setTempo failed:', e)
    )
  }

  async startClock (): Promise<void> {
    if (this.running || !this.selectedId) return
    try {
      await this.invoke('midi_start_clock', { bpm: this.tempo })
      this.running = true
    } catch (e) {
      console.error('Tauri MIDI startClock failed:', e)
    }
  }

  async stopClock (): Promise<void> {
    if (!this.running) return
    try {
      await this.invoke('midi_stop_clock')
    } catch (e) {
      console.error('Tauri MIDI stopClock failed:', e)
    }
    this.running = false
  }

  isInitialized (): boolean {
    return this.initialized
  }

  hasSelectedOutput (): boolean {
    return this.selectedId !== null
  }
}

const backend: MidiBackend = isTauriRuntime()
  ? new TauriMidiBackend()
  : new WebMidiBackend()

export default backend
