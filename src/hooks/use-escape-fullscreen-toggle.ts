import { useEffect } from 'react'

const isTauri = (): boolean =>
  typeof window !== 'undefined' &&
  '__TAURI_INTERNALS__' in window

/**
 * Toggle fullscreen ↔ windowed (with decorations) when the user presses Escape.
 * No-op when running outside Tauri (e.g. `npm run dev` in a browser, or the PWA
 * deployed on the web). The `@tauri-apps/api/webviewWindow` module is imported
 * dynamically because in Tauri 2 `getCurrentWebviewWindow()` synchronously
 * dereferences `window.__TAURI_INTERNALS__.metadata`, which throws in a plain
 * browser and breaks the whole React tree.
 */
export function useEscapeFullscreenToggle(): void {
  useEffect(() => {
    if (!isTauri()) return

    let cleanup: (() => void) | undefined
    let cancelled = false

    ;(async () => {
      try {
        const { getCurrentWebviewWindow } = await import(
          '@tauri-apps/api/webviewWindow'
        )
        if (cancelled) return
        const appWindow = getCurrentWebviewWindow()

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
        cleanup = () => window.removeEventListener('keydown', onKeyDown)
      } catch (err) {
        console.error('Failed to load Tauri webviewWindow API', err)
      }
    })()

    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [])
}