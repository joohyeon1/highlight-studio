# STRUCTURE PHASE 1-23C Render Executor Survey

## Scope

This is a read-only survey before extracting `createRenderFromProject`.

No source code, FFmpeg Engine, Queue Controller, Queue Operations, Job Store, Job Utilities, Render POST route, legacy videos route, cancel route, shutdown handling, package files, or user data were modified.

Current baseline:

- Branch: `main`
- Latest commit: `b61365e`
- `server.js`: 880 lines by Node CRLF/LF split method

## Full Call Flow

Actual queued render path:

```text
POST /api/render
→ normalizeUploadedFiles(req.files)
→ parseProjectPayload(req.body.project)
→ create job object
→ addRenderJob(job)
→ enqueueRenderJob(job)
→ processRenderQueue
→ createRenderFromProject(project, files, job)
→ updateJob(preparing)
→ pushJobLog(FFmpeg check)
→ checkFfmpeg()
→ getRenderPhotos(project, files)
→ updateJob(rendering, input count)
→ create workDir under UPLOAD_DIR
→ read project.video.outputOptions
→ getResolution(outputOptions)
→ resolveRenderEncoder(...)
→ set job encoder fields
→ uniqueOutputPath(...)
→ loop selected render photos
→ cancellation check
→ displayFileName(...)
→ duration calculation
→ updateJob(currentPhoto/progress)
→ probeInputImage(file, job)
→ optional caption/transition logs
→ buildSceneFilter(...)
→ getEncoderArgs(job.encoder, quality)
→ runFfmpeg(scene args)
→ on GPU scene failure: mutate job fallback fields and retry CPU once
→ segmentPaths.push(...)
→ updateJob(progress)
→ write segments.txt
→ updateJob(MP4 encoding stage)
→ runFfmpeg(concat args)
→ fs.statSync(outputPath)
→ push output/completion logs
→ return result object
→ finally delete uploaded files and workDir
```

No template helper is called directly by `createRenderFromProject`. Template selection is already materialized into project/timeline data before rendering.

## Inputs And Return Shape

Function:

```js
async function createRenderFromProject(project, files, job)
```

Inputs:

- `project`: parsed render project payload.
- `files`: uploaded multer file objects.
- `job`: render queue job object.

Required/used project fields:

- `project.photos`: array, selected via `photo.selected !== false`.
- `project.video.outputOptions`: optional settings.
- `project.video.title`: output filename fallback.
- `project.encoder`: fallback encoder setting.

Used photo fields:

- `id`
- `fileName`
- `name`
- `originalName`
- `selected`
- `durationSeconds`
- `duration`
- `photoEffect`
- `caption.text`
- `caption.position`
- `transitionAfter.type`
- `transitionAfter.duration`

Used output fields:

- `outputOptions.resolution.width`
- `outputOptions.resolution.height`
- `outputOptions.fps`
- `outputOptions.encoder`
- `outputOptions.quality`
- `outputOptions.fileName`
- `outputOptions.defaultPhotoDuration`

Return shape expected by Queue Controller:

```js
{
  filename,
  downloadUrl,
  durationSeconds,
  bytes
}
```

Queue Controller uses exactly:

- `result.filename`
- `result.downloadUrl`
- `result.durationSeconds`
- `result.bytes`

Legacy `createVideoFromPhotos` shares similar result fields (`filename`, `downloadUrl`, `durationSeconds`, `bytes`) but adds `id` and `photoCount`; it is not called by `createRenderFromProject`.

## Dependency Table

| Dependency | Defined in | Input | Return | FS changes | Job changes | Move with executor? |
| --- | --- | --- | --- | --- | --- | --- |
| `getRenderPhotos` | `server.js` | project, files | `{ photo, file }[]` | no | no | Yes |
| `probeInputImage` | `server.js` | file, job | `{ ok }` or `{ ok:false,error }` | reads file stat, runs FFmpeg probe | `runFfmpeg` may set currentProcess/logs | Yes, or later media probe helper |
| `buildSceneFilter` | `server.js` | photo, width, height, fps, duration | FFmpeg filter string | no | no | Yes, or scene/filter module |
| `uniqueOutputPath` | `server.js` | fileName | output path | reads output existence | no | Yes, but consider output planner module |
| `safeOutputFileName` | `server.js` | value | `.mp4` filename | no | no | Maybe with output planner |
| `getResolution` | `server.js` | outputOptions | `{ width, height }` | no | no | Yes |
| `ffmpegListPath` | `server.js` | file path | escaped list path | no | no | Yes |
| `displayFileName` | upload helper | names | display string | no | no | Keep imported dependency |
| `safeName` | `server.js` common helper | value | safe string | no | no | Keep for now or common helper later |
| `makeId` | `server.js` common helper | prefix | id string | no | no | Keep for now |
| `checkFfmpeg` | `server/ffmpeg-engine.js` | none | boolean | child process | no | Already engine |
| `resolveRenderEncoder` | `server/ffmpeg-engine.js` | requested, job | encoder plan | child process/cache | logs through `pushJobLog` | Engine dependency |
| `getEncoderArgs` | `server/ffmpeg-engine.js` | encoder, quality | arg array | no | no | Engine dependency |
| `runFfmpeg` | `server/ffmpeg-engine.js` | args, job, options | resolves/rejects | child process | currentProcess/logs | Engine dependency |
| `updateJob` | job utils | job, patch | none | no | yes | Inject |
| `pushJobLog` | job utils | job, message | none | no | logs | Inject |
| `RENDER_ENCODERS` | FFmpeg engine | value lookup | metadata | no | no | Engine dependency |
| `fs`, `path` | Node | paths | varies | create/read/write/delete/stat | no | Executor module can require directly |

## Job State Changes

`createRenderFromProject` uses `updateJob` for:

| Step | Patch |
| --- | --- |
| Start | `status: "preparing"`, `progress: 2`, `startedAt` |
| Inputs confirmed | `status: "rendering"`, `totalPhotos`, `progress: 5` |
| Per photo start | `status: "rendering"`, `currentPhoto`, `currentPhotoName`, `totalPhotos`, `progress` |
| Per photo complete | `progress` |
| MP4 concat start | `status: "rendering"`, `progress: 76`, `currentPhoto`, `currentPhotoName: "MP4 인코딩"`, `totalPhotos` |

Direct job mutations:

- `job.encoderRequested`
- `job.encoder`
- `job.encoderCodec`
- `job.encoderLabel`
- `job.encoderFallback`
- `job.encoderFallbackMessage`
- `job.failedPhotos`

Indirect job mutations through FFmpeg Engine:

- `job.currentProcess` set/cleared by `runFfmpeg`
- FFmpeg stderr/timeout logs via `pushJobLog`

Logs emitted directly:

- `FFmpeg 설치 여부 확인 시작`
- `FFmpeg 실행 가능 확인`
- `입력 파일 확인: N장`
- `현재 사용 인코더: ...`
- `사진 처리 중: ...`
- `사진 스킵: ...`
- `자막 적용: ...`
- `전환효과 적용: ...`
- GPU fallback messages
- `MP4 인코딩 시작`
- `출력 파일 생성: ...`
- `스킵된 사진: N장`
- `완료 시간: ...`
- `임시 파일 정리 완료`

`createRenderFromProject` does not set final `completed`, `failed`, or `canceled`; that remains Queue Controller responsibility.

## Filesystem Side Effects

Creates:

- `workDir = path.join(UPLOAD_DIR, makeId("render"))`
- per-scene MP4 files under `workDir`
- `segments.txt` under `workDir`
- final MP4 under `OUTPUT_DIR`

Reads:

- uploaded file existence and size through `probeInputImage`
- output existence through `uniqueOutputPath`
- output stat through `fs.statSync(outputPath)`

Deletes:

- all uploaded `files` in `finally`
- `workDir` recursively in `finally`

Potential leftovers:

- final output file remains on success.
- if concat/output write fails after partial output creation, partial output may remain because `finally` does not delete `outputPath`.
- uploaded files may also be removed by Queue Controller catch/cancel/shutdown paths; duplicate `fs.rm(... force:true)` is tolerated.

## GPU Fallback Detail

Initial selection:

1. `resolveRenderEncoder(outputOptions.encoder || project.encoder || "auto", job)`.
2. `job.encoderRequested = encoderPlan.requested`.
3. `job.encoder = encoderPlan.selected`.
4. `job.encoderCodec` and `job.encoderLabel` are set from `RENDER_ENCODERS`.
5. `job.encoderFallback = false`.
6. `job.encoderFallbackMessage = ""`.

Scene render:

1. Build `segmentArgs` with `getEncoderArgs(job.encoder, outputOptions.quality)`.
2. `await runFfmpeg(segmentArgs, job, { timeoutMs: sceneTimeoutMs })`.

Fallback condition:

- Any scene `runFfmpeg` error while `job.encoder !== "cpu"` and job is not canceled.

Fallback actions:

- `job.encoderFallback = true`
- `job.encoderFallbackMessage = "GPU 사용 불가. CPU로 전환하여 계속 렌더링합니다."`
- log `${job.encoderCodec} 인코딩 실패`
- log fallback message
- `job.encoder = "cpu"`
- `job.encoderCodec = "libx264"`
- `job.encoderLabel = "CPU"`
- retry the same scene once with `getEncoderArgs("cpu", outputOptions.quality)`

If CPU retry fails:

- If canceled, rethrow.
- Otherwise push failed photo entry and continue to next photo.

Explicit vs auto:

- Both auto-selected GPU and user-requested GPU follow the same scene failure fallback.
- `resolveRenderEncoder` already falls back to CPU before render if requested encoder is unavailable.

## Cleanup Coupling

Executor cleanup:

- Deletes uploaded files and `workDir` in `finally`.

Queue Controller cleanup:

- On executor rejection, also calls upload cleanup.
- Schedules terminal job cleanup.

Cancel/shutdown cleanup:

- Cancel route and shutdown can remove uploaded files.
- Shutdown kills current process and clears queue/active state.

Conclusion:

- Do not centralize cleanup during executor extraction.
- Preserve duplicate-safe `force:true` deletion until cancel/shutdown are separately surveyed.

## Helper Move Judgement

| Helper | Render executor only? | Legacy used? | Other route used? | Recommended |
| --- | --- | --- | --- | --- |
| `getRenderPhotos` | Yes | No | No | Move with executor |
| `probeInputImage` | Mostly executor/input media | No | No | Move with executor for now; possible later media-probe helper |
| `buildSceneFilter` | Yes | No | No | Move with executor, or scene-filter module if split smaller |
| `uniqueOutputPath` | Render/output planning | No | No direct route use | Move with executor or output planner |
| `safeOutputFileName` | Shared with output rename route registration dependency | No | Yes, output write route | Keep in `server.js` for now |
| `getResolution` | Executor only | No | No | Move with executor |
| `ffmpegListPath` | Executor + legacy renderer | Yes | No | Keep until legacy renderer split, or duplicate injection carefully |
| `escapeDrawText` | Scene filter only | No | No | Move with `buildSceneFilter` |
| `getCaptionY` | Scene filter only | No | No | Move with `buildSceneFilter` |

## Module Shape Comparison

### A. Factory Render Executor

Example:

```js
const { createRenderFromProject } = createRenderExecutor({
  uploadDir,
  photoSeconds,
  renderEncoders,
  runFfmpeg,
  checkFfmpeg,
  resolveRenderEncoder,
  getEncoderArgs,
  updateJob,
  pushJobLog,
  displayFileName,
  safeName,
  makeId
});
```

Risk: MEDIUM.

Pros:

- Keeps a single executor instance.
- Shares FFmpeg Engine instance cleanly.
- Testable with stubbed FFmpeg functions.
- Avoids passing a large dependency object on every call.

Cons:

- Requires careful dependency list.
- Some path/output helpers must be moved or injected.

Recommendation: Yes.

### B. Configure Singleton

Risk: MEDIUM-HIGH.

Pros:

- Similar to existing modules.
- Less change at call sites.

Cons:

- More hidden mutable dependencies.
- Harder to test in isolation.
- Easier to accidentally duplicate state or leave defaults.

Recommendation: Avoid for executor.

### C. Pass Dependency Object Per Call

Risk: MEDIUM.

Pros:

- No module-level dependency state.
- Very explicit.

Cons:

- Call sites become bulky.
- Queue Controller would need to know executor dependencies or wrapper function.
- More chance of changing route/controller boundaries.

Recommendation: Not preferred.

## Recommended Actual Split Scope

Choose option 2: `createRenderFromProject` plus render-specific helper functions together.

Move together:

- `createRenderFromProject`
- `getRenderPhotos`
- `probeInputImage`
- `buildSceneFilter`
- `escapeDrawText`
- `getCaptionY`
- `getResolution`
- possibly `uniqueOutputPath`

Keep in `server.js` for now:

- `createVideoFromPhotos`
- `ffmpegListPath` if legacy renderer remains in `server.js`
- `safeOutputFileName` because output write route uses it
- Render POST route
- Cancel route
- Queue Controller

A slightly safer implementation variant:

- Move `createRenderFromProject`, `getRenderPhotos`, `probeInputImage`, `buildSceneFilter`, `escapeDrawText`, `getCaptionY`, `getResolution`.
- Keep `uniqueOutputPath` and `ffmpegListPath` injected from `server.js` to avoid output/legacy coupling in the first executor extraction.

Risk: MEDIUM.

Reason:

- `createRenderFromProject` is currently the largest remaining render orchestration block.
- Its helper set is mostly render-only.
- FFmpeg Engine is already separated, so executor can depend on a stable engine API.
- Moving Render POST route first would be higher risk because it touches upload middleware and job creation.

## Expected Files For Next Implementation

Likely files:

- `server.js`
- `server/render-executor.js`
- `docs/STRUCTURE_PHASE1_23D_RENDER_EXECUTOR_20260715.md`

Potentially unchanged but verified:

- `server/ffmpeg-engine.js`
- `server/render-queue-controller.js`
- `server/render-job-utils.js`

## Expected server.js Reduction

If moving executor and render-specific helpers:

- Gross moved code: about 170-230 lines.
- Import/factory wiring: about 20-35 lines.
- Net reduction: about 140-190 lines.

If moving only `createRenderFromProject`:

- Net reduction: about 90-120 lines, but dependency wiring is less clean.

## Risks

- Upload cleanup duplication must stay behavior-compatible.
- `job.currentProcess` still depends on FFmpeg Engine receiving the same job object.
- GPU fallback must keep exact job field mutation order and log strings.
- `uniqueOutputPath` collision behavior must remain identical.
- `ffmpegListPath` is shared by legacy renderer; moving it carelessly can break `/api/videos`.
- Scene filter strings are sensitive to escaping and should not be reformatted.
- Queue Controller return shape must remain unchanged.

## Frozen Areas

Do not modify during the next executor extraction unless explicitly scoped:

- `createVideoFromPhotos`
- FFmpeg Engine internals
- Queue Controller
- Queue Operations
- Job Store
- Job Utilities
- Render POST route
- Legacy videos route
- Cancel route
- shutdown handling
- package files
- user data
