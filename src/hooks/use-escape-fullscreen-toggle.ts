import { useEffect } from 'react'

const isTauri = (): boolean =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

export const isTauriRuntime = isTauri

/**
 * Toggle the Tauri window between fullscreen (no decorations) and windowed
 * (with decorations). No-op outside Tauri. Imports
 * `@tauri-apps/api/webviewWindow` dynamically because in Tauri 2
 * `getCurrentWebviewWindow()` synchronously dereferences
 * `window.__TAURI_INTERNALS__.metadata`, which throws in a plain browser.
 */
export async function toggleTauriFullscreen (): Promise<void> {
  if (!isTauri()) return
  try {
    const { getCurrentWebviewWindow } = await import(
      '@tauri-apps/api/webviewWindow'
    )
    const appWindow = getCurrentWebviewWindow()
    const wasFullscreen = await appWindow.isFullscreen()
    await appWindow.setFullscreen(!wasFullscreen)
    // When leaving fullscreen, show decorations so the user can move/close
    // the window. When entering fullscreen, hide them again.
    await appWindow.setDecorations(wasFullscreen)
  } catch (err) {
    console.error('Failed to toggle fullscreen', err)
  }
}

/**
 * Bind Escape to {@link toggleTauriFullscreen}. No-op outside Tauri.
 */
export function useEscapeFullscreenToggle (): void {
  useEffect(() => {
    if (!isTauri()) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      void toggleTauriFullscreen()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}

