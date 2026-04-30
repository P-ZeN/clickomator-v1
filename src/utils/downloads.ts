/**
 * Centralised list of installer download links.
 *
 * Files are uploaded to GitHub Releases with stable filenames by
 * .github/workflows/release.yml, so `releases/latest/download/<file>`
 * always serves the most recent version. No code change is needed when
 * publishing a new release — just push a `v*` tag.
 */
const RELEASES_BASE =
  'https://github.com/P-ZeN/clickomator-v1/releases/latest/download'

export interface DownloadLink {
  label: string
  href: string
  hint?: string
}

export const windowsDownloads: DownloadLink[] = [
  {
    label: 'Windows Installer (.msi)',
    href: `${RELEASES_BASE}/Clickomator-windows-x64.msi`
  }
]

export const linuxDownloads: DownloadLink[] = [
  {
    label: 'Linux .deb (Ubuntu / Debian)',
    href: `${RELEASES_BASE}/Clickomator-linux-amd64.deb`,
    hint: 'sudo apt install ./Clickomator-linux-amd64.deb'
  },
  {
    label: 'Linux .AppImage (universal)',
    href: `${RELEASES_BASE}/Clickomator-linux-x86_64.AppImage`,
    hint: 'chmod +x ./Clickomator-linux-x86_64.AppImage && ./Clickomator-linux-x86_64.AppImage'
  }
]

export const macosDownloads: DownloadLink[] = [
  {
    label: 'macOS (.dmg)',
    href: `${RELEASES_BASE}/Clickomator-macos.dmg`
  }
]

export const allDownloads: DownloadLink[] = [
  ...windowsDownloads,
  ...linuxDownloads,
  ...macosDownloads
]
