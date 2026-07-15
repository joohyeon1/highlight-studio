# STRUCTURE PHASE 1-25A Bootstrap and Shutdown Survey

## Baseline

- Branch: `main`
- Latest commit: `f3d5c2b`
- `server.js` line count: `527`
- Scope: survey only
- Source changes: none

## 1. Remaining `server.js` Responsibilities

| Lines | Responsibility | Dependencies | Notes |
| --- | --- | --- | --- |
| 1-107 | Imports | Node core, Express, extracted helpers/services/routes | `server.js` is still the composition root. |
| 109-124 | Environment load and constants | `.env`, `process.env`, paths, app version, render constants | `loadLocalEnv()` is called before the function declaration; safe because function declarations are hoisted. |
| 125-141 | Project helper import and FFmpeg engine creation | `project-helpers`, `createFfmpegEngine`, `pushJobLog` | FFmpeg engine is created before render job utils are configured, but only stores the `pushJobLog` function reference. |
| 142-149 | Project module-scope state | `projectAutosave`, `recentProjects` | Still intentionally local to `server.js`. Accessors are passed to read routes. |
| 150-154 | Render job store/utils configuration | `RENDER_ENCODERS`, `getRenderJob`, `deleteRenderJob` | Must happen before route/controller use. |
| 156-159 | Directory initialization | uploads, outputs, data, backups | Synchronous `mkdirSync` on module load. |
| 161 | Express app creation | `express()` | App is exported. |
| 163-177 | Local env loader helper | `fs`, `path`, `process.env` | Runs once at module load. |
| 179-183 | License middleware stub | Express request lifecycle | Still in `server.js`. |
| 185-212 | Shared local helpers | `crypto`, `spawn`, `path` | `safeName`, `makeId`, `openLocalPath` remain common helpers. |
| 214-222 | Upload middleware and cleanup helper | `createUploadMiddleware`, `fs.rm` | Upload middleware is shared by render and legacy video routes. |
| 224-235 | Startup encoder logging | `detectRenderEncoders` | Called after listen callback; async result is logged only. |
| 237-245 | Legacy/output path helpers | `path`, `safeName` | Used by legacy renderer and output write routes. |
| 247-255 | Legacy renderer factory | `createLegacyVideoRenderer`, FFmpeg engine, path helpers | Creates single `createVideoFromPhotos` instance. |
| 257-320 | Project write/load support helpers | `project-helpers`, `recentProjects`, `projectAutosave`, `BACKUP_DIR`, `fs` | Save/load/backup write state still lives here. |
| 322-340 | Render executor factory | `createRenderExecutor`, FFmpeg engine, job utils, render constants | Creates single `createRenderFromProject` instance. |
| 342-359 | Queue controller and operations wiring | job store, job utils, executor, cleanup | Controller must exist before queue operations are configured. |
| 361-368 | Middleware/static and `/health` | Express, license gate, output/static paths | Static middleware precedes API route registration in current code. |
| 370-470 | Route registration | extracted route modules and inline auth logout/output open-folder routes | Route order is explicit and should be preserved. |
| 472-487 | Shutdown helper | render job store, job utils, FFmpeg child process refs, uploads cleanup | `cancelAllRenderJobs` remains exported for Electron. |
| 489-491 | Express error middleware | Express error flow | Registered after routes. |
| 493-514 | `startServer` | `app.listen`, local bind host, startup logging | Returns HTTP server instance. |
| 516-527 | Direct-run gate and module exports | `require.main`, Electron/tests | Public API currently: `app`, `startServer`, `cancelAllRenderJobs`, `PORT`, `UPLOAD_DIR`, `OUTPUT_DIR`. |

## 2. Initialization Order

Actual `server.js` order:

1. Import Node, Express, helpers, services, and routes.
2. Call `loadLocalEnv()`.
3. Define constants: `PORT`, `LOCAL_BIND_HOST`, `APP_VERSION`, root/public/upload/output/data/backup dirs, render constants.
4. Load `DEFAULT_TEMPLATES` and project helpers.
5. Create FFmpeg engine with `{ pushJobLog }`.
6. Destructure FFmpeg engine functions and encoder state.
7. Initialize project state: `projectAutosave`, `recentProjects`, accessors.
8. Configure render job store with `RENDER_ENCODERS`.
9. Configure render job utils with `getRenderJob` and `deleteRenderJob`.
10. Ensure upload/output/data/backup directories exist.
11. Create Express app.
12. Define local helper functions and middleware helpers.
13. Create upload middleware.
14. Create legacy video renderer.
15. Define project payload/summary/recent/backup helpers.
16. Create render executor.
17. Create render queue controller.
18. Configure render queue operations with `processRenderQueue`.
19. Register license gate, JSON parser, `/outputs` static, and public static middleware.
20. Register `/health`.
21. Register system routes.
22. Register render read routes.
23. Register AI routes.
24. Register project save/load/read routes.
25. Register template routes.
26. Register inline `POST /api/auth/logout`.
27. Register legacy video route.
28. Register render write routes.
29. Register output read routes.
30. Register inline `POST /api/outputs/open-folder`.
31. Register output write routes.
32. Define `cancelAllRenderJobs`.
33. Register Express error middleware.
34. Define `startServer`.
35. If direct execution, call `startServer(PORT)`.
36. Export app/server/shutdown constants.

## 3. Order Dependencies

- `loadLocalEnv()` must run before constants read `process.env`.
- `createFfmpegEngine({ pushJobLog })` relies on the hoisted `pushJobLog` import binding, not on runtime configuration.
- `configureRenderJobStore({ renderEncoders: RENDER_ENCODERS })` must happen before render read routes expose queue/job encoder labels.
- `configureRenderJobUtils({ getRenderJob, deleteRenderJob })` must happen before `scheduleJobCleanup` is used.
- Directory creation must happen before upload middleware writes, outputs are served, backups are written, or data files are used.
- `createRenderQueueController` must be created before `configureRenderQueueOperations`, because enqueue calls `processRenderQueue`.
- `configureRenderQueueOperations` must run before `/api/render` can enqueue jobs.
- Legacy renderer and render executor both depend on the single FFmpeg engine instance.
- `registerRenderReadRoutes` depends on job store accessors and `detectRenderEncoders`.
- `registerRenderWriteRoutes` depends on upload middleware, job store, queue operations, job utils, and queue controller.
- Static middleware currently precedes API routes. This works because API paths are not static files, but a bootstrap split should preserve the current order unless separately tested.
- Error middleware is after route registration and should remain last among Express middleware.

No 404 fallback route was found in `server.js`.

## 4. Node Shutdown Flow

### Direct `node server.js`

Current direct run path:

1. `require.main === module`
2. `startServer(PORT)`
3. `app.listen(port, "127.0.0.1", callback)`

Current direct shutdown handling:

- No `process.on("SIGINT")` handler in `server.js`
- No `process.on("SIGTERM")` handler in `server.js`
- No `uncaughtException` or `unhandledRejection` handler in `server.js`
- No automatic `cancelAllRenderJobs()` on direct Node shutdown
- HTTP server is not captured by module-level direct-run code for explicit close

Implication:

- Ctrl-C relies on the Node process ending.
- Active FFmpeg child processes may be terminated by process teardown, but `cancelAllRenderJobs` is not explicitly called in direct Node mode.
- A shutdown manager would improve direct mode only if introduced carefully and tested against Electron ownership.

## 5. Electron Shutdown Flow

Relevant `desktop/main.js` flow:

1. `APP_URL` is `http://127.0.0.1:${APP_PORT}`.
2. `startInternalServer()` reads settings and writes env vars:
   - `PORT`
   - `HIGHLIGHT_OUTPUT_DIR`
   - `HIGHLIGHT_UPLOAD_DIR`
   - `HIGHLIGHT_DATA_DIR`
   - `HIGHLIGHT_BACKUP_LIMIT`
3. It pings an existing local server first.
4. If no existing Highlight Studio server responds, it requires `server.js`.
5. It calls `serverModule.startServer(APP_PORT)`.
6. It stores the returned server in `serverInstance`.
7. It sets `ownsInternalServer = true`.
8. It waits for `listening`.
9. `createMainWindow()` loads `APP_URL`.

Electron quit path:

1. `app.on("before-quit")` fires.
2. It calls `serverModule?.cancelAllRenderJobs?.(...)`.
3. If `ownsInternalServer && serverInstance`, it calls `serverInstance.close()`.

Notes:

- If an existing server is reused, `serverModule` is not required and `ownsInternalServer` remains false. Electron will not call `cancelAllRenderJobs` on that external server.
- Electron does not await `serverInstance.close()`.
- Electron does not provide a forced close timeout.
- Duplicate `before-quit` calls could invoke `cancelAllRenderJobs` and `server.close()` more than once; current code relies on those operations being tolerant.

## 6. `cancelAllRenderJobs` Analysis

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

Behavior:

- Iterates over all render jobs in the store.
- Skips terminal jobs: `completed`, `failed`, `canceled`.
- Marks non-terminal jobs with `job.canceled = true`.
- Logs the shutdown reason through `pushJobLog`.
- Updates status to `canceled` and sets `completedAt`.
- Attempts `SIGTERM` for active `job.currentProcess`.
- Removes uploaded files attached to each non-terminal job.
- Clears the queue array in place with `splice(0)`.
- Clears active render job id.

Limitations:

- Synchronous function; it does not await `fs.rm` callbacks.
- It does not call `scheduleJobCleanup`.
- It does not wait for FFmpeg process exit.
- It does not close timers created by `scheduleJobCleanup`.
- It does not guard against duplicate invocation explicitly.
- It does not return a result object.
- It uses direct job mutation plus `updateJob`.

Multiple calls:

- Mostly tolerant because terminal jobs are skipped and the queue is cleared in place.
- A race is still possible if `processRenderQueue` is resolving while shutdown clears active state.

## 7. Current Export Structure

`server.js` exports:

```js
module.exports = {
  app,
  startServer,
  cancelAllRenderJobs,
  PORT,
  UPLOAD_DIR,
  OUTPUT_DIR
};
```

Known consumers:

- `desktop/main.js` uses `startServer` and `cancelAllRenderJobs`.
- `desktop/main.js` relies on the returned HTTP server for `serverInstance.close()`.
- Direct Node execution uses `require.main === module`.

Bootstrap separation must preserve:

- `require("./server.js").startServer(port)`
- `require("./server.js").cancelAllRenderJobs(reason)`
- `require("./server.js").app`
- local loopback binding inside `startServer`
- direct execution behavior

## 8. Split Options

### A. Bootstrap Factory Only

New file example:

- `server/bootstrap.js`

Role:

- Create/configure app
- Initialize services
- Register middleware/routes
- Return `{ app, startServer, cancelAllRenderJobs, constants }`

Risk:

- Medium

Pros:

- Reduces `server.js` substantially.
- Keeps shutdown with the composed app/services.
- Makes `server.js` a thin entrypoint.

Cons:

- Requires moving many dependency wires at once.
- Risk of route order or configure order drift.
- Must carefully preserve module exports.

Expected line reduction:

- `server.js`: roughly 250-330 lines removed
- final `server.js`: roughly 180-260 lines

Recommendation:

- Good next implementation target, but only after a small bootstrap boundary plan.

### B. Application Factory and Server Runner Split

New file examples:

- `server/create-app.js`
- `server/start-server.js`

Role:

- `create-app.js` returns app/services without listening.
- `start-server.js` handles bind/listen/logging/error handling.

Risk:

- Medium-high

Pros:

- Cleaner long-term architecture.
- Testability improves because app construction and server listening are separate.

Cons:

- Larger change set.
- More public API surface.
- Direct run and Electron import behavior need careful validation.

Expected line reduction:

- `server.js`: roughly 320-400 lines removed
- final `server.js`: roughly 120-200 lines

Recommendation:

- Better long-term target, but not the safest immediate step.

### C. Shutdown Manager Separate

New file example:

- `server/shutdown-manager.js`

Role:

- Provide `cancelAllRenderJobs`
- Optionally provide close/signal helpers later

Risk:

- Medium

Pros:

- Focuses on a small remaining responsibility.
- Directly improves Electron/direct mode shutdown clarity.

Cons:

- `cancelAllRenderJobs` depends on render job store, job utils, queue, process refs, and upload cleanup.
- If moved before bootstrap, it adds another dependency wiring block without reducing route/bootstrap complexity much.

Expected line reduction:

- `server.js`: roughly 20-45 lines

Recommendation:

- Survey first if direct Node signal handling or graceful close is to be changed.
- Not the highest-value next implementation.

### D. Bootstrap + Shutdown Together

New files example:

- `server/bootstrap.js`
- `server/shutdown-manager.js`

Risk:

- High

Pros:

- Most complete architectural improvement.

Cons:

- Too many lifecycle responsibilities move at once.
- Electron startup/quit behavior is sensitive.
- Harder to isolate regressions.

Expected line reduction:

- `server.js`: roughly 300-420 lines

Recommendation:

- Do not do this as the next step.

## 9. Realistic Final `server.js` Target

Current: `527` lines.

If only Bootstrap Factory is extracted:

- realistic target: `180-260` lines

If Bootstrap and Server Runner are split:

- realistic target: `120-200` lines

If Shutdown Manager is also split:

- realistic target: `90-160` lines

Recommended practical target:

- `150-220` lines

Reason:

- `server.js` should remain a readable entrypoint that loads env, calls bootstrap, exposes public API, and supports direct execution.
- Pushing below 100 lines may create excessive indirection unless all app construction is intentionally moved to a stable `createApp`/`bootstrap` API.

Responsibility boundary matters more than line count. A good final `server.js` can keep:

- env load
- direct-run guard
- public exports
- `startServer` wrapper or import
- small constants if not better owned elsewhere

## 10. Recommended Next Actual Step

Recommendation: **Baseline first, then Bootstrap Factory extraction.**

Suggested next step:

1. Create a Structure Baseline document for the current split layout.
2. Then extract a single `server/bootstrap.js` that performs existing app/service/route composition and returns the same public handles.

Why:

- The major route/helper/render boundaries are already split.
- The next risk is not one helper but the composition order.
- A baseline gives a stable map before moving the composition root.
- Bootstrap Factory can reduce `server.js` meaningfully while preserving current `startServer` and Electron API.

Do not split Shutdown Manager first unless the next goal is specifically graceful shutdown behavior. Moving shutdown alone has lower payoff and still touches render job/process state.

## 11. Expected Change Files for Bootstrap Factory

Likely files:

- `server.js`
- `server/bootstrap.js`
- `docs/STRUCTURE_PHASE1_25B_BOOTSTRAP_FACTORY_20260716.md`

Possible but avoid if not required:

- `desktop/main.js`
- route modules
- render modules

Expected `server.js` reduction:

- roughly `250-330` lines

## 12. Risk Elements

- Route registration order drift.
- Middleware/static order drift.
- `configureRenderQueueOperations` running before `processRenderQueue` exists.
- Duplicate FFmpeg engine or render executor instances.
- Duplicate upload middleware instances.
- Loss of single render job store state.
- Electron expecting `startServer()` and `cancelAllRenderJobs()` from `server.js`.
- Direct run behavior changing.
- `app.listen` local loopback binding changing.
- `logStartupEncoderDetection()` timing changing.
- Direct Node shutdown behavior accidentally changing without tests.

## 13. Modification Prohibited Areas for Next Implementation

Unless explicitly scoped:

- API method/path/status/response shape
- Render Queue logic
- FFmpeg Engine internals
- Render Executor internals
- Legacy Video Renderer internals
- Electron `desktop/main.js`
- Package files
- User uploads/outputs/data/projects/templates
- New signal handling semantics
- New shutdown timeout behavior

## 14. Survey Validation

Required validation for this survey phase:

- `node --check server.js`
- full `server/**/*.js` syntax check
- `node --check desktop/main.js`
- `node --check desktop/preload.js`
- `node --check public/app.js`
- `npm.cmd run check`
- `git diff --check`
- `git status --short`

Only this document should be untracked after the survey.
