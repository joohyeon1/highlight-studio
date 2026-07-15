# STRUCTURE PHASE 1-23D Render Executor Extraction

## Scope

This phase extracted the queued project render executor from `server.js` into a dedicated module without moving queue control, FFmpeg Engine internals, routes, cancel handling, or shutdown handling.

Baseline:

- Branch: `main`
- Previous commit: `b61365e`
- Previous `server.js` line count: 880
- New `server.js` line count: 635

## Changed Files

- `server.js`
- `server/render-executor.js`
- `docs/STRUCTURE_PHASE1_23C_RENDER_EXECUTOR_SURVEY_20260715.md`
- `docs/STRUCTURE_PHASE1_23D_RENDER_EXECUTOR_20260715.md`

## Moved Functions

Moved from `server.js` to `server/render-executor.js`:

- `createRenderFromProject`
- `probeInputImage`
- `uniqueOutputPath`
- `getRenderPhotos`
- `getResolution`
- `escapeDrawText`
- `getCaptionY`
- `buildSceneFilter`

The moved helper implementations keep the same calculations, messages, field updates, fallback rules, cleanup calls, and return shape as the previous `server.js` implementation.

## New Module Export

`server/render-executor.js` exports:

```js
module.exports = {
  createRenderExecutor
};
```

`createRenderExecutor()` returns:

```js
{
  createRenderFromProject
}
```

## Factory Dependencies

`server.js` creates the executor after project helpers and FFmpeg Engine setup, before queue controller setup:

- `uploadDir`
- `outputDir`
- `photoSeconds`
- `supportedRenderTransitions`
- `supportedRenderEffects`
- `renderEncoders`
- `checkFfmpeg`
- `resolveRenderEncoder`
- `getEncoderArgs`
- `runFfmpeg`
- `updateJob`
- `pushJobLog`
- `displayFileName`
- `safeName`
- `makeId`
- `safeOutputFileName`
- `ffmpegListPath`

No dependency is imported from `server.js` inside `server/render-executor.js`, so there is no circular require.

## Initialization Order

The current render-related initialization order is:

1. Load Render Job Store.
2. Configure Render Job Store.
3. Configure Render Job Utilities.
4. Create FFmpeg Engine.
5. Create Render Executor.
6. Create Render Queue Controller with `createRenderFromProject`.
7. Configure Render Queue Operations with `processRenderQueue`.
8. Register render read routes and POST routes.

The queue controller still receives a function named `createRenderFromProject` and remains responsible for active job control, queue order, terminal status handling, and cleanup scheduling.

## Preserved Executor Flow

The extracted executor keeps the existing flow:

1. Set job to `preparing`.
2. Check FFmpeg availability.
3. Match project photos to uploaded files.
4. Set job to `rendering`.
5. Create a per-job work directory under uploads.
6. Resolve resolution, FPS, output path, and encoder.
7. Probe each input image.
8. Build each scene filter.
9. Render each scene segment.
10. Fall back from GPU encoder to CPU when segment encoding fails.
11. Skip failed photos while keeping failure details.
12. Concatenate successful segments.
13. Return output metadata.
14. Remove uploaded files and the work directory asynchronously.

## Return Shape

`createRenderFromProject()` still returns:

```js
{
  filename,
  downloadUrl,
  durationSeconds,
  bytes
}
```

The queue controller still uses this result as before.

## Job State And Field Updates

The executor still updates:

- `status`
- `progress`
- `startedAt`
- `totalPhotos`
- `currentPhoto`
- `currentPhotoName`
- `encoderRequested`
- `encoder`
- `encoderCodec`
- `encoderLabel`
- `encoderFallback`
- `encoderFallbackMessage`
- `failedPhotos`

Log messages are still written through `pushJobLog()`.

## GPU Fallback

GPU fallback remains inside the executor:

- Initial encoder is selected by `resolveRenderEncoder()`.
- Segment FFmpeg args are built through `getEncoderArgs()`.
- If a non-CPU segment render fails and the job is not canceled, the executor sets:
  - `encoderFallback = true`
  - `encoderFallbackMessage = "GPU 사용 불가. CPU로 전환하여 계속 렌더링합니다."`
  - `encoder = "cpu"`
  - `encoderCodec = "libx264"`
  - `encoderLabel = "CPU"`
- The failed segment is retried with CPU args.
- If CPU retry fails, the photo is skipped exactly as before.

## Cleanup

Executor cleanup remains unchanged:

- Uploaded files from the render request are removed with `fs.rm(file.path, { force: true }, () => {})`.
- Per-job work directory is removed with `fs.rm(workDir, { recursive: true, force: true }, () => {})`.
- Cleanup log message remains `"임시 파일 정리 완료"`.

Queue-level cleanup and terminal job Map cleanup remain in existing queue/job utility modules.

## Not Moved

The following were intentionally left in place:

- `createVideoFromPhotos`
- `ffmpegListPath`
- `safeOutputFileName`
- `POST /api/render`
- `POST /api/videos`
- `POST /api/render/cancel/:jobId`
- `processRenderQueue`
- `enqueueRenderJob`
- `removeQueuedJob`
- `cancelAllRenderJobs`
- FFmpeg Engine internals
- encoder cache
- Electron shutdown handling

`ffmpegListPath` is shared by the legacy `/api/videos` renderer. `safeOutputFileName` is still passed to output write routes, so both remain in `server.js`.

## Unit Stub Verification

A no-FFmpeg stub test called `createRenderFromProject()` through the new factory with temporary OS directories only.

Covered:

- normal CPU executor flow
- output result shape
- upload cleanup
- work directory cleanup
- GPU failure followed by CPU fallback
- final encoder state

Result:

- normal flow: PASS
- GPU fallback flow: PASS
- temporary test directory removed: PASS

## API Verification

Read-only API regression was planned and executed after extraction:

- `GET /api/render/encoders`
- `GET /api/render/queue`
- `GET /api/render/status/__missing__`
- `GET /api/health`
- `GET /api/templates`
- `GET /api/outputs`
- `GET /api/project/recent`
- `GET /api/license/status`
- `POST /api/ai/analyze-photos` with fixed JSON payload only

No render, upload, videos, cancel, project save, or destructive output API was called.

## User Data

No user data files are intentionally changed in this phase:

- uploads unchanged except temporary OS-dir unit stubs outside the workspace
- outputs unchanged
- data/backups unchanged
- data/templates.json unchanged
- package.json unchanged
- package-lock.json unchanged
- no `.hsp` generated

## Validation

Required validation:

- `node --check server.js`
- `node --check server/render-executor.js`
- `node --check server/ffmpeg-engine.js`
- `node --check server/render-queue-controller.js`
- all `server/**/*.js`
- `node --check desktop/main.js`
- `node --check desktop/preload.js`
- `node --check public/app.js`
- `npm.cmd run check`
- `git diff --check`
- read-only server API regression

## Next Step

The next safe boundary is a survey or extraction of render path/output planning helpers only if they are proven executor-only. The legacy `/api/videos` renderer should remain separate until its compatibility status is intentionally changed.
