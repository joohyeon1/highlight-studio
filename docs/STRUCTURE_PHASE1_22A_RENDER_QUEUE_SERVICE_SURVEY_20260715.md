# STRUCTURE PHASE 1-22A Render Queue / Service Survey

## 1. Current Render Queue Flow

1. Frontend sends `POST /api/render` with multipart `photos` and `project`.
2. Route normalizes uploaded file names and parses the project payload.
3. Route creates an in-memory job object with status `queued`.
4. Job is stored in `renderJobs` by `jobId`.
5. Job is appended to `renderQueue` through `enqueueRenderJob(job)`.
6. `enqueueRenderJob` logs queue position and calls `processRenderQueue()`.
7. `processRenderQueue` starts only when `activeRenderJobId` is empty.
8. The next queued job is shifted from `renderQueue`.
9. `activeRenderJobId` is set to the selected job ID.
10. `createRenderFromProject(project, files, job)` performs FFmpeg-based rendering.
11. On success, job becomes `completed` and output metadata is copied into the job.
12. On failure, job becomes `failed` or `canceled`.
13. Job cleanup is scheduled for terminal jobs.
14. `activeRenderJobId` is cleared and `processRenderQueue()` is called again.

Concurrency is limited by the single `activeRenderJobId` gate.

## 2. Function And Variable Inventory

| Name | Location | Role | State/IO |
| --- | --- | --- | --- |
| `renderJobs` | `server.js:94` | `Map` of all in-memory render jobs | module-scope memory |
| `renderQueue` | `server.js:95` | pending job array | module-scope memory |
| `activeRenderJobId` | `server.js:96` | currently running job ID | module-scope memory |
| `getRenderJob` | `server.js:106` | read accessor for render-read routes | memory read |
| `getActiveRenderJobId` | `server.js:107` | active job accessor | memory read |
| `getQueuedRenderCount` | `server.js:108` | queued count accessor | memory read |
| `pushJobLog` | `server.js:179` | appends timestamped log entries, trims to 300 | mutates job |
| `updateJob` | `server.js:185` | merges patch and updates `updatedAt` | mutates job |
| `getQueuePosition` | `server.js:190` | computes 1-based position for queued jobs | reads queue |
| `publicJob` | `server.js:196` | full public job response shape | reads job/encoder constants |
| `publicQueue` | `server.js:227` | queue list response shape sorted by `createdAt` | reads `renderJobs` |
| `scheduleJobCleanup` | `server.js:251` | removes terminal jobs after 30 minutes | mutates `renderJobs` later |
| `runFfmpeg` | `server.js:260` | spawns FFmpeg and links child process to job | child process, mutates `currentProcess` |
| `checkFfmpeg` | `server.js:304` | probes FFmpeg availability | child process |
| `getFfmpegEncodersText` | `server.js:312` | reads FFmpeg encoder list | child process |
| `probeFfmpegEncoder` | `server.js:323` | runtime encoder probe | child process |
| `detectRenderEncoders` | `server.js:341` | GPU/CPU encoder detection and cache update | child process, cache |
| `resolveRenderEncoder` | `server.js:375` | chooses requested/auto encoder and logs fallback | reads cache, mutates logs |
| `getEncoderArgs` | `server.js:405` | FFmpeg args for CPU/NVENC/QSV/AMF | pure-ish helper |
| `probeInputImage` | `server.js:428` | validates file with FFmpeg | child process, fs read |
| `getRenderPhotos` | `server.js:536` | matches uploaded files to project photos | reads upload file objects |
| `createRenderFromProject` | `server.js:626` | main render implementation | FFmpeg, fs, output, cleanup |
| `removeQueuedJob` | `server.js:773` | removes queued job by ID | mutates queue |
| `enqueueRenderJob` | `server.js:779` | appends job and starts processing | mutates queue |
| `processRenderQueue` | `server.js:785` | single-job runner loop | mutates active state/job |
| `createVideoFromPhotos` | `server.js:826` | legacy `/api/videos` renderer | FFmpeg, output, cleanup |
| `cancelAllRenderJobs` | `server.js:1064` | Electron/server shutdown cleanup hook | kills child process, deletes temp uploads |

## 3. Route Dependencies

| Route | Queue Dependency | Mutation | Notes |
| --- | --- | --- | --- |
| `POST /api/render` | `renderJobs`, `enqueueRenderJob`, `makeId`, upload files | creates job, appends queue | active render entry point |
| `POST /api/videos` | none of queue; uses legacy `createVideoFromPhotos` | creates output directly | deprecated compatibility path |
| `GET /api/render/encoders` | `detectRenderEncoders` | may update encoder cache | already extracted into read route module |
| `GET /api/render/status/:jobId` | `getRenderJob`, `publicJob` | none | already extracted |
| `GET /api/render/queue` | `getActiveRenderJobId`, `getQueuedRenderCount`, `publicQueue` | none | already extracted |
| `POST /api/render/cancel/:jobId` | `renderJobs`, `removeQueuedJob`, `processRenderQueue`, `publicJob` | mutates job/queue, kills process | high risk |
| Electron shutdown | `cancelAllRenderJobs` export | mutates all non-terminal jobs and queue | desktop/main.js calls this on quit |

## 4. Job Object Structure

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

Additional fields are assigned during render:

- `encoderRequested`
- `encoder`
- `encoderCodec`
- `encoderLabel`
- `encoderFallback`
- `encoderFallbackMessage`

Public shape is controlled by `publicJob` and `publicQueue`; these are API-contract-critical.

## 5. State Transition Table

| From | To | Location | Trigger |
| --- | --- | --- | --- |
| none | `queued` | `POST /api/render` | job creation |
| `queued` | `preparing` | `createRenderFromProject` | selected by queue processor |
| `preparing` | `rendering` | `createRenderFromProject` | FFmpeg ready/input files confirmed |
| `rendering` | `completed` | `processRenderQueue.then` | `createRenderFromProject` resolved |
| `queued` | `canceled` | cancel route | user cancels queued job |
| `preparing/rendering` | `canceled` | cancel route / `runFfmpeg` close | user cancels active job |
| any non-terminal active | `failed` | `processRenderQueue.catch` | render error |
| terminal | deleted from `renderJobs` | `scheduleJobCleanup` | 30 minute timeout |

There is no retry API or explicit retry service. GPU encode failure inside one scene can retry that scene with CPU, but this is not a queue-level job retry.

## 6. FFmpeg / GPU / Cancel / Cleanup Coupling

- `runFfmpeg` stores the spawned child process in `job.currentProcess`.
- Cancel route checks `job.currentProcess` and kills it with `SIGTERM`.
- `runFfmpeg` rejects with "렌더링이 취소되었습니다." if `job.canceled` is true.
- `createRenderFromProject` performs GPU fallback by mutating `job.encoder`, `job.encoderCodec`, `job.encoderLabel`, and fallback flags.
- `createRenderFromProject` deletes uploaded files and work dir in `finally`.
- `processRenderQueue.catch` also deletes `nextJob.files`; this overlaps with render cleanup.
- `cancelAllRenderJobs` kills any current process and deletes `job.files`, then clears queue state.
- `detectRenderEncoders` uses child processes and caches results in `encoderDetectionCache`.

This means queue state, FFmpeg child process references, cancel, cleanup, and GPU fallback are tightly coupled.

## 7. Global State Analysis

Move candidates:

- `renderJobs`
- `renderQueue`
- `activeRenderJobId`
- `getRenderJob`
- `getActiveRenderJobId`
- `getQueuedRenderCount`
- `removeQueuedJob`
- `enqueueRenderJob`
- `processRenderQueue`

Likely stay in `server.js` until a larger service boundary exists:

- `ffmpegPath`
- `UPLOAD_DIR`
- `OUTPUT_DIR`
- `RENDER_ENCODERS`
- route registration order
- `cancelAllRenderJobs` export interface expected by Electron

Closure/order concerns:

- `processRenderQueue` calls `createRenderFromProject`, `updateJob`, `pushJobLog`, `scheduleJobCleanup`.
- `createRenderFromProject` calls many helpers declared earlier and relies on output/upload dirs.
- `cancelAllRenderJobs` is exported at the bottom and used by Electron.
- Moving only some state without the lifecycle functions would create broad dependency injection or circular references.

## 8. Separation Boundary Options

| Option | Scope | Risk | Pros | Cons |
| --- | --- | --- | --- | --- |
| A | queue state and accessors only | MEDIUM | small line reduction; read routes can use service accessors | POST/cancel/process functions still mutate state through injected object; partial ownership awkward |
| B | job creation/query/status mutation helpers | MEDIUM-HIGH | centralizes job object shape and `updateJob` | touches `POST /api/render`, public API shape, queue position |
| C | queue execution control | HIGH | owns single-runner invariant | touches active job timing, completion/failure, cleanup, next-job behavior |
| D | full render service except FFmpeg execution | HIGH | clearer long-term boundary | requires many dependencies and risks cancel/GPU/cleanup behavior |

Recommended next step: A small actual extraction of render job store/accessors only is possible but not ideal. The safer next phase is another focused implementation that moves `renderJobs`, `renderQueue`, `activeRenderJobId`, `getRenderJob`, `getActiveRenderJobId`, `getQueuedRenderCount`, `getQueuePosition`, `publicJob`, and `publicQueue` together into a `render-job-store` module only if public response hashes are locked.

## 9. Risk Elements

- `POST /api/render` response shape must stay `{ ok, jobId, statusUrl }`.
- Legacy `POST /api/videos` must remain compatible and separate from queue.
- Job ID prefix `render` must not change.
- Job object fields must not change because frontend reads status/queue fields.
- Queue ordering must remain `createdAt` sort in public queue and FIFO shift in execution.
- Cancel timing depends on `job.currentProcess` and `job.canceled`.
- `activeRenderJobId` is the only concurrency guard.
- If `finally` does not clear `activeRenderJobId`, queue can stall.
- If cleanup is duplicated or moved incorrectly, uploaded files can remain or be deleted too early.
- Electron shutdown depends on exported `cancelAllRenderJobs`.
- GPU fallback mutates job fields during scene render.
- Encoder detection cache is separate but connected to route and render service.

## 10. Minimum Modification Recommendation

For the next actual phase, prefer a narrow "render job store" extraction:

Create:

- `server/render-job-store.js`

Candidate moves:

- `renderJobs`
- `renderQueue`
- `activeRenderJobId`
- `getRenderJob`
- `getActiveRenderJobId`
- `getQueuedRenderCount`
- `getQueuePosition`
- `publicJob`
- `publicQueue`

Do not move yet:

- `POST /api/render`
- `POST /api/render/cancel/:jobId`
- `processRenderQueue`
- `createRenderFromProject`
- `runFfmpeg`
- `cancelAllRenderJobs`

Expected risk: MEDIUM, because cancel and process functions still need mutation access. If this creates too many setter functions, defer and instead extract `publicJob/publicQueue` only.

## 11. Expected Files For Next Actual Split

Likely files:

- `server.js`
- `server/render-job-store.js`
- `docs/STRUCTURE_PHASE1_22B_RENDER_JOB_STORE_20260715.md`

Potential dependency injection:

- `RENDER_ENCODERS`
- terminal status list
- maybe queue mutation methods such as `addJob`, `removeQueuedJob`, `clearQueue`, `setActiveJobId`

## 12. Modification-Prohibited Areas

Do not change in the next small phase:

- FFmpeg command construction
- `runFfmpeg`
- `createRenderFromProject`
- GPU fallback
- output creation
- upload cleanup
- cancel route behavior
- Electron shutdown contract
- `/api/videos`
- `/api/render` response shape

## 13. Expected server.js Reduction

Depending on boundary:

- A: queue state + accessors only: about 10-20 lines
- public shape helpers too: about 45-65 lines
- process control too: about 90-130 lines, but high risk
- full service without FFmpeg: 150+ lines, not recommended yet

Recommended next actual reduction target: 45-65 lines if moving public job/queue helpers with state store, otherwise 10-20 lines for state/accessors only.
