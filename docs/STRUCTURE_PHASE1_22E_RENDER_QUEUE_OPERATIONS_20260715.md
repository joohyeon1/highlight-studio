# STRUCTURE PHASE 1-22E Render Queue Operations

## Scope

This phase extracts only the pure render queue operation helpers from `server.js`.
Render queue execution, FFmpeg rendering, GPU fallback, cancel handling, routes, and Electron shutdown behavior remain in `server.js`.

## Moved Functions

| Function | Previous location | New location | Behavior |
| --- | --- | --- | --- |
| `removeQueuedJob` | `server.js` render queue block | `server/render-queue-operations.js` | Finds the first matching queued job by `jobId`, removes it from the original queue array with `splice`, and returns the removed job or `null`. |
| `enqueueRenderJob` | `server.js` render queue block | `server/render-queue-operations.js` | Pushes the job to the original queue array, writes the same queue-position log message, then calls `processRenderQueue()` synchronously. |

## New Module Exports

`server/render-queue-operations.js` exports:

- `configureRenderQueueOperations`
- `removeQueuedJob`
- `enqueueRenderJob`

## Dependency Connection

`server.js` configures the module with the existing single-source dependencies:

- `getRenderQueue`
- `getQueuePosition`
- `pushJobLog`
- `processRenderQueue`

The new module does not require `server.js`, does not create Express state, and does not own any queue execution logic.

## Queue Single Source

The queue remains owned by `server/render-job-store.js`.

`removeQueuedJob` receives the original queue reference through `getRenderQueue()` and mutates that exact array with `splice`. It does not create or mutate a copied queue.

`enqueueRenderJob` receives the same original queue reference through `getRenderQueue()` and appends with `push`, preserving queue insertion order.

## Preserved Enqueue/Remove Behavior

`removeQueuedJob`:

- Keeps the same `jobId` input.
- Keeps first-match removal via `findIndex`.
- Keeps `null` return when no queued job exists.
- Keeps original queue order for remaining jobs.

`enqueueRenderJob`:

- Keeps the same `job` input.
- Keeps push-before-log order.
- Keeps log message: `렌더링 대기열 추가: N번째`.
- Keeps synchronous `processRenderQueue()` call immediately after logging.

## Process Queue Boundary

`processRenderQueue` remains in `server.js`.

It is injected into `server/render-queue-operations.js` only as a callback so the enqueue operation can preserve the existing call point. Active job control, `createRenderFromProject`, completion/failure handling, and queue continuation remain unchanged.

## Excluded Logic

The following areas were not moved or modified:

- `processRenderQueue`
- `scheduleJobCleanup`
- `cancelAllRenderJobs`
- `createRenderFromProject`
- `createVideoFromPhotos`
- `runFfmpeg`
- `detectRenderEncoders`
- `resolveRenderEncoder`
- `POST /api/render`
- `POST /api/videos`
- `POST /api/render/cancel/:jobId`
- active job state control
- `job.currentProcess`
- FFmpeg and GPU fallback
- upload/output cleanup
- Electron shutdown cleanup

## Verification Results

Static checks:

- `node --check server.js`: PASS
- `node --check server/render-queue-operations.js`: PASS
- `node --check server/render-job-store.js`: PASS
- `node --check server/render-job-utils.js`: PASS
- `server/**/*.js` syntax check: PASS
- `node --check desktop/main.js`: PASS
- `node --check desktop/preload.js`: PASS
- `node --check public/app.js`: PASS
- `npm.cmd run check`: PASS
- `git diff --check`: PASS with CRLF normalization warning only

Memory-only function check:

- Enqueue appended jobs to the queue end.
- Enqueue called `processRenderQueue()` once per enqueue.
- Enqueue preserved the Korean queue-position log message.
- Remove deleted the first matching job from the original queue.
- Remove returned `null` for a missing job.

Read-only API regression:

- `GET /api/render/queue`: 200, hash `3f2368a87e1d0fc87b84eb94bbf1770fd1679cdfef720913ad92d20df74e61d7`
- `GET /api/render/status/__missing__`: 404, hash `50263507f7f1067a6b431e9149bc693115520a1b2a794c5264f4ab315c4532a2`
- `GET /api/render/encoders`: 200, normalized hash `75e56298cd92a4f670c26e57dd68a7cebe82b7a570c7d5f2559976fc2d01bc6e`
- `GET /api/health`: 200
- `GET /api/templates`: 200
- `GET /api/outputs`: 200
- `GET /api/project/recent`: 200
- `GET /api/license/status`: 200
- `POST /api/ai/analyze-photos` with fixed JSON payload: 200

No render, upload, videos, or cancel POST endpoints were called.

## User Data

No user data was changed.

- `uploads`, `outputs`, and `data/backups` manifest: unchanged
- `package.json`: unchanged
- `package-lock.json`: unchanged
- `data/templates.json`: unchanged
- No `.hsp` files were generated
- Port `4000` was stopped after API verification

## server.js Line Count

- Observed before this phase: 1059 lines
- After this phase: 1057 lines

The prompt baseline listed 978 lines, but the working tree observed before editing contained 1059 lines. The actual measured reduction for this extraction is 2 lines because the removed helper block was replaced by the import and configuration wiring.

## Next Step Recommendation

Next safe step: investigate extracting a render queue controller boundary around `processRenderQueue` only after a separate survey confirms dependency injection for:

- active job state
- `createRenderFromProject`
- terminal job updates
- cleanup scheduling
- queue continuation

Do not move FFmpeg, GPU fallback, cancel, or POST render routes until the controller boundary is proven with isolated tests.
