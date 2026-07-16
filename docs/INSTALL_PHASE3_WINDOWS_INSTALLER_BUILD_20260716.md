# Install Phase 3 - Windows Installer Build

Date: 2026-07-16

Project: `E:\codex\highlight-studio`

Scope: Windows installer build and verification. No source code, package
configuration, package-lock, custom protocol implementation, SportsLink code,
GitHub Release upload, commit, or push was performed.

## 1. Baseline

| Item | Result |
| --- | --- |
| HEAD | `d83c2b10c400e6e3c3b44e4c0fe8ad9b846800a7` |
| Latest commit | `d83c2b1 chore: include server runtime in electron package` |
| Pre-existing untracked file | `docs/INSTALL_PHASE1_WINDOWS_INSTALLER_SPORTSLINK_LAUNCH_SURVEY_20260716.md` |
| `package-lock.json` | clean before build |
| Push status | not pushed in this phase |

## 2. Build Command

Official package script used:

```powershell
npm.cmd run build
```

Resolved command:

```text
electron-builder --win nsis
```

No new package installation, `npm install`, `npm update`, code signing, publish,
or GitHub Release upload was performed.

## 3. Build Configuration Summary

| Setting | Value |
| --- | --- |
| `main` | `desktop/main.js` |
| `version` | `1.0.0` |
| `build.appId` | `com.sportlink.highlightstudio` |
| `build.productName` | `Highlight Studio` |
| `build.directories.output` | `dist` |
| `build.directories.buildResources` | `build` |
| Windows target | `nsis`, `x64` |
| icon | `build/icon.ico` |
| oneClick | `false` |
| perMachine | `false` |
| desktop shortcut | `true` |
| Start Menu shortcut | `true` |
| signAndEditExecutable | `false` |
| publish provider | GitHub metadata present, not used |
| explicit `asar` | not configured |
| explicit `asarUnpack` | not configured |
| `extraResources` | not configured |

Build file patterns:

```json
[
  "desktop/**/*",
  "public/**/*",
  "server.js",
  "server/**/*",
  "package.json",
  "node_modules/**/*"
]
```

## 4. Static Checks Before Build

| Check | Result |
| --- | --- |
| `node --check server.js` | PASS |
| `node --check server/bootstrap.js` | PASS |
| `node --check desktop/main.js` | PASS |
| `server/**/*.js` syntax check | PASS |
| `npm.cmd run check` | PASS |
| `git diff --check` | PASS |

## 5. Build Result

Build status: **PASS**

electron-builder output:

- packaged platform: `win32`
- architecture: `x64`
- Electron: `31.7.7`
- app output: `dist\win-unpacked`
- NSIS target: `dist\Highlight Studio Setup 1.0.0.exe`
- block map: `dist\Highlight Studio Setup 1.0.0.exe.blockmap`

## 6. Installer Artifact

| Item | Value |
| --- | --- |
| file | `dist\Highlight Studio Setup 1.0.0.exe` |
| full path | `E:\codex\highlight-studio\dist\Highlight Studio Setup 1.0.0.exe` |
| size | `95,087,824` bytes |
| modified | `2026-07-16 14:05:39` |
| SHA-256 | `77ABE77238EFFA9E9CE50D7EC2B6F197ACD8705A64E0DB55DC78BE5EBA5385AE` |

Additional generated metadata:

- `dist\Highlight Studio Setup 1.0.0.exe.blockmap`
- `dist\latest.yml`
- `dist\builder-debug.yml`

Existing older build artifact also remains:

- `dist\Highlight Studio Setup 0.1.0.exe`

It was not created by this phase and was not deleted.

## 7. win-unpacked Artifact

| Item | Value |
| --- | --- |
| directory | `dist\win-unpacked` |
| executable | `dist\win-unpacked\Highlight Studio.exe` |
| executable full path | `E:\codex\highlight-studio\dist\win-unpacked\Highlight Studio.exe` |
| executable size | `180,849,664` bytes |
| executable SHA-256 | `1FA93C3471C11DC8128998C662C705104E4528B98901B61C8A25216ACDA424C5` |
| `resources\app.asar` | present |
| `resources\app.asar` size | `2,239,625` bytes |
| `resources\app.asar.unpacked` | present |

## 8. app.asar Structure Verification

`app.asar` was inspected with the local Electron asar tool.

Confirmed present:

- `\package.json`
- `\server.js`
- `\server\bootstrap.js`
- `\server\shutdown-manager.js`
- `\server\routes\ai-routes.js`
- `\server\routes\legacy-video-routes.js`
- `\server\routes\output-read-routes.js`
- `\server\routes\output-write-routes.js`
- `\server\routes\project-load-routes.js`
- `\server\routes\project-read-routes.js`
- `\server\routes\project-save-routes.js`
- `\server\routes\render-read-routes.js`
- `\server\routes\render-write-routes.js`
- `\server\routes\system-routes.js`
- `\server\routes\template-routes.js`
- `\server\render-executor.js`
- `\server\render-job-store.js`
- `\server\render-job-utils.js`
- `\server\render-queue-controller.js`
- `\server\render-queue-operations.js`
- `\server\ffmpeg-engine.js`
- `\server\legacy-video-renderer.js`
- `\server\upload-middleware.js`
- `\public\index.html`
- `\public\app.js`
- `\public\styles.css`
- `\desktop\main.js`
- `\desktop\preload.js`

Result: **server module omission fixed**.

## 9. FFmpeg Binary Inclusion

Confirmed in unpacked resources:

```text
dist\win-unpacked\resources\app.asar.unpacked\node_modules\@ffmpeg-installer\win32-x64\ffmpeg.exe
```

Size:

```text
64,458,752 bytes
```

No `ffprobe.exe` was found. This is acceptable for the current code because
runtime inspection found no separate `ffprobe` call.

No FFmpeg setting or dependency was changed.

## 10. win-unpacked Runtime Test

Test command shape:

- ran `dist\win-unpacked\Highlight Studio.exe`
- used temporary `HIGHLIGHT_DESKTOP_USER_DATA`
- checked local API on `127.0.0.1:4000`
- closed the app and checked port/process state

Results:

| Check | Result |
| --- | --- |
| app process started | PASS |
| `/api/ping` | PASS: `{ "ok": true, "app": "Highlight Studio", "version": "1.0.0" }` |
| `/api/health` | PASS |
| server bind | `127.0.0.1:4000` LISTENING while app ran |
| `MODULE_NOT_FOUND` | none observed |
| server module missing | none observed |
| FFmpeg path startup error | none observed |
| CloseMainWindow | PASS |
| process exit | PASS |
| remaining Highlight Studio/FFmpeg process | none observed |
| port 4000 after close | no LISTENING, only temporary TIME_WAIT entries |

The health response reported:

```json
{
  "ok": true,
  "app": "Highlight Studio",
  "version": "1.0.0",
  "port": 4000,
  "environment": "development",
  "storageMode": "local",
  "firebase": false,
  "firestore": false
}
```

## 11. NSIS Installer Test

The installer was tested with silent install because interactive UI automation
is not reliable in this environment.

Test install path:

```text
C:\Users\김주현\AppData\Local\Temp\HSInstallPhase3
```

Results before uninstall:

| Check | Result |
| --- | --- |
| installer exit code | `0` |
| installed executable exists | PASS |
| uninstaller exists | PASS |
| desktop shortcut exists | PASS |
| Start Menu shortcut exists | PASS |
| installed app starts | PASS |
| `/api/ping` from installed app | PASS |
| `/api/health` from installed app | PASS |
| app close | PASS |
| uninstall exit code | `0` |
| executable removed after uninstall | PASS |
| uninstaller removed after uninstall | PASS |
| desktop shortcut removed after uninstall | PASS |
| Start Menu shortcut removed after uninstall | PASS |
| remaining Highlight Studio/FFmpeg process | none observed |
| port 4000 after close/uninstall | no LISTENING after wait; temporary TIME_WAIT entries observed |

After uninstall, the empty install directory itself still existed briefly, but
the executable, uninstaller, and shortcuts were removed. The temporary test
install/userData folders were then removed by the test cleanup step.

## 12. Writable Storage

Test runs used temporary `HIGHLIGHT_DESKTOP_USER_DATA` paths:

- `%TEMP%\highlight-studio-install-phase3-userdata`
- `%TEMP%\HSInstallPhase3UserData`
- `%TEMP%\HSInstallPhase3UserData2`

The temporary folders were cleaned after verification.

No existing user `uploads`, `outputs`, `data`, project files, templates, or
package files were intentionally modified.

Packaged Electron default remains:

- install files under install directory;
- writable settings/uploads/outputs/data under Electron `userData`.

## 13. SmartScreen

The installer is unsigned:

- `signAndEditExecutable: false`
- no signing certificate configured

SmartScreen warning was not fully evaluated in this automated silent install
run. It should be expected for broader user installation and documented as a
user-facing notice.

SmartScreen warning itself is not a build failure.

## 14. Custom Protocol Status

Custom protocol implementation was not changed in this phase.

Package metadata already contains the `highlightstudio` scheme, but
`highlightstudio://open` was not used as a PASS/FAIL criterion for this phase.

SportsLink integration was not modified or tested in this phase.

## 15. Problems Found

| Issue | Severity | Notes |
| --- | --- | --- |
| Interactive installer UI not manually clicked | Low | Silent NSIS install was used for automation; UI still needs human confirmation before public rollout |
| SmartScreen not interactively confirmed | Low | Expected for unsigned installer; document for users |
| Old `0.1.0` installer remains in `dist` | Low | Existing artifact not deleted in this phase |
| Health response says `environment: development` | Informational | Existing server health field; no code changed |

No packaged server module omission was found after the Phase 2 package file fix.

## 16. INSTALL PHASE 4 Readiness

INSTALL PHASE 4 can proceed.

Recommended next phase:

- custom protocol `highlightstudio://open` installed-app verification;
- explicit unknown-action rejection/ignore behavior review;
- SportsLink protocol-first launch design remains separate and should not be
  mixed with installer build validation.

## 17. Final Judgment

Final judgment: **PASS with manual UI caveats**

The Windows NSIS installer and `win-unpacked` app were built successfully. The
server module inclusion issue is resolved, the app starts from packaged output,
the local server responds, FFmpeg binary is present, installer silent install
and uninstall succeeded, and no source/package-lock changes were made.

Manual confirmation still recommended before public distribution:

- visible installer UI;
- SmartScreen message;
- installed protocol launch;
- Start Menu/Desktop shortcut behavior in a normal user session.

## 18. Final Verification

Final verification commands:

- `node --check server.js`
- `node --check server/bootstrap.js`
- `node --check desktop/main.js`
- `npm.cmd run check`
- `git diff --check`
- `git status --short`
- `git diff -- package-lock.json`

Results are recorded in the final task report.
