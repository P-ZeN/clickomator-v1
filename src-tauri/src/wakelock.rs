// Cross-platform "don't sleep / don't dim" wake lock, exposed to JS via
// Tauri commands. Held while the user is performing (i.e. metronome or song
// is playing). Released when the JS side sends `wakelock_release` or the
// app exits.
//
// The `keepawake` crate handles the platform glue:
//   - Linux: D-Bus (logind, GNOME, freedesktop ScreenSaver — best-effort)
//   - Windows: SetThreadExecutionState
//   - macOS: IOPMAssertion
//
// We keep the AwakeHandle in app state so multiple acquire calls are a no-op
// (we only ever hold one assertion at a time) and dropping it on release
// returns the system to its normal power policy.

use std::sync::Mutex;

use keepawake::KeepAwake;
use tauri::State;

pub struct WakeLockState {
    handle: Mutex<Option<KeepAwake>>,
}

impl WakeLockState {
    pub fn new() -> Self {
        Self {
            handle: Mutex::new(None),
        }
    }
}

#[tauri::command]
pub fn wakelock_acquire(state: State<'_, WakeLockState>) -> Result<(), String> {
    let mut guard = state.handle.lock().unwrap();
    if guard.is_some() {
        return Ok(());
    }
    let handle = keepawake::Builder::default()
        .display(true)
        .idle(true)
        .sleep(true)
        .reason("Clickomator metronome is playing")
        .app_name("Clickomator")
        .app_reverse_domain("clickomator.v1.1")
        .create()
        .map_err(|e| e.to_string())?;
    *guard = Some(handle);
    Ok(())
}

#[tauri::command]
pub fn wakelock_release(state: State<'_, WakeLockState>) -> Result<(), String> {
    let mut guard = state.handle.lock().unwrap();
    // Drop the handle to release the OS-level assertion.
    *guard = None;
    Ok(())
}
