# STRUCTURE PHASE 1-22C Render Queue Controller Survey

## 1. Queue Controller Flow

Current flow:

1. `POST /api/render` creates a job object with status `queued`.
2. The route stores it with `addRenderJob(job)`.
3. The route calls `enqueueRenderJob(job)`.
4. `enqueueRenderJob` pushes the job into `getRenderQueue()` and logs queue position.
5. `enqueueRenderJob` immediately calls `processRenderQueue()`.
6. `processRenderQueue` returns early when `getActiveRenderJobId()` is set.
7. If there is no active job, `processRenderQueue` shifts the next job from `getRenderQueue()`.
8. Already canceled jobs are skipped and `process.nextTick(processRenderQueue)` is scheduled.
9. The active job ID is set with `setActiveRenderJobId(nextJob.jobId)`.
10. `createRenderFromProject(nextJob.project, nextJob.files || [], nextJob)` starts.
11. On success, the job is updated to `completed`, progress `100`, and output fields are copied in.
12. On failure, the job is updated to `canceled` if `nextJob.canceled` is true, otherwise `failed`.
13. Terminal jobs call `scheduleJobCleanup(nextJob.jobId)`.
14. The `finally` block calls `clearActiveRenderJobId()` and then `processRenderQueue()` for the next item.

The queue runner is single-concurrency because `activeRenderJobId` is the execution gate.

## 2. Function Dependency Table

| Function | Input | Return | Reads State | Mutates State | Calls | Called By | FFmpeg | Route | Electron |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `pushJobLog` | `job`, `message` | none | job logs length | `job.logs` | `Date` | FFmpeg, render, queue, cancel, shutdown | indirect | yes | yes |
| `updateJob` | `job`, `patch` | none | none | job fields and `updatedAt` | `Date` | render, queue, cancel, shutdown | indirect | yes | yes |
| `scheduleJobCleanup` | `jobId` | timer handle ignored | `getRenderJob` | deletes terminal job later | `setTimeout`, `deleteRenderJob` | queue success/fail, queued cancel | no | yes | no |
| `removeQueuedJob` | `jobId` | removed job or `null` | `getRenderQueue` | queue array splice | none | cancel route | no | yes | no |
| `enqueueRenderJob` | `job` | none | queue position | queue push | `pushJobLog`, `processRenderQueue` | `POST /api/render` | no | yes | no |
| `processRenderQueue` | none | none | active ID, queue | active ID, job status fields | `createRenderFromProject`, `updateJob`, `pushJobLog`, `scheduleJobCleanup`, itself | enqueue, cancel, finally | yes via render engine | yes | no |
| `cancelAllRenderJobs` | `reason` | none | all jobs, queue | job canceled/status, queue clear, active clear | `pushJobLog`, `updateJob`, `currentProcess.kill`, `fs.rm` | exported to Electron | child process kill | no | yes |

## 3. Job State Transitions

Actual strings in current code:

| From | To | Location |
| --- | --- | --- |
| none | `queued` | `POST /api/render` job object |
| `queued` | `preparing` | `createRenderFromProject` first `updateJob` |
| `preparing` | `rendering` | `createRenderFromProject` after input confirmation |
| `rendering` | `completed` | `processRenderQueue().then` |
| `queued` | `canceled` | cancel route queued branch |
| `preparing/rendering` | `canceled` | cancel route active branch and queue catch |
| `preparing/rendering` | `failed` | queue catch when not canceled |

The code uses American spelling `canceled`, not `cancelled`.

There is no queue-level retry status. GPU encoder failure can retry a scene using CPU inside `createRenderFromProject`, but it does not requeue a job.

## 4. Concurrency Structure

- `activeRenderJobId` is set in `processRenderQueue` immediately before `createRenderFromProject`.
- `activeRenderJobId` is cleared only in the promise `finally` block and in `cancelAllRenderJobs`.
- Multiple `processRenderQueue()` calls are expected and safe because the active ID check returns early.
- A queued canceled job is skipped and schedules the next processing on `process.nextTick`.
- If `createRenderFromProject` throws synchronously before returning a promise, the current code path would be risky; however it is an `async` function and returns a promise.
- If a bug prevented the `finally` block from running, the queue would stall because `activeRenderJobId` would remain set.
- If `activeRenderJobId` were copied into another module instead of using the render-job-store singleton, duplicate execution could occur.

## 5. Cancel Flow

### Single Job Cancel Route

Route: `POST /api/render/cancel/:jobId`

1. Reads job with `getRenderJob`.
2. Missing job returns 404.
3. Terminal job returns current public job.
4. Sets `job.canceled = true`.
5. Logs `"사용자 취소 요청"`.
6. If job is still `queued`:
   - removes it with `removeQueuedJob`
   - updates status to `canceled`
   - removes uploaded files
   - logs queued cancel complete
   - schedules job cleanup
   - returns public job
7. If active:
   - updates status to `canceled`
   - kills `job.currentProcess` if present
   - calls `processRenderQueue()`
   - returns public job

### Shutdown Cancel

Function: `cancelAllRenderJobs`

1. Iterates all jobs.
2. Skips terminal jobs.
3. Sets `job.canceled = true`.
4. Logs shutdown reason.
5. Updates status to `canceled`.
6. Kills `currentProcess` when present.
7. Deletes upload files.
8. Clears queue array.
9. Clears active job ID.

Difference: single cancel returns HTTP response and schedules cleanup for queued cancel. Shutdown cancel is global and does not schedule cleanup timers.

## 6. Cleanup Flow

| Cleanup | Location | What It Removes | Notes |
| --- | --- | --- | --- |
| terminal job map cleanup | `scheduleJobCleanup` | `renderJobs` entry after 30 min | timer handle is not stored |
| render temp cleanup | `createRenderFromProject.finally` | uploaded files and workDir | runs after render attempt |
| queue catch cleanup | `processRenderQueue.catch` | `nextJob.files` | overlaps with render finally |
| queued cancel cleanup | cancel route | queued job uploaded files | no FFmpeg process |
| shutdown cleanup | `cancelAllRenderJobs` | non-terminal job uploaded files, process kill, queue clear | used by Electron |
| legacy video cleanup | `createVideoFromPhotos.finally` | uploaded files and workDir | separate from queue |

Outputs are not deleted by queue cleanup after a successful render. Output lifecycle is handled by outputs APIs.

Potential duplication exists between `createRenderFromProject.finally` and `processRenderQueue.catch`, both deleting uploaded files. Because `fs.rm(... force:true)` is used, this is currently tolerant but should not be refactored casually.

## 7. FFmpeg / Route / Electron Coupling

- `processRenderQueue` directly calls `createRenderFromProject`.
- `createRenderFromProject` calls `runFfmpeg`, `resolveRenderEncoder`, `probeInputImage`, output path helpers, scene filter helpers, and cleanup.
- `runFfmpeg` sets and clears `job.currentProcess`; cancel depends on this reference.
- `resolveRenderEncoder` calls `detectRenderEncoders` and logs to job.
- `POST /api/render` constructs the job object shape and calls `enqueueRenderJob`.
- `POST /api/render/cancel/:jobId` mutates queue/job state and can call `processRenderQueue`.
- `desktop/main.js` calls exported `cancelAllRenderJobs("프로그램 종료로 렌더링 취소")` during shutdown.

## 8. Separation Options

| Option | Move Scope | Dependency Injection | Risk | Estimated Reduction | Recommendation |
| --- | --- | --- | --- | --- | --- |
| A | `enqueueRenderJob`, `removeQueuedJob`, queue position control | store, `pushJobLog`, `processRenderQueue` callback | MEDIUM | 15-25 lines | possible but awkward because enqueue calls process |
| B | A + `processRenderQueue`, active set/clear, next job execution | store, `createRenderFromProject`, `updateJob`, `pushJobLog`, `scheduleJobCleanup`, file cleanup | HIGH | 55-80 lines | not until tests cover queued job execution |
| C | B + `pushJobLog`, `updateJob`, `scheduleJobCleanup` | timestamp, terminal statuses, store, render executor | HIGH | 70-100 lines | cleaner boundary, but broad API/job shape risk |
| D | C + cancel route/controller | store, HTTP route helpers, `fs`, public job, process kill, queue runner | HIGH | 90-120 lines | defer; cancel timing is sensitive |

## 9. Recommended Split

Recommended next implementation: A narrow controller extraction only if `processRenderQueue` remains injected from `server.js`.

Safer variant:

- move `removeQueuedJob`
- move a new `pushQueuedRenderJob(job)` helper that only pushes and logs via injected logger
- keep `enqueueRenderJob` in `server.js` because it calls `processRenderQueue`

Better alternative:

- Perform a small implementation phase that extracts `pushJobLog`, `updateJob`, and `scheduleJobCleanup` first into a job utility module.
- Then move queue controller after job update/log behavior is isolated and covered by route hashes.

## 10. Recommended Module Shape

For queue controller, prefer a factory or configure function over loose singleton globals.

Recommended when ready:

```js
function createRenderQueueController({
  store,
  executeRenderJob,
  updateJob,
  pushJobLog,
  scheduleJobCleanup,
  cleanupUploadedFiles
}) {
  // returns enqueue/remove/process/cancel helpers
}
```

This is safer than importing `server.js` or creating a second singleton. It also matches the current `render-job-store` pattern where state stays in one module and behavior receives explicit dependencies.

## 11. Expected Files For Actual Split

Likely files:

- `server.js`
- `server/render-queue-controller.js`
- maybe `server/render-job-utils.js`
- docs for the implementation phase

Do not modify:

- `public/app.js`
- `desktop/main.js`
- package files
- output/upload storage

## 12. Expected server.js Reduction

- A only: 15-25 lines
- job utility first: 15-25 lines
- B: 55-80 lines
- C/D: 70-120 lines but too risky now

Recommended practical target for next phase: 15-25 lines with either queue operation helpers or job utility helpers.

## 13. Risks To Guard

- Queue double-start if active ID is not authoritative.
- Queue stall if active ID is not cleared in all promise paths.
- Cancel response could return before process kill has propagated.
- `currentProcess` must remain on the same job object.
- Queued cancel and active cancel have different cleanup paths.
- Shutdown cleanup must keep Electron contract.
- Timer handles from `scheduleJobCleanup` are not tracked; moving this may complicate shutdown.
- Duplicated file deletion currently relies on force deletion tolerance.
- `/api/videos` is legacy but separate from queue and must not be pulled into queue controller accidentally.

## 14. Actual Split Prohibited Areas

For the next phase, continue to avoid moving:

- `runFfmpeg`
- `createRenderFromProject`
- `createVideoFromPhotos`
- `resolveRenderEncoder`
- `detectRenderEncoders`
- GPU fallback logic
- `POST /api/render`
- `POST /api/videos`
- `POST /api/render/cancel/:jobId`
- Electron shutdown code
- output/upload cleanup
