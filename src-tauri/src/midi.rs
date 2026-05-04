// Native MIDI clock output, exposed to the JS frontend via Tauri commands.
//
// The Web MIDI API isn't available in the WebKitGTK / WebView2 / WKWebView
// engines used by Tauri, so on the desktop app we drive a `midir`-based
// backend instead. The JS layer keeps a single shape for both runtimes
// (browser PWA = Web MIDI, Tauri = these commands).

use std::sync::{
    atomic::{AtomicBool, AtomicU32, Ordering},
    Arc, Mutex,
};
use std::thread;
use std::time::Duration;

use midir::{MidiOutput, MidiOutputConnection};
use serde::Serialize;
use tauri::State;

const MIDI_CLOCK: u8 = 0xF8;
const MIDI_START: u8 = 0xFA;
const MIDI_STOP: u8 = 0xFC;
const PULSES_PER_QUARTER: u32 = 24;

#[derive(Serialize)]
pub struct MidiOutputInfo {
    pub id: String,
    pub name: String,
}

/// Shared state across Tauri commands.
///
/// The connection lives behind a `Mutex` because every send needs `&mut`.
/// Tempo is an `AtomicU32` storing BPM × 1000 (we want fractional BPM later
/// without taking a lock on every pulse). The clock thread polls
/// `running` + `tempo_x1000` and exits when `running` is cleared.
pub struct MidiState {
    output: Arc<Mutex<Option<MidiOutputConnection>>>,
    running: Arc<AtomicBool>,
    tempo_x1000: Arc<AtomicU32>,
}

impl MidiState {
    pub fn new() -> Self {
        Self {
            output: Arc::new(Mutex::new(None)),
            running: Arc::new(AtomicBool::new(false)),
            tempo_x1000: Arc::new(AtomicU32::new(120_000)),
        }
    }
}

fn list_ports() -> Result<Vec<MidiOutputInfo>, String> {
    let out = MidiOutput::new("Clickomator").map_err(|e| e.to_string())?;
    let ports = out.ports();
    let mut result = Vec::with_capacity(ports.len());
    for (idx, port) in ports.iter().enumerate() {
        let name = out
            .port_name(port)
            .unwrap_or_else(|_| format!("port-{idx}"));
        // The port-id index is stable for a single MidiOutput instance but not
        // across invocations; we expose the index as the id and re-resolve it
        // every time the user picks something. Names returned by midir already
        // include enough disambiguation on every platform.
        result.push(MidiOutputInfo {
            id: idx.to_string(),
            name,
        });
    }
    Ok(result)
}

#[tauri::command]
pub fn midi_list_outputs() -> Result<Vec<MidiOutputInfo>, String> {
    list_ports()
}

#[tauri::command]
pub fn midi_select_output(id: String, state: State<'_, MidiState>) -> Result<(), String> {
    // Stop any running clock first — re-opening the same port while still
    // sending pulses confuses ALSA on Linux.
    stop_clock_inner(state.inner());

    let out = MidiOutput::new("Clickomator").map_err(|e| e.to_string())?;
    let ports = out.ports();
    let idx: usize = id.parse().map_err(|_| "invalid id".to_string())?;
    let port = ports
        .get(idx)
        .ok_or_else(|| format!("port {idx} not found"))?;
    let conn = out
        .connect(port, "clickomator-clock")
        .map_err(|e| e.to_string())?;
    *state.output.lock().unwrap() = Some(conn);
    Ok(())
}

fn set_tempo_inner(bpm: f32, state: &MidiState) -> Result<(), String> {
    if !(20.0..=400.0).contains(&bpm) {
        return Err(format!("bpm out of range: {bpm}"));
    }
    state
        .tempo_x1000
        .store((bpm * 1000.0) as u32, Ordering::Relaxed);
    Ok(())
}

#[tauri::command]
pub fn midi_set_tempo(bpm: f32, state: State<'_, MidiState>) -> Result<(), String> {
    set_tempo_inner(bpm, state.inner())
}

#[tauri::command]
pub fn midi_start_clock(bpm: f32, state: State<'_, MidiState>) -> Result<(), String> {
    let state = state.inner();
    if state.running.load(Ordering::SeqCst) {
        return Ok(());
    }
    if state.output.lock().unwrap().is_none() {
        return Err("no MIDI output selected".into());
    }
    set_tempo_inner(bpm, state)?;

    // Send MIDI Start.
    if let Some(out) = state.output.lock().unwrap().as_mut() {
        let _ = out.send(&[MIDI_START]);
    }

    state.running.store(true, Ordering::SeqCst);

    // Worker thread: clones Arcs, dies when running flips to false.
    let output = Arc::clone(&state.output);
    let running = Arc::clone(&state.running);
    let tempo_x1000 = Arc::clone(&state.tempo_x1000);
    thread::spawn(move || {
        // Use a "next deadline" loop to keep cumulative drift bounded — naive
        // sleep(interval) drifts by the time spent in send() each pulse.
        let mut next = std::time::Instant::now();
        while running.load(Ordering::SeqCst) {
            let bpm = tempo_x1000.load(Ordering::Relaxed) as f64 / 1000.0;
            let interval_us = (60_000_000.0 / bpm / PULSES_PER_QUARTER as f64) as u64;
            next += Duration::from_micros(interval_us);

            if let Ok(mut guard) = output.lock() {
                if let Some(conn) = guard.as_mut() {
                    let _ = conn.send(&[MIDI_CLOCK]);
                }
            }

            let now = std::time::Instant::now();
            if next > now {
                thread::sleep(next - now);
            } else {
                // We fell behind — reset the deadline so we don't burst.
                next = now;
            }
        }
    });
    Ok(())
}

fn stop_clock_inner(state: &MidiState) {
    if !state.running.swap(false, Ordering::SeqCst) {
        return;
    }
    if let Some(out) = state.output.lock().unwrap().as_mut() {
        let _ = out.send(&[MIDI_STOP]);
    }
}

#[tauri::command]
pub fn midi_stop_clock(state: State<'_, MidiState>) -> Result<(), String> {
    stop_clock_inner(state.inner());
    Ok(())
}
