# STRUCTURE PHASE 1-24A Legacy Render Routes Survey

## Scope

This is a read-only survey for the remaining render write routes after Render Job Store, Queue Controller, FFmpeg Engine, and Render Executor extraction.

Baseline:

- Branch: `main`
- Latest commit: `902a91a`
- `server.js`: 635 lines
- Git status before survey: clean

No source code, route behavior, render queue logic, FFmpeg logic, legacy renderer logic, cancel behavior, shutdown behavior, package files, or user data were modified.

## Surveyed Routes And Functions

Routes:

- `POST /api/render`
- `POST /api/videos`
- `POST /api/render/cancel/:jobId`

Functions and helpers:

- `createVideoFromPhotos`
- `safeOutputFileName`
- `ffmpegListPath`
- `addRenderJob`
- `enqueueRenderJob`
- `removeQueuedJob`
- `getRenderJob`
- `updateJob`
- `pushJobLog`
- `scheduleJobCleanup`
- `cancelAllRenderJobs`
- `startServer`

Related modules:

- `server/render-job-store.js`
- `server/render-job-utils.js`
- `server/render-queue-operations.js`
- `server/render-queue-controller.js`
- `server/render-executor.js`
- `server/ffmpeg-engine.js`
- `desktop/main.js`

## `/api/render` Flow

Location: `server.js:486`

Actual flow:

1. `upload.array("photos", MAX_PHOTOS)` receives uploaded photos.
2. `normalizeUploadedFiles(req.files)` mutates upload file display names.
3. `parseProjectPayload(req.body.project)` parses JSON project data.
4. `makeId("render")` creates a render job ID.
5. `now = new Date().toISOString()` is used for job timestamps and initial log.
6. The route constructs the initial job object inline.
7. `addRenderJob(job)` stores the job in the shared Map.
8. `enqueueRenderJob(job)` pushes the job into the shared queue and triggers queue processing.
9. Route immediately returns `202` with `{ ok, jobId, statusUrl }`.
10. On route-level error, uploaded files in `req.files` are removed and `500` is returned.

The route does not run FFmpeg directly. Actual rendering is async through the queue controller and render executor.

## Initial Job Shape

Created in `POST /api/render`:

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

Encoder fields are not present at creation. They are added later by `createRenderFromProject`:

- `encoderRequested`
- `encoder`
- `encoderCodec`
- `encoderLabel`
- `encoderFallback`
- `encoderFallbackMessage`

## `/api/videos` Flow

Location: `server.js:466`

Actual flow:

1. `upload.array("photos", MAX_PHOTOS)` receives uploaded photos.
2. `normalizeUploadedFiles(req.files)` mutates upload file display names.
3. `createVideoFromPhotos(req.files || [], { title, secondsPerPhoto })` runs synchronously from the route perspective.
4. The route waits for MP4 generation to finish.
5. On success, route returns `201`.
6. Response includes:
   - `ok: true`
   - `video: result`
   - `deprecated: true`
   - `replacement: "/api/render"`
   - `message: "POST /api/videos is deprecated. Use POST /api/render for new integrations."`
7. On error, uploaded files in `req.files` are removed and `500` is returned.

This route does not use render queue state, render job IDs, job logs, queue positions, cancel route, GPU fallback, project timeline rendering, captions, transitions, or the Render Executor.

## Legacy Renderer: `createVideoFromPhotos`

Location: `server.js:342`

Inputs:

- `files`
- `options.title`
- `options.secondsPerPhoto`

Return shape:

```js
{
  id,
  filename,
  downloadUrl,
  photoCount,
  durationSeconds,
  bytes
}
```

Behavior:

- Throws if no files are provided.
- Creates a temporary work directory under `UPLOAD_DIR`.
- Generates an output name from `safeName(options.title || "Highlight Studio")` and `Date.now().toString(36)`.
- Writes output directly under `OUTPUT_DIR`.
- Uses fixed duration from `secondsPerPhoto` or `PHOTO_SECONDS`, clamped to 1-10 seconds.
- Renders each photo to a 1920x1080 segment using CPU `libx264`.
- Uses fixed filter:
  - scale
  - pad
  - `format=yuv420p`
- Writes `segments.txt` with `ffmpegListPath()`.
- Concatenates segments with FFmpeg concat demuxer.
- Deletes uploaded files and work directory in `finally`.

Unsupported compared with queued render:

- project `.hsp` data
- storyboard timeline
- captions
- transitions
- photo effects
- output resolution options
- output FPS options
- GPU encoder selection
- GPU fallback
- progress/status/log API
- cancel API
- queueing

## Shared And Legacy Helpers

`ffmpegListPath`

- Location: `server.js:228`
- Escapes Windows path separators and apostrophes for FFmpeg concat lists.
- Shared by legacy `createVideoFromPhotos`.
- Also injected into `server/render-executor.js`.
- Moving it requires care because it currently serves both legacy and queued render paths.

`safeOutputFileName`

- Location: `server.js:232`
- Normalizes output MP4 names through `safeName()`.
- Passed to `server/render-executor.js`.
- Passed to output write routes.
- Not legacy-only.

## Cancel Route Flow

Location: `server.js:554`

### Missing Job

If `getRenderJob(req.params.jobId)` returns nothing:

- Status: `404`
- JSON: `{ ok: false, error: "렌더링 작업을 찾을 수 없습니다." }`

### Terminal Job

If status is `completed`, `failed`, or `canceled`:

- No mutation.
- Returns `{ ok: true, job: publicJob(job) }`.

### Queued Job

Flow:

1. `job.canceled = true`
2. `pushJobLog(job, "사용자 취소 요청")`
3. If `job.status === "queued"`:
   - `removeQueuedJob(job.jobId)`
   - `updateJob(job, { status: "canceled", completedAt: new Date().toISOString() })`
   - removes uploaded files in `job.files`
   - `pushJobLog(job, "대기 중 작업 취소 완료")`
   - `scheduleJobCleanup(job.jobId)`
   - returns `{ ok: true, job: publicJob(job) }`

The route does not call `processRenderQueue()` for queued cancellation.

### Active Job

Flow:

1. `job.canceled = true`
2. `pushJobLog(job, "사용자 취소 요청")`
3. `updateJob(job, { status: "canceled", completedAt: new Date().toISOString() })`
4. If `job.currentProcess` exists, call `job.currentProcess.kill("SIGTERM")`.
5. `processRenderQueue()`
6. Return `{ ok: true, job: publicJob(job) }`

The queue controller may also catch the resulting FFmpeg rejection, set terminal status again, call `cleanupUploadedFiles()`, schedule cleanup, clear active ID, and start the next job. Duplicate terminal status writes are possible but currently converge on `canceled`.

## Shutdown Flow

`cancelAllRenderJobs`

- Location: `server.js:580`
- Iterates `getRenderJobs().values()`.
- Skips terminal jobs.
- Sets `job.canceled = true`.
- Logs the provided reason.
- Sets status `canceled` and `completedAt`.
- Kills `job.currentProcess` with `SIGTERM` if present.
- Removes each file in `job.files`.
- Clears the queue with `getRenderQueue().splice(0)`.
- Calls `clearActiveRenderJobId()`.

Export:

- `server.js` exports `cancelAllRenderJobs`.

Electron:

- `desktop/main.js` requires `server.js` in `startInternalServer()`.
- `desktop/main.js` keeps `serverModule`.
- On `before-quit`, Electron calls `serverModule?.cancelAllRenderJobs?.(...)`.
- If Electron owns the internal server, it then calls `serverInstance.close()`.

Timer cleanup:

- `cancelAllRenderJobs` does not clear scheduled `scheduleJobCleanup()` timers.
- Existing timers are only created for jobs that have already reached terminal states through queue/cancel flows.

## Route Dependency Matrix

| Route | Dependencies | State mutation | File mutation | FFmpeg | Response timing |
| --- | --- | --- | --- | --- | --- |
| `POST /api/render` | `upload`, `normalizeUploadedFiles`, `parseProjectPayload`, `makeId`, `addRenderJob`, `enqueueRenderJob` | creates job, enqueues | upload files remain until executor/cancel/error cleanup | async later via queue | immediate `202` |
| `POST /api/videos` | `upload`, `normalizeUploadedFiles`, `createVideoFromPhotos` | no render job state | writes output, temp segments, deletes uploads/workdir | yes, direct | after MP4 completes |
| `POST /api/render/cancel/:jobId` | `getRenderJob`, `publicJob`, `removeQueuedJob`, `updateJob`, `pushJobLog`, `scheduleJobCleanup`, `processRenderQueue` | mutates job/queue | deletes queued upload files; active cleanup happens here and/or queue catch/finally | may kill current process | immediate JSON |

## Queued Render vs Legacy Render

| Area | `POST /api/render` | `POST /api/videos` |
| --- | --- | --- |
| Status | current primary route | deprecated compatibility route |
| HTTP status success | `202` | `201` |
| Response | `{ ok, jobId, statusUrl }` | `{ ok, video, deprecated, replacement, message }` |
| Execution | async queue | waits for FFmpeg completion |
| Input | project JSON + photos | photos + simple options |
| Output options | project `video.outputOptions` | fixed 1920x1080/30fps CPU |
| Captions/transitions/effects | supported through project scenes/photos | not supported |
| GPU | auto/user encoder + fallback | no GPU path |
| Progress | `/api/render/status/:jobId`, `/api/render/queue` | none |
| Cancel | supported | not supported |
| Job logs | supported | none |
| Cleanup | executor/cancel/controller | function `finally` and route catch |

## Duplicate And Similar Code

Safe-ish shared candidates:

- `ffmpegListPath`: truly shared concat-list path escaping.
- upload cleanup loops over `file.path`: appears in route catch, cancel, shutdown, executor, and legacy renderer. It is similar but lifecycle-specific.
- concat list writing: similar in queued executor and legacy renderer, but output/metadata lifecycles differ.

Similar but intentionally different before v1.0:

- `createVideoFromPhotos` segment rendering resembles queued executor segment rendering, but lacks project timeline, probe/skip, caption/effect/transition, encoder selection, progress, logs, queue, and cancel integration.
- output naming differs: legacy uses title plus timestamp; queued render uses output option filename and unique output planner.
- cleanup timing differs: legacy cleans all files at function end; queued render cleanup interacts with cancel and queue controller catch/finally.

Risky to unify now:

- FFmpeg argument generation for legacy and queued render.
- upload cleanup into one generic service.
- render write routes and legacy renderer in the same first move.

## Separation Options

### A. Render Write Routes Only

Module:

- `server/routes/render-write-routes.js`

Move:

- `POST /api/render`
- `POST /api/render/cancel/:jobId`

Keep:

- `POST /api/videos`
- `createVideoFromPhotos`

Dependencies:

- `upload`
- `MAX_PHOTOS`
- `normalizeUploadedFiles`
- `parseProjectPayload`
- `makeId`
- `addRenderJob`
- `enqueueRenderJob`
- `getRenderJob`
- `publicJob`
- `removeQueuedJob`
- `updateJob`
- `pushJobLog`
- `scheduleJobCleanup`
- `processRenderQueue`
- `fs`

Risk: MEDIUM

Pros:

- Keeps legacy route untouched.
- Directly removes primary render route/cancel responsibility from `server.js`.
- Response compatibility is easier to compare.

Cons:

- Many dependencies must be injected.
- Cancel route still touches queue state and `job.currentProcess`.

Expected `server.js` reduction: about 70-90 lines.

Recommendation: YES, but only after a pre/post API comparison plan for `202`, cancel missing, cancel terminal, and queued cancel with a safe in-memory/unit route test or controlled temp upload test.

### B. All Render Write Routes Together

Module:

- `server/routes/render-write-routes.js`

Move:

- `POST /api/render`
- `POST /api/videos`
- `POST /api/render/cancel/:jobId`

Risk: MEDIUM-HIGH

Pros:

- One module owns upload-triggered render writes.

Cons:

- Mixes async queued render with sync legacy direct render.
- Pulls legacy renderer dependencies into the same route module.
- Larger compatibility surface.

Expected `server.js` reduction: about 95-120 lines.

Recommendation: Not first.

### C. Separate Legacy Route Module

Modules:

- `server/routes/render-write-routes.js`
- `server/routes/legacy-video-routes.js`

Move:

- primary queued render/cancel routes separately from legacy `/api/videos`.

Risk: MEDIUM

Pros:

- Preserves conceptual boundary.
- Makes deprecation strategy explicit.

Cons:

- Requires two route modules and two dependency sets.

Expected `server.js` reduction: about 95-120 lines after both moves.

Recommendation: Good follow-up after A.

### D. Legacy Renderer Service First

Module:

- `server/legacy-video-renderer.js`

Move:

- `createVideoFromPhotos`

Risk: MEDIUM

Pros:

- Small service boundary.
- Removes legacy direct FFmpeg implementation from `server.js`.

Cons:

- Still leaves `/api/videos` route in `server.js`.
- Needs dependencies for `UPLOAD_DIR`, `OUTPUT_DIR`, `PHOTO_SECONDS`, `makeId`, `safeName`, `runFfmpeg`, `ffmpegListPath`, `fs`, and `path`.
- Requires preserving deprecated response shape separately.

Expected `server.js` reduction: about 60 lines.

Recommendation: Good after route write boundary is documented; not before route behavior is locked.

## Legacy Retention Strategy

Do not remove `/api/videos` now.

Recommended strategy:

1. Keep `/api/videos` as deprecated compatibility.
2. Document that new integrations must use `/api/render`.
3. Separate legacy route and legacy renderer into their own modules.
4. Avoid converting `/api/videos` to queue-backed behavior before v1.0 because it would change synchronous completion semantics and response shape.
5. Revisit removal only after an explicit external compatibility decision.

## Recommended Next Actual Step

Recommended next phase: extract Render Write Routes only.

Move:

- `POST /api/render`
- `POST /api/render/cancel/:jobId`

Do not move:

- `POST /api/videos`
- `createVideoFromPhotos`
- `cancelAllRenderJobs`
- `createRenderFromProject`
- FFmpeg Engine
- queue controller/operations/store/utils

Expected files:

- `server.js`
- `server/routes/render-write-routes.js`
- a new phase document

Expected `server.js` reduction:

- about 70-90 lines

Risk:

- MEDIUM

Primary risk factors:

- cancel route mutates active job and calls `processRenderQueue()`.
- queued cancel removes uploaded files directly.
- active cancel relies on `job.currentProcess.kill("SIGTERM")` and queue controller catch/finally.
- route module requires a wide dependency injection object.

## Modification Prohibited Areas For Next Step

- `POST /api/videos` behavior
- legacy renderer behavior
- queue controller internals
- queue operations internals
- job store shape
- job public response shape
- FFmpeg Engine
- Render Executor
- Electron shutdown behavior
- upload middleware configuration
- output/template/project routes

## Validation Performed In This Survey

Static validation was run after document creation:

- `node --check server.js`
- `node --check server/render-executor.js`
- `node --check server/ffmpeg-engine.js`
- all `server/**/*.js`
- `node --check desktop/main.js`
- `node --check desktop/preload.js`
- `node --check public/app.js`
- `npm.cmd run check`
- `git diff --check`
- `git status --short`

No runtime POST route calls were made.

## Commit And Push

No commit and no push are performed in this survey phase.
