# Tauri updater signing (private key + CI)

You **cannot “retrieve”** a Tauri signing private key from anywhere—it is **created once** with the Tauri CLI. **Do not share the private key** or commit it to git. Only the **public** key (`.pub` file contents) belongs in the repo.

## 1. Generate a keypair (on your computer)

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

Open the `.pub` file in a text editor. It is a **single line** (minisign public key). You will paste that entire line into `src-tauri/tauri.conf.json` → `plugins.updater.pubkey`.

## 2. Put the public key in the repo

This repo already has `pubkey` and `endpoints` set in `src-tauri/tauri.conf.json`, plus `bundle.createUpdaterArtifacts: true`.

If you rotate keys: replace `plugins.updater.pubkey` with the **full text** of your new `.pub` file (two lines: `untrusted comment:...` and the `RWR...` line), as a JSON string with `\n` between lines.

Commit and push. **Never** commit the `.key` file.

## 3. Add GitHub Actions secrets

Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Name | Value |
|------|--------|
| `TAURI_SIGNING_PRIVATE_KEY` | **Entire contents** of the private key file (`dice-express.key`), as plain text (open in editor, copy all). |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Only if you set a password when generating; otherwise omit. |

The workflow `.github/workflows/release-desktop.yml` passes these into `tauri build` automatically.

## 4. Enable updater artifacts in config

In `src-tauri/tauri.conf.json`, under `bundle`, add:

```json
"createUpdaterArtifacts": true
```

Then cut a new release tag (version must match `tauri.conf.json`). CI will produce signed updater bundles (e.g. `.tar.gz` on macOS) in addition to installers.

## 5. `latest.json` on each release

The **Release desktop app** workflow (`.github/workflows/release-desktop.yml`) runs `scripts/generate-updater-latest.mjs` after collecting all platform bundles and `.sig` files, then uploads **`latest.json`** with the release. No manual step needed once CI is green.

## Summary

| Item | Where it lives |
|------|----------------|
| Private key | Your machine + GitHub secret `TAURI_SIGNING_PRIVATE_KEY` |
| Public key | `tauri.conf.json` → `plugins.updater.pubkey` (in git) |
| Optional password | GitHub secret `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` |

**I (or any AI) cannot generate a production key for you**—anything generated in chat would be compromised. Generate locally with the commands above.
