# Highlight Studio Structure Baseline Phase 1

## 1. Baseline Commit

- Branch: `main`
- Baseline commit: `f3d5c2b`
- Baseline commit message: `refactor: extract legacy video route`
- GitHub push status before this baseline: completed
- `server.js` line count: `527`
- Source working tree before this baseline: clean
- Included prior survey document:
  - `docs/STRUCTURE_PHASE1_25A_BOOTSTRAP_SHUTDOWN_SURVEY_20260716.md`

This baseline records the current structure before any Bootstrap or Shutdown extraction.

## 2. File Structure

### Composition Root

| Path | Main export | Responsibility | Connected from `server.js` |
| --- | --- | --- | --- |
| `server.js` | `app`, `startServer`, `cancelAllRenderJobs`, path constants | Composition root, env/path constants, service creation, route registration, startup/export | Top-level entrypoint |

### Helpers

| Path | Main exports | Responsibility | Main dependencies |
| --- | --- | --- | --- |
| `server/default-templates.js` | `DEFAULT_TEMPLATES` array | Built-in local template definitions | none |
| `server/ai-local-rules.js` | `clampScore`, `normalizeAiPhoto`, `analyzeAiPhotos`, `createStoryboardFromAnalysis` | Local rule-based AI analysis/storyboard helpers | none |
| `server/license-helpers.js` | `normalizeEmail`, `buildLicenseStatus` | Local license/auth status helper | `Date` |
| `server/output-helpers.js` | `resolveOutputMp4`, `outputFilePayload`, `getPublicBaseUrl`, `createShareInfo` | Output file path, payload, share URL helpers | `fs`, `path` |
| `server/project-helpers.js` | `validateProjectDocument`, `projectFileName`, `projectBackupFileName`, `cleanupOldBackups`, `listProjectBackups` | Project validation, backup naming/listing/cleanup helpers | `fs`, `path` |
| `server/template-helpers.js` | `safeTemplateName`, `readUserTemplates`, `writeUserTemplates`, `sanitizeTemplatePayload`, `getAllTemplates` | User template read/write/sanitize/merge helpers | `fs`, default templates |
| `server/upload-file-helpers.js` | `displayFileName`, `decodeUploadName`, `normalizeUploadedFiles` | Upload filename/display normalization | `path`, `Buffer` |

### Middleware

| Path | Main export | Responsibility | Connected from `server.js` |
| --- | --- | --- | --- |
| `server/upload-middleware.js` | `createUploadMiddleware` | Multer disk storage, file limit, file size limit, image MIME filter | Called once with `UPLOAD_DIR`, `MAX_PHOTOS`, `makeId` |

### Routes

| Path | Main export | Responsibility | Connected from `server.js` |
| --- | --- | --- | --- |
| `server/routes/system-routes.js` | `registerSystemRoutes` | Ping, health, login, license status, update check | registered with app/version/license helpers |
| `server/routes/ai-routes.js` | `registerAiRoutes` | Local AI photo analysis and storyboard APIs | registered with AI helpers |
| `server/routes/template-routes.js` | `registerTemplateRoutes` | Template list/create/delete APIs | registered with template helpers |
| `server/routes/output-read-routes.js` | `registerOutputReadRoutes` | Output list/share/download/open APIs | registered with output helpers and `openLocalPath` |
| `server/routes/output-write-routes.js` | `registerOutputWriteRoutes` | Output rename/delete APIs | registered with output helpers |
| `server/routes/project-save-routes.js` | `registerProjectSaveRoutes` | Project save and autosave write APIs | registered with project state/write helpers |
| `server/routes/project-load-routes.js` | `registerProjectLoadRoutes` | Project load and backup restore APIs | registered with backup read/recent helpers |
| `server/routes/project-read-routes.js` | `registerProjectReadRoutes` | Recent/autosave/backups read APIs | registered with state accessors and backup list helper |
| `server/routes/render-read-routes.js` | `registerRenderReadRoutes` | Render encoder/status/queue read APIs | registered with FFmpeg detection and job store public helpers |
| `server/routes/render-write-routes.js` | `registerRenderWriteRoutes` | Queued render create and cancel APIs | registered with upload, job store, queue, job utils |
| `server/routes/legacy-video-routes.js` | `registerLegacyVideoRoutes` | Deprecated synchronous `/api/videos` compatibility API | registered with upload and legacy renderer |

### Render State and Services

| Path | Main exports | Responsibility | State owner |
| --- | --- | --- | --- |
| `server/render-job-store.js` | render job store accessors, `publicJob`, `publicQueue` | Single render job `Map`, queue array, active job id, public response projection | owns `renderJobs`, `renderQueue`, `activeRenderJobId` |
| `server/render-job-utils.js` | `configureRenderJobUtils`, `pushJobLog`, `updateJob`, `scheduleJobCleanup` | Job log/update/terminal cleanup helpers | uses store accessors configured from `server.js` |
| `server/render-queue-operations.js` | `configureRenderQueueOperations`, `removeQueuedJob`, `enqueueRenderJob` | Queue add/remove operations | uses queue accessor and controller callback |
| `server/render-queue-controller.js` | `createRenderQueueController` | Active job execution loop and next-job progression | receives store/job utils/executor/cleanup |
| `server/ffmpeg-engine.js` | `createFfmpegEngine` | FFmpeg path, process execution, encoder detection/cache, encoder args | owns `encoderDetectionCache` inside engine instance |
| `server/render-executor.js` | `createRenderExecutor` | Queued project render orchestration, scene/filter building, GPU fallback, output creation | receives FFmpeg engine/job utils/path helpers |
| `server/legacy-video-renderer.js` | `createLegacyVideoRenderer` | Deprecated synchronous photo slideshow renderer for `/api/videos` | receives FFmpeg `runFfmpeg` and path/name helpers |

### Electron Desktop Integration

| Path | Responsibility | Server connection |
| --- | --- | --- |
| `desktop/main.js` | Electron app lifecycle, splash/main/settings windows, protocol registration, internal server startup, quit handling | requires `server.js`, calls `startServer(APP_PORT)`, calls `cancelAllRenderJobs()` on `before-quit`, closes returned server |
| `desktop/preload.js` | Renderer bridge | No direct server lifecycle ownership |

## 3. Module Responsibilities

- Helpers hold pure or narrowly scoped file/payload functions.
- Route modules register API handlers onto the shared Express `app`.
- Render state modules own queue/job state and public response projection.
- FFmpeg Engine owns binary path, process execution, encoder detection, and encoder cache.
- Render Executor owns queued project render orchestration.
- Legacy Video Renderer owns deprecated synchronous slideshow creation only.
- `server.js` owns composition and the remaining unextracted bootstrap/shutdown responsibilities.

## 4. Complete Route List

Total registered routes found: `31`.

| Method | Path | Defined in | Auth/license gate | Upload | Read/Write | Main dependency |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/health` | `server.js` | yes, global `licenseGate` | no | read | `getFfmpegPath` |
| OPTIONS | `/api/ping` | `server/routes/system-routes.js` | yes | no | read/preflight | CORS headers |
| GET | `/api/ping` | `server/routes/system-routes.js` | yes | no | read | app/version constants |
| GET | `/api/health` | `server/routes/system-routes.js` | yes | no | read | `APP_VERSION`, `PORT` |
| POST | `/api/auth/login` | `server/routes/system-routes.js` | yes | no | write-like/session response only | `normalizeEmail`, `buildLicenseStatus` |
| POST | `/api/auth/logout` | `server.js` | yes | no | write-like/stateless | inline response |
| GET | `/api/license/status` | `server/routes/system-routes.js` | yes | no | read | `buildLicenseStatus` |
| GET | `/api/update/check` | `server/routes/system-routes.js` | yes | no | read | env update variables |
| POST | `/api/ai/analyze-photos` | `server/routes/ai-routes.js` | yes | no | read-like local calculation | `analyzeAiPhotos` |
| POST | `/api/ai/create-storyboard` | `server/routes/ai-routes.js` | yes | no | read-like local calculation | `createStoryboardFromAnalysis` |
| GET | `/api/templates` | `server/routes/template-routes.js` | yes | no | read | `getAllTemplates` |
| POST | `/api/templates` | `server/routes/template-routes.js` | yes | no | write | `sanitizeTemplatePayload`, `writeUserTemplates` |
| DELETE | `/api/templates/:templateId` | `server/routes/template-routes.js` | yes | no | write | user template file |
| POST | `/api/videos` | `server/routes/legacy-video-routes.js` | yes | `upload.array("photos", MAX_PHOTOS)` | write/render | `createVideoFromPhotos` |
| GET | `/api/render/encoders` | `server/routes/render-read-routes.js` | yes | no | read | `detectRenderEncoders` |
| GET | `/api/render/status/:jobId` | `server/routes/render-read-routes.js` | yes | no | read | `getRenderJob`, `publicJob` |
| GET | `/api/render/queue` | `server/routes/render-read-routes.js` | yes | no | read | `publicQueue`, queue accessors |
| POST | `/api/render` | `server/routes/render-write-routes.js` | yes | `upload.array("photos", MAX_PHOTOS)` | write/render job | job store, queue operations |
| POST | `/api/render/cancel/:jobId` | `server/routes/render-write-routes.js` | yes | no | write/job state | job store, `currentProcess.kill("SIGTERM")` |
| POST | `/api/project/save` | `server/routes/project-save-routes.js` | yes | no | write | backup write, recent/autosave state |
| POST | `/api/project/autosave` | `server/routes/project-save-routes.js` | yes | no | write | autosave state, backup write |
| POST | `/api/project/load` | `server/routes/project-load-routes.js` | yes | no | write-like state/recent | project validation, recent state |
| POST | `/api/project/backups/:backupId/restore` | `server/routes/project-load-routes.js` | yes | no | write-like state/recent | backup read, recent state |
| GET | `/api/project/recent` | `server/routes/project-read-routes.js` | yes | no | read | recent state accessor |
| GET | `/api/project/autosave` | `server/routes/project-read-routes.js` | yes | no | read | autosave state accessor |
| GET | `/api/project/backups` | `server/routes/project-read-routes.js` | yes | no | read | `listProjectBackups` |
| GET | `/api/outputs` | `server/routes/output-read-routes.js` | yes | no | read | output folder |
| GET | `/api/outputs/:filename/share-info` | `server/routes/output-read-routes.js` | yes | no | read | output/share helpers |
| GET | `/api/outputs/:filename/download` | `server/routes/output-read-routes.js` | yes | no | read/download | `res.download` |
| POST | `/api/outputs/:filename/open` | `server/routes/output-read-routes.js` | yes | no | write-like OS action | `openLocalPath` |
| POST | `/api/outputs/open-folder` | `server.js` | yes | no | write-like OS action | `openLocalPath(OUTPUT_DIR)` |
| PATCH | `/api/outputs/:filename` | `server/routes/output-write-routes.js` | yes | no | write | `fs.rename` |
| DELETE | `/api/outputs/:filename` | `server/routes/output-write-routes.js` | yes | no | write | `fs.unlink` |

Note: `/api/templates` currently has GET/POST/DELETE routes. No active PATCH template route was found in the current code.

## 5. Remaining `server.js` Responsibilities

| Lines | Responsibility | Split need |
| --- | --- | --- |
| 1-107 | Imports and dependency list | Can shrink after bootstrap factory extraction |
| 109-124 | Env and constants | Some should remain entrypoint/bootstrap config |
| 125-141 | Project helper import and FFmpeg engine instance | Bootstrap factory candidate |
| 142-149 | Project autosave/recent state | Keep until project state/storage phase |
| 150-154 | Render job store/utils configuration | Bootstrap factory candidate |
| 156-159 | Directory creation | Bootstrap factory candidate, preserve timing |
| 161 | Express app creation | Bootstrap factory candidate |
| 163-177 | `.env` loader | May remain entrypoint or become env helper |
| 179-183 | `licenseGate` middleware | Low-value helper; can move with bootstrap |
| 185-212 | `safeName`, `makeId`, `openLocalPath` | common helper candidate after bootstrap |
| 214-222 | Upload middleware and `cleanupUploadedFiles` | Bootstrap/common helper candidate |
| 224-235 | startup encoder logging | startup/server runner candidate |
| 237-245 | `ffmpegListPath`, `safeOutputFileName` | render/output common helper candidate |
| 247-255 | legacy renderer creation | Bootstrap factory candidate |
| 257-320 | project payload/recent/backup write/load helpers | project state/storage follow-up |
| 322-359 | render executor, queue controller, queue operation wiring | Bootstrap factory candidate |
| 361-470 | middleware and route registration | Bootstrap factory candidate |
| 472-487 | `cancelAllRenderJobs` | shutdown manager candidate |
| 489-491 | error middleware | Bootstrap factory candidate |
| 493-514 | `startServer` | server runner candidate |
| 516-527 | direct run and exports | should mostly remain in `server.js` |

## 6. Initialization Order

Actual order:

1. Import modules.
2. `loadLocalEnv()`.
3. Define constants and paths.
4. Require default templates and project helpers.
5. Create FFmpeg Engine.
6. Destructure FFmpeg Engine functions and encoder map.
7. Initialize project autosave/recent state.
8. Configure Render Job Store with encoder map.
9. Configure Render Job Utilities with job store accessors.
10. Ensure upload/output/data/backup directories.
11. Create Express app.
12. Define local middleware/common helpers.
13. Create upload middleware instance.
14. Create Legacy Video Renderer instance.
15. Define project state/write helpers.
16. Create Render Executor instance.
17. Create Render Queue Controller instance.
18. Configure Render Queue Operations with `processRenderQueue`.
19. Register middleware/static.
20. Register `/health`.
21. Register system routes.
22. Register render read routes.
23. Register AI routes.
24. Register project save/load/read routes.
25. Register template routes.
26. Register auth logout.
27. Register legacy video route.
28. Register render write routes.
29. Register output read/open-folder/write routes.
30. Register error middleware.
31. Define/export `startServer` and `cancelAllRenderJobs`.
32. Direct-run guard calls `startServer(PORT)`.

## 7. Dependency Relationships

- FFmpeg Engine is created once in `server.js`.
- Render Executor and Legacy Video Renderer both receive `runFfmpeg` from the same FFmpeg Engine instance.
- Render Read Routes receive `detectRenderEncoders` from the same FFmpeg Engine instance.
- Render Job Store owns the render job map, queue array, and active job id.
- Render Queue Controller receives store accessors and `createRenderFromProject`.
- Render Queue Operations receives the queue accessor and `processRenderQueue`.
- Render Write Routes enqueue jobs through Render Queue Operations.
- Cancel route mutates job state and may kill `job.currentProcess`.
- Electron imports `server.js`; it does not import any internal service modules directly.

No circular `require` relationship was found in the inspected structure. Dependencies flow from `server.js` into modules by factory/register injection.

## 8. Single State Source Map

| State | Owner | Access pattern |
| --- | --- | --- |
| `renderJobs` | `server/render-job-store.js` | Map accessed through exported functions |
| `renderQueue` | `server/render-job-store.js` | Array accessed through `getRenderQueue()` |
| `activeRenderJobId` | `server/render-job-store.js` | getter/setter/clear functions |
| Encoder detection cache | `server/ffmpeg-engine.js` instance | private `encoderDetectionCache` in one engine instance |
| Upload middleware instance | `server.js` | one `const upload = createUploadMiddleware(...)` passed to routes |
| Express app | `server.js` | one `const app = express()` exported |
| HTTP server instance | runtime return from `startServer()` | owned by caller; Electron stores as `serverInstance` |
| Project autosave | `server.js` | `projectAutosave` plus accessor/setter functions |
| Recent projects | `server.js` | `recentProjects` array plus accessor/mutator helpers |

## 9. Render Queue Flow

1. `POST /api/render` receives uploaded photos.
2. `normalizeUploadedFiles(req.files)` normalizes multer file metadata.
3. `parseProjectPayload(req.body.project)` validates JSON project payload.
4. Route creates job object with status `queued`.
5. `addRenderJob(job)` stores job in `renderJobs`.
6. `enqueueRenderJob(job)` pushes job to `renderQueue`, logs position, and calls `processRenderQueue()`.
7. Queue controller exits if an active job exists.
8. Queue controller shifts the next job from `renderQueue`.
9. Active job id is set.
10. `createRenderFromProject(project, files, job)` performs render execution.
11. On success, queue controller updates job to `completed` and schedules cleanup.
12. On failure/cancel, queue controller updates job to `failed` or `canceled`, cleans uploaded files, and schedules cleanup.
13. Finally, active id is cleared and the next queue item is processed.

## 10. FFmpeg / Executor / Legacy Flow

### Queued `/api/render`

```text
POST /api/render
-> render job store
-> enqueueRenderJob
-> processRenderQueue
-> createRenderFromProject
-> runFfmpeg
-> output file
-> public job/status APIs
```

Characteristics:

- Async queued semantics.
- Success response is `202` with `jobId` and `statusUrl`.
- Render Executor does scene/photo matching, image probing, filter graph construction, encoder selection, GPU fallback, and cleanup.
- FFmpeg Engine manages child process lifecycle, `job.currentProcess`, stderr logging, timeout handling, cancel detection, and encoder cache.

### Deprecated `/api/videos`

```text
POST /api/videos
-> upload.array("photos", MAX_PHOTOS)
-> createVideoFromPhotos
-> runFfmpeg
-> output file
-> synchronous 201 response
```

Characteristics:

- Deprecated compatibility route.
- Synchronous completion semantics.
- Response includes `deprecated: true`, `replacement: "/api/render"`, and the legacy message.
- Uses the same FFmpeg Engine instance through injected `runFfmpeg`.
- Does not use render queue/job store.

## 11. Current Shutdown State

### Electron

- `desktop/main.js` calls `serverModule.startServer(APP_PORT)`.
- `desktop/main.js` stores the returned HTTP server as `serverInstance`.
- On `before-quit`, Electron calls:
  - `serverModule?.cancelAllRenderJobs?.(...)`
  - `serverInstance.close()` if it owns the internal server

### `cancelAllRenderJobs`

Current behavior:

- Skips terminal jobs.
- Marks non-terminal jobs as canceled.
- Logs shutdown reason.
- Updates status to `canceled`.
- Kills active `job.currentProcess` with `SIGTERM`.
- Removes uploaded files for non-terminal jobs.
- Clears queue array in place.
- Clears active render job id.

Current limitations intentionally recorded for later:

- No Node direct SIGINT/SIGTERM handler in `server.js`.
- No async wait for upload cleanup callbacks.
- No wait for FFmpeg process exit.
- No explicit duplicate shutdown guard.
- No forced shutdown timeout.

These are baseline facts, not changes in this phase.

## 12. Duplicate Scan Results

### Actual duplicates

- No duplicate route registration found for the same method/path in `server.js` or `server/routes/**/*.js`.
- No duplicate render queue array or active job id source found.
- No duplicate FFmpeg Engine instance creation found.
- No duplicate Render Executor instance creation found.
- No duplicate Legacy Renderer instance creation found.
- No duplicate upload middleware instance creation found.

### Purposeful compatibility duplication

- `/api/videos` and `/api/render` both render MP4 output from photos, but semantics differ:
  - `/api/videos`: deprecated, synchronous, compatibility response, no queue.
  - `/api/render`: current queued workflow, returns `202`, status polling, cancel support.
- Legacy renderer and Render Executor both call `runFfmpeg`, but they target different API contracts.

### Duplicates to keep until after v1.0

- Legacy `/api/videos` compatibility path.
- Legacy slideshow renderer.
- Inline output open-folder route, unless a later output route consolidation is explicitly scoped.

### Bootstrap-phase removable duplication/candidates

- Scattered factory wiring and route registration in `server.js` can move into a bootstrap factory.
- `safeName`, `makeId`, `ffmpegListPath`, `safeOutputFileName`, and `cleanupUploadedFiles` are common helper candidates, but should not move before bootstrap boundaries are stable.

### Later improvement tasks

- Graceful shutdown manager.
- Common local path/open helper module.
- Project state/storage module.
- Common startup logging/server runner.

## 13. Non-Destructive Compatibility Verification

No state-changing render/upload/output/project POST was called in this phase.

Static/source compatibility checks:

- `POST /api/render` remains registered in `server/routes/render-write-routes.js`.
- `POST /api/render` response remains `202` with `{ ok, jobId, statusUrl }`.
- Initial render job object still includes `jobId`, `status`, `progress`, photo counts, output fields, `error`, `failedPhotos`, `logs`, `project`, `files`, `currentProcess`, `canceled`, and timestamps.
- `POST /api/render/cancel/:jobId` still uses `job.currentProcess.kill("SIGTERM")` for active jobs.
- `POST /api/videos` remains registered in `server/routes/legacy-video-routes.js`.
- `/api/videos` still uses `upload.array("photos", maxPhotos)` and receives `MAX_PHOTOS` from `server.js`.
- `/api/videos` deprecated metadata remains in source:
  - `deprecated: true`
  - `replacement: "/api/render"`
  - `message: "POST /api/videos is deprecated. Use POST /api/render for new integrations."`

## 14. Full Validation Results

Required static checks:

- `node --check server.js`
- full `server/**/*.js` syntax check
- `node --check desktop/main.js`
- `node --check desktop/preload.js`
- `node --check public/app.js`
- `npm.cmd run check`
- `git diff --check`

Read API regression was performed with only safe requests:

- `GET /api/health`
- `GET /api/render/encoders`
- `GET /api/render/queue`
- `GET /api/render/status/__missing__`
- `GET /api/templates`
- `GET /api/outputs`
- `GET /api/project/recent`
- `GET /api/license/status`
- `POST /api/ai/analyze-photos` with fixed JSON payload

Dynamic field handling:

- Encoder `checkedAt` is expected to be dynamic.

## 15. User Data Protection

This baseline phase must not create render jobs, upload files, run FFmpeg, create outputs, delete outputs, modify templates, or change project/backups.

Protection checklist:

- No render POST
- No upload POST
- No cancel POST
- No FFmpeg execution
- No output write/delete
- No project save/autosave/restore
- No package file changes
- No source file changes

## 16. Known Remaining Structure Tasks

1. Bootstrap Factory extraction.
2. Shutdown Manager survey and later extraction.
3. Project state/storage consolidation.
4. Common helper consolidation after bootstrap.
5. Output open-folder route consolidation.
6. Direct Node graceful shutdown behavior.

## 17. Next Bootstrap Phase Minimum Scope

Recommended next implementation scope:

- Create `server/bootstrap.js`.
- Move app/service/route composition into bootstrap.
- Preserve all existing route registration order.
- Preserve single instances:
  - Express app
  - upload middleware
  - FFmpeg Engine
  - Render Executor
  - Legacy Renderer
  - Queue Controller
- Preserve `server.js` public exports.
- Preserve `startServer(port)` behavior and local loopback binding.
- Do not modify Electron in the first bootstrap extraction unless a validation failure requires it.

Expected files:

- `server.js`
- `server/bootstrap.js`
- `docs/STRUCTURE_PHASE1_25B_BOOTSTRAP_FACTORY_20260716.md`

## 18. Realistic Final `server.js` Target

Current: `527` lines.

Practical target after Bootstrap Factory:

- `180-260` lines

Practical target after Bootstrap + Server Runner + Shutdown Manager:

- `120-200` lines

Recommended final target:

- `150-220` lines

The final target should be based on responsibility boundaries rather than line count alone. A readable final `server.js` should keep entrypoint duties, public exports, and direct-run behavior clear.
