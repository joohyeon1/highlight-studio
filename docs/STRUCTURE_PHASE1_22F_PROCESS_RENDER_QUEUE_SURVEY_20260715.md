# STRUCTURE PHASE 1-22F Process Render Queue Survey

## Scope

This phase is a read-only survey before moving `processRenderQueue`.

No source module, route, FFmpeg, GPU fallback, cancel handling, package file, upload/output/project data, or render queue behavior was modified.

## Line Count Baseline

Chosen measurement method for future phases:

```powershell
node -e "const fs=require('fs'); const count=s=>s.split(/\r?\n/).length-(s.endsWith('\n')?1:0); console.log(count(fs.readFileSync('server.js','utf8')))"
```

Reason: this applies the same CRLF/LF split logic to both working tree files and Git blob contents.

Measured results with this Node split method:

| Target | Lines | Bytes |
| --- | ---: | ---: |
| Working tree `server.js` | 1057 | 37855 |
| `a77eec5^:server.js` | 1057 | 37855 |
| `a77eec5:server.js` | 1057 | 37855 |

PowerShell `git show a77eec5:server.js | Measure-Object -Line` reported `978`, while `(Get-Content server.js).Count` reported `1057`. This appears to be a measurement difference caused by native command pipeline handling rather than an actual content difference. The Node split method showed identical counts and byte lengths for the working tree, parent commit, and head commit.

## Current `processRenderQueue` Location

`server.js` lines 723-761.

```text
723 function processRenderQueue() {
724   if (getActiveRenderJobId()) return;
725   const nextJob = getRenderQueue().shift();
726   if (!nextJob) return;
727   if (nextJob.canceled || nextJob.status === "canceled") {
728     process.nextTick(processRenderQueue);
729     return;
730   }
731   setActiveRenderJobId(nextJob.jobId);
732   pushJobLog(nextJob, "대기열에서 렌더링 시작");
733   createRenderFromProject(nextJob.project, nextJob.files || [], nextJob)
...
758     .finally(() => {
759       clearActiveRenderJobId();
760       processRenderQueue();
761     });
```

## Full Execution Order

Actual order in current code:

1. Check `getActiveRenderJobId()`.
2. Return immediately if an active job exists.
3. Remove the next queued job from the original queue with `getRenderQueue().shift()`.
4. Return if the queue is empty.
5. If the shifted job has `canceled === true` or `status === "canceled"`, schedule `process.nextTick(processRenderQueue)` and return.
6. Set the active job ID with `setActiveRenderJobId(nextJob.jobId)`.
7. Append log: `대기열에서 렌더링 시작`.
8. Call `createRenderFromProject(nextJob.project, nextJob.files || [], nextJob)`.
9. On fulfilled result:
   - If `nextJob.canceled`, return without completed patch and without cleanup scheduling in this `.then` block.
   - Otherwise update the job to `completed`, set `progress: 100`, output fields, `completedAt`.
   - Schedule terminal job cleanup.
10. On rejected error:
    - Update status to `canceled` if `nextJob.canceled`, otherwise `failed`.
    - Set error message, progress, and `completedAt`.
    - Append error log.
    - Remove uploaded files from `nextJob.files`.
    - Schedule terminal job cleanup.
11. In `finally`:
    - Clear active job ID.
    - Call `processRenderQueue()` synchronously to continue the queue.

## Branches And Exit Paths

| Path | Active ID cleared | Next job started | Terminal status set | Cleanup scheduled | Upload cleanup | Log |
| --- | --- | --- | --- | --- | --- | --- |
| Active job already exists | Not changed | No | No | No | No | No |
| Queue empty | Not changed | No | No | No | No | No |
| Shifted job already canceled | Not set | Yes, via `process.nextTick` | No in this function | No | No | No |
| Render success, job not canceled | Yes in `finally` | Yes in `finally` | `completed` | Yes | Done by `createRenderFromProject` finally | completion logs from executor |
| Render success, job canceled before `.then` | Yes in `finally` | Yes in `finally` | No in `.then` | No in `.then` | Done by `createRenderFromProject` finally | executor logs only |
| Render failure | Yes in `finally` | Yes in `finally` | `failed` | Yes | Yes for `nextJob.files` plus executor finally cleanup | error log |
| Render rejection while canceled | Yes in `finally` | Yes in `finally` | `canceled` | Yes | Yes for `nextJob.files` plus executor finally cleanup | error log |
| `scheduleJobCleanup` throws | No local catch; promise chain would reject before `finally` still runs because `finally` is chained after `.then/.catch` | `finally` still executes | Patch before cleanup remains | Failed scheduling if throw occurs | Depends on path | Possible unhandled rejection risk |
| `processRenderQueue()` in `finally` throws | Not caught | Queue could stop | Current terminal patch remains | Current path cleanup remains | Current path cleanup remains | No extra log |

Notes:

- `scheduleJobCleanup` currently only calls `setTimeout`, so a throw is unlikely unless dependencies are broken.
- The canceled-but-fulfilled path is unusual: if `createRenderFromProject` resolves after `nextJob.canceled` is true, `.then` returns before terminal patch and cleanup scheduling. Current cancellation normally kills FFmpeg and causes rejection, so this path is low probability but important for controller extraction.

## Dependency Table

| Dependency | Read/write role in `processRenderQueue` | Source |
| --- | --- | --- |
| `getActiveRenderJobId` | Reads active job guard | `server/render-job-store.js` |
| `getRenderQueue` | Mutates original queue via `.shift()` | `server/render-job-store.js` |
| `setActiveRenderJobId` | Sets active job before async render starts | `server/render-job-store.js` |
| `clearActiveRenderJobId` | Clears active job in `finally` | `server/render-job-store.js` |
| `pushJobLog` | Adds queue start and error logs | `server/render-job-utils.js` |
| `updateJob` | Applies terminal completed/failed/canceled patches | `server/render-job-utils.js` |
| `scheduleJobCleanup` | Schedules terminal job deletion | `server/render-job-utils.js` |
| `createRenderFromProject` | Performs real FFmpeg render orchestration | `server.js` |
| `fs.rm` | Removes uploaded files in catch path | Node `fs` in `server.js` |
| `process.nextTick` | Skips already canceled shifted jobs without recursion on same stack | Node process global |
| `processRenderQueue` | Self-called from canceled-shift branch and `finally` | `server.js` |

Indirect dependencies through `createRenderFromProject`:

- `checkFfmpeg`
- `getRenderPhotos`
- `getResolution`
- `resolveRenderEncoder`
- `uniqueOutputPath`
- `probeInputImage`
- `buildSceneFilter`
- `getEncoderArgs`
- `runFfmpeg`
- `displayFileName`
- `safeName`
- `makeId`
- `UPLOAD_DIR`
- `OUTPUT_DIR`
- `PHOTO_SECONDS`
- `SUPPORTED_RENDER_TRANSITIONS`
- `SUPPORTED_RENDER_EFFECTS`
- `RENDER_ENCODERS`
- `fs`, `path`

## State Changes

Job creation in `POST /api/render` starts with:

```text
status: queued
progress: 0
currentPhoto: 0
currentPhotoName: ""
totalPhotos: selected photo count
filename/downloadUrl/durationSeconds/bytes empty or zero
error: ""
failedPhotos: []
logs: [{ time, message: "렌더링 작업 대기" }]
currentProcess: null
canceled: false
createdAt/updatedAt set
startedAt/completedAt empty
```

Status flow for a normal render:

```text
queued
→ preparing
→ rendering
→ completed
```

Status flow for a render failure:

```text
queued
→ preparing and/or rendering
→ failed
```

Status flow for active cancel:

```text
queued
→ preparing/rendering
→ canceled
```

Status flow for queued cancel:

```text
queued
→ canceled
```

`updateJob` calls tied to this lifecycle:

| Location | Patch |
| --- | --- |
| `createRenderFromProject` start | `status: "preparing"`, `progress: 2`, `startedAt` |
| after FFmpeg/photos validation | `status: "rendering"`, `totalPhotos`, `progress: 5` |
| per scene | `status: "rendering"`, `currentPhoto`, `currentPhotoName`, `totalPhotos`, `progress` |
| after segment render | `progress` |
| MP4 concat start | `status: "rendering"`, `progress: 76`, `currentPhoto`, `currentPhotoName: "MP4 인코딩"`, `totalPhotos` |
| `processRenderQueue` success | `status: "completed"`, `progress: 100`, `filename`, `downloadUrl`, `durationSeconds`, `bytes`, `completedAt` |
| `processRenderQueue` catch | `status: "canceled"` or `"failed"`, `error`, `progress`, `completedAt` |
| cancel route queued | `status: "canceled"`, `completedAt` |
| cancel route active | `status: "canceled"`, `completedAt` |
| shutdown cancel | `status: "canceled"`, `completedAt` |

Additional direct job mutation:

- `createRenderFromProject` sets encoder fields and `failedPhotos`.
- `runFfmpeg` sets and clears `job.currentProcess`.
- cancel routes set `job.canceled = true`.

## Active Job Concurrency

Current concurrency behavior:

- Active guard happens before queue shift.
- Active ID is set synchronously before the async render begins.
- There is no `await` between the active guard and `setActiveRenderJobId`.
- Therefore, two synchronous calls in the same event loop turn should not start two jobs.
- `enqueueRenderJob` calls `processRenderQueue()` synchronously after pushing.
- `finally` calls `clearActiveRenderJobId()` and then immediately calls `processRenderQueue()`.

Risk notes:

- `processRenderQueue` does not wrap its synchronous pre-promise body in `try/catch`.
- If an injected dependency throws during a future extraction before `.finally` is attached, active state could become inconsistent.
- Active cancel route calls `processRenderQueue()` while the active ID is still set, so that call usually returns. Actual continuation happens later in the active render promise `finally`.
- `cancelAllRenderJobs` directly clears active ID after canceling jobs and emptying the queue. It is part of shutdown behavior and should not be moved with `processRenderQueue` until shutdown ownership is defined.

## Recursion And Queue Continuation

Current continuation style:

- Already-canceled shifted job: `process.nextTick(processRenderQueue)`.
- Normal job terminal path: `.finally(() => { clearActiveRenderJobId(); processRenderQueue(); })`.
- Enqueue path: direct synchronous `processRenderQueue()` call from `enqueueRenderJob`.
- Active cancel route: direct synchronous `processRenderQueue()` call, but active guard usually returns.

Call stack risk:

- Normal completion does not recurse through synchronous render execution because render work is promise-based.
- A long run of pre-canceled queue entries uses `process.nextTick`, which avoids immediate same-stack recursion but may still run many ticks.
- The `finally` continuation is not awaited or caught, so any synchronous throw in the next queue start can surface as an unhandled promise issue.

## Cancel Coupling

Queued cancel route:

1. Get job by ID.
2. Return 404 if missing.
3. Return public job if already terminal.
4. Set `job.canceled = true`.
5. Log `사용자 취소 요청`.
6. If status is `queued`:
   - `removeQueuedJob(job.jobId)`.
   - `updateJob` to `canceled` and `completedAt`.
   - Remove uploaded files from `job.files`.
   - Log `대기 중 작업 취소 완료`.
   - Schedule cleanup.
   - Return public job.

Active cancel route:

1. Set `job.canceled = true`.
2. Log cancel request.
3. Update status to `canceled`.
4. Kill `job.currentProcess` with `SIGTERM` if present.
5. Call `processRenderQueue()` directly.
6. Return public job.

Important coupling:

- Active cancel depends on `runFfmpeg` rejecting when `job.canceled` is set.
- The direct `processRenderQueue()` call in active cancel does not normally start the next job because active ID remains set until render `finally`.
- Moving `processRenderQueue` without cancel route coordination risks changing cancel timing.

Shutdown cancel:

- Iterates `getRenderJobs().values()`.
- Skips terminal jobs.
- Sets `job.canceled = true`.
- Logs shutdown reason.
- Updates status to `canceled`.
- Kills `job.currentProcess` if present.
- Removes `job.files`.
- Clears the render queue with `getRenderQueue().splice(0)`.
- Clears active ID.

## Cleanup Coupling

Cleanup paths:

- `createRenderFromProject` always removes per-render temp files and work directory in its `finally`.
- `processRenderQueue` catch removes uploaded files from `nextJob.files`.
- Queued cancel removes uploaded files from `job.files`.
- Shutdown cancel removes uploaded files from each non-terminal job.
- `scheduleJobCleanup` removes terminal job records from the in-memory Map after 30 minutes.

Potential overlap:

- Uploaded files may be removed by both executor catch handling and cancel/shutdown cleanup in some timing windows. Current code uses `fs.rm(..., { force: true })`, so duplicate removal is tolerated.
- `scheduleJobCleanup` does not store timer handles and can be scheduled multiple times if called from multiple paths.
- `scheduleJobCleanup` only deletes records if the job is still terminal at timeout time.

## Executor Return And Error Structure

`createRenderFromProject(project, files, job)` returns:

```js
{
  filename,
  downloadUrl: `/outputs/${encodeURIComponent(filename)}`,
  durationSeconds,
  bytes
}
```

It also mutates `job` with:

- `encoderRequested`
- `encoder`
- `encoderCodec`
- `encoderLabel`
- `encoderFallback`
- `encoderFallbackMessage`
- `failedPhotos`
- progress/current photo fields through `updateJob`

Errors:

- Missing FFmpeg throws a user-facing `Error`.
- Missing render photos throws a user-facing `Error`.
- Cancellation throws/rejects with `렌더링이 취소되었습니다.`.
- FFmpeg timeout throws `FFmpeg 처리 시간이 초과되었습니다.`.
- FFmpeg non-zero exit throws stderr or `ffmpeg exited with code N`.
- All photos skipped throws `처리 가능한 사진이 없습니다...`.
- GPU encoder failure may fallback to CPU inside the executor before deciding whether to skip a photo or throw.

Queue controller implication:

- A future controller can treat executor output as a simple result patch for completed jobs.
- It still needs to know the exact field mapping for `filename`, `downloadUrl`, `durationSeconds`, and `bytes`.
- It must not own GPU fallback, FFmpeg args, photo skipping, or temp work directory cleanup.

## Split Option Comparison

### A. Move `processRenderQueue` Only To A Factory Controller

Expected dependencies:

- `getActiveRenderJobId`
- `getRenderQueue`
- `setActiveRenderJobId`
- `clearActiveRenderJobId`
- `pushJobLog`
- `updateJob`
- `scheduleJobCleanup`
- `executeRenderJob` wrapper for `createRenderFromProject`
- upload file cleanup callback or `fs.rm`

Risk: MEDIUM.

Pros:

- Keeps FFmpeg and POST routes in `server.js`.
- Can reduce `server.js` by roughly 35-50 lines after wiring.
- Builds on existing `render-job-store`, `render-job-utils`, and `render-queue-operations`.

Cons:

- Cancel route still calls `processRenderQueue`.
- Shutdown still clears queue and active state.
- Error/terminal field mapping must be preserved exactly.
- If dependency wiring is wrong, active job state can get stuck.

Recommendation: Possible, but only after defining an `executeRenderJob` function and a cleanup callback in `server.js` without moving FFmpeg.

### B. Integrate `processRenderQueue` With Queue Operations

Expected move:

- `enqueueRenderJob`
- `removeQueuedJob`
- `processRenderQueue`

Risk: MEDIUM-HIGH.

Pros:

- More cohesive queue module.
- Removes the callback from `render-queue-operations`.

Cons:

- The operations module is currently pure and simple.
- Merging controller logic would mix queue mutation with executor orchestration.
- More dependencies would enter `render-queue-operations`.
- Existing low-risk separation would become broader and harder to verify.

Recommendation: Do not do this next. Keep `render-queue-operations.js` as the small operation layer.

### C. Split FFmpeg Engine First, Then Move Controller

Expected move:

- `runFfmpeg`
- encoder args/fallback helpers
- image probe/render segment helpers
- possibly `createRenderFromProject`

Risk: HIGH.

Pros:

- A later queue controller could depend on a clean `executeRenderJob`.
- Strong long-term boundary.

Cons:

- `createRenderFromProject` is large and coupled to many constants, helpers, paths, job mutation, GPU fallback, and temp cleanup.
- Moving engine first creates larger blast radius than moving `processRenderQueue`.
- Requires broader render tests.

Recommendation: Not next. Survey engine separately before any move.

## Recommended Next Step

Recommended order:

1. Add a tiny `executeRenderJob(job)` wrapper in `server.js` only if the next implementation phase needs a stable dependency name.
2. Move `processRenderQueue` to a new `server/render-queue-controller.js` using factory/configure dependency injection.
3. Keep `render-queue-operations.js` separate.
4. Keep `createRenderFromProject`, FFmpeg, GPU fallback, POST routes, cancel route, and shutdown in `server.js` for that phase.

Why:

- `processRenderQueue` itself has a compact dependency set.
- The highest risk is not FFmpeg execution, but preserving active ID clear/next queue timing and terminal patch mapping.
- Moving the controller before FFmpeg is smaller than moving the engine first.

## Expected Files For Next Implementation Phase

Likely files:

- `server.js`
- `server/render-queue-controller.js`
- `docs/STRUCTURE_PHASE1_22G_RENDER_QUEUE_CONTROLLER_20260715.md`

Potentially unchanged but verified:

- `server/render-queue-operations.js`
- `server/render-job-store.js`
- `server/render-job-utils.js`

## Expected server.js Reduction

If only `processRenderQueue` moves:

- Function body: about 39 lines.
- Added import/config wiring: about 10-18 lines.
- Net reduction: approximately 20-30 lines.

If an `executeRenderJob` wrapper is added first, net reduction may be closer to 15-25 lines.

## Areas To Keep Frozen

Do not modify in the next queue-controller extraction:

- `createRenderFromProject`
- `createVideoFromPhotos`
- `runFfmpeg`
- GPU encoder detection/fallback
- `POST /api/render`
- `POST /api/videos`
- `POST /api/render/cancel/:jobId`
- `cancelAllRenderJobs`
- Electron shutdown export shape
- upload middleware
- output routes
- job object shape
- status strings
- response JSON
- `render-job-store.js` state ownership
