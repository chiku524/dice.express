/**
 * Desktop app download links — fallback when GitHub API is unavailable.
 * The Download page normally fetches the latest release from the API; these
 * constants are used only if that request fails.
 * DESKTOP_APP_VERSION: release tag (e.g. v1.0.3). If assets on that release
 * use a different version in filenames, set ASSET_VERSION to match so fallback links work.
 */
const GITHUB_RELEASE_BASE = 'https://github.com/chiku524/dice.express/releases/download'

export const DESKTOP_APP_VERSION = '1.0.28'
const ASSET_VERSION = '1.0.28'

function directDownloadUrl(filename) {
  return `${GITHUB_RELEASE_BASE}/v${DESKTOP_APP_VERSION}/${filename}`
}

const v = ASSET_VERSION

/** Direct download links for the desktop app (Tauri). Filenames match tauri build output. */
export const DESKTOP_DOWNLOADS = {
  windows: {
    label: 'Windows',
    icon: '🪟',
    primary: {
      label: 'Download for Windows (x64)',
      href: directDownloadUrl(`dice.express_${v}_x64-setup.exe`),
      filename: `dice.express_${v}_x64-setup.exe`,
    },
  },
  macIntel: {
    label: 'macOS (Intel)',
    icon: '🍎',
    primary: {
      label: 'Download for macOS (Intel)',
      href: directDownloadUrl(`dice.express_${v}_x64.dmg`),
      filename: `dice.express_${v}_x64.dmg`,
    },
  },
  macApple: {
    label: 'macOS (Apple Silicon)',
    icon: '🍎',
    primary: {
      label: 'Download for macOS (Apple Silicon)',
      href: directDownloadUrl(`dice.express_${v}_aarch64.dmg`),
      filename: `dice.express_${v}_aarch64.dmg`,
    },
  },
  linux: {
    label: 'Linux',
    icon: '🐧',
    primary: {
      label: 'Download for Linux (AppImage, x64)',
      href: directDownloadUrl(`dice.express_${v}_amd64.AppImage`),
      filename: `dice.express_${v}_amd64.AppImage`,
    },
    secondary: {
      label: 'Debian / Ubuntu (.deb)',
      href: directDownloadUrl(`dice.express_${v}_amd64.deb`),
      filename: `dice.express_${v}_amd64.deb`,
    },
  },
}
