# STABILITY PHASE 4A Shutdown Flow Survey

## Baseline

- Branch: `main`
- Latest commit: `411345a`
- `server.js`: `71` lines
- `server/bootstrap.js`: `503` lines
- Bootstrap Factory extraction is complete.
- Scope: survey only. No source code changes.

## 1. Node Direct Execution Shutdown Flow

### Startup

`server.js` direct execution path:

1. `loadLocalEnv()` runs.
2. `PORT`, `LOCAL_BIND_HOST`, `APP_VERSION`, and `ROOT_DIR` are defined.
3. `createApplication({ rootDir, appVersion, port })` builds the Express application and services.
4. `startServer(PORT)` is called only when `require.main === module`.
5. `startServer()` calls:

```js
const server = app.listen(port, LOCAL_BIND_HOST, () => {
  console.log(...);
  logStartupEncoderDetection();
});
```

6. The HTTP server instance is returned from `startServer()`.

### Shutdown

Current direct Node behavior:

- No `process.on("SIGINT")` handler in `server.js`.
- No `process.on("SIGTERM")` handler in `server.js`.
- No `process.on("uncaughtException")` handler in `server.js`.
- No `process.on("unhandledRejection")` handler in `server.js`.
- No direct call to `cancelAllRenderJobs()` during Ctrl+C.
- No direct call to `server.close()` during Ctrl+C.

Implications:

- Ctrl+C relies on Node/process termination.
- Active FFmpeg child processes are not explicitly canceled through app logic in direct Node mode.
- Upload cleanup associated with active jobs is not explicitly triggered by direct Node shutdown.
- New requests can be accepted until the process actually terminates.
- The process may end before async cleanup callbacks complete.

## 2. Electron Shutdown Flow

### Startup

`desktop/main.js` server startup flow:

1. `startInternalServer()` reads settings.
2. It sets:
   - `process.env.PORT`
   - `process.env.HIGHLIGHT_OUTPUT_DIR`
   - `process.env.HIGHLIGHT_UPLOAD_DIR`
   - `process.env.HIGHLIGHT_DATA_DIR`
   - `process.env.HIGHLIGHT_BACKUP_LIMIT`
3. It pings `APP_URL`.
4. If an existing Highlight Studio server responds, it sets `ownsInternalServer = false` and does not import `server.js`.
5. Otherwise, it imports `server.js`.
6. It calls `serverModule.startServer(APP_PORT)`.
7. It stores the returned server as `serverInstance`.
8. It sets `ownsInternalServer = true`.
9. It waits for `listening`.

### Quit Path

Current Electron quit flow:

1. `window-all-closed` calls `app.quit()`.
2. Menu quit also calls `app.quit()`.
3. `before-quit` runs.
4. `before-quit` calls:

```js
serverModule?.cancelAllRenderJobs?.("프로그램 종료로 렌더링 취소");
```

5. If Electron owns the internal server, it calls:

```js
serverInstance.close();
```

6. `uncaughtException` and `unhandledRejection` in `desktop/main.js` are logged only. They do not trigger shutdown cleanup.

### Observations

- Electron does not await `serverInstance.close()`.
- Electron does not pass a callback to `serverInstance.close()`.
- Electron does not wait for upload cleanup callbacks.
- Electron does not wait for FFmpeg process exit.
- If an external server is reused, Electron has no local `serverModule`, and therefore cannot call that server's `cancelAllRenderJobs()`.
- Repeated `before-quit` calls are not guarded.

## 3. `cancelAllRenderJobs` Detail

Current location:

- `server/bootstrap.js`

Current implementation:

```js
function cancelAllRenderJobs(reason = "프로그램 종료") {
  for (const job of getRenderJobs().values()) {
    if (["completed", "failed", "canceled"].includes(job.status)) continue;
    job.canceled = true;
    pushJobLog(job, reason);
    updateJob(job, { status: "canceled", completedAt: new Date().toISOString() });
    if (job.currentProcess) {
      try {
        job.currentProcess.kill("SIGTERM");
      } catch (_) {}
    }
    for (const file of job.files || []) fs.rm(file.path, { force: true }, () => {});
  }
  getRenderQueue().splice(0);
  clearActiveRenderJobId();
}
```

### Terminal / Non-terminal Judgment

Terminal statuses skipped:

- `completed`
- `failed`
- `canceled`

Every other job is treated as non-terminal and canceled.

### Queued Job Handling

For queued jobs:

- `job.canceled = true`
- log is appended
- status is updated to `canceled`
- uploaded files are removed asynchronously through callback-style `fs.rm`
- queue is later cleared with `getRenderQueue().splice(0)`

### Active Job Handling

For active jobs:

- `job.canceled = true`
- status is updated to `canceled`
- if `job.currentProcess` exists, `SIGTERM` is sent
- uploaded files are removed asynchronously
- active id is cleared after the loop

### `cancelRequested`

There is no separate `cancelRequested` field. The current flag is:

- `job.canceled`

### Return and Async Behavior

- Return value: `undefined`
- Function type: synchronous
- Does not return a Promise
- Does not await `fs.rm`
- Does not await FFmpeg child process close
- Does not wait for `server.close`
- Does not schedule job cleanup
- Does not clear existing `scheduleJobCleanup` timers

### Multiple Calls

Multiple calls are mostly tolerated because terminal jobs are skipped and the queue is cleared in place. However:

- Duplicate `SIGTERM` can happen if a job is non-terminal and `job.currentProcess` persists.
- Duplicate upload cleanup calls can be scheduled.
- There is no explicit guard to prevent repeated shutdown work.

### Queue Controller Interaction

`processRenderQueue()` uses `.finally(() => { clearActiveRenderJobId(); processRenderQueue(); })`.

Potential interaction:

- `cancelAllRenderJobs()` clears active id and queue.
- If an active render promise later settles, the controller `finally` calls `processRenderQueue()`.
- Because the queue is cleared, the next call should normally do nothing.
- If a new job is enqueued during shutdown, there is no global shutdown flag to prevent it from running.

## 4. HTTP Server Close Analysis

Current use:

- `server.js startServer()` returns the HTTP server instance.
- Electron stores it as `serverInstance`.
- Electron calls `serverInstance.close()` without callback.

Current gaps:

- No Promise wrapper.
- No callback logging.
- No timeout fallback.
- No keep-alive handling.
- No repeated-close guard.
- Direct Node mode does not retain the returned server for signal shutdown.

Node behavior considerations:

- `server.close()` stops accepting new connections and waits for existing connections to close.
- Calling `server.close()` on an already closed server can produce callback errors or throw depending on timing and state if not guarded.
- Without a callback or Promise, Electron may exit before close completion is observed.

## 5. Duplicate Shutdown Risk

### Electron `before-quit` multiple firing

Risk:

- `cancelAllRenderJobs()` can run multiple times.
- `serverInstance.close()` can be called multiple times.

Current mitigation:

- None explicit.

### Node signals repeated

Current direct Node:

- No signal handlers, so no app-level duplicate handling exists.

Future risk:

- Adding signal handlers without a guard could run cancel/close multiple times.

### FFmpeg `SIGTERM` duplicate

Current routes:

- cancel route can kill active `job.currentProcess`.
- `cancelAllRenderJobs()` can also kill active `job.currentProcess`.
- FFmpeg timeout logic can also kill child process.

Current mitigation:

- `try/catch` around kill calls.
- `runFfmpeg` clears `job.currentProcess` on `error` or `close`.

### Queue Controller `finally`

Risk:

- Shutdown clears queue and active id while active render is settling.
- Controller `finally` calls `processRenderQueue()` again.
- Without `isShuttingDown`, a newly enqueued job during shutdown could start.

### Shutdown-time route requests

Risk:

- Until HTTP server close begins, write routes can accept new work.
- There is no middleware rejecting requests during shutdown.

## 6. Async Cleanup Analysis

Cleanup mechanisms:

- `cancelAllRenderJobs()` uses callback-style `fs.rm` for uploaded files.
- queued cancel route uses callback-style `fs.rm`.
- queue controller catch uses `cleanupUploadedFiles`, which also uses callback-style `fs.rm`.
- render executor and legacy renderer use callback-style cleanup in `finally`.
- terminal job cleanup uses `setTimeout` and deletes job records after 30 minutes.

Current behavior:

- Cleanup is fire-and-forget.
- Cleanup errors are ignored.
- Shutdown does not wait for cleanup completion.
- Electron quit is not delayed for cleanup.

Possible leftover files:

- uploaded temp files if the process exits before `fs.rm` callbacks complete
- render work directories if executor cleanup has not run yet
- partially written output files if FFmpeg is killed during output creation

This phase does not change cleanup behavior.

## 7. Shutdown Manager Options

### A. Minimal Guard Only

Add:

- `isShuttingDown`
- guard around existing cancel/close calls

Risk:

- Low to medium

Pros:

- Smallest behavioral change.
- Prevents duplicate shutdown work.

Cons:

- Does not solve direct Node signal handling unless signal listeners are also added.
- Does not wait for HTTP close or cleanup.

Recommendation:

- Good first implementation if scope is very conservative.

### B. `server/shutdown-manager.js`

Role:

- single shutdown entrypoint
- cancel render jobs
- close HTTP server
- duplicate guard
- optional Node signal wiring
- shared Electron/direct Node path

Risk:

- Medium

Pros:

- Creates a real lifecycle boundary.
- Can preserve `cancelAllRenderJobs` as a wrapper.
- Makes future timeout/async cleanup easier.

Cons:

- Requires careful public API design.
- May touch `server.js`, `server/bootstrap.js`, and `desktop/main.js`.

Recommendation:

- Best long-term structure, but implement in a minimal first pass.

### C. Bootstrap Internal Shutdown Function

Return from `createApplication()`:

```js
{
  app,
  cancelAllRenderJobs,
  shutdown
}
```

Risk:

- Medium

Pros:

- Keeps lifecycle close to app/service composition.
- Avoids an extra module initially.

Cons:

- Can make `bootstrap.js` grow into a lifecycle manager.
- Less clear separation than a shutdown manager file.

Recommendation:

- Acceptable if the first implementation only returns a guarded function, but not ideal long-term.

### D. Keep Node and Electron Separate

Risk:

- Low immediate, medium long-term

Pros:

- No cross-environment behavior change.

Cons:

- Direct Node remains less safe.
- Duplicate cleanup/close risks remain.
- Future shutdown fixes get scattered.

Recommendation:

- Not recommended as the next stability step.

## 8. Public API Compatibility

Current `server.js` exports:

- `app`
- `startServer`
- `cancelAllRenderJobs`
- `PORT`
- `UPLOAD_DIR`
- `OUTPUT_DIR`

Compatibility requirement:

- Keep `startServer`.
- Keep `cancelAllRenderJobs`.
- If a new shutdown function is added, add it without removing existing exports.
- Electron can be updated later to call the new function, but `cancelAllRenderJobs` should remain a wrapper/compat API.

Potential new export:

- `shutdownServer` or `shutdown`

Electron impact:

- Minimal first pass can preserve `desktop/main.js`.
- A stronger pass would update Electron `before-quit` to call the new shutdown entrypoint.

## 9. Recommended Minimum Implementation Scope

Recommended next implementation: **B-lite: a minimal Shutdown Manager module**.

Include:

1. Add `server/shutdown-manager.js`.
2. Provide a guarded shutdown function.
3. Keep `cancelAllRenderJobs` behavior unchanged or call the existing function internally.
4. Add HTTP server close Promise/callback handling in the new shutdown function.
5. Preserve existing `cancelAllRenderJobs` export.
6. Add direct Node `SIGINT` and `SIGTERM` only if the shutdown function can be proven idempotent.
7. Avoid changing cleanup semantics in the first pass.

Do not include in the first implementation:

- cleanup Promise conversion
- force-kill timeout
- keep-alive socket tracking
- shutdown-time request rejection middleware
- queue controller changes
- FFmpeg engine changes
- Electron behavior rewrite

Why:

- Duplicate shutdown is the clearest current risk.
- HTTP server close observation is useful and low-risk.
- Cleanup semantics are broader and should be separated.

## 10. Expected Change Files

Likely files for the next implementation:

- `server.js`
- `server/bootstrap.js`
- `server/shutdown-manager.js`
- `docs/STABILITY_PHASE4B_SHUTDOWN_MANAGER_20260716.md`

Possible but defer if not required:

- `desktop/main.js`

## 11. Risks

- Changing Electron quit timing accidentally.
- Calling `server.close()` twice.
- Starting shutdown while queue controller `finally` is still running.
- Allowing enqueue during shutdown.
- Waiting too long for child processes or cleanup and making app quit feel stuck.
- Breaking `server.js` direct run behavior.
- Removing or changing existing exports used by Electron.

## 12. Verification Plan

For the next implementation:

Static:

- `node --check server.js`
- `node --check server/bootstrap.js`
- `node --check server/shutdown-manager.js`
- full `server/**/*.js`
- `desktop/main.js`
- `desktop/preload.js`
- `public/app.js`
- `npm.cmd run check`
- `git diff --check`

Runtime:

- `npm start`
- GET `/api/health`
- stop with Ctrl+C
- confirm no port `4000` LISTENING
- Electron start
- Electron quit
- confirm no Electron process and no port `4000` LISTENING

Safety:

- no real render POST
- no upload POST
- no cancel POST unless a stubbed in-memory job test is used
- no FFmpeg render
- no user data changes

## 13. Modification-Prohibited Areas for This Survey

This survey phase did not modify:

- `server.js`
- `server/bootstrap.js`
- `desktop/main.js`
- queue/executor/FFmpeg internals
- routes
- package files
- user data

Only this document was created.
