# STRUCTURE PHASE 1-23A Render Executor And FFmpeg Survey

## Scope

This is a read-only survey before extracting the render executor and FFmpeg engine.

No source code, queue controller, queue operations, job store, job utilities, cancel route, shutdown handling, FFmpeg logic, GPU fallback, POST routes, package files, or user data were modified.

Current baseline:

- Branch: `main`
- Latest commit: `f2754bf`
- `server.js`: 1036 lines by Node CRLF/LF split method

## Call Graph

Primary queued render flow:

```text
POST /api/render
→ normalizeUploadedFiles
→ parseProjectPayload
→ addRenderJob
→ enqueueRenderJob
→ processRenderQueue
→ createRenderFromProject
→ checkFfmpeg
→ getRenderPhotos
→ resolveRenderEncoder
→ detectRenderEncoders
→ checkFfmpeg
→ getFfmpegEncodersText
→ probeFfmpegEncoder
→ uniqueOutputPath
→ probeInputImage
→ runFfmpeg
→ buildSceneFilter
→ getEncoderArgs
→ runFfmpeg for each scene
→ runFfmpeg concat
→ return render result
```

Legacy video flow:

```text
POST /api/videos
→ normalizeUploadedFiles
→ createVideoFromPhotos
→ runFfmpeg for each photo segment
→ runFfmpeg concat
→ return legacy video result
```

Encoder read flow:

```text
GET /api/render/encoders
→ registerRenderReadRoutes
→ detectRenderEncoders({ force })
→ checkFfmpeg
→ getFfmpegEncodersText
→ probeFfmpegEncoder
→ encoderDetectionCache
```

Cancel coupling:

```text
POST /api/render/cancel/:jobId
→ job.canceled = true
→ job.currentProcess.kill("SIGTERM")
→ runFfmpeg close handler rejects if job.canceled
→ processRenderQueue catch marks canceled
```

## Function Inputs And Outputs

| Function | Inputs | Output | Throws/rejects |
| --- | --- | --- | --- |
| `createRenderFromProject` | `project`, uploaded `files`, render `job` | `{ filename, downloadUrl, durationSeconds, bytes }` | FFmpeg unavailable, no selected files, cancellation, all photos unusable, FFmpeg/FS errors |
| `createVideoFromPhotos` | uploaded `files`, `{ title, secondsPerPhoto }` | `{ id, filename, downloadUrl, photoCount, durationSeconds, bytes }` | no files, FFmpeg errors, FS errors |
| `runFfmpeg` | FFmpeg `args`, optional `job`, optional `{ timeoutMs }` | resolves `undefined` | spawn error, timeout, job canceled, non-zero exit |
| `detectRenderEncoders` | optional `{ force }` | encoder detection object with `ok`, `selected`, `selectedCodec`, `selectedLabel`, `encoders`, `checkedAt` | normally resolves even if FFmpeg unavailable |
| `resolveRenderEncoder` | requested encoder value, job | `{ requested, selected, detected }` | propagation from encoder detection if unexpected error occurs |

## `createRenderFromProject`

Location: `server.js` lines 577-721.

Inputs:

- `project`: parsed project payload from `/api/render`
- `files`: uploaded multer file objects
- `job`: queue job object

Return shape expected by queue controller:

```js
{
  filename,
  downloadUrl,
  durationSeconds,
  bytes
}
```

Responsibilities:

- Updates job to `preparing`.
- Logs FFmpeg availability check.
- Verifies FFmpeg.
- Matches selected project photos to uploaded files.
- Updates job to `rendering`.
- Creates temporary work directory under `UPLOAD_DIR`.
- Resolves output options: resolution, fps, quality, output filename, encoder.
- Mutates encoder-related job fields:
  - `encoderRequested`
  - `encoder`
  - `encoderCodec`
  - `encoderLabel`
  - `encoderFallback`
  - `encoderFallbackMessage`
  - `failedPhotos`
- Iterates render photos.
- Checks cancellation before each scene.
- Updates current photo progress and display name.
- Validates each input image through FFmpeg probe.
- Builds scene filters for crop/scale/effect/caption/transition.
- Builds FFmpeg scene command args.
- Runs FFmpeg for each scene.
- Performs GPU-to-CPU fallback inside scene render failure handling.
- Skips failed photos and records `failedPhotos`.
- Writes concat list file.
- Runs FFmpeg concat.
- Stats output file.
- Logs output, skipped photo count, and completion time.
- Cleans uploaded files and temp work directory in `finally`.

Direct dependencies:

- `updateJob`
- `pushJobLog`
- `checkFfmpeg`
- `getRenderPhotos`
- `makeId`
- `UPLOAD_DIR`
- `OUTPUT_DIR`
- `getResolution`
- `resolveRenderEncoder`
- `RENDER_ENCODERS`
- `uniqueOutputPath`
- `safeName`
- `displayFileName`
- `PHOTO_SECONDS`
- `probeInputImage`
- `buildSceneFilter`
- `getEncoderArgs`
- `runFfmpeg`
- `ffmpegListPath`
- `fs`
- `path`

Notable side effects:

- Mutates `job`.
- Spawns FFmpeg through helper calls.
- Creates and deletes temp files.
- Deletes uploaded files in `finally`.
- Creates MP4 output in `OUTPUT_DIR`.

## `createVideoFromPhotos`

Location: `server.js` lines 743-801.

Inputs:

- `files`: uploaded multer file objects from legacy `/api/videos`
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

Responsibilities:

- Validates at least one file exists.
- Creates a temp work directory under `UPLOAD_DIR`.
- Creates output filename from safe title and timestamp.
- Creates one 1920x1080 libx264 segment per photo.
- Writes concat list.
- Runs FFmpeg concat.
- Stats output file.
- Deletes uploaded files and temp work directory in `finally`.

Important distinction:

- Despite its name, it is not the current project render executor.
- It is a legacy `/api/videos` compatibility renderer.
- It does not use project timeline, captions, transitions beyond a basic fixed filter, GPU encoder selection, queue job progress, or job logs.

## `runFfmpeg`

Location: `server.js` lines 211-253.

Inputs:

- `args`: FFmpeg argument array
- `job`: optional job object
- `options.timeoutMs`: optional timeout

Responsibilities:

- Spawns `ffmpegPath` with `windowsHide: true`.
- Stores child process in `job.currentProcess`.
- Collects stderr.
- Logs up to 12 matching stderr lines containing `frame=`, `error`, `failed`, or `invalid`.
- Avoids duplicate last logged line.
- Kills process with `SIGTERM` on timeout.
- Clears timeout on error/close.
- Clears `job.currentProcess` on error/close.
- Rejects if `job.canceled` is true on close.
- Rejects if timeout occurred.
- Resolves on exit code `0`.
- Rejects with stderr or `ffmpeg exited with code N` otherwise.

No stdout parsing is currently implemented for progress. Progress is managed by executor-level `updateJob` calls, not by FFmpeg frame parsing.

Cancel coupling:

- Cancel route kills `job.currentProcess`.
- `runFfmpeg` close handler checks `job.canceled` and rejects with `렌더링이 취소되었습니다.`.
- Queue controller then marks the job as `canceled`.

## Encoder Structure

Constants and state:

- `RENDER_ENCODERS`
  - `cpu`: `libx264`
  - `nvenc`: `h264_nvenc`
  - `qsv`: `h264_qsv`
  - `amf`: `h264_amf`
- `encoderDetectionCache`
- `ffmpegPath`

Detection flow:

1. `detectRenderEncoders({ force })` returns cache unless `force` is true.
2. `checkFfmpeg` runs `ffmpeg -version`.
3. `getFfmpegEncodersText` runs `ffmpeg -hide_banner -encoders`.
4. Each configured encoder is checked for compiled support by string match.
5. Compiled encoders are runtime-probed with `probeFfmpegEncoder`.
6. Auto selection priority:
   - NVIDIA NVENC
   - Intel QSV
   - AMD AMF
   - CPU
7. Result is cached with `checkedAt`.

Resolve flow:

1. `normalizeRenderEncoder` maps invalid values to `auto`.
2. `resolveRenderEncoder` calls `detectRenderEncoders`.
3. `auto` selects detected `selected`.
4. Explicit supported encoder is used if available.
5. Unavailable explicit encoder logs fallback and selects CPU.

Fallback during actual render:

- Scene FFmpeg failure with non-CPU encoder triggers one CPU retry for that scene.
- This mutates:
  - `job.encoderFallback`
  - `job.encoderFallbackMessage`
  - `job.encoder`
  - `job.encoderCodec`
  - `job.encoderLabel`
- If CPU retry fails, that photo is skipped unless the job was canceled.

API sharing:

- `GET /api/render/encoders` uses `detectRenderEncoders`.
- Render executor uses `resolveRenderEncoder`.
- Startup log uses `detectRenderEncoders`.
- These share `encoderDetectionCache`.

## Dependency Table

| Area | Dependency | Type | Notes |
| --- | --- | --- | --- |
| FFmpeg process | `spawn`, `ffmpegPath` | child process | engine-level dependency |
| Job state | `updateJob`, direct job mutation | state mutation | executor/controller visible |
| Job logs | `pushJobLog` | state mutation | used by engine and executor |
| Cancel | `job.currentProcess`, `job.canceled` | shared mutable state | engine must keep process reference behavior |
| Upload files | multer file objects | filesystem | read, probe, cleanup |
| Temp files | `UPLOAD_DIR`, `fs`, `path` | filesystem | create workDir, segments, list file, cleanup |
| Outputs | `OUTPUT_DIR`, `uniqueOutputPath` | filesystem | output MP4 creation and stat |
| Encoder | `RENDER_ENCODERS`, `encoderDetectionCache` | module state | shared with API and startup |
| Project timeline | `getRenderPhotos`, `buildSceneFilter` | orchestration | executor-level |
| Legacy video | `createVideoFromPhotos` | route compatibility | not queue-based |

## State And Side Effects

| Function | Job status/progress | Encoder/currentProcess | Logs | Filesystem | Output |
| --- | --- | --- | --- | --- | --- |
| `createRenderFromProject` | `preparing`, `rendering`, current photo, progress | encoder fields and fallback flags | many render logs | creates/deletes temp dir, deletes uploads | creates final MP4 |
| `createVideoFromPhotos` | none | none | none | creates/deletes temp dir, deletes uploads | creates final MP4 |
| `runFfmpeg` | none directly | sets/clears `job.currentProcess` | stderr and timeout logs | child process only | depends on args |
| `detectRenderEncoders` | none | updates cache only | none | child process probes | none |
| `resolveRenderEncoder` | none directly | no field mutation itself | encoder selection/fallback logs | child process through detection | none |

## Cleanup Coupling

Queued render cleanup:

- `createRenderFromProject.finally` deletes uploaded files and temp work directory.
- `processRenderQueue.catch` also deletes uploaded files through `cleanupUploadedFiles`.
- Duplicate deletion is tolerated because `fs.rm(..., { force: true })` is used.

Legacy video cleanup:

- `createVideoFromPhotos.finally` deletes uploaded files and temp work directory.

Route cleanup:

- `/api/render` catch removes uploaded files if job creation fails before queueing.
- `/api/videos` catch removes uploaded files if legacy creation throws before internal finally handles them.
- cancel route and shutdown also remove job files.

## Boundary Judgement

### FFmpeg command generation

Command generation currently belongs to the executor layer because it needs project photo data, captions, transitions, effects, duration, resolution, quality, and output paths.

The FFmpeg engine should run already-built argument arrays, manage process lifecycle, timeout, stderr logging, and cancellation via `job.currentProcess`.

### Progress parsing

Current implementation does not parse FFmpeg progress into percentages. Progress belongs to executor-level milestones. If future frame parsing is added, it should be introduced in the engine with callbacks into job utilities.

### `job.currentProcess`

This should stay engine-owned because it is directly tied to the spawned child process. The engine must set and clear it exactly as today for cancel route compatibility.

### Encoder fallback

Detection and low-level encoder args can be engine/helper responsibilities, but per-scene GPU-to-CPU fallback currently belongs to executor orchestration because it decides whether to retry, skip the photo, mutate job encoder fields, or continue.

### output/upload cleanup

Temp work directory cleanup belongs to the executor that creates the work directory.

Uploaded file cleanup is currently duplicated across executor, route failure, queue failure, cancel, and shutdown. It should not be centralized until cancel/shutdown ownership is surveyed again.

### `createVideoFromPhotos` naming

The name is accurate for legacy direct video creation but not for the current project render executor. It is a compatibility path, not the main render pipeline.

## Split Options

### A. `render-executor.js` First

Move:

- `createRenderFromProject`

Keep in `server.js`:

- `createVideoFromPhotos`
- `runFfmpeg`
- encoder detection and selection

Risk: MEDIUM-HIGH.

Pros:

- Separates current project render orchestration from routes.
- Keeps FFmpeg process lifecycle stable.

Cons:

- Requires many dependencies to be injected.
- Executor still calls FFmpeg/encoder helpers in `server.js`, creating broad wiring.
- Could be awkward without moving related scene/filter/output helpers.

Expected reduction: about 120-170 lines if helper dependencies remain imported/wired.

Recommendation: Not first unless scoped to a factory with exact dependency injection and no helper moves.

### B. Executor And FFmpeg Engine Together

Move:

- `createRenderFromProject`
- `createVideoFromPhotos`
- `runFfmpeg`
- encoder detection/selection

Risk: HIGH.

Pros:

- Produces a cleaner final render module boundary.
- Reduces `server.js` significantly.

Cons:

- Moves child process lifecycle, cancel coupling, GPU fallback, legacy `/api/videos`, encoder API, startup detection, and output/temp cleanup together.
- Large blast radius.
- Harder to verify without actual render tests.

Expected reduction: 350-500 lines.

Recommendation: Do not do this in one step.

### C. FFmpeg Engine First

Move:

- `runFfmpeg`
- `checkFfmpeg`
- `getFfmpegEncodersText`
- `probeFfmpegEncoder`
- `detectRenderEncoders`
- `normalizeRenderEncoder`
- `resolveRenderEncoder`
- `getQualityArgs`
- `getEncoderArgs`
- possibly `ffmpegPath` and `encoderDetectionCache`

Risk: MEDIUM.

Pros:

- Isolates child process lifecycle and encoder cache.
- Preserves current executor orchestration.
- Keeps command construction in `server.js`.
- Easier to verify with no render POST by checking `/api/render/encoders`.

Cons:

- `runFfmpeg` still mutates job and logs, so job utilities must be injected.
- Startup `/health` currently reports `ffmpegPath`.
- Encoder constants are also used to configure public job labels in `render-job-store`.
- Need to avoid duplicate encoder cache instances.

Expected reduction: 120-180 lines.

Recommendation: Best next implementation step, with a small `server/ffmpeg-engine.js` factory/module.

## Recommended Split Order

Recommended next step: **FFmpeg Engine first**.

Rationale:

- `runFfmpeg` and encoder detection are cohesive around child process and codec support.
- `createRenderFromProject` is broader and easier to move after its engine dependency is stable.
- `/api/render/encoders` already depends on `detectRenderEncoders`, so read-only API regression can verify the engine without creating render jobs.
- GPU fallback in scene rendering can remain in `createRenderFromProject` while using engine-provided `runFfmpeg`, `resolveRenderEncoder`, and `getEncoderArgs`.

Do not move `createRenderFromProject` and `createVideoFromPhotos` together with the engine in the next step.

## Expected Next Implementation Files

Likely files for next step:

- `server.js`
- `server/ffmpeg-engine.js`
- `docs/STRUCTURE_PHASE1_23B_FFMPEG_ENGINE_20260715.md`

Potentially verified but unchanged:

- `server/render-queue-controller.js`
- `server/render-job-utils.js`
- `server/routes/render-read-routes.js`

## Expected server.js Reduction

If FFmpeg engine is extracted first:

- Gross moved code: about 120-180 lines.
- Import/config wiring: about 15-30 lines.
- Net reduction: about 100-150 lines.

If only encoder detection helpers move without `runFfmpeg`:

- Net reduction: about 60-90 lines.

## Risks

- `job.currentProcess` must remain set/cleared exactly for cancel route.
- `encoderDetectionCache` must not be duplicated.
- `RENDER_ENCODERS` labels/codecs must remain shared with public job serialization.
- Startup encoder detection and `/api/render/encoders` must use the same cache.
- `runFfmpeg` stderr logging caps and duplicate suppression must remain unchanged.
- Timeout behavior and cancellation rejection order must remain unchanged.
- Moving `createRenderFromProject` before the engine is stable would require too many dependencies at once.

## Frozen Areas

Do not modify during the next survey/implementation unless explicitly scoped:

- Queue controller
- Queue operations
- Job store
- Job utilities
- cancel route
- shutdown handling
- POST `/api/render`
- POST `/api/videos`
- output routes
- upload middleware
- package files
- user data
