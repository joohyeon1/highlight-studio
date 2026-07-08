# Highlight Studio Download Guide

Highlight Studio is a Windows desktop program for creating and editing highlight videos. It processes video work on the user's PC.

Photos and videos are not stored in SportsLink. SportsLink only opens Highlight Studio.

## Windows Installation

1. Download `Highlight Studio Setup 1.0.0.exe`.
2. Run the installer.
3. Follow the Windows setup steps.
4. Launch `Highlight Studio.exe` from the desktop shortcut or Start menu.

The installer is generated locally with:

```powershell
npm run dist
```

Generated files are placed in:

```text
dist/
```

Typical output:

```text
dist/Highlight Studio Setup 1.0.0.exe
dist/win-unpacked/Highlight Studio.exe
```

For v1.0 distribution, share the installer from the dist/ folder or attach it to a release channel when ready.

## Development Run

Use this mode while developing or testing locally:

```powershell
cd E:\codex\highlight-studio
npm install
npm start
```

Open:

```text
http://localhost:4000
```

## Installed App Run

After installation, run:

```text
Highlight Studio.exe
```

The app starts the local Highlight Studio server internally, then opens the editor window.

## SportsLink Launch

SportsLink has a `Highlight Studio 실행` button.

The button only launches Highlight Studio:

1. It tries `highlightstudio://open`.
2. It checks `http://localhost:4000/api/ping`.
3. If Highlight Studio is running, it opens `http://localhost:4000`.
4. If not running, it shows a guide to start the installed app or run `npm start`.

SportsLink does not send photos, student data, videos, or project files to Highlight Studio.

## Troubleshooting

### The app does not start

Restart Highlight Studio. During development, check:

```powershell
npm start
npm run electron
```

### `localhost:4000` does not open

Check whether another program is using port `4000`. Close the other program, then run Highlight Studio again.

### `highlightstudio://open` does not respond

Install or reinstall Highlight Studio so Windows can register the `highlightstudio` protocol. During development, run:

```powershell
npm run electron
```

### FFmpeg error

Highlight Studio renders videos locally. Confirm FFmpeg is available and check the render log shown in the app.

### GPU acceleration fails

If GPU encoding is unavailable or fails, Highlight Studio falls back to CPU rendering.

## Privacy And Storage

Highlight Studio is independent from SportsLink.

- No Firestore
- No Firebase
- No SportsLink DB storage
- No long-term server storage
- Local PC rendering
- Temporary local `uploads/` and `outputs/` folders only
