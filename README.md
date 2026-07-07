# Highlight Studio

Highlight Studio is an independent video creation and editing app for Taekwondo academies. It is separated from SportsLink. SportsLink only opens Highlight Studio by URL and does not store videos or run rendering logic.

## Current Status

Implemented through STEP 10 final check and stabilization.

- Photo upload and browser-memory photo management
- Student tagging and filtering
- Timeline editing
- Per-photo effects
- Per-scene transitions
- Scene captions
- Project save/load as `.hsp`
- Output settings
- Storyboard and recommendation structure
- FFmpeg MP4 rendering
- Render progress, logs, cancel, and queue
- Output preview, download, list, and delete
- Share link copy, Kakao share preparation, Band share URL
- Local login, license status, and update check structure
- Deployment preparation for `https://highlight.sportlink.kr`

## Local Run

Highlight Studio must run through the Express server. Do not open
`public/index.html` directly with `file://`, because `/api/*`, uploads,
outputs, FFmpeg rendering, and download routes require `server.js`.

```powershell
cd E:\codex\highlight-studio
npm install
npm start
```

Open:

```text
http://localhost:4000
```

PowerShell note:

```powershell
npm.cmd install
npm.cmd start
```

Use `npm.cmd` if `npm.ps1` is blocked by the Windows execution policy.

## Environment

See `.env.example`.

Important values:

```text
PORT=4000
APP_URL=https://highlight.sportlink.kr
LOCAL_APP_URL=http://localhost:4000
KAKAO_JS_KEY=
LICENSE_MODE=local
```

## Storage Policy

Highlight Studio currently uses local temporary folders only.

- `uploads/`: temporary uploaded images
- `outputs/`: temporary generated MP4 files
- No Firestore
- No Firebase
- No external DB
- No long-term server storage

Generated files may disappear after server restart, redeploy, or cleanup. This is expected for the current stage.

## API

Health:

```text
GET /api/health
GET /health
```

Auth and license:

```text
POST /api/auth/login
POST /api/auth/logout
GET /api/license/status
GET /api/update/check
```

Rendering:

```text
POST /api/render
GET /api/render/status/:jobId
GET /api/render/queue
POST /api/render/cancel/:jobId
```

Outputs:

```text
GET /api/outputs
GET /api/outputs/:filename/share-info
GET /api/outputs/:filename/download
DELETE /api/outputs/:filename
```

Legacy compatibility:

```text
POST /api/videos
```

## Security Checks

- Output download/delete only accepts `.mp4` files in `outputs/`.
- Path traversal attempts are rejected.
- Uploads are handled by Multer into `uploads/`.
- Login data is local-development only.
- Passwords are not logged.
- SportsLink code is not copied into this app.
- Highlight Studio rendering code is not copied into SportsLink.

## SportsLink Integration

SportsLink opens Highlight Studio as an external app only:

```js
window.open(url, "_blank", "noopener,noreferrer");
```

Development URL:

```text
http://localhost:4000
```

Production URL:

```text
https://highlight.sportlink.kr
```

## Deployment

See `README_DEPLOY.md`.

Summary:

- Build command: `npm install`
- Start command: `npm start`
- Health check: `GET /api/health`
- Runtime: Node.js 20 or later
- Domain: `highlight.sportlink.kr`

## Windows Desktop App

The Electron desktop app wraps the existing Express server. Users do not need
to open a browser manually: the desktop shell starts the local server, waits for
it to become ready, then opens `http://localhost:4000` inside the Electron
window.

Development server:

```powershell
cd E:\codex\highlight-studio
npm install
npm start
```

Open:

```text
http://localhost:4000
```

Desktop development:

```powershell
npm run electron
```

Windows installer build:

```powershell
npm run dist
```

Generated files:

```text
dist/Highlight Studio Setup 0.1.0.exe
dist/win-unpacked/Highlight Studio.exe
```

Installer distribution:

- Run `npm run dist` to create the Windows installer.
- Share the installer from the `dist/` folder.
- The installer file is named like `Highlight Studio Setup 0.1.0.exe`.
- The unpacked executable is available at `dist/win-unpacked/Highlight Studio.exe`.
- GitHub Releases upload is planned for the next step; this repository does not upload installers automatically yet.

Installed app run:

```text
Highlight Studio.exe
```

SportsLink launch:

- SportsLink only provides a Highlight Studio launch button.
- The button first tries `highlightstudio://open`.
- If the installed app is not available, it checks `http://localhost:4000/api/ping`.
- During development, run `npm start` and open `http://localhost:4000`.
- SportsLink does not receive photos, videos, project files, or student data.

Desktop behavior:

- Starts the internal Express server on `localhost:4000`.
- Reuses an already running Highlight Studio local server when `/api/ping` responds.
- Opens the main Highlight Studio screen inside Electron.
- Stops the internal server when the app exits.
- Prepares the custom protocol `highlightstudio://open`.
- If the app is already running, a protocol open request focuses the existing window.
- Prevents duplicate desktop instances with Electron's single instance lock.
- Shows a startup guide if the local server cannot start or port `4000` is blocked.

Packaged builds use local AppData folders for uploads, outputs, settings, and logs.
Photos and videos are still processed locally; no Firestore, Firebase, or long-term
server storage is used.

Custom protocol:

```text
highlightstudio://open
```

The protocol is prepared for Windows installer builds. When called while the app
is running, the existing Highlight Studio window is focused. When called after
installation, Windows can launch the registered app and open the local editor.

Auto update:

- Actual auto-update server integration is not enabled yet.
- The build metadata is prepared for future GitHub Releases publishing.
- `electron-updater` can be connected in a later step when the release channel is ready.

## Final Check Notes

Verified in STEP 10:

- `npm.cmd install`
- `npm.cmd start`
- `/api/health`
- Render job completion
- Share info generation
- Output list
- License status
- Update check
- Download/delete path traversal rejection

## Next Steps

- Deploy to Render or the selected Node hosting provider.
- Connect DNS for `highlight.sportlink.kr`.
- Verify rendering on the deployed server.
- Add real Kakao SDK integration after the public URL is live.
- Add real license server integration in a later step.
- Add long-term object storage only when a separate storage policy is approved.
