# STRUCTURE PHASE 1-24B Render Write Routes

## Scope

This phase extracted only the queue-based render write routes into `server/routes/render-write-routes.js`.

Moved routes:

- `POST /api/render`
- `POST /api/render/cancel/:jobId`

Not moved:

- `POST /api/videos`
- `createVideoFromPhotos`
- `ffmpegListPath`
- `safeOutputFileName`
- `cancelAllRenderJobs`
- Render Executor
- FFmpeg Engine
- Queue Controller
- Queue Operations
- Job Store
- Job Utilities
- Electron shutdown handling

## Changed Files

- `server.js`
- `server/routes/render-write-routes.js`
- `docs/STRUCTURE_PHASE1_24A_LEGACY_RENDER_ROUTES_SURVEY_20260715.md`
- `docs/STRUCTURE_PHASE1_24B_RENDER_WRITE_ROUTES_20260715.md`

## Route Registration

New module export:

```js
module.exports = {
  registerRenderWriteRoutes
};
```

`server.js` registers the module after legacy `POST /api/videos` and before output routes:

```js
registerRenderWriteRoutes(app, {
  upload,
  maxPhotos: MAX_PHOTOS,
  normalizeUploadedFiles,
  parseProjectPayload,
  makeId,
  addRenderJob,
  enqueueRenderJob,
  getRenderJob,
  removeQueuedJob,
  updateJob,
  pushJobLog,
  scheduleJobCleanup,
  publicJob,
  processRenderQueue
});
```

This keeps the existing middleware order and avoids any reverse require from the route module to `server.js`.

## Dependency List

Upload:

- `upload`
- `MAX_PHOTOS` passed as `maxPhotos`
- `normalizeUploadedFiles`

Render job creation:

- `parseProjectPayload`
- `makeId`
- `addRenderJob`
- `enqueueRenderJob`

Cancel:

- `getRenderJob`
- `removeQueuedJob`
- `updateJob`
- `pushJobLog`
- `scheduleJobCleanup`
- `publicJob`
- `processRenderQueue`

Local module dependency:

- `node:fs` for upload cleanup.

## `/api/render` Flow Preserved

The moved route preserves the existing flow:

1. `upload.array("photos", maxPhotos)`
2. `normalizeUploadedFiles(req.files)`
3. `parseProjectPayload(req.body.project)`
4. `makeId("render")`
5. `new Date().toISOString()`
6. inline initial job object creation
7. `addRenderJob(job)`
8. `enqueueRenderJob(job)`
9. `202` response with `{ ok, jobId, statusUrl }`
10. catch cleanup of `req.files`
11. `500` response with `{ ok: false, error }`

## Initial Job Shape Preserved

The route still creates:

```js
{
  jobId,
  status: "queued",
  progress: 0,
  currentPhoto: 0,
  currentPhotoName: "",
  totalPhotos,
  filename: "",
  downloadUrl: "",
  durationSeconds: 0,
  bytes: 0,
  error: "",
  failedPhotos: [],
  logs: [{ time: now, message: "렌더링 작업 대기" }],
  project,
  files: req.files || [],
  currentProcess: null,
  canceled: false,
  createdAt: now,
  startedAt: "",
  completedAt: "",
  updatedAt: now
}
```

Encoder fields are still added later by the Render Executor, not at route creation.

## Cancel Flow Preserved

Missing job:

- `404`
- `{ ok: false, error: "렌더링 작업을 찾을 수 없습니다." }`

Terminal job:

- statuses: `completed`, `failed`, `canceled`
- response: `{ ok: true, job: publicJob(job) }`
- no mutation

Queued job:

1. `job.canceled = true`
2. `pushJobLog(job, "사용자 취소 요청")`
3. `removeQueuedJob(job.jobId)`
4. `updateJob(job, { status: "canceled", completedAt: new Date().toISOString() })`
5. cleanup `job.files`
6. `pushJobLog(job, "대기 중 작업 취소 완료")`
7. `scheduleJobCleanup(job.jobId)`
8. response `{ ok: true, job: publicJob(job) }`

Active job:

1. `job.canceled = true`
2. `pushJobLog(job, "사용자 취소 요청")`
3. `updateJob(job, { status: "canceled", completedAt: new Date().toISOString() })`
4. if present, `job.currentProcess.kill("SIGTERM")`
5. `processRenderQueue()`
6. response `{ ok: true, job: publicJob(job) }`

The route still does not clear active job ID directly. Queue controller catch/finally remains responsible for active lifecycle convergence.

## `currentProcess` Preservation

`job.currentProcess` remains a property on the same job object from the shared Job Store. The route module receives `getRenderJob`, mutates the same object, and calls `kill("SIGTERM")` on the existing reference.

No job object clone or new status store was introduced.

## Upload Cleanup Preservation

Preserved cleanup locations:

- `/api/render` catch removes `req.files`.
- queued cancel removes `job.files`.
- active cancel leaves the executor/controller path to converge after killing the process.

No cleanup deduplication was introduced.

## Legacy Route Compatibility

`POST /api/videos` remains in `server.js`.

Preserved legacy route behavior:

- upload middleware still uses `upload.array("photos", MAX_PHOTOS)`
- still calls `normalizeUploadedFiles(req.files)`
- still calls `createVideoFromPhotos(req.files || [], { title, secondsPerPhoto })`
- still returns success status `201`
- still includes `deprecated: true`
- still includes `replacement: "/api/render"`
- still includes the same deprecation message
- still uses the same failure response and cleanup

## Stub Verification

A memory-only Express stub app verified the new route module without real user files, FFmpeg, real uploads, or port 4000.

Covered:

- `/api/render` missing project payload
- route-level upload cleanup on parse failure
- valid `/api/render` job creation
- job object key list
- `addRenderJob` before `enqueueRenderJob`
- success response `202`
- missing cancel job `404`
- queued cancel flow
- active cancel flow with `currentProcess.kill("SIGTERM")`
- terminal cancel no-op response

Result: PASS

## Read API Regression

Read-only regression endpoints:

- `GET /api/render/encoders`
- `GET /api/render/queue`
- `GET /api/render/status/__missing__`
- `GET /api/health`
- `GET /api/templates`
- `GET /api/outputs`
- `GET /api/project/recent`
- `GET /api/license/status`
- `POST /api/ai/analyze-photos` with fixed JSON payload only

No real `/api/render`, `/api/videos`, cancel, upload, or FFmpeg POST was called.

## Validation

Required validation:

- `node --check server.js`
- `node --check server/routes/render-write-routes.js`
- `node --check server/render-executor.js`
- `node --check server/ffmpeg-engine.js`
- `node --check server/render-queue-controller.js`
- `node --check server/render-queue-operations.js`
- `node --check server/render-job-store.js`
- `node --check server/render-job-utils.js`
- all `server/**/*.js`
- `node --check desktop/main.js`
- `node --check desktop/preload.js`
- `node --check public/app.js`
- `npm.cmd run check`
- `git diff --check`

## User Data

No user data was intentionally changed:

- no real upload
- no real render POST
- no real videos POST
- no real cancel POST
- no FFmpeg execution
- no output creation
- no changes to uploads, outputs, data, projects, templates, or backups
- no package file changes

## Line Count

- Before: `server.js` 635 lines
- After: `server.js` 584 lines
- Reduction: 51 lines

## Next Step

Recommended next phase: extract the legacy video route or legacy video renderer in a separate step.

Safer order:

1. Survey legacy renderer one more time after write route extraction.
2. Extract `createVideoFromPhotos` into `server/legacy-video-renderer.js`.
3. Extract `POST /api/videos` into `server/routes/legacy-video-routes.js`.

Do not convert `/api/videos` to queue-backed behavior before an explicit compatibility decision.
