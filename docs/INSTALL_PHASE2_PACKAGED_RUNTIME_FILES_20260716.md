# Install Phase 2 - Packaged Runtime Files Configuration

Date: 2026-07-16

Project: `E:\codex\highlight-studio`

Scope: minimal electron-builder runtime file inclusion change. No installer
build, package install, protocol change, FFmpeg change, Electron code change,
server code change, SportsLink change, or push was performed.

## 1. Pre-change Package State

Current `package.json` runtime and build summary:

| Item | Value |
| --- | --- |
| `main` | `desktop/main.js` |
| `version` | `1.0.0` |
| `scripts.start` | `node server.js` |
| `scripts.electron` | `electron .` |
| `scripts.build` | `electron-builder --win nsis` |
| `scripts.pack` | `electron-builder --dir` |
| Electron builder target | Windows NSIS x64 |
| `asar` setting | not explicitly configured |
| `asarUnpack` setting | not explicitly configured |
| `extraResources` | not configured |

Pre-change `build.files`:

```json
[
  "desktop/**/*",
  "public/**/*",
  "server.js",
  "package.json",
  "node_modules/**/*"
]
```

## 2. Missing Runtime Risk

The current server entrypoint is thin:

```text
server.js
-> ./server/bootstrap
-> ./server/shutdown-manager
```

`server/bootstrap.js` then requires route, helper, render, queue, FFmpeg, upload,
template, project, output, AI, and legacy renderer modules under `server/`.

Because `build.files` included `server.js` but not `server/**/*`, a packaged app
could include the entrypoint while omitting the module tree it requires.

This is the same risk identified in Install Phase 1.

## 3. Packaged Runtime Files Required

Required application runtime files:

- `desktop/**/*`
- `public/**/*`
- `server.js`
- `server/**/*`
- `package.json`
- production dependencies from `node_modules`

The currently active server module tree includes:

- `server/bootstrap.js`
- `server/shutdown-manager.js`
- `server/routes/**/*`
- `server/ai-local-rules.js`
- `server/default-templates.js`
- `server/ffmpeg-engine.js`
- `server/legacy-video-renderer.js`
- `server/license-helpers.js`
- `server/output-helpers.js`
- `server/project-helpers.js`
- `server/render-executor.js`
- `server/render-job-store.js`
- `server/render-job-utils.js`
- `server/render-queue-controller.js`
- `server/render-queue-operations.js`
- `server/template-helpers.js`
- `server/upload-file-helpers.js`
- `server/upload-middleware.js`

## 4. Minimal Package Change

Changed only `package.json`:

```diff
 "files": [
   "desktop/**/*",
   "public/**/*",
   "server.js",
+  "server/**/*",
   "package.json",
   "node_modules/**/*"
 ]
```

No existing file pattern was removed.

## 5. Included Directories

The packaged app should now include:

| Directory/file | Reason |
| --- | --- |
| `desktop/**/*` | Electron main/preload runtime |
| `public/**/*` | Browser UI assets served by Express |
| `server.js` | Node/Express entrypoint |
| `server/**/*` | Bootstrap, shutdown, routes, helpers, render services |
| `package.json` | App metadata and version |
| `node_modules/**/*` | Runtime dependencies, including Electron-packaged modules and FFmpeg dependency |

No docs pattern was added.

## 6. Explicitly Excluded User Data

The installer package must not include user/runtime data:

- existing user uploads;
- existing user outputs;
- projects;
- autosave;
- backups;
- logs;
- temporary render files;
- Git metadata;
- development archives/backups;
- generated build caches;
- local `.env`;
- user templates/data JSON.

Current `.gitignore` already excludes:

- `uploads/*`
- `outputs/*`
- `dist/`
- `release/`
- `.electron-cache/`
- `.electron-builder-cache/`
- `data/*.json`
- `data/backups/`

Writable data remains governed by the existing Electron `userData` policy. This
phase did not change storage code.

## 7. package-lock.json

No package was installed or updated.

`package-lock.json` was not modified.

## 8. FFmpeg Configuration

No FFmpeg code or packaging configuration was changed.

Current behavior remains:

- `@ffmpeg-installer/ffmpeg` is a dependency;
- `server/ffmpeg-engine.js` resolves the bundled dependency first;
- system `ffmpeg` remains fallback;
- no explicit `asarUnpack` was added in this phase.

Packaged FFmpeg execution still must be verified in a later build phase.

## 9. Custom Protocol

No protocol setting was added or changed.

Existing package metadata still includes:

```json
"protocols": [
  {
    "name": "Highlight Studio",
    "schemes": ["highlightstudio"]
  }
]
```

Protocol behavior is reserved for a later install phase.

## 10. Installer Build

No installer or packaged app build was executed in this phase.

Specifically, these commands were not run:

- `npm.cmd run build`
- `npm.cmd run dist`
- `npm.cmd run pack`
- `electron-builder`

## 11. Runtime Inclusion Verification

Static inspection confirms that all modules required from `server.js` through
`server/bootstrap.js` are now covered by the `server/**/*` file pattern.

Coverage now includes:

- server bootstrap and shutdown manager;
- route modules;
- helper modules;
- render job store/utilities/queue operations/controller;
- render executor;
- FFmpeg engine;
- legacy renderer;
- upload middleware.

No runtime server module remains outside `server/**/*`.

## 12. Next INSTALL PHASE 3 Readiness

This phase clears the first packaging blocker.

Recommended next step:

1. Run an unpacked package build in a dedicated build phase.
2. Verify `dist/win-unpacked/Highlight Studio.exe` starts.
3. Verify `/api/ping` and main window load.
4. Verify FFmpeg encoder detection from the packaged app.
5. Only after unpacked validation, build the NSIS Setup `.exe`.

## 13. Final Assessment

Verdict: **PASS for packaged runtime file configuration**

The missing server module inclusion risk is addressed by adding only
`server/**/*` to electron-builder `build.files`.

Remaining work:

- actual packaged build;
- packaged FFmpeg verification;
- installer shortcut/uninstall/protocol verification;
- SmartScreen/signing documentation.

## 14. Verification

Requested verification commands were run after the change:

- `node --check server.js`
- `node --check server/bootstrap.js`
- `node --check desktop/main.js`
- full `server/**/*.js` syntax check
- `npm.cmd run check`
- `git diff --check`
- `git diff -- package.json`
- `git status --short`
- `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('package.json JSON PASS')"`

Results are recorded in the final task report.
