# STRUCTURE PHASE 1 Server Survey

Date: 2026-07-14
Project: Highlight Studio
Target file: `server.js`

## Scope

This document records the current `server.js` structure before any code split.
No runtime code was changed during this phase.

## Baseline

- Branch: `main`
- Latest commit observed: `fdb7613 docs: deprecate legacy videos endpoint`
- `server.js` size: 1,787 lines
- Primary runtime: Express server used by browser and Electron
- Local bind: `127.0.0.1`
- Exported API from `server.js`: `app`, `startServer`, `cancelAllRenderJobs`, `PORT`, `UPLOAD_DIR`, `OUTPUT_DIR`

## Current Structure

### 1. Imports and configuration

Lines 1-29:

- Node modules: `crypto`, `fs`, `path`, `child_process`
- External modules: `express`, `multer`
- `.env` loading is invoked before constants are created.
- Core constants:
  - `PORT`
  - `LOCAL_BIND_HOST`
  - `APP_VERSION`
  - `ROOT_DIR`
  - `PUBLIC_DIR`
  - `UPLOAD_DIR`
  - `OUTPUT_DIR`
  - `DATA_DIR`
  - `USER_TEMPLATES_PATH`
  - `BACKUP_DIR`
  - `MAX_PHOTOS`
  - `PHOTO_SECONDS`
  - render effect/transition/encoder constants

Risk: MEDIUM if moved first, because the constants are used throughout the whole file.

### 2. Built-in template data

Lines 30-121:

- `DEFAULT_TEMPLATES`
- Used by:
  - `getAllTemplates`
  - template update/delete guard logic
  - `GET /api/templates`

Risk: LOW. This block is static data and is a strong first extraction candidate.

### 3. Global runtime state

Lines 122-139:

- `renderJobs`
- `renderQueue`
- `activeRenderJobId`
- `encoderDetectionCache`
- `projectAutosave`
- `recentProjects`
- directory creation for uploads/outputs/data/backups
- FFmpeg path initialization
- `const app = express()`

Risk: HIGH for render queue state, MEDIUM for directory/FFmpeg setup. This area should not be split before route and helper boundaries are clearer.

### 4. General utilities and local file helpers

Lines 141-264:

- `loadLocalEnv`
- `licenseGate`
- `safeName`
- `makeId`
- `resolveOutputMp4`
- `outputFilePayload`
- `openLocalPath`
- `getPublicBaseUrl`
- `createShareInfo`
- `normalizeEmail`
- `buildLicenseStatus`

Dependencies:

- `fs`, `path`, `spawn`, `crypto`
- `OUTPUT_DIR`
- environment variables

Risk:

- LOW: `safeName`, `makeId`, `normalizeEmail`
- LOW/MEDIUM: `resolveOutputMp4`, `outputFilePayload`, `createShareInfo`
- MEDIUM: `openLocalPath`, because it shells out to OS-specific commands
- LOW: license status helpers

Safe extraction candidate: pure helpers and license/share/output helpers, if passed config paths explicitly or grouped with a small config module.

### 5. Upload middleware and upload filename normalization

Lines 266-315:

- Multer storage in `UPLOAD_DIR`
- `upload`
- `displayFileName`
- `decodeUploadName`
- `normalizeUploadedFiles`

Dependencies:

- `multer`
- `UPLOAD_DIR`
- `MAX_PHOTOS`
- `makeId`

Risk: MEDIUM. The upload middleware is directly used by `POST /api/videos` and `POST /api/render`. It can be extracted later as a complete module, but not before render route behavior is locked.

### 6. Render job public state helpers

Lines 317-390:

- `pushJobLog`
- `updateJob`
- `getQueuePosition`
- `publicJob`
- `publicQueue`
- `scheduleJobCleanup`

Dependencies:

- `renderQueue`
- `renderJobs`
- `activeRenderJobId`
- `RENDER_ENCODERS`

Risk: HIGH. These are tightly coupled to render queue state and route responses. Do not split first.

### 7. FFmpeg and encoder helpers

Lines 392-558:

- `runFfmpeg`
- `checkFfmpeg`
- `getFfmpegEncodersText`
- `probeFfmpegEncoder`
- `detectRenderEncoders`
- `normalizeRenderEncoder`
- `resolveRenderEncoder`
- `logStartupEncoderDetection`
- `getEncoderArgs`
- `ffmpegListPath`

Dependencies:

- `spawn`
- `ffmpegPath`
- `encoderDetectionCache`
- `RENDER_ENCODERS`
- job logging helpers

Risk: HIGH. This block has process management, cache state, log side effects, and GPU fallback behavior. It should remain untouched until after low-risk modules are separated and tests are in place.

### 8. Template and project helpers

Lines 586-773:

- `safeOutputFileName`
- `safeTemplateName`
- `readUserTemplates`
- `writeUserTemplates`
- `sanitizeTemplatePayload`
- `getAllTemplates`
- `uniqueOutputPath`
- `parseProjectPayload`
- `validateProjectDocument`
- `projectFileName`
- `projectSummary`
- `rememberProject`
- `projectBackupFileName`
- `cleanupOldBackups`
- `writeProjectBackup`
- `listProjectBackups`
- `readProjectBackup`

Dependencies:

- `fs`, `path`
- `USER_TEMPLATES_PATH`
- `DEFAULT_TEMPLATES`
- `OUTPUT_DIR`
- `BACKUP_DIR`
- `recentProjects`
- `projectAutosave` through route handlers

Risk:

- LOW: template static data and template payload sanitizers
- MEDIUM: project validation and backup helpers, because they write/read local files
- MEDIUM: `recentProjects`, because it is process memory state

Safe extraction candidate: template data and template helpers first.

### 9. AI analysis and storyboard helpers

Lines 814-977:

- `clampScore`
- `normalizeAiPhoto`
- `analyzeAiPhotos`
- `createStoryboardFromAnalysis`

Dependencies:

- No filesystem or process dependency
- Route handlers only call these functions

Risk: LOW. This is one of the safest extraction candidates because it is local rule logic with no I/O.

### 10. Render project and scene generation

Lines 775-812 and 979-1175:

- `getRenderPhotos`
- `getResolution`
- `getQualityArgs`
- `escapeDrawText`
- `getCaptionY`
- `buildSceneFilter`
- `createRenderFromProject`

Dependencies:

- uploaded file objects
- project document shape
- FFmpeg helpers
- queue job helpers
- `UPLOAD_DIR`, `OUTPUT_DIR`
- `PHOTO_SECONDS`
- render effect/transition constants

Risk: HIGH. This is core rendering behavior and must not be moved in the first split.

### 11. Render queue

Lines 1177-1228:

- `removeQueuedJob`
- `enqueueRenderJob`
- `processRenderQueue`

Dependencies:

- `renderQueue`
- `activeRenderJobId`
- `renderJobs`
- `createRenderFromProject`
- job cleanup/log/public state helpers

Risk: HIGH. Queue sequencing and cancellation behavior are sensitive. Do not split in the first code phase.

### 12. Legacy `/api/videos` renderer

Lines 1230-1288 and route at 1536-1554:

- `createVideoFromPhotos`
- `POST /api/videos`
- Marked deprecated in the response and README.

Dependencies:

- `UPLOAD_DIR`
- `OUTPUT_DIR`
- FFmpeg
- `makeId`
- `safeName`
- multer upload middleware

Risk: MEDIUM/HIGH. It is legacy, but still an API compatibility route. Do not remove or rename. If extracted later, keep response and status exactly unchanged.

### 13. Middleware, static files, and routes

Lines 1290-1730:

- Middleware:
  - `licenseGate`
  - `express.json`
  - `/outputs` static
  - `public` static
- Health and ping:
  - `GET /health`
  - `OPTIONS /api/ping`
  - `GET /api/ping`
  - `GET /api/health`
- Render/AI/template/project/license/update/auth:
  - `GET /api/render/encoders`
  - `POST /api/ai/analyze-photos`
  - `POST /api/ai/create-storyboard`
  - `GET /api/templates`
  - `POST /api/project/save`
  - `POST /api/project/load`
  - `GET /api/project/recent`
  - `POST /api/project/autosave`
  - `GET /api/project/autosave`
  - `GET /api/project/backups`
  - `POST /api/project/backups/:backupId/restore`
  - `POST /api/templates`
  - `PUT /api/templates/:templateId`
  - `DELETE /api/templates/:templateId`
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/license/status`
  - `GET /api/update/check`
  - `POST /api/videos`
  - `POST /api/render`
  - `GET /api/render/status/:jobId`
  - `GET /api/render/queue`
  - `GET /api/outputs`
  - `GET /api/outputs/:filename/share-info`
  - `GET /api/outputs/:filename/download`
  - `POST /api/outputs/open-folder`
  - `POST /api/outputs/:filename/open`
  - `PATCH /api/outputs/:filename`
  - `DELETE /api/outputs/:filename`
  - `POST /api/render/cancel/:jobId`

Risk: MEDIUM/HIGH. Route movement can be safe only if route registration order and middleware order are preserved exactly.

### 14. Shutdown and server lifecycle

Lines 1732-1787:

- `cancelAllRenderJobs`
- error handler middleware
- `startServer`
- `require.main === module`
- exports

Dependencies:

- render job state
- local bind constants
- Electron imports `startServer`/`cancelAllRenderJobs`

Risk: HIGH. Do not modify before Electron regression tests are automated.

## Responsibility Split Candidates

### LOW risk candidates

1. `DEFAULT_TEMPLATES`
   - Suggested file: `server/defaultTemplates.js`
   - Reason: static data only.
   - Must preserve object shape exactly.

2. AI local rule helpers
   - Suggested file: `server/aiRules.js`
   - Functions: `clampScore`, `normalizeAiPhoto`, `analyzeAiPhotos`, `createStoryboardFromAnalysis`
   - Reason: no filesystem/process state.
   - Route responses must remain unchanged.

3. License/update helper functions
   - Suggested file: `server/license.js`
   - Functions: `normalizeEmail`, `buildLicenseStatus`
   - Reason: simple environment-based logic.
   - Keep API response shape unchanged.

4. Pure naming helpers
   - Suggested file: `server/naming.js`
   - Functions: `safeName`, `makeId`, `safeOutputFileName`, `safeTemplateName`
   - Risk note: `makeId` depends on `crypto`.

### MEDIUM risk candidates

1. Output file helpers and output routes
   - Candidate helpers: `resolveOutputMp4`, `outputFilePayload`, `openLocalPath`, `createShareInfo`
   - Candidate routes: `/api/outputs*`
   - Reason: isolated feature area, but includes local file open/delete/rename security behavior.
   - Must preserve basename, `.mp4`, and output-root path checks.

2. Template helpers and routes
   - Helpers: `readUserTemplates`, `writeUserTemplates`, `sanitizeTemplatePayload`, `getAllTemplates`
   - Routes: `/api/templates*`
   - Reason: mostly isolated local JSON persistence.
   - Risk: default template guard must remain exact.

3. Project helpers and routes
   - Helpers: project validation, recent projects, autosave, backups
   - Routes: `/api/project*`
   - Reason: coherent feature area.
   - Risk: local backup writes and in-memory recent/autosave state.

4. Upload middleware
   - Candidate file: `server/upload.js`
   - Reason: coherent multer configuration.
   - Risk: used by both render and legacy `/api/videos`.

### HIGH risk candidates

1. Render queue and render job public state
   - `renderJobs`, `renderQueue`, `activeRenderJobId`
   - `publicJob`, `publicQueue`, `enqueueRenderJob`, `processRenderQueue`
   - Reason: status, cancellation, and cleanup behavior are core product behavior.

2. FFmpeg helpers and render project generation
   - `runFfmpeg`, encoder detection, scene filter creation, `createRenderFromProject`
   - Reason: process lifecycle, GPU fallback, cleanup, and output creation are tightly coupled.

3. Server lifecycle and Electron integration
   - `startServer`, `cancelAllRenderJobs`, exported values
   - Reason: Electron relies on these exports and local loopback behavior.

4. Route registration order and static middleware
   - Reason: changing order can affect `/outputs`, `public`, JSON parsing, and ping behavior.

## Recommended First Split Order

1. Extract static default templates.
   - Risk: LOW
   - Expected change: import `DEFAULT_TEMPLATES` from a new module.
   - Validation needed: `GET /api/templates` response shape unchanged.

2. Extract local AI rule helpers.
   - Risk: LOW
   - Expected change: import analysis/storyboard functions.
   - Validation needed: `/api/ai/analyze-photos` and `/api/ai/create-storyboard` response shape unchanged.

3. Extract license/update helper logic.
   - Risk: LOW
   - Expected change: helper imports only, route handlers remain in `server.js`.
   - Validation needed: `/api/license/status`, `/api/update/check`.

4. Extract output helper functions, but keep routes in `server.js` initially.
   - Risk: MEDIUM
   - Reason: security-sensitive file path checks should be tested before moving routes.

5. Extract template helpers, then template routes.
   - Risk: MEDIUM
   - Reason: local JSON persistence and built-in template guard.

6. Extract project helpers, then project routes.
   - Risk: MEDIUM
   - Reason: autosave/backups write files under `data/backups`.

7. Extract upload middleware only after render and legacy upload tests are available.
   - Risk: MEDIUM

8. Extract render/queue/FFmpeg last.
   - Risk: HIGH
   - Prerequisite: stable automated regression for render queue, cancel, GPU fallback, cleanup, and output listing.

## Do Not Split First

- `createRenderFromProject`
- `processRenderQueue`
- `runFfmpeg`
- `detectRenderEncoders`
- `startServer`
- `cancelAllRenderJobs`
- `POST /api/render`
- `POST /api/render/cancel/:jobId`
- legacy `POST /api/videos`

## Minimum Validation Checklist For Next Structure Phase

For every extraction step:

- `node --check server.js`
- `npm run check`
- `git diff --check`
- `GET /api/health`
- `GET /api/ping`
- `GET /api/templates`
- `GET /api/license/status`
- `GET /api/update/check`
- `GET /api/outputs`
- `GET /api/render/queue`
- Electron smoke test if `server.js` exports or startup path are touched

For output/project/render related extraction:

- Path traversal negative tests
- `.mp4` extension enforcement tests
- empty render queue shape check
- no changes to existing outputs/uploads/projects/backups unless explicitly using disposable test fixtures

## Phase 1 Recommendation

The safest first code split is:

1. `DEFAULT_TEMPLATES` static data
2. AI local rule helpers
3. license helper functions

Avoid route movement in the first code split. Keep route handlers in `server.js` while moving only low-risk helpers/data. This reduces the chance of changing middleware order, API status codes, response shapes, Electron startup behavior, or render queue behavior.
