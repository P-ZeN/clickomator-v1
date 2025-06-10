class MidiService {
  private midiAccess: WebMidi.MIDIAccess | null = null;
  private midiOutput: WebMidi.MIDIOutput | null = null;
  private clockIntervalId: number | null = null;
  private pulsesPerQuarterNote = 24; // Standard MIDI clock sends 24 pulses per quarter note
  private isRunning = false;
  private tempo = 120; // Default tempo

  async initialize(): Promise<boolean> {
    try {
      // Request MIDI access
      if (navigator.requestMIDIAccess) {
        this.midiAccess = await navigator.requestMIDIAccess();
        console.log('MIDI access granted');
        return true;
      } else {
        console.warn('Web MIDI API not supported in this browser');
        return false;
      }
    } catch (error) {
      console.error('Failed to initialize MIDI:', error);
      return false;
    }
  }

  getOutputs(): WebMidi.MIDIOutput[] {
    if (!this.midiAccess) return [];
    return Array.from(this.midiAccess.outputs.values());
  }

  selectOutput(outputId: string): boolean {
    if (!this.midiAccess) return false;

    const output = this.midiAccess.outputs.get(outputId);
    if (output) {
      this.midiOutput = output;
      console.log(`MIDI output set to: ${output.name}`);
      return true;
    }
    return false;
  }

  setTempo(bpm: number): void {
    this.tempo = bpm;

    // If already running, restart the clock with new tempo
    if (this.isRunning) {
      this.stopClock();
      this.startClock();
    }
  }

  startClock(): void {
    if (this.isRunning || !this.midiOutput) return;

    // Send MIDI start message
    this.midiOutput.send([0xFA]); // MIDI Start message

    // Calculate interval between MIDI clock pulses
    const millisecondsPerMinute = 60000;
    const millisecondsPerBeat = millisecondsPerMinute / this.tempo;
    const millisecondsPerPulse = millisecondsPerBeat / this.pulsesPerQuarterNote;

    // Start sending MIDI clock pulses
    this.clockIntervalId = window.setInterval(() => {
      if (this.midiOutput) {
        this.midiOutput.send([0xF8]); // MIDI Clock message
      }
    }, millisecondsPerPulse);

    this.isRunning = true;
  }

  stopClock(): void {
    if (!this.isRunning || !this.midiOutput) return;

    // Clear interval
    if (this.clockIntervalId !== null) {
      clearInterval(this.clockIntervalId);
      this.clockIntervalId = null;
    }

    // Send MIDI stop message
    this.midiOutput.send([0xFC]); // MIDI Stop message

    this.isRunning = false;
  }

  isInitialized(): boolean {
    return this.midiAccess !== null;
  }

  hasSelectedOutput(): boolean {
    return this.midiOutput !== null;
  }
}

// Create a singleton instance
const midiService = new MidiService();
export default midiService;
