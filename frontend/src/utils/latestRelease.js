/**
 * Fetches the latest desktop app release from GitHub and maps assets to the
 * same shape as DESKTOP_DOWNLOADS. Used by the Download page so links update
 * automatically with every release.
 */
const GITHUB_RELEASE_API = 'https://api.github.com/repos/chiku524/dice.express/releases/latest'

function findAsset(assets, predicate) {
  const asset = assets.find(
    (a) => (typeof predicate === 'function' ? predicate(a) : a.name === predicate)
  )
  return asset ? { href: asset.browser_download_url, filename: asset.name } : null
}

function byPattern(re) {
  return (a) => re.test(a.name)
}

/**
 * @param {Array<{ name: string; browser_download_url: string }>} assets
 */
function mapAssetsToDownloads(assets) {
  const win = findAsset(assets, byPattern(/_x64-setup\.exe$/))
  const macIntel = findAsset(assets, byPattern(/_x64\.dmg$/))
  const macApple = findAsset(assets, byPattern(/_aarch64\.dmg$/))
  const appImage = findAsset(assets, byPattern(/_amd64\.AppImage$/))
  const deb = findAsset(assets, byPattern(/_amd64\.deb$/))

  return {
    windows: {
      label: 'Windows',
      icon: '🪟',
      primary: win
        ? { label: 'Download for Windows (x64)', href: win.href, filename: win.filename }
        : null,
    },
    macIntel: {
      label: 'macOS (Intel)',
      icon: '🍎',
      primary: macIntel
        ? { label: 'Download for macOS (Intel)', href: macIntel.href, filename: macIntel.filename }
        : null,
    },
    macApple: {
      label: 'macOS (Apple Silicon)',
      icon: '🍎',
      primary: macApple
        ? { label: 'Download for macOS (Apple Silicon)', href: macApple.href, filename: macApple.filename }
        : null,
    },
    linux: {
      label: 'Linux',
      icon: '🐧',
      primary: appImage
        ? { label: 'Download for Linux (AppImage, x64)', href: appImage.href, filename: appImage.filename }
        : null,
      secondary: deb
        ? { label: 'Debian / Ubuntu (.deb)', href: deb.href, filename: deb.filename }
        : null,
    },
  }
}

/**
 * @returns {Promise<{ version: string; downloads: import('../constants/downloads').DESKTOP_DOWNLOADS } | null>}
 */
export async function fetchLatestRelease() {
  const res = await fetch(GITHUB_RELEASE_API, {
    headers: { Accept: 'application/vnd.github+json' },
  })
  if (!res.ok) return null
  const data = await res.json()
  const version = (data.tag_name || '').replace(/^v/, '') || null
  const assets = data.assets || []
  if (!version || !assets.length) return null
  return {
    version,
    downloads: mapAssetsToDownloads(assets),
  }
}
