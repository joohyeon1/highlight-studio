# STRUCTURE PHASE 1-25B Bootstrap Factory

## Baseline

- Started from local commit: `ddad75a`
- Baseline message: `docs: establish structure phase 1 baseline`
- Initial branch state after required push: `main...origin/main`
- Baseline `server.js`: `527` lines
- Source working tree before implementation: clean

## Moved Composition Responsibilities

Created:

- `server/bootstrap.js`

Moved into `createApplication(options = {})`:

- Express app creation
- common middleware setup
- static middleware setup
- upload middleware instance creation
- render job store configuration
- render job utilities configuration
- FFmpeg Engine instance creation
- Legacy Video Renderer instance creation
- Render Executor instance creation
- Render Queue Controller instance creation
- Render Queue Operations configuration
- route dependency object wiring
- route registration calls
- remaining app-level inline routes:
  - `GET /health`
  - `POST /api/auth/logout`
  - `POST /api/outputs/open-folder`
- Express error middleware
- current `cancelAllRenderJobs` implementation

The following were not moved:

- `startServer`
- HTTP `listen`
- local loopback binding
- direct-run `require.main === module`
- public `server.js` export shape
- Electron shutdown behavior

## Responsibilities Left in `server.js`

`server.js` now keeps:

- Node core imports needed for local env loading
- `createApplication` import
- `.env` loading
- `PORT`
- `LOCAL_BIND_HOST`
- `APP_VERSION`
- `ROOT_DIR`
- single `createApplication(...)` call
- `startServer(port = PORT)`
- HTTP server `listen`
- startup logging calls
- direct execution branch
- existing public exports:
  - `app`
  - `startServer`
  - `cancelAllRenderJobs`
  - `PORT`
  - `UPLOAD_DIR`
  - `OUTPUT_DIR`

## `bootstrap.js` Export

`server/bootstrap.js` exports:

```js
module.exports = {
  createApplication
};
```

## Bootstrap Return Value

`createApplication()` returns:

```js
{
  app,
  cancelAllRenderJobs,
  logStartupEncoderDetection,
  paths: {
    UPLOAD_DIR,
    OUTPUT_DIR,
    DATA_DIR,
    BACKUP_DIR
  },
  constants: {
    APP_VERSION,
    MAX_PHOTOS,
    PHOTO_SECONDS
  }
}
```

`server.js` uses only:

- `app`
- `cancelAllRenderJobs`
- `logStartupEncoderDetection`
- `paths.UPLOAD_DIR`
- `paths.OUTPUT_DIR`

## Initialization Order

The preserved order is:

1. `server.js` loads `.env`.
2. `server.js` defines `PORT`, `LOCAL_BIND_HOST`, `APP_VERSION`, `ROOT_DIR`.
3. `server.js` calls `createApplication({ rootDir, appVersion, port })`.
4. `bootstrap.js` creates paths and constants from current environment.
5. FFmpeg Engine is created once.
6. Project autosave/recent state is initialized.
7. Render Job Store is configured once.
8. Render Job Utilities are configured once.
9. Upload/output/data/backup directories are ensured.
10. Express app is created once.
11. Upload middleware is created once.
12. Legacy Video Renderer is created once.
13. Project storage helpers remain wired.
14. Render Executor is created once.
15. Render Queue Controller is created once.
16. Render Queue Operations are configured once.
17. Middleware/static registration runs.
18. Routes are registered in the current order.
19. Error middleware is registered.
20. `createApplication()` returns app/services.
21. `server.js` owns `startServer()` and `listen()`.

## Factory and State Singleness

Source checks after extraction:

- Express app instance: one `const app = express()` in `server/bootstrap.js`
- Upload middleware instance: one `createUploadMiddleware(...)`
- FFmpeg Engine instance: one `createFfmpegEngine(...)`
- Render Executor instance: one `createRenderExecutor(...)`
- Legacy Renderer instance: one `createLegacyVideoRenderer(...)`
- Queue Controller instance: one `createRenderQueueController(...)`
- Render Job Store state remains only in `server/render-job-store.js`
- FFmpeg encoder cache remains only inside one `createFfmpegEngine()` instance

No circular require was introduced. `server.js` imports `server/bootstrap.js`; internal modules do not require `server.js`.

## Route Preservation

Route source check:

- `app.*` registrations found: `33`
- API route count excluding `OPTIONS /api/ping` and legacy `/health`: `31`
- Duplicate method/path registrations found by inspection: `0`

Preserved key routes:

- `GET /api/health`
- `GET /api/render/encoders`
- `GET /api/render/queue`
- `GET /api/render/status/:jobId`
- `POST /api/render`
- `POST /api/render/cancel/:jobId`
- `POST /api/videos`
- `GET /api/templates`
- `GET /api/outputs`
- `GET /api/project/recent`
- `GET /api/license/status`

## Static and Fallback Order

Preserved middleware order:

1. `licenseGate`
2. `express.json({ limit: "10mb" })`
3. `/outputs` static middleware
4. public static middleware
5. route registration
6. error middleware

No SPA fallback route exists in the current baseline, so no fallback route was moved or changed.

## `cancelAllRenderJobs` Connection

`cancelAllRenderJobs` is now created inside `createApplication()` because it depends on the composed render job store, job utilities, queue, and upload cleanup helper.

`server.js` re-exports the returned function under the same public name:

```js
const { app, cancelAllRenderJobs, logStartupEncoderDetection, paths } = application;
```

Preserved behavior:

- skips terminal jobs
- marks non-terminal jobs canceled
- logs shutdown reason
- updates status to `canceled`
- kills `job.currentProcess` with `SIGTERM`
- removes uploaded files
- clears queue in place
- clears active render job id

No shutdown manager, async shutdown, signal handler, guard, timeout, or process-kill behavior was added.

## Electron Public API Preservation

`desktop/main.js` can continue to use:

- `serverModule.startServer(APP_PORT)`
- `serverModule.cancelAllRenderJobs(...)`

`server.js` still exports:

- `app`
- `startServer`
- `cancelAllRenderJobs`
- `PORT`
- `UPLOAD_DIR`
- `OUTPUT_DIR`

Electron minimum verification confirmed:

- `npm.cmd run electron` started the app process with temp userData.
- Internal Express server started on `127.0.0.1:4000`.
- Electron process was terminated after startup verification.
- No Electron process remained.
- Port `4000` had no `LISTENING` entry after shutdown.
- The temporary userData folder was removed.

## API Regression Results

Server was started with `node server.js`.

Safe read/API checks:

| Request | Status |
| --- | --- |
| `GET /api/health` | `200` |
| `GET /api/render/encoders` | `200` |
| `GET /api/render/queue` | `200` |
| `GET /api/render/status/__missing__` | `404` |
| `GET /api/templates` | `200` |
| `GET /api/outputs` | `200` |
| `GET /api/project/recent` | `200` |
| `GET /api/license/status` | `200` |
| `POST /api/ai/analyze-photos` fixed JSON payload | `200` |

Dynamic field note:

- `/api/render/encoders.checkedAt` remains dynamic.

No real upload, render, cancel, output write, project write, or FFmpeg render was performed.

## Static Verification Results

Passed:

- `node --check server.js`
- `node --check server/bootstrap.js`
- full `server/**/*.js` syntax check
- `node --check desktop/main.js`
- `node --check desktop/preload.js`
- `node --check public/app.js`
- `npm.cmd run check`
- `git diff --check`

`git diff --check` reported only the existing CRLF warning for `server.js`.

## User Data Protection

No state-changing API was called.

Observed data summary after verification:

- `uploads`: count `1`, size `5`
- `outputs`: count `13`, size `6027534`
- `data`: count `11`, size `26757`

Known unchanged hashes:

- `package.json`: `5849264501847F4A827CD568EDD748FB6BD884F9549613768E52232CE1D6F848`
- `package-lock.json`: `F00887DD1379B9EFF83FAC71C1E0DFE6966E743ABB152879F5BFC13FC867DD2C`
- `data/templates.json`: `38FCBC0FBED94930A76E74A22B43B0D3B1E371668C918082BEBFF8E448614071`

Port cleanup:

- After server and Electron checks, `netstat` showed only `TIME_WAIT` entries for port `4000`.
- No `LISTENING` entry remained.

## Line Counts

Node/PowerShell line count:

- Before `server.js`: `527`
- After `server.js`: `71`
- `server/bootstrap.js`: `503`
- Visual reduction in `server.js`: `456`

`server.js` is now below the original 150-220 line target because `startServer` and exports stayed compact while composition moved to `bootstrap.js`.

## Remaining Shutdown Tasks

Still intentionally not changed:

- direct Node `SIGINT/SIGTERM` graceful shutdown
- async cleanup wait
- duplicate shutdown guard
- shutdown timeout
- wait for FFmpeg process exit
- shutdown manager module

## Next Step Recommendation

Recommended next step:

1. Survey and then extract a Shutdown Manager.

Reason:

- Bootstrap composition is now isolated.
- `server.js` still owns listen/export behavior.
- `cancelAllRenderJobs` remains the next meaningful lifecycle boundary.
- Shutdown changes touch Electron and render process lifecycle, so they should be surveyed separately before implementation.
