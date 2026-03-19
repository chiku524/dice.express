# dice.express Desktop (Tauri 2)

The desktop app opens with a **frameless splash window** (intro animation), then transitions to the **main window** (with title bar) on the sign-in screen.

## Development

From repo root:

```bash
npm run tauri:dev
```

This starts the frontend dev server and opens two windows: the splash (frameless, 420×320) and the main (hidden until splash finishes). After ~2.2s the splash closes and the main window shows at `/sign-in`.

## Build

From repo root:

```bash
npm run tauri:build
```

Output: `src-tauri/target/release/` (and installer in `target/release/bundle/`).

## Icons

Icons are in `src-tauri/icons/`. To regenerate from a new image:

```bash
npx tauri icon path/to/1024x1024.png
```

## Splash flow

1. App starts → splash window visible (frameless), main window hidden.
2. Splash loads `/splashscreen` (React route) and runs a short animation.
3. Frontend calls `close_splash_and_show_main` when done (or `set_splash_complete` with task `frontend`); backend also signals when a minimal setup is done.
4. Splash closes, main window is shown and focused at `/sign-in`.
