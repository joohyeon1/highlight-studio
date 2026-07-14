# STRUCTURE PHASE 1-22G Render Queue Controller

## Scope

This phase extracts only `processRenderQueue` into a render queue controller module.

The following areas were not moved or modified:

- `createRenderFromProject`
- `createVideoFromPhotos`
- `runFfmpeg`
- `detectRenderEncoders`
- `resolveRenderEncoder`
- `enqueueRenderJob`
- `removeQueuedJob`
- `pushJobLog`
- `updateJob`
- `scheduleJobCleanup`
- `cancelAllRenderJobs`
- `POST /api/render`
- `POST /api/videos`
- `POST /api/render/cancel/:jobId`
- `job.currentProcess`
- FFmpeg child process handling
- GPU encoder fallback
- output cleanup structure
- Electron shutdown handling
- response JSON
- `package.json`
- `package-lock.json`

## Moved Function

| Function | Previous location | New location |
| --- | --- | --- |
| `processRenderQueue` | `server.js` render queue area | `server/render-queue-controller.js` |

## New Module Export

`server/render-queue-controller.js` exports:

- `createRenderQueueController`

The factory returns:

- `processRenderQueue`

## Factory Dependencies

The controller is created once from `server.js` with:

- `getRenderQueue`
- `getActiveRenderJobId`
- `setActiveRenderJobId`
- `clearActiveRenderJobId`
- `pushJobLog`
- `updateJob`
- `scheduleJobCleanup`
- `createRenderFromProject`
- `cleanupUploadedFiles`

The controller module does not require `server.js`, does not create store state, and does not copy queue or active job state.

## Initialization Order

Current order in `server.js`:

1. Import job store, job utilities, queue operations, and queue controller.
2. Configure the render job store.
3. Configure render job utilities.
4. Define `cleanupUploadedFiles`.
5. Define render executor functions including `createRenderFromProject`.
6. Create the queue controller once:
   - `const { processRenderQueue } = createRenderQueueController(...)`
7. Configure queue operations with the returned `processRenderQueue`.
8. Register routes and start the app.

This keeps `configureRenderQueueOperations` connected to the actual controller function, not a placeholder.

## Queue Single Source

The queue remains the single array owned by `server/render-job-store.js`.

The controller receives `getRenderQueue` and uses `getRenderQueue().shift()` exactly as the previous `server.js` implementation did. It does not clone or replace the queue.

## Active Job Single Source

Active job state remains owned by `server/render-job-store.js`.

The controller receives and uses:

- `getActiveRenderJobId`
- `setActiveRenderJobId`
- `clearActiveRenderJobId`

It does not create a local active job copy.

## Preserved Canceled Skip Flow

For a shifted job with `nextJob.canceled === true` or `nextJob.status === "canceled"`:

1. The job is skipped.
2. `process.nextTick(processRenderQueue)` is called.
3. The function returns.

No `await`, Promise conversion, or terminal patch was added.

## Preserved Success Flow

For a successful render:

1. Active guard passes.
2. Job is shifted from the original queue.
3. Active job ID is set.
4. Log is appended: `대기열에서 렌더링 시작`.
5. `createRenderFromProject(nextJob.project, nextJob.files || [], nextJob)` runs.
6. If the job has not been canceled, `updateJob` applies:
   - `status: "completed"`
   - `progress: 100`
   - `filename`
   - `downloadUrl`
   - `durationSeconds`
   - `bytes`
   - `completedAt`
7. `scheduleJobCleanup(nextJob.jobId)` is called.
8. `finally` clears active ID and calls the next `processRenderQueue()`.

## Preserved Failure Flow

For a rejected render:

1. `updateJob` applies `status: "failed"` unless `nextJob.canceled` is true.
2. Error message remains `error.message || "MP4 생성에 실패했습니다."`.
3. Failed progress remains `0`.
4. Error log is appended with `오류 메시지: ...`.
5. Uploaded files are cleaned through the injected `cleanupUploadedFiles`.
6. `scheduleJobCleanup(nextJob.jobId)` is called.
7. `finally` clears active ID and calls the next `processRenderQueue()`.

## Preserved Canceled Error Flow

For a rejected render where `nextJob.canceled` is true:

1. `updateJob` applies `status: "canceled"`.
2. Existing progress is preserved.
3. Error message comes from the rejection.
4. Error log is appended.
5. Uploaded files are cleaned.
6. Cleanup is scheduled.
7. Active ID is cleared in `finally`.

## Excluded Logic

The controller does not own:

- FFmpeg execution
- GPU fallback
- photo probing
- scene rendering
- concat rendering
- legacy `/api/videos`
- render POST request handling
- cancel POST request handling
- shutdown cleanup
- child process kill behavior
- output route behavior

## Unit Verification

Memory-only stubs were used. No files, uploads, outputs, render jobs, or FFmpeg processes were created.

Verified:

- Active job present: executor call count stayed `0`.
- Empty queue: executor call count stayed `0`.
- Normal job:
  - active ID was set before executor call
  - executor called once
  - completed patch applied
  - cleanup scheduled
  - active ID cleared
  - queue length became `0`
- Executor failure:
  - failed patch applied
  - progress set to `0`
  - error message preserved
  - upload cleanup callback called
  - cleanup scheduled
  - active ID cleared
- Canceled executor error:
  - canceled status preserved
  - progress preserved
  - cleanup callback called
  - cleanup scheduled
  - active ID cleared
- Already canceled shifted job:
  - skipped without executor call
  - next queue processing scheduled with `process.nextTick`

## API Regression

Read-only or safe fixed-payload checks:

| Endpoint | Status | Hash |
| --- | ---: | --- |
| `GET /api/render/queue` | 200 | `3f2368a87e1d0fc87b84eb94bbf1770fd1679cdfef720913ad92d20df74e61d7` |
| `GET /api/render/status/__missing__` | 404 | `50263507f7f1067a6b431e9149bc693115520a1b2a794c5264f4ab315c4532a2` |
| `GET /api/render/encoders` | 200 | `75e56298cd92a4f670c26e57dd68a7cebe82b7a570c7d5f2559976fc2d01bc6e` after normalizing `checkedAt` |
| `GET /api/health` | 200 | `5987096b61a5c7456d14fe7294aa915680efe66ca23bb77ea049b3323e156e96` |
| `GET /api/templates` | 200 | `96bee505115fd1f78ab66db2529ad96ce08c6986205754869dc2f47405054d48` |
| `GET /api/outputs` | 200 | `4a2a9dc3838dc85a41c4e26b62854f2c52517237b5fe7c4a8b545d7387b9df81` |
| `GET /api/project/recent` | 200 | `83ec6395c2adffe00bb3660d1fb81a4e5bd18455d8af54ed4f8efa0196808383` |
| `GET /api/license/status` | 200 | response shape verified; hash may vary with time-sensitive license fields |
| `POST /api/ai/analyze-photos` fixed JSON | 200 | `e5bce3fe604b4a3cc223625ef5de0862366ea3d124e89d37813b999f8140c292` |

No render, videos, cancel, or upload POST endpoints were called.

## Static Verification

- `node --check server.js`: PASS
- `node --check server/render-queue-controller.js`: PASS
- `node --check server/render-queue-operations.js`: PASS
- `node --check server/render-job-store.js`: PASS
- `node --check server/render-job-utils.js`: PASS
- `server/**/*.js` syntax check: PASS
- `node --check desktop/main.js`: PASS
- `node --check desktop/preload.js`: PASS
- `node --check public/app.js`: PASS
- `npm.cmd run check`: PASS
- `git diff --check`: PASS with CRLF normalization warning only

## User Data

No user data was changed.

- `uploads`, `outputs`, and `data/backups` manifest: unchanged
- `package.json`: unchanged
- `package-lock.json`: unchanged
- `data/templates.json`: unchanged
- Port `4000` was stopped after API verification
- No LISTENING process remained on port `4000`

## server.js Line Count

Measurement method: Node CRLF/LF split, excluding final newline.

- Before: 1057 lines
- After: 1036 lines
- Reduction: 21 lines

## Next Step Recommendation

Next safe step: survey and then separate the remaining render POST/cancel boundary, or survey FFmpeg engine extraction before moving larger render orchestration.

Recommended order:

1. Survey cancel route and shutdown coupling.
2. Extract cancel/shutdown controller only if active job timing can be preserved.
3. Survey FFmpeg engine separately before moving `createRenderFromProject`.

Keep FFmpeg/GPU fallback and POST render route frozen until their own survey and fixed-payload tests are prepared.
