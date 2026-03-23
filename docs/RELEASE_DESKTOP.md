# Desktop app release (Tauri)

The desktop app is built for **Windows**, **macOS** (Intel + Apple Silicon), and **Linux** via GitHub Actions.

## Desktop app experience

- **Intro flow**: A frameless splash window shows a short logo animation, then checks for updates (with progress in the same window). If an update is available it is downloaded and installed there; only the splash progress is shown (Windows installer runs in quiet/silent mode). When done, the splash closes and the main window opens at **home** if the user has an account in storage, or **sign-in** otherwise.
- **Auto-update**: On first load the app checks for updates in the frameless splash; if one is available it is downloaded with a progress bar in that window, then the app installs silently and relaunches. To enable updates you must configure the updater in `tauri.conf.json` (see **Updater** below).
- **App-like UI**: When running inside Tauri, the UI uses a tighter layout and compact footer; the navbar logo area can act as a window drag region if you switch to a custom title bar. Direct download links on the [Download](/download) page point to the release assets.
- **System tray**: Closing the main window (✕) minimizes to the tray instead of quitting. The tray menu includes **Show dice.express**, **Sign out** (local account cleared → sign-in), and **Quit**. Left-click the tray icon restores the window; the context menu is typically on right-click (Windows/Linux) or control-click (macOS).

## GitHub Actions authentication

The **Release desktop app** workflow uses the default **`GITHUB_TOKEN`** (with `permissions: contents: write`) to create releases and upload assets. You do **not** need a separate PAT unless you fork into a setup that disables the default token.

## macOS DMG builds on CI

Keep **`CI=true`** for the `tauri build` step (GitHub sets this by default). Do **not** override with `CI=false`: Tauri’s DMG bundler would then try to drive **Finder/AppleScript** to lay out the disk image, which fails on headless runners.

The frontend is built via **`npm run build:frontend:tauri`**, which runs Vite with **`CI=false` only in that subprocess**—so tooling differences under CI don’t affect the outer Tauri build.

## Bundle identifier (macOS)

`identifier` in `src-tauri/tauri.conf.json` is **`com.dice.express`** (reverse-DNS style; avoids the `.app` suffix that conflicts with macOS bundle extensions).

## How to release

- **Option A – Manual run**  
  **Actions** tab → **Release desktop app** → **Run workflow**. The workflow uses the version from `src-tauri/tauri.conf.json` and creates/updates a release with that tag (e.g. `v1.0.0`).

- **Option B – Tag push**  
  Bump the version in **both** `package.json` and `src-tauri/tauri.conf.json`, commit, **then** create and push a tag:
  ```bash
  git tag v1.0.1
  git push origin v1.0.1
  ```
  The workflow runs and builds for all platforms, then creates the release `v1.0.1` with the installers attached.

**Important:** The workflow checks that the tag matches the version in `tauri.conf.json`. If you push a tag (e.g. `v1.0.3`) before bumping `tauri.conf.json` to that version, the build will produce installers with the *old* version in their filenames (e.g. `dice.express_1.0.2_x64-setup.exe`), and the release will have broken direct-download links. The workflow now fails in that case so you fix the version and re-tag.

The [Download](/download) page fetches the latest release from the GitHub API and updates links automatically; you do not need to change the frontend when you cut a new release. A static fallback in `frontend/src/constants/downloads.js` is used only when the API is unavailable.

## Updater (optional)

The app includes the Tauri updater plugin. **Windows silent install:** `plugins.updater.windows.installMode: "quiet"` so the installer runs silently and only the in-app splash progress is shown (per-user install; no admin elevation prompt in quiet mode).

If `pubkey` or `endpoints` are left empty, the splash still runs but skips the update check and goes straight to the app.

**CI without signing:** Leave `createUpdaterArtifacts` **out** of `bundle` (or `false`). If it is `true` while a `pubkey` is configured but `TAURI_SIGNING_PRIVATE_KEY` is missing in CI, the build fails with *"A public key has been found, but no private key"*.

Full key generation, GitHub secrets, and `latest.json` behavior: see **Tauri updater signing** below.

## Artifacts produced

| Platform   | Files |
|-----------|--------|
| Windows   | `dice.express_<version>_x64-setup.exe`, `dice.express_<version>_x64_en-US.msi` |
| macOS     | `dice.express_<version>_aarch64.dmg` (Apple Silicon), `dice.express_<version>_x64.dmg` (Intel) |
| Linux     | `dice.express_<version>_amd64.AppImage`, `dice.express_<version>_amd64.deb` |

Direct download URL pattern:  
`https://github.com/chiku524/dice.express/releases/download/v<version>/<filename>`

## Why tag and asset filenames must match

Tauri uses the version in `src-tauri/tauri.conf.json` when naming bundle outputs (e.g. `dice.express_1.0.3_x64-setup.exe`). The release *tag* (e.g. `v1.0.3`) is set when you push the tag or when the workflow runs. If you created the tag from a commit where `tauri.conf.json` still said `1.0.2`, the workflow would build installers named with 1.0.2, upload them to the release `v1.0.3`, and any link pointing at `dice.express_1.0.3_*.exe` would 404. The workflow now validates that the tag version matches `tauri.conf.json` and fails early if not, so you bump the version first and re-tag.

---

## Tauri updater signing (private key + CI)

You **cannot “retrieve”** a Tauri signing private key from anywhere—it is **created once** with the Tauri CLI. **Do not share the private key** or commit it to git. Only the **public** key (`.pub` file contents) belongs in the repo.

### 1. Generate a keypair (on your computer)

From the **repo root** (with dev dependencies installed):

```bash
npm ci
```

Pick a path **outside the repo** (recommended) so you never commit the key:

**macOS / Linux**

```bash
mkdir -p ~/.tauri
npx tauri signer generate -w ~/.tauri/dice-express.key
```

**Windows (PowerShell)**

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.tauri" | Out-Null
npx tauri signer generate -w "$env:USERPROFILE\.tauri\dice-express.key"
```

The CLI will prompt for an optional **password** to encrypt the private key. If you set one, you must also store that password as the `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` GitHub secret (see below).

This creates:

- **Private key file** — e.g. `~/.tauri/dice-express.key` — **secret**; used only for signing builds.
- **Public key file** — same name with `.pub` — e.g. `dice-express.key.pub` — **safe to commit** into `tauri.conf.json`.

Open the `.pub` file in a text editor. It should be a **single base64 line** (Tauri’s `pubkey` field expects that base64 string, not the decoded “untrusted comment…” text). Paste that entire line into `src-tauri/tauri.conf.json` → `plugins.updater.pubkey`.

### 2. Put the public key in the repo

This repo already has `pubkey` and `endpoints` set in `src-tauri/tauri.conf.json`, plus `bundle.createUpdaterArtifacts: true`.

If you rotate keys: set `plugins.updater.pubkey` to the **exact single-line base64 string** from your `.pub` file (open `dice-express.key.pub` in a text editor—it is one long line). Tauri decodes this as base64; do **not** paste the decoded “untrusted comment…” plaintext into `tauri.conf.json` (that causes `Invalid symbol 32` / base64 decode errors).

Commit and push. **Never** commit the `.key` file.

### 3. Add GitHub Actions secrets

Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Name | Value |
|------|--------|
| `TAURI_SIGNING_PRIVATE_KEY` | **Entire contents** of the private key file (`dice-express.key`), as plain text (open in editor, copy all). |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Only if you set a password when generating; otherwise omit. |

The workflow `.github/workflows/release-desktop.yml` passes these into `tauri build` automatically.

**macOS bundle identifier:** Use **`com.dice.express`** in `tauri.conf.json` → `identifier`; it must **not** end with `.app`. Changing the identifier after release creates a **new app identity** on macOS (Keychain / “Open at login” from an older ID may not carry over). See **Bundle identifier (macOS)** earlier in this document.

### 4. Enable updater artifacts in config

In `src-tauri/tauri.conf.json`, under `bundle`, ensure:

```json
"createUpdaterArtifacts": true
```

Then cut a new release tag (version must match `tauri.conf.json`). CI will produce signed updater bundles (e.g. `.tar.gz` on macOS) in addition to installers.

### 5. `latest.json` on each release

The **Release desktop app** workflow runs `scripts/generate-updater-latest.mjs` after collecting all platform bundles and `.sig` files, then uploads **`latest.json`** with the release. No manual step needed once CI is green.

### Summary

| Item | Where it lives |
|------|----------------|
| Private key | Your machine + GitHub secret `TAURI_SIGNING_PRIVATE_KEY` |
| Public key | `tauri.conf.json` → `plugins.updater.pubkey` (in git) |
| Optional password | GitHub secret `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` |

**No one can generate a production key for you in chat**—anything generated outside your machine would be compromised. Generate locally with the commands above.
