# Install Phase 1 - Windows Installer and SportsLink Launch Survey

Date: 2026-07-16

Projects:

- Highlight Studio: `E:\codex\highlight-studio`
- SportsLink: `E:\codex\sport-link-demo\sport-link-demo`

Scope: survey and documentation only. No source code, package files, installer
configuration, registry state, runtime data, build output, SportsLink button,
commit, or push was changed.

## 1. Current Highlight Studio Electron Runtime Structure

| Item | Current state |
| --- | --- |
| Browser/server command | `npm start` -> `node server.js` |
| Electron command | `npm run electron` -> `electron .` |
| Electron main | `desktop/main.js` |
| Server entrypoint | `server.js` |
| Internal URL | `http://127.0.0.1:4000` |
| Server bind | `127.0.0.1` only |
| App protocol constant | `highlightstudio` |
| Protocol URL currently advertised | `highlightstudio://open` |
| Single-instance guard | `app.requestSingleInstanceLock()` |
| Packaged storage root | `app.getPath("userData")` |
| Development storage root | project root |

Electron flow:

1. `desktop/main.js` reads `package.json` and sets `APP_PORT` from `PORT || 4000`.
2. `APP_URL` is fixed to `http://127.0.0.1:${APP_PORT}`.
3. Optional `HIGHLIGHT_DESKTOP_USER_DATA` overrides Electron `userData`.
4. `app.requestSingleInstanceLock()` prevents duplicate desktop instances.
5. `app.whenReady()` registers the custom protocol, shows splash, starts the
   internal server, waits for `/api/ping`, then creates the main window.
6. `before-quit` calls `serverModule.shutdownServer(...)` and then quits.

The current desktop runtime already has the correct local-only direction:
Electron talks to `127.0.0.1`, not to an external network host.

## 2. Current Package Readiness

Package tooling already present:

| Tool | Status |
| --- | --- |
| `electron-builder` | present in `devDependencies` |
| NSIS target | configured |
| `electron-forge` | not present |
| `electron-packager` | not present |
| Squirrel | not present |
| WiX/MSI | not present |

Build scripts:

| Script | Command |
| --- | --- |
| `build` | `electron-builder --win nsis` |
| `dist` | `electron-builder` |
| `pack` | `electron-builder --dir` |

Current build metadata:

| Field | Value |
| --- | --- |
| version | `1.0.0` |
| appId | `com.sportlink.highlightstudio` |
| productName | `Highlight Studio` |
| build output | `dist` |
| Windows target | NSIS x64 |
| icon | `build/icon.ico` |
| desktop shortcut | enabled |
| Start Menu shortcut | enabled |
| per-machine install | disabled |
| installer UI | assisted install, not one-click |
| publish provider | GitHub Releases, owner `joohyeon1`, repo `highlight-studio` |

Existing build artifacts observed:

- `dist/Highlight Studio Setup 1.0.0.exe`
- `dist/Highlight Studio Setup 0.1.0.exe`
- `dist/win-unpacked/Highlight Studio.exe`
- `dist/win-unpacked/resources/app.asar`
- `dist/win-unpacked/resources/app.asar.unpacked/node_modules/@ffmpeg-installer/...`

No installer build was executed in this phase.

## 3. Installer Tool Options

| Option | Pros | Cons | Fit for v1.0 |
| --- | --- | --- | --- |
| NSIS via electron-builder | Already configured, creates Setup `.exe`, shortcuts, uninstall entry, protocol registration support | Unsigned installer triggers SmartScreen; must fix packaged file list first | Recommended |
| Portable/unpacked directory | Easy to inspect and debug | Not user-friendly, no Start Menu/uninstall/protocol install guarantees | Useful for QA only |
| MSI/WiX | Enterprise-friendly | Not configured; more setup and signing complexity | Not recommended for v1.0 |
| Squirrel | Auto-update friendly | Not configured; different installer model | Not recommended |
| electron-forge/packager | Alternative packaging ecosystem | New dependency and reconfiguration needed | Not recommended |

Recommended v1.0 installer format: NSIS Setup `.exe` from electron-builder.

Suggested artifact name for the next implementation phase:

`Highlight-Studio-Setup-1.0.0.exe`

Current electron-builder default artifact appears to be:

`Highlight Studio Setup 1.0.0.exe`

If a hyphenated artifact name is required, add `artifactName` in a later
package edit phase.

## 4. Critical Packaged Path Risk

Current `package.json` build `files` list includes:

- `desktop/**/*`
- `public/**/*`
- `server.js`
- `package.json`
- `node_modules/**/*`

It does **not** explicitly include:

- `server/**/*`

This is the highest-priority packaging risk. `server.js` now requires
`./server/bootstrap` and `./server/shutdown-manager`, and bootstrap requires many
modules under `server/`. A freshly packaged app can fail at startup if
`server/**/*` is not included in `app.asar`.

Recommended INSTALL PHASE 2 minimum fix:

- add `server/**/*` to `build.files`;
- rebuild unpacked and Setup artifacts;
- verify `dist/win-unpacked/resources/app.asar` contains the `server/` tree or
  that the app starts successfully from `dist/win-unpacked/Highlight Studio.exe`.

No package file was modified in this survey.

## 5. FFmpeg Packaging Survey

Current FFmpeg structure:

- Dependency: `@ffmpeg-installer/ffmpeg`.
- Runtime resolver: `server/ffmpeg-engine.js`.
- Resolver first tries `require("@ffmpeg-installer/ffmpeg").path`.
- Fallback path is system command `ffmpeg`.
- FFmpeg is spawned with `windowsHide: true`.
- Encoder detection uses `ffmpeg -encoders`.
- There is no separate `ffprobe` dependency or runtime call currently observed.

Packaging options:

| Option | Pros | Cons | Current code impact |
| --- | --- | --- | --- |
| Use user's system FFmpeg | Smaller installer; external updates | User must install FFmpeg; PATH and support burden | Already fallback only |
| Bundle `@ffmpeg-installer/ffmpeg` | Stable out-of-box render; no external install | Larger installer; license notice needed | Already configured dependency |

Recommended v1.0 FFmpeg approach:

- Bundle `@ffmpeg-installer/ffmpeg`.
- Keep system FFmpeg fallback.
- Verify packaged app can execute the bundled binary.
- Consider explicit electron-builder `asarUnpack` for FFmpeg binaries if a fresh
  package test fails.

Observed previous build output already contains an unpacked ffmpeg binary under
`app.asar.unpacked`, but the next build must still be verified because the
server module include list currently has a separate risk.

License note:

- FFmpeg distribution has license obligations. Release docs should include a
  third-party notice or installer README reference before broad public release.

## 6. Writable Storage Design

Current Electron defaults:

| Runtime | Storage root |
| --- | --- |
| Development | project root |
| Packaged | `app.getPath("userData")` |

Current desktop settings set:

- `HIGHLIGHT_OUTPUT_DIR = settings.outputDir`
- `HIGHLIGHT_UPLOAD_DIR = settings.tempDir`
- `HIGHLIGHT_DATA_DIR = settings.dataDir`
- `HIGHLIGHT_BACKUP_LIMIT = settings.backupLimit`

Server fallback paths when run directly:

- uploads: `<project>/uploads`
- outputs: `<project>/outputs`
- data: `<project>/data`

Packaged app recommendation:

- Keep writable files under Electron `userData`.
- Do not write to the install directory.
- Keep uploads/temp, outputs, data, backups, settings, and logs separated under
  userData.

## 7. Custom Protocol Survey

Current Highlight Studio protocol support:

- `APP_PROTOCOL = "highlightstudio"`
- `registerAppProtocol()` calls `app.setAsDefaultProtocolClient(...)`.
- Development mode uses `process.execPath` and `process.argv[1]`.
- Packaged mode calls `app.setAsDefaultProtocolClient(APP_PROTOCOL)`.
- `second-instance` checks argv for `highlightstudio://`.
- `open-url` handles macOS-style protocol callback.
- `focusMainWindowFromProtocol()` restores/focuses the existing window and loads
  `APP_URL`.

Electron-builder also includes:

```json
"protocols": [
  {
    "name": "Highlight Studio",
    "schemes": ["highlightstudio"]
  }
]
```

Recommended initial allowed action:

- `highlightstudio://open`

Do not add data-bearing actions in v1.0. Avoid passing project paths, photo
paths, tokens, sessions, academy IDs, or student IDs in the URL.

`highlightstudio://new-project` can be considered later, but initial protocol
scope should stay at "launch/focus only".

## 8. Single-instance Design

Current behavior:

- A second Electron instance is rejected by `requestSingleInstanceLock()`.
- If the second argv contains a Highlight Studio protocol URL, it logs the event.
- The existing main window is restored/focused and reloaded to the local URL.

This is suitable for v1.0. The installer protocol should launch the existing
window instead of creating a second server process.

## 9. SportsLink Current Highlight Studio Connection

Current active bridge:

- File: `js/ai-highlight-engine.js`
- Loaded by:
  - `app.html`
  - `dashboard.html`
  - `owner.html`
- Host screen:
  - `main#aiCenter`
  - `#slAiCenterPanel-highlight`
- Button handler:
  - `.sl-ai-highlight-studio-open`
  - calls `launchHighlightStudio()`

Current config values in `js/ai-highlight-engine.js`:

- `LOCAL_URL = "http://localhost:4000"`
- `DEPLOY_URL = "https://highlight.sportlink.kr"`
- `APP_PROTOCOL = "highlightstudio://open"`
- `PING_API = "/api/ping"`

Config override lookup:

- `window.SPORT_LINK_CONFIG.highlightStudioUrl`
- `window.SL_CONFIG.highlightStudioUrl`
- `window.CONFIG.highlightStudioUrl`
- mode equivalents under the same objects

Current launch behavior:

- `launchHighlightStudio()` calls `openHighlightStudio()`.
- `openHighlightStudio()` opens `CONFIG.highlightStudioUrl` with
  `window.open(url, "_blank", "noopener,noreferrer")`.
- `tryOpenHighlightStudioProtocol()` exists and sets `window.location.href` to
  `highlightstudio://open`, but it is not currently the default launch path.
- `checkHighlightStudio()` exists and checks `CONFIG.pingUrl`, but it is not
  currently used in the default click flow.

Current SportsLink status:

- It is already a link-only bridge.
- It does not copy Highlight Studio generation code.
- It does not run FFmpeg from SportsLink for this launch path.
- It does not send photos, project data, student data, or tokens to Highlight
  Studio.

## 10. SportsLink Launch UX Recommendation

Recommended sequence for Windows desktop:

1. User clicks "Highlight Studio" in SportsLink.
2. SportsLink attempts `highlightstudio://open`.
3. SportsLink waits briefly.
4. SportsLink checks `http://localhost:4000/api/ping` or
   `http://127.0.0.1:4000/api/ping`.
5. If ping succeeds, open `http://127.0.0.1:4000` or show "already running".
6. If ping fails, show install/download guidance.

Among the requested options, recommended order:

**B. Protocol launch -> wait -> localhost open/check**

Reason:

- protocol is how installed Windows apps should launch;
- localhost only works if the app/server is already running;
- browsers cannot reliably tell whether a custom protocol succeeded, so the
  follow-up ping is the practical confirmation step.

Development mode can keep the current direct localhost button as a fallback.

## 11. Not-installed Fallback Design

Browser custom protocol failure detection is inherently limited. A safe fallback
should be explicit and time-based:

1. Try `highlightstudio://open`.
2. Start a timer, for example 1-2 seconds.
3. Try `/api/ping` on localhost.
4. If ping fails, show:
   - "Highlight Studio is not running or not installed."
   - "Install Highlight Studio for Windows."
   - "If already installed, open it from Start Menu and try again."
   - download button to release URL.

Do not pass SportsLink user/session information in the fallback link.

## 12. Mobile and Tablet Handling

Mobile/tablet constraints:

- Windows Electron app cannot launch on Android/iOS.
- `highlightstudio://open` is a Windows desktop flow.
- Mobile browsers may show confusing unsupported-protocol behavior.

Recommended UX:

- Detect mobile/tablet by user agent and viewport only for UI guidance.
- Show "PC Windows program" notice.
- Show install/download information or "Use this on a Windows PC".
- Do not attempt automatic protocol launch on mobile by default.

## 13. Installer Distribution Location

Options:

| Location | Pros | Cons | Recommendation |
| --- | --- | --- | --- |
| GitHub Releases | Versioned, works with electron-builder publish, easy rollback | Public repo/release management, unsigned warning remains | Recommended for v1.0 |
| SportsLink static `/downloads` | Fully controlled app UX | Large binary in SportsLink deploy, storage/bandwidth burden | Not recommended initially |
| Separate download server | Flexible | Extra ops/cost | Later only |
| Render static asset | Simple if small | Installer size and bandwidth constraints | Not recommended |
| GitHub raw URL | Simple link | Poor release/version UX | Avoid |

Recommended v1.0:

- Publish installer in GitHub Releases.
- SportsLink stores only the download URL and version metadata.
- SportsLink should not bundle the installer binary.

## 14. Auto-update Recommendation

Current state:

- `desktop/main.js` has a TODO to connect electron-updater later.
- `/api/update/check` exposes environment-driven version/update URL metadata.
- `electron-updater` is not installed.

Recommendation:

**A for v1.0, C for v1.1**

- v1.0: manual download/update via GitHub Releases.
- v1.1: add automatic updater after code signing and release process are stable.

Reason:

- unsigned auto-updates are a poor user trust story;
- auto-update introduces signing, channel, rollback, and failure handling work;
- current update check endpoint can already show update/download guidance.

## 15. SmartScreen and Code Signing

Current package config:

- `signAndEditExecutable: false`
- no certificate configuration observed.

Expected user impact:

- Windows SmartScreen may show an unknown publisher warning.
- Users may need to click "More info" -> "Run anyway".

v1.0 recommendation:

- Do not purchase/sign in this survey phase.
- Document unsigned installer warning in the user guide/release notes.
- For wider deployment, evaluate OV or EV code signing certificate later.

## 16. Security Limits

Recommended v1.0 integration limits:

- Protocol action: launch/focus only.
- Allowed URL: `highlightstudio://open`.
- No file paths in protocol URL.
- No student IDs, academy IDs, sessions, JWTs, or tokens in protocol URL.
- No photo/project paths in protocol URL.
- Highlight Studio server remains bound to `127.0.0.1`.
- SportsLink does not call local render/upload APIs directly.
- SportsLink provides only a launch/download guide.

Security notes:

- Validate protocol URLs by scheme and action.
- Ignore unknown actions.
- Do not construct shell commands from protocol input.
- Keep local file opening inside Highlight Studio's existing safe output APIs.

## 17. Expected Minimal File Changes by Phase

### INSTALL PHASE 2 - packaged path and writable storage stabilization

Expected files:

- `package.json`
- possibly `README.md` or installer docs

Likely changes:

- add `server/**/*` to `build.files`;
- optionally add explicit `asarUnpack` for FFmpeg binary paths if fresh build
  proves it is needed;
- verify packaged userData paths.

### INSTALL PHASE 3 - Windows installer settings

Expected files:

- `package.json`
- `build/icon.ico` only if icon replacement is needed
- docs

Likely changes:

- artifact name;
- installer naming;
- publisher metadata if available;
- verify shortcuts/uninstall.

### INSTALL PHASE 4 - protocol registration and single-instance hardening

Expected files:

- `desktop/main.js`
- docs

Likely changes:

- strictly allow only `highlightstudio://open`;
- ignore or warn on unknown protocol actions;
- improve development protocol test notes.

### INSTALL PHASE 5 - actual build and install verification

Expected files:

- build artifacts under `dist/`
- release notes/checklist docs

Likely actions:

- run `npm.cmd run build`;
- install on Windows;
- verify Start Menu, desktop shortcut, uninstall entry, protocol, local server,
  shutdown, FFmpeg render.

### SPORTSLINK INTEGRATION PHASE 1 - launch survey to protocol flow

Expected files:

- `js/ai-highlight-engine.js`
- maybe `css/ai-highlight-engine.css`
- maybe app/dashboard/owner cache query strings

Likely changes:

- protocol-first launch flow;
- ping confirmation;
- no data transfer.

### SPORTSLINK INTEGRATION PHASE 2 - not-installed fallback/download UI

Expected files:

- `js/ai-highlight-engine.js`
- `css/ai-highlight-engine.css`
- optional config file if SportsLink central config is introduced

Likely changes:

- release download URL;
- install help panel;
- failure messaging.

### SPORTSLINK INTEGRATION PHASE 3 - PC/mobile split

Expected files:

- `js/ai-highlight-engine.js`
- `css/ai-highlight-engine.css`

Likely changes:

- mobile/tablet notice;
- Windows-only launch button behavior.

## 18. v1.0 Installer Feasibility

Feasibility: possible, but not ready to ship from the current config without at
least one packaging fix.

Blocking packaging risk:

- `server/**/*` is missing from electron-builder `files`.

Non-blocking but important:

- confirm FFmpeg binary execution from packaged app;
- document unsigned SmartScreen warning;
- confirm protocol registration from installed app, not only development mode;
- verify installer shortcut and uninstall entries.

## 19. Final Recommendation

Proceed in this order:

1. INSTALL PHASE 2: fix package file inclusion for `server/**/*` and verify
   packaged path/userData behavior.
2. INSTALL PHASE 3: finalize NSIS artifact name and installer metadata.
3. INSTALL PHASE 4: harden protocol handling to launch/focus only.
4. INSTALL PHASE 5: build real installer and run install/uninstall/protocol
   regression.
5. SPORTSLINK INTEGRATION PHASE 1: switch SportsLink launch button to
   protocol-first plus ping confirmation.
6. SPORTSLINK INTEGRATION PHASE 2: add not-installed fallback and GitHub
   Releases download URL.
7. SPORTSLINK INTEGRATION PHASE 3: add mobile/tablet guidance.

Do not move video generation logic into SportsLink. Keep Highlight Studio fully
separate and local-PC rendered.

## 20. Verification

Commands requested for this survey:

Highlight Studio:

- `node --check server.js`
- `node --check server/bootstrap.js`
- `node --check desktop/main.js`
- `npm.cmd run check`
- `git diff --check`
- `git status --short`

SportsLink:

- `npm.cmd run check`
- `npm.cmd run smoke`
- `git diff --check`
- `git status --short`

Results are reported in the final task response.
