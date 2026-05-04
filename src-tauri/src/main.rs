// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod midi;
mod wakelock;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .manage(midi::MidiState::new())
        .manage(wakelock::WakeLockState::new())
        .invoke_handler(tauri::generate_handler![
            midi::midi_list_outputs,
            midi::midi_select_output,
            midi::midi_set_tempo,
            midi::midi_start_clock,
            midi::midi_stop_clock,
            wakelock::wakelock_acquire,
            wakelock::wakelock_release,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
