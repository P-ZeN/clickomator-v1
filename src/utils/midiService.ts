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
  // ── Lookahead scheduler ────────────────────────────────────────────────
  // Same Chris Wilson pattern as the audio metronome in SongView: a slow
  // imprecise JS timer schedules MIDI clock pulses up to SCHEDULE_AHEAD_MS
  // milliseconds in advance, using `output.send(data, timestamp)` so the
  // browser dispatches each pulse at the exact intended time. This avoids
  // the cumulative drift and 15-100 ms jitter of a naive setInterval loop,
  // and makes the PWA MIDI clock as tight as the native Tauri/Rust one.
  private clockTimerId: number | null = null
  private nextPulseTime = 0 // performance.now() ms
  private readonly pulsesPerQuarterNote = 24
  private readonly LOOKAHEAD_INTERVAL_MS = 25
  private readonly SCHEDULE_AHEAD_MS = 100
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
    // No need to restart: the scheduler tick reads `this.tempo` on every
    // wake-up, so the new tempo applies on the very next pulse it schedules.
  }

  private schedulerTick = (): void => {
    if (!this.isRunning || !this.midiOutput) return
    const horizon = performance.now() + this.SCHEDULE_AHEAD_MS
    const msPerPulse = 60000 / this.tempo / this.pulsesPerQuarterNote
    while (this.nextPulseTime < horizon) {
      // The second arg is a DOMHighResTimeStamp; the browser dispatches
      // the bytes on the MIDI port at exactly that time, sub-ms accurate.
      this.midiOutput.send([0xf8], this.nextPulseTime)
      this.nextPulseTime += msPerPulse
    }
  }

  private startClockSilently (): void {
    if (this.isRunning || !this.midiOutput) return
    // Start a hair (10 ms) in the future so the very first pulse is itself
    // scheduled ahead, matching the audio scheduler's behaviour.
    this.nextPulseTime = performance.now() + 10
    this.isRunning = true
    this.schedulerTick() // initial pass
    this.clockTimerId = window.setInterval(
      this.schedulerTick,
      this.LOOKAHEAD_INTERVAL_MS
    )
  }

  private stopClockSilently (): void {
    if (!this.isRunning) return
    if (this.clockTimerId !== null) {
      clearInterval(this.clockTimerId)
      this.clockTimerId = null
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
