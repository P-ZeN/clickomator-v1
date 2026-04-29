import { useEffect } from 'react'
import { appWindow } from '@tauri-apps/api/window'

const isTauri = (): boolean =>
  typeof window !== 'undefined' && '__TAURI_IPC__' in window

/**
 * Toggle fullscreen ↔ windowed (with decorations) when the user presses Escape.
 * No-op when running outside Tauri (e.g. `npm run dev` in a browser).
 */
export function useEscapeFullscreenToggle(): void {
  useEffect(() => {
    if (!isTauri()) return

    const onKeyDown = async (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      try {
        const wasFullscreen = await appWindow.isFullscreen()
        await appWindow.setFullscreen(!wasFullscreen)
        // When leaving fullscreen, show decorations so the user can move/close
        // the window. When entering fullscreen, hide them again.
        await appWindow.setDecorations(wasFullscreen)
      } catch (err) {
        console.error('Failed to toggle fullscreen', err)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
