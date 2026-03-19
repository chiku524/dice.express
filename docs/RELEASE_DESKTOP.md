# Desktop app release (Tauri)

The desktop app is built for **Windows**, **macOS** (Intel + Apple Silicon), and **Linux** via GitHub Actions. Direct download links on the [Download](/download) page point to the release assets.

## Required: GitHub PAT secret

The workflow needs a **Personal Access Token (PAT)** to create releases and upload installers.

1. **Add the secret**
   - Go to **GitHub → your repo → Settings → Secrets and variables → Actions**
   - Click **New repository secret**
   - **Name:** `GH_TOKEN`
   - **Value:** your GitHub PAT (with `repo` scope, or at least permission to write release assets)

2. **If you ever shared the PAT** (e.g. in chat or email), **rotate it**:
   - GitHub → **Settings → Developer settings → Personal access tokens**
   - Revoke the old token and generate a new one
   - Add the new token as `GH_TOKEN` in the repo secrets (step 1)

To set the secret from the command line (you’ll be prompted for the value):

```bash
gh secret set GH_TOKEN
```

## How to release

- **Option A – Manual run**  
  **Actions** tab → **Release desktop app** → **Run workflow**. The workflow uses the version from `package.json` and creates/updates a release with that tag (e.g. `v1.0.0`).

- **Option B – Tag push**  
  Bump the version in `package.json` and `src-tauri/tauri.conf.json`, commit, then create and push a tag:
  ```bash
  git tag v1.0.1
  git push origin v1.0.1
  ```
  The workflow runs and builds for all platforms, then creates the release `v1.0.1` with the installers attached.

After the run finishes, the [Download](/download) page links will work for the new version (update `DESKTOP_APP_VERSION` in `frontend/src/constants/downloads.js` when you bump the version).

## Artifacts produced

| Platform   | Files |
|-----------|--------|
| Windows   | `dice.express_<version>_x64-setup.exe`, `dice.express_<version>_x64_en-US.msi` |
| macOS     | `dice.express_<version>_aarch64.dmg` (Apple Silicon), `dice.express_<version>_x64.dmg` (Intel) |
| Linux     | `dice.express_<version>_amd64.AppImage`, `dice.express_<version>_amd64.deb` |

Direct download URL pattern:  
`https://github.com/chiku524/dice.express/releases/download/v<version>/<filename>`
