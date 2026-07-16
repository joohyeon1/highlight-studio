# INSTALL PHASE 4 - Custom Protocol & Single Instance

Date: 2026-07-16

## 1. Baseline

- Branch: main
- Starting commit: d83c2b1
- Previous installer: `dist/Highlight Studio Setup 1.0.0.exe`
- Previous known installer result: INSTALL PHASE 3 PASS
- Existing untracked docs before this phase:
  - `docs/INSTALL_PHASE1_WINDOWS_INSTALLER_SPORTSLINK_LAUNCH_SURVEY_20260716.md`
  - `docs/INSTALL_PHASE3_WINDOWS_INSTALLER_BUILD_20260716.md`

## 2. Investigation Summary

- `package.json` already had electron-builder protocol metadata for `highlightstudio`.
- `desktop/main.js` already had `app.setAsDefaultProtocolClient`, `app.requestSingleInstanceLock`, `second-instance`, and `open-url` handling.
- Existing URL validation accepted any `highlightstudio://...` value by scheme prefix.
- Existing focus handling restored minimized windows but did not explicitly show hidden windows.
- `before-quit` still routes through the shutdown manager.
- SportsLink files were not inspected or modified.

## 3. Pre-change Protocol Status

- Protocol metadata existed in `package.json`.
- Installed protocol registry was found stale during verification:
  - `HKCU\Software\Classes\highlightstudio\shell\open\command`
  - pointed to an older temporary Phase 3 install path.
- Before installer fix, direct `highlightstudio://open` launch failed with the stale registry.
- Running the app once refreshed the protocol via `app.setAsDefaultProtocolClient`, but direct post-install protocol launch still needed installer-level protection.

## 4. Desktop Changes

Changed file:

- `desktop/main.js`

Changes:

- Added strict protocol parsing.
- Allowed only:
  - `highlightstudio://open`
  - `highlightstudio:open`
- Rejected or ignored:
  - unsupported actions such as `highlightstudio://delete`
  - query strings such as `highlightstudio://open?file=C:\test`
  - hashes
  - non-highlightstudio schemes
  - malformed values
- Added `mainWindow.show()` before focusing an existing window.
- Kept the existing server startup, BrowserWindow creation, and shutdown flow unchanged.

## 5. Installer Changes

Changed files:

- `package.json`
- `build/installer.nsh`

Reason:

- Real install testing showed that electron-builder protocol metadata alone did not repair a stale `highlightstudio` registry entry from an older temporary install.
- A minimal NSIS include was required to set and remove the Windows protocol registration reliably.

NSIS behavior:

- Install writes:
  - `HKCU\Software\Classes\highlightstudio`
  - `HKCU\Software\Classes\highlightstudio\shell\open\command`
- Uninstall deletes:
  - `HKCU\Software\Classes\highlightstudio`

No server, render, FFmpeg, queue, or SportsLink code was changed.

## 6. Allowed Protocol Action

Allowed action:

- `open`

Allowed URL forms:

- `highlightstudio://open`
- `highlightstudio:open`

The action only restores/shows/focuses the existing app window or starts the app through Windows protocol registration.

## 7. Rejected Protocol Inputs

The app ignores unsupported protocol payloads and never passes protocol text to a shell.

Rejected examples:

- `highlightstudio://delete`
- `highlightstudio://open?file=C:\test`
- `highlightstudio://open?token=abc`
- `http://example.com`
- `file://C:/test`

No arbitrary file path, token, external URL, command, photo, video, or student data is accepted through the protocol.

## 8. Single Instance Behavior

- Existing `app.requestSingleInstanceLock()` remains in place.
- A second app launch focuses the existing window.
- Valid protocol second-instance requests are logged as protocol opens.
- Invalid protocol launches do not execute any action.
- Verification showed one port 4000 listener during repeated protocol launches.

## 9. BrowserWindow Behavior

When a protocol request is handled and the main window exists:

- minimized windows are restored
- hidden windows are shown
- the main window is focused
- the local app URL remains `http://127.0.0.1:4000`

## 10. Server Duplication Prevention

- Single-instance lock prevents duplicate Electron main processes from starting a second server.
- Repeated `highlightstudio://open` while running kept only one `127.0.0.1:4000` listener.
- No duplicate server bind was observed.

## 11. Shutdown Compatibility

- `before-quit` remains unchanged.
- `shutdownServer` remains the shutdown path.
- Render job cancellation and HTTP close are still handled by the existing shutdown manager.
- Protocol handling does not bypass shutdown.

## 12. Package Configuration

`package.json` changes:

- Added `build.nsis.include`: `build/installer.nsh`

Unchanged:

- appId
- productName
- version
- build target
- installer artifact name
- FFmpeg configuration
- server runtime file inclusion
- `package-lock.json`

## 13. Rebuild Result

Command:

```text
npm.cmd run build
```

Result:

- PASS

Installer:

- Path: `E:\codex\highlight-studio\dist\Highlight Studio Setup 1.0.0.exe`
- Size: 95,088,203 bytes
- SHA-256: `9A539EDB1D5D89971C4AF3246C72F25F0F214239F9DE7947E9AA09E60E9A55E9`

## 14. Protocol Install Verification

Test install path:

- `%TEMP%\HSInstallPhase4`

Results:

- Installer exit: 0
- Installed exe: PASS
- Desktop shortcut: PASS
- Start menu shortcut: PASS
- Registry after install: PASS
- Registry command path: current Phase 4 install path

The installer overwrote the stale protocol command with:

```text
"%TEMP%\HSInstallPhase4\Highlight Studio.exe" "%1"
```

## 15. Protocol Launch Verification

Closed app:

- `highlightstudio://open`
- `/api/ping`: PASS
- `/api/health`: PASS
- port 4000 listeners: 1

Already running:

- second `highlightstudio://open`
- `/api/ping`: PASS
- port 4000 listeners: 1
- duplicate server: none observed

Invalid action:

- `highlightstudio://delete`
- app remained responsive
- port 4000 listeners: 1
- no delete action executed

Query injection:

- `highlightstudio://open?file=C:\test`
- app remained responsive
- port 4000 listeners: 1
- no file was opened
- no shell command was executed

## 16. Uninstall Verification

Results:

- Uninstaller exit: 0
- Installed exe removed: PASS
- Desktop shortcut removed: PASS
- Start menu shortcut removed: PASS
- `HKCU\Software\Classes\highlightstudio` removed: PASS
- `highlightstudio://open` after uninstall did not start the app
- port 4000 listeners after uninstall protocol attempt: 0

## 17. User Data Handling

- Disposable userData path used where possible:
  - `%TEMP%\highlight-studio-phase4-protocol-userdata`
- Test userData was removed after verification.
- Test install directory was removed after verification.
- No uploads, outputs, projects, templates, or user media were modified.

## 18. Static Verification

Commands:

```text
node --check desktop/main.js
node --check server.js
node --check server/bootstrap.js
server/**/*.js syntax check
npm.cmd run check
git diff --check
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"
git diff -- package-lock.json
```

Results:

- PASS
- `git diff --check` showed CRLF warnings only.
- `package-lock.json` unchanged.

## 19. SportsLink Impact

- SportsLink was not modified.
- No SportsLink launch integration was added in this phase.
- This phase only prepares Highlight Studio to accept Windows protocol launches.

## 20. Files Changed

- `desktop/main.js`
- `package.json`
- `build/installer.nsh`
- `docs/INSTALL_PHASE4_CUSTOM_PROTOCOL_SINGLE_INSTANCE_20260716.md`

## 21. INSTALL PHASE 5 Readiness

Ready for the next phase:

- SportsLink can be updated later to launch `highlightstudio://open`.
- The Highlight Studio side now has protocol registration, strict action filtering, single-instance focus, and uninstall cleanup.

## 22. Final Judgment

INSTALL PHASE 4: PASS

The rebuilt installer registers `highlightstudio://open`, repairs stale protocol registry entries, removes protocol registration on uninstall, and repeated protocol launches do not create a duplicate server.
