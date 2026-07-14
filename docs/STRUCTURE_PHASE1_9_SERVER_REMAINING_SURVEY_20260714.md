# Structure Phase 1-9 Server Remaining Survey

Date: 2026-07-14

Scope: survey only. No application code, route, package, user project, upload, output, template, or backup data was intentionally changed.

Baseline:

- Branch: `main`
- Latest commit: `9b4111a refactor: extract project storage helpers`
- `server.js`: 1253 lines
- Git status before this document: clean

## 1. Full `server.js` Block Map

| Lines | Block | Responsibility | Notes |
| ---: | --- | --- | --- |
| 1-34 | imports and extracted helper requires | Node modules, Express/Multer, extracted server helpers | No circular dependencies observed. |
| 36-80 | env load, constants, state, directory init, FFmpeg path | `PORT`, bind host, root/data/upload/output dirs, render/project state | Still mixes app bootstrap, filesystem setup, and runtime state. |
| 82-153 | Express instance, local env loader, license middleware, common naming, OS open, upload/multer | request setup and upload guard | Upload/multer not yet extracted. |
| 155-234 | render job public state and queue helpers | log/update/public job/queue cleanup | Strongly coupled to `renderJobs`, `renderQueue`, `activeRenderJobId`. |
| 236-379 | FFmpeg process and encoder detection | child process execution, ffmpeg availability, GPU encoder probing | High-risk; keep until render module split. |
| 381-453 | render utility and payload helpers | encoder args, ffmpeg list path, image probe, output name, render project parser | Mixed render/output/project payload logic. |
| 455-510 | project state/write/restore helpers | recent summary, recent memory update, backup write, backup restore | State and filesystem side effects remain. |
| 512-600 | render input and filter helpers | selected photo mapping, resolution, quality, captions, scene filters | Render-specific and FFmpeg-specific. |
| 602-748 | queued render creation from project | main render engine for current `/api/render` | Highest-risk block. |
| 749-800 | queue processing | enqueue/dequeue/cancel transition and cleanup | Strong render state coupling. |
| 802-858 | legacy video creation | `/api/videos` compatibility path | Render-like but separate implementation. |
| 860-865 | Express middleware/static | JSON/body/static setup | Bootstrap candidate. |
| 867-914 | health/ping/render encoders routes | system and read-only render metadata | Low-medium route split candidate. |
| 916-953 | AI routes | local-rule AI analysis/storyboard | Helpers extracted, routes still inline. |
| 955-1068 | template and project routes | templates CRUD, project save/load/autosave/backups | Templates route split is easier than project route split. |
| 1070-1106 | auth/license/update routes | local login, license status, update check | Good low-risk grouped route extraction candidate. |
| 1108-1185 | upload/render/legacy video/render status/queue routes | upload, queue creation/status | High-risk due Multer, queue, files, FFmpeg state. |
| 1188-1276 | outputs routes | list/share/download/open/rename/delete | Helpers extracted, routes still inline with file mutations. |
| 1278-1302 | render cancel route | cancel queued/active jobs | High-risk stateful route. |
| 1304-1319 | shutdown render cleanup | cancel all jobs and delete temp uploads | Electron shutdown-related. |
| 1321-1323 | error middleware | generic request error handler | Bootstrap or app-factory candidate. |
| 1325-1356 | start/export | loopback server start, error logging, exported API | Keep stable until final bootstrap split. |

## 2. Extracted Module Status

| Module | Lines | Exports | Used In `server.js` | Circular Dependency | Split Quality |
| --- | ---: | --- | --- | --- | --- |
| `server/default-templates.js` | 93 | `DEFAULT_TEMPLATES` array | line 51; template routes and template helpers use it | None | Good, static data. |
| `server/ai-local-rules.js` | 162 | `clampScore`, `normalizeAiPhoto`, `analyzeAiPhotos`, `createStoryboardFromAnalysis` | AI routes | None | Good, pure local rules. |
| `server/license-helpers.js` | 29 | `normalizeEmail`, `buildLicenseStatus` | auth/license routes | None | Good, pure helper. |
| `server/output-helpers.js` | 52 | `resolveOutputMp4`, `outputFilePayload`, `getPublicBaseUrl`, `createShareInfo` | outputs routes | None | Good, but routes still handle mutations. |
| `server/template-helpers.js` | 50 | `safeTemplateName`, `readUserTemplates`, `writeUserTemplates`, `sanitizeTemplatePayload`, `getAllTemplates` | template routes | None | Good; contains its own local `makeId`. |
| `server/upload-file-helpers.js` | 27 | `displayFileName`, `decodeUploadName`, `normalizeUploadedFiles` | upload/render routes and image probe | None | Good, upload response normalization only. |
| `server/project-helpers.js` | 84 | `validateProjectDocument`, `projectFileName`, `projectBackupFileName`, `cleanupOldBackups`, `listProjectBackups` | project save/list and backup write | None | Useful, but duplicates `safeName` by design to avoid broad common helper churn. |

No module currently imports `server.js`, so no circular dependency was found.

Possible over-splitting:

- `license-helpers.js` is tiny but stable and harmless.
- `upload-file-helpers.js` is tiny but isolates tricky filename encoding behavior.
- `project-helpers.js` duplicates `safeName`, but this is safer than centralizing shared naming across render/output/project/template in the same phase.

## 3. Remaining Named Functions In `server.js`

| Function | Line | Called By | Route Area | External/State Dependency | FS/OS/Child Process | Risk | Split Recommendation |
| --- | ---: | --- | --- | --- | --- | --- | --- |
| `loadLocalEnv` | 84 | startup | bootstrap | `process.env` | reads `.env` | LOW | Move with bootstrap/app factory later. |
| `licenseGate` | 100 | middleware | system | request mutation | none | LOW | Move with auth/license routes. |
| `safeName` | 106 | upload filename, output filename, render, legacy video | common | `crypto` no, pure string | none | MEDIUM | Extract only after common naming survey. |
| `makeId` | 115 | upload, project recent, render jobs, legacy jobs | common | `crypto`, `Date` | none | MEDIUM | Extract with common id helper later. |
| `openLocalPath` | 119 | outputs open routes | outputs/system | `process.platform` | `spawn` OS opener | MEDIUM-HIGH | Move with outputs routes only. |
| `pushJobLog` | 155 | render queue/FFmpeg | render | job object mutation | none | MEDIUM | Move with render queue. |
| `updateJob` | 161 | render queue/FFmpeg | render | job object mutation | none | MEDIUM | Move with render queue. |
| `getQueuePosition` | 166 | `publicJob`, `publicQueue` | render queue | `renderQueue` | none | MEDIUM | Move with queue state only. |
| `publicJob` | 172 | status/cancel routes | render queue | `RENDER_ENCODERS`, queue state | none | MEDIUM | Move with queue. |
| `publicQueue` | 203 | queue route | render queue | `renderJobs`, `renderQueue` | none | MEDIUM | Move with queue. |
| `scheduleJobCleanup` | 227 | render completion/cancel | render queue | `renderJobs` | timer | MEDIUM | Move with queue. |
| `runFfmpeg` | 236 | probes/render/video | FFmpeg | `ffmpegPath`, job mutation | `spawn` | HIGH | Move only in render engine phase. |
| `checkFfmpeg` | 280 | encoder detection | FFmpeg | `ffmpegPath` | `spawn` | HIGH | Move with FFmpeg service. |
| `getFfmpegEncodersText` | 288 | encoder detection | FFmpeg | `ffmpegPath` | `spawn` | HIGH | Move with FFmpeg service. |
| `probeFfmpegEncoder` | 299 | encoder detection | FFmpeg | `ffmpegPath` | `spawn` | HIGH | Move with FFmpeg service. |
| `detectRenderEncoders` | 317 | route/startup/render | render | `encoderDetectionCache`, `RENDER_ENCODERS` | FFmpeg probes | HIGH | Move with encoder service after DI plan. |
| `normalizeRenderEncoder` | 345 | render encoder resolve | render | `RENDER_ENCODERS` | none | LOW-MEDIUM | Move with encoder service. |
| `resolveRenderEncoder` | 351 | render engine | render | encoder detection, job log | FFmpeg via detection | HIGH | Move with render engine. |
| `logStartupEncoderDetection` | 368 | `startServer` | bootstrap/render | encoder detection | FFmpeg probe | MEDIUM-HIGH | Keep until bootstrap split. |
| `getEncoderArgs` | 381 | render engine | FFmpeg | `RENDER_ENCODERS`, quality helper | none | MEDIUM | Move with render FFmpeg args. |
| `ffmpegListPath` | 400 | render concat | FFmpeg | none | none | MEDIUM | Move with render args. |
| `probeInputImage` | 404 | render engine | render/upload | file object, `runFfmpeg` | reads/probes file | HIGH | Move with render engine. |
| `safeOutputFileName` | 430 | output path/render output rename | outputs/render | `safeName`, `path` | none | MEDIUM | Move with output route/service later. |
| `uniqueOutputPath` | 436 | render engine | outputs/render | `OUTPUT_DIR` | existence checks | MEDIUM-HIGH | Move only with render/output boundary plan. |
| `parseProjectPayload` | 447 | render route | render | `JSON` | none | LOW-MEDIUM | Move with render request helpers. |
| `projectSummary` | 455 | project routes | project | `makeId`, `Date` | none | MEDIUM | Move with project state if recent state moves. |
| `rememberProject` | 468 | project routes | project | `recentProjects` | memory mutation | MEDIUM-HIGH | Keep until project state module. |
| `writeProjectBackup` | 478 | project save/autosave | project | project helpers, `BACKUP_DIR` | writes backup files | HIGH | Next project storage write phase candidate. |
| `readProjectBackup` | 500 | backup restore route | project | `BACKUP_DIR`, validation helper | reads backup files | MEDIUM-HIGH | Next project storage read/restore candidate. |
| `getRenderPhotos` | 512 | render engine | render/upload | upload file maps | reads file metadata | HIGH | Move with render engine. |
| `getResolution` | 544 | render engine | render | none | none | MEDIUM | Move with render helpers. |
| `getQualityArgs` | 551 | encoder args | render | none | none | MEDIUM | Move with render helpers. |
| `escapeDrawText` | 557 | render filter | FFmpeg captions | string escaping | none | MEDIUM | Move with render filter helpers. |
| `getCaptionY` | 567 | render filter | FFmpeg captions | none | none | MEDIUM | Move with render filter helpers. |
| `buildSceneFilter` | 573 | render engine | FFmpeg filters | render constants | none | HIGH | Move with render engine. |
| `createRenderFromProject` | 602 | queue processor | render | jobs, FFmpeg, files, output dirs | many read/write/delete/spawn | HIGH | Keep until dedicated render service extraction. |
| `removeQueuedJob` | 749 | cancel/process queue | render queue | `renderQueue` | none | MEDIUM | Move with queue state. |
| `enqueueRenderJob` | 755 | render route | render queue | `renderQueue` | none | MEDIUM | Move with queue state. |
| `processRenderQueue` | 761 | queue/cancel | render queue | `activeRenderJobId`, `renderJobs` | invokes render engine | HIGH | Move with queue+engine boundary. |
| `createVideoFromPhotos` | 802 | legacy `/api/videos` | legacy render | FFmpeg/output/upload | many read/write/delete/spawn | HIGH | Keep or deprecate separately. |
| `cancelAllRenderJobs` | 1304 | export/Electron shutdown | render queue | all render state | deletes temp uploads/kills process | HIGH | Move only with render queue module. |
| `startServer` | 1325 | CLI/Electron | bootstrap | `app`, bind host, dirs, encoder startup log | starts server | MEDIUM-HIGH | Final bootstrap split only. |

## 4. Route Inventory

| Group | Method/Path | Uses | State/File Change | Route Module Risk |
| --- | --- | --- | --- | --- |
| system | `GET /health` | `ffmpegPath` | no | LOW |
| system | `GET /api/ping` | constants | no | LOW |
| system | `GET /api/health` | constants | no | LOW |
| render meta | `GET /api/render/encoders` | `detectRenderEncoders` | encoder cache may update | MEDIUM |
| AI | `POST /api/ai/analyze-photos` | AI helpers | no server file change | LOW-MEDIUM |
| AI | `POST /api/ai/create-storyboard` | AI helpers | no server file change | LOW-MEDIUM |
| templates | `GET /api/templates` | `getAllTemplates` | reads templates | LOW |
| templates | `POST /api/templates` | template helpers | writes `data/templates.json` | MEDIUM |
| templates | `PUT /api/templates/:templateId` | template helpers, default templates | writes `data/templates.json` | MEDIUM |
| templates | `DELETE /api/templates/:templateId` | template helpers, default templates | writes `data/templates.json` | MEDIUM |
| project | `POST /api/project/save` | validation, recent, backup write | writes backup, memory recent | HIGH |
| project | `POST /api/project/load` | validation, recent | memory recent | MEDIUM |
| project | `GET /api/project/recent` | `recentProjects` | no | MEDIUM |
| project | `POST /api/project/autosave` | validation, autosave, backup write | memory autosave + backup write | HIGH |
| project | `GET /api/project/autosave` | `projectAutosave` | no | MEDIUM |
| project | `GET /api/project/backups` | project helper | reads backups | MEDIUM |
| project | `POST /api/project/backups/:backupId/restore` | read backup, recent | reads backup + memory recent | HIGH |
| auth/license/update | `POST /api/auth/login` | license helpers | no file change | LOW |
| auth/license/update | `POST /api/auth/logout` | none | no | LOW |
| auth/license/update | `GET /api/license/status` | license helpers | no | LOW |
| auth/license/update | `GET /api/update/check` | env/app version | no | LOW |
| legacy render | `POST /api/videos` | multer, legacy render | writes output/temp, deletes temp | HIGH |
| render | `POST /api/render` | multer, project parser, queue | creates job, temp uploads exist | HIGH |
| render | `GET /api/render/status/:jobId` | `renderJobs`, `publicJob` | no | MEDIUM |
| render | `GET /api/render/queue` | queue state | no | MEDIUM |
| render | `POST /api/render/cancel/:jobId` | queue state/process | kills process/deletes temp uploads | HIGH |
| outputs | `GET /api/outputs` | output helpers | reads outputs | MEDIUM |
| outputs | `GET /api/outputs/:filename/share-info` | output helpers | reads stat | LOW-MEDIUM |
| outputs | `GET /api/outputs/:filename/download` | output helpers | read/send file | MEDIUM |
| outputs | `POST /api/outputs/open-folder` | `openLocalPath` | OS side effect | HIGH |
| outputs | `POST /api/outputs/:filename/open` | output helpers, `openLocalPath` | OS side effect | HIGH |
| outputs | `PATCH /api/outputs/:filename` | output helpers, `safeOutputFileName` | renames file | HIGH |
| outputs | `DELETE /api/outputs/:filename` | output helpers | deletes file | HIGH |

Route module extraction should use dependency injection for:

- `app` or an Express router
- runtime paths (`OUTPUT_DIR`, `UPLOAD_DIR`, `BACKUP_DIR`)
- render state maps/queues
- `upload` middleware
- OS opener
- render engine functions

## 5. Duplicate Code Survey

Must remove eventually:

- Safe file naming duplicated between `server.js`, `server/project-helpers.js`, and template helper ID/name handling.
- Repeated `{ ok: false, error: ... }` response pattern across routes.
- Repeated `new Date().toISOString()` timestamp generation for jobs, projects, auth, backups, and startup checks.
- Repeated file stat/existence pattern in output routes.

Can remain:

- Tiny route-specific Korean error messages, because user-facing wording differs.
- `safeName` duplicate inside `project-helpers.js`, until a common helper phase can verify all consumers.
- `makeId` duplicate in `template-helpers.js`, because template IDs are local and already stable.
- Separate JSON read/write logic in template/project/output areas while storage side effects are still being isolated.

Dangerous to unify now:

- FFmpeg argument arrays, because subtle option ordering can break rendering.
- Render cleanup loops, because they delete temp uploads and kill processes.
- Path traversal guards across outputs and backups, because allowed extensions and roots differ.
- Upload file cleanup in render error/cancel paths, because it is tied to Multer temp files and queue state.
- `safeOutputFileName` with project/template naming, because `.mp4`, `.hsp`, `.hsp.json`, and template names have different constraints.

## 6. Common Function Survey

| Function | Calls | Current Coupling | Split Now? | Recommendation |
| --- | --- | --- | --- | --- |
| `safeName` | output naming, render output, legacy video title | shared naming across unrelated domains | No | Extract later to `server/common-name-helpers.js` with full filename regression tests. |
| `makeId` | upload photo names, project recent ID, render job ID, legacy job ID | shared ID format, crypto/date | No | Extract with `safeName` only after upload/render/project ID tests. |
| `openLocalPath` | outputs open folder/file routes | OS `spawn`, local-only behavior | Not alone | Move with outputs route/service extraction. |
| `writeProjectBackup` | save/autosave routes | writes backup, invokes cleanup, mutates via validation | Not yet | Dedicated project storage write phase. |
| `readProjectBackup` | backup restore route | path traversal guard + validation | Possible but still restore-coupled | Move with project storage restore phase. |
| `rememberProject` | save/load/restore routes | mutates `recentProjects` singleton | Not alone | Move only if project state module is introduced. |
| `startServer` | CLI and Electron `desktop/main.js` | owns app listen, bind, startup logs | No | Final bootstrap split after route modules settle. |

## 7. Grouped Split Recommendations

### A. System/License/Update Routes

- Move: `/health`, `/api/ping`, `/api/health`, `/api/auth/login`, `/api/auth/logout`, `/api/license/status`, `/api/update/check`
- Module: `server/routes/system-license-routes.js`
- Dependency style: function `registerSystemLicenseRoutes(app, deps)`
- Deps: `APP_VERSION`, `PORT`, `ffmpegPath`, `normalizeEmail`, `buildLicenseStatus`, env getter
- Expected `server.js` reduction: 60-90 lines
- Risk: LOW
- Recommended: Yes, next.

### B. Template/AI Routes

- Move AI routes and template routes together or in two small route modules.
- Modules: `server/routes/ai-routes.js`, `server/routes/template-routes.js`
- Deps: AI helpers, template helpers, `DEFAULT_TEMPLATES`
- Expected reduction: 100-140 lines
- Risk: LOW-MEDIUM for AI, MEDIUM for template write routes
- Recommended: Yes, after A.

### C. Outputs Routes

- Move all `/api/outputs*` routes.
- Module: `server/routes/output-routes.js`
- Deps: `OUTPUT_DIR`, output helpers, `safeOutputFileName`, `openLocalPath`, `fs`, `path`
- Expected reduction: 90-120 lines
- Risk: MEDIUM-HIGH due open/rename/delete side effects
- Recommended: Yes, but after read-only + mutation route tests are prepared.

### D. Project Routes/State/Storage

- Move project routes and remaining helpers/state into a project module.
- Module: `server/routes/project-routes.js` or `server/project-state.js`
- Deps: `projectAutosave`, `recentProjects`, `writeProjectBackup`, `readProjectBackup`, project helpers
- Expected reduction: 110-160 lines
- Risk: HIGH because autosave/recent are module-scope singletons and backups write/delete files
- Recommended: Later.

### E. Upload/Multer

- Move Multer storage/filter and upload middleware construction.
- Module: `server/upload-middleware.js`
- Deps: `UPLOAD_DIR`, `MAX_PHOTOS`, `makeId`, `path`
- Expected reduction: 20-35 lines
- Risk: MEDIUM due filename and upload behavior
- Recommended: After common `makeId` decision.

### F. Render Queue/FFmpeg

- Move render state, queue helpers, FFmpeg helpers, and render engine.
- Modules: `server/render/queue.js`, `server/render/ffmpeg.js`, `server/render/engine.js`
- Deps: many paths, state maps, `upload`, `ffmpegPath`, `RENDER_ENCODERS`, output helpers
- Expected reduction: 500-650 lines
- Risk: HIGH
- Recommended: Last major split.

### G. startServer/App Bootstrap

- Move app creation into factory and keep `server.js` as entrypoint.
- Modules: `server/app.js`, `server/bootstrap.js`
- Deps: all route registration modules
- Expected final `server.js`: 80-150 lines
- Risk: MEDIUM-HIGH
- Recommended: Final phase only.

## 8. Suggested Next 3 Steps

1. Extract system/license/update routes.
   - Lowest risk and no file mutation required for read route verification.
2. Extract AI routes and template routes.
   - AI is low risk; template route writes need temp data or helper-level comparison.
3. Extract outputs routes.
   - Helpers already exist, but mutation endpoints need careful non-destructive tests.

Do not start render queue/FFmpeg extraction until the route surface is smaller.

## 9. `server.js` Completion Criteria

Structure complete when:

- `server.js` is reduced to 120-200 lines.
- It only loads env/constants, creates app, registers route modules, starts/exports server.
- Route modules are grouped into 5-7 files:
  - system/license/update
  - AI
  - templates
  - project
  - outputs
  - upload/render
  - render queue/engine
- Helper files remain under about 10-14 total modules.
- Render/FFmpeg can remain in a larger dedicated module if behavior is stable; it does not need to be aggressively decomposed unless tests exist.

## 10. Duplicate Removal Completion Criteria

Structure cleanup complete is separate from duplicate cleanup.

Duplicate removal complete when:

- Common naming/ID helper has replaced the safe duplicated pieces with tests.
- Error response helper is used where messages/status are identical.
- File stat/existence patterns in outputs are centralized.
- Timestamp helper is used only where it does not obscure domain-specific time semantics.

Keep duplicates when:

- They protect different roots/extensions.
- User-facing messages differ.
- FFmpeg argument ordering or cleanup behavior could change.
- The shared abstraction would require route behavior changes.

Dangerous duplicates should be documented rather than removed until integration tests cover them.

## 11. Verification Plan For This Survey

Static:

- `node --check server.js`
- all `server/*.js`
- `node --check desktop/main.js`
- `node --check desktop/preload.js`
- `node --check public/app.js`
- `npm.cmd run check`
- `git diff --check`

Read-only API:

- `GET /api/health`
- `GET /api/templates`
- `GET /api/license/status`
- `GET /api/update/check`
- `GET /api/outputs`
- `GET /api/project/autosave`
- `GET /api/project/recent`
- `GET /api/project/backups`
- `GET /api/render/queue`

No state-changing API should be called.

## 12. Verification Results

Static verification:

- `node --check server.js`: PASS
- all `server/*.js` with `node --check`: PASS
- `node --check desktop/main.js`: PASS
- `node --check desktop/preload.js`: PASS
- `node --check public/app.js`: PASS
- `npm.cmd run check`: PASS
- `git diff --check`: PASS

Read-only API verification:

- `GET /api/health`: PASS
- `GET /api/templates`: PASS
- `GET /api/license/status`: PASS
- `GET /api/update/check`: PASS
- `GET /api/outputs`: PASS
- `GET /api/project/autosave`: PASS
- `GET /api/project/recent`: PASS
- `GET /api/project/backups`: PASS
- `GET /api/render/queue`: PASS

No state-changing route was called.

Server/process cleanup:

- Server was stopped after read-only checks.
- Port `4000` had no remaining LISTENING entry.

User data integrity:

- `data/backups`: 10 files, 26720 bytes, hashes unchanged
- `uploads`: 1 file, 5 bytes, hash unchanged
- `outputs`: 13 files, 6027534 bytes, hashes unchanged
- `data/templates.json`: hash unchanged
- `package.json`: hash unchanged
- `package-lock.json`: hash unchanged

Final expected git state for this survey:

- Only `docs/STRUCTURE_PHASE1_9_SERVER_REMAINING_SURVEY_20260714.md` is untracked.
- No code files were modified.
