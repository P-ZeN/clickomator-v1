// Cross-runtime wake-lock helper.
//
// In Tauri we call our `wakelock_acquire` / `wakelock_release` Rust commands
// (see src-tauri/src/wakelock.rs) which use the `keepawake` crate to hold
// platform-native power assertions on Linux/Windows/macOS.
//
// In a regular browser we fall back to the standard
// `navigator.wakeLock.request('screen')` API, which is widely supported in
// Chromium and works in installed PWAs. It is *not* available in Firefox
// nor in WebKitGTK, but those users can still install the desktop app for
// the full guarantee.

import { isTauriRuntime } from '@/hooks/use-escape-fullscreen-toggle'

let browserSentinel: WakeLockSentinel | null = null
let acquired = false

export async function acquireWakeLock (): Promise<void> {
  if (acquired) return
  acquired = true

  if (isTauriRuntime()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('wakelock_acquire')
    } catch (e) {
      console.error('wakelock_acquire failed:', e)
      acquired = false
    }
    return
  }

  // Browser path: ask for a screen wake lock; ignore if unsupported.
  // The lock is automatically released by the browser if the page becomes
  // hidden, so we re-request it on visibilitychange while still "acquired".
  try {
    if ('wakeLock' in navigator) {
      browserSentinel = await navigator.wakeLock.request('screen')
      document.addEventListener('visibilitychange', onVisibilityChange)
    }
  } catch (e) {
    console.warn('Browser wake lock unavailable:', e)
  }
}

export async function releaseWakeLock (): Promise<void> {
  if (!acquired) return
  acquired = false

  if (isTauriRuntime()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('wakelock_release')
    } catch (e) {
      console.error('wakelock_release failed:', e)
    }
    return
  }

  document.removeEventListener('visibilitychange', onVisibilityChange)
  try {
    await browserSentinel?.release()
  } catch {
    // ignore
  }
  browserSentinel = null
}

async function onVisibilityChange (): Promise<void> {
  if (!acquired) return
  if (document.visibilityState !== 'visible') return
  if (browserSentinel && !browserSentinel.released) return
  try {
    browserSentinel = await navigator.wakeLock.request('screen')
  } catch {
    // ignore — user may have switched tab during a transient state
  }
}
