# STABILITY PHASE 4B - Minimal Shutdown Manager

## Scope

This phase adds a minimal shutdown manager for Highlight Studio without changing render queue execution, FFmpeg behavior, route responses, or cleanup semantics.

## Changed Files

- `server/shutdown-manager.js`
- `server.js`
- `desktop/main.js`
- `docs/STABILITY_PHASE4A_SHUTDOWN_FLOW_SURVEY_20260716.md`
- `docs/STABILITY_PHASE4B_MINIMAL_SHUTDOWN_MANAGER_20260716.md`

## New Shutdown Manager

`server/shutdown-manager.js` exports:

- `createShutdownManager(dependencies)`

The created manager returns:

- `shutdownServer(server, reason)`
- `isShuttingDown()`

Dependencies:

- `cancelAllRenderJobs`
- optional `logger`

The manager keeps one `shutdownPromise` as the duplicate shutdown guard. Repeated calls return the same Promise and do not call `cancelAllRenderJobs` or `server.close()` again.

## cancelAllRenderJobs Connection

`server.js` creates the shutdown manager with the existing `cancelAllRenderJobs` function from `createApplication()`.

The existing `cancelAllRenderJobs` implementation was not modified.

The manager calls:

```js
cancelAllRenderJobs(reason);
```

No render queue, job store, job utility, FFmpeg engine, executor, route, or cleanup helper was changed.

## HTTP Server Close Handling

`shutdownServer(server, reason)` observes HTTP server shutdown with a Promise around `server.close()`.

Behavior:

- no server: resolves
- server without `close`: resolves
- already not listening: resolves
- successful `server.close()`: resolves
- `ERR_SERVER_NOT_RUNNING`: resolves
- other close error: rejects

No force timeout, socket tracking, or keep-alive destruction was added in this phase.

## Node Direct Execution

`server.js` still owns direct execution through:

```js
if (require.main === module) {
  const serverInstance = startServer(PORT);
  ...
}
```

Added signal handlers:

- `SIGINT`
- `SIGTERM`

Both call the same `shutdownServer(serverInstance, signal)` path.

Existing exports remain available:

- `startServer`
- `cancelAllRenderJobs`

New exports:

- `shutdownServer`
- `isShuttingDown`

## Electron Integration

`desktop/main.js` now routes `before-quit` through `serverModule.shutdownServer` when available.

The Electron shutdown path uses:

- `allowQuit`
- `quitInProgress`
- `event.preventDefault()`
- `serverModule.shutdownServer(ownsInternalServer ? serverInstance : null, "electron-before-quit")`
- `app.quit()` after the Promise settles

This keeps one shutdown path shared with direct Node execution.

The previous direct `cancelAllRenderJobs` plus `serverInstance.close()` call was replaced by the shared shutdown API.

## Async Cleanup Boundary

This phase does not change async cleanup behavior inside render jobs.

`cancelAllRenderJobs` is still called as the existing synchronous cancellation entry point. Upload/temp cleanup Promise handling was not expanded, awaited, or refactored.

Deferred items:

- cleanup Promise waiting
- force shutdown timeout
- keep-alive socket tracking
- shutdown-time request rejection
- automated UI close verification

## Stub Verification

Memory-only shutdown manager stub checks:

- duplicate shutdown calls returned the same Promise
- `cancelAllRenderJobs` called once
- `server.close()` called once
- no-server shutdown resolved
- close failure rejected
- duplicate failure path reused the same Promise

Observed output:

```text
samePromise true
{"cancelCount":1,"closeCount":1,"isShuttingDown":true}
{"nullCancel":1}
sameFailurePromise true
{"failedCancel":1,"error":"close boom"}
```

## Node Signal Verification

`node server.js` started successfully and bound to `127.0.0.1:4000`.

`Ctrl+C` triggered the shutdown manager path:

```text
Highlight Studio shutdown started: SIGINT
Highlight Studio shutdown completed
```

After exit, port 4000 had no `LISTENING` entry.

## Electron Verification

Electron was started with a temporary userData folder:

```powershell
$env:HIGHLIGHT_DESKTOP_USER_DATA="$env:TEMP\highlight-studio-4b-electron-userdata"
npm.cmd run electron
```

Observed:

- Electron process started
- internal Highlight Studio server started
- `127.0.0.1:4000` was available
- no GPU fatal error
- no renderer launch-failed error

Terminal SIGINT stopped the Electron process. The UI-driven `before-quit` path is wired in code but was not fully verified by interactive window close tooling in this phase.

The temporary userData folder was removed after verification.

## API Regression

Read-only and non-file-changing APIs were checked:

- `GET /api/health`
- `GET /api/render/encoders`
- `GET /api/render/queue`
- `GET /api/render/status/__missing__`
- `GET /api/templates`
- `GET /api/outputs`
- `GET /api/project/recent`
- `GET /api/license/status`
- `POST /api/ai/analyze-photos` with fixed JSON payload

No render POST, videos POST, upload, cancel, or state-changing project API was called.

## Static Verification

Passed:

- `node --check server.js`
- `node --check server/shutdown-manager.js`
- `node --check server/bootstrap.js`
- `node --check desktop/main.js`
- `node --check desktop/preload.js`
- `node --check public/app.js`
- full `server/**/*.js` syntax check
- `npm.cmd run check`
- `git diff --check`

## User Data Integrity

No user uploads, outputs, projects, backups, templates, package files, or lock files were modified.

Verified manifests remained unchanged:

- `uploads`
- `outputs`
- `data`
- `data/templates.json`
- `package.json`
- `package-lock.json`

## Server Line Count

Node `Get-Content` line count:

- before: 71 lines
- after: 89 lines

The increase is from adding shutdown manager wiring and direct-run signal handlers.

## Remaining Risk

- Electron UI close path was connected but not fully manually verified through a visible close interaction in this phase.
- `cancelAllRenderJobs` remains synchronous and does not wait for async cleanup.
- No force close timeout is present for long-lived HTTP keep-alive connections.
- Shutdown does not block new requests during the closing window.

## Next Step

Recommended next phase:

- verify Electron visible close path manually
- then consider a small cleanup-waiting phase only if render/upload temp files are proven to remain after cancellation
