# Clickomator

Métronome audio et visuel — for musicians who want a metronome that's both audible AND visible, on the desktop or in the browser.

Distributed as:

- **Web app / PWA** — Vite-built static site (deployed to `ehpad-break.net/clickomator/` via `deploy-web.yml`)
- **Desktop app** — Tauri v2 bundles for Linux (AppImage + `.deb`), Windows, macOS (built and released via `release.yml`)

## Stack

- React + TypeScript + Vite (web frontend)
- Tauri v2 + Rust (desktop backend, native MIDI clock, system wake-lock)
- shadcn-ui + Radix UI + Tailwind (components / styling)
- Web Audio API with lookahead scheduler (timing core — see `src/utils/midiService.ts`)
- `vite-plugin-pwa` for service-worker / installable web app

## Local development

Requires Node.js (tested on 20) and npm.

```sh
# Install dependencies
npm install

# Web dev server (browser)
npm run dev

# Tauri desktop dev (opens the native window)
npm run devtauri

# Lint
npm run lint
```

## Build & release

```sh
# Web build (static output in dist/)
npm run build

# Tauri bundle for current platform
npm run bundle

# Coordinated release (bumps versions, tags, pushes — see scripts/release.mjs)
npm run release
```

## Distribution

- **Web**: pushing to the `deploy` branch triggers `.github/workflows/deploy-web.yml`, which builds and rsyncs `dist/` to the web host
- **Desktop**: a release commit triggers `.github/workflows/release.yml`, which builds bundles on all three OSes and publishes them as a GitHub Release. On Linux, GStreamer plugins are bundled into the AppImage via `linuxdeploy-plugin-gstreamer` so audio works on any distro regardless of the user's installed GStreamer version.

## History

Originally scaffolded with [Lovable](https://lovable.dev) as a prototype, then rewritten into its current form (Tauri + native MIDI + Web Audio scheduler + PWA). The Lovable connection was severed in June 2026; the project is now maintained directly via git.
