declare namespace WebMidi {
  interface MIDIOptions {
    sysex?: boolean;
    software?: boolean;
  }

  interface MIDIInputMap {
    entries(): IterableIterator<[string, MIDIInput]>;
    forEach(callbackfn: (value: MIDIInput, key: string, map: Map<string, MIDIInput>) => void, thisArg?: any): void;
    get(key: string): MIDIInput | undefined;
    has(key: string): boolean;
    keys(): IterableIterator<string>;
    size: number;
    values(): IterableIterator<MIDIInput>;
  }

  interface MIDIOutputMap {
    entries(): IterableIterator<[string, MIDIOutput]>;
    forEach(callbackfn: (value: MIDIOutput, key: string, map: Map<string, MIDIOutput>) => void, thisArg?: any): void;
    get(key: string): MIDIOutput | undefined;
    has(key: string): boolean;
    keys(): IterableIterator<string>;
    size: number;
    values(): IterableIterator<MIDIOutput>;
  }

  interface MIDIAccess extends EventTarget {
    inputs: MIDIInputMap;
    outputs: MIDIOutputMap;
    onstatechange: ((this: MIDIAccess, ev: MIDIConnectionEvent) => any) | null;
    sysexEnabled: boolean;
  }

  interface MIDIPort extends EventTarget {
    connection: MIDIPortConnectionState;
    id: string;
    manufacturer?: string;
    name?: string;
    state: MIDIPortDeviceState;
    type: MIDIPortType;
    version?: string;
    onstatechange: ((this: MIDIPort, ev: MIDIConnectionEvent) => any) | null;
    open(): Promise<MIDIPort>;
    close(): Promise<MIDIPort>;
  }

  interface MIDIInput extends MIDIPort {
    onmidimessage: ((this: MIDIInput, ev: MIDIMessageEvent) => any) | null;
  }

  interface MIDIOutput extends MIDIPort {
    send(data: number[], timestamp?: number): void;
    clear(): void;
  }

  interface MIDIMessageEvent extends Event {
    data: Uint8Array;
  }

  interface MIDIConnectionEvent extends Event {
    port: MIDIPort;
  }

  type MIDIPortConnectionState = "open" | "closed" | "pending";
  type MIDIPortDeviceState = "connected" | "disconnected";
  type MIDIPortType = "input" | "output";
}

interface Navigator {
  requestMIDIAccess(options?: WebMidi.MIDIOptions): Promise<WebMidi.MIDIAccess>;
}
