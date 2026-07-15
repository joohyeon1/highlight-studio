# STRUCTURE PHASE 1-23B FFmpeg Engine

## Scope

This phase extracts FFmpeg child process execution and encoder detection/selection into `server/ffmpeg-engine.js`.

Render executor, legacy renderer, queue controller, routes, cancel handling, shutdown cleanup, project/timeline matching, scene filter construction, output cleanup, and upload cleanup orchestration were not moved.

## Moved Functions And State

Moved to `server/ffmpeg-engine.js`:

- `runFfmpeg`
- `checkFfmpeg`
- `getFfmpegEncodersText`
- `probeFfmpegEncoder`
- `detectRenderEncoders`
- `normalizeRenderEncoder`
- `resolveRenderEncoder`
- `getQualityArgs`
- `getEncoderArgs`
- `RENDER_ENCODERS`
- encoder detection cache
- FFmpeg binary path resolution

`normalizeRenderEncoder` and `getQualityArgs` are internal helpers required by the exported engine functions.

## Not Moved

The following executor/legacy functions remain in `server.js`:

- `createRenderFromProject`
- `createVideoFromPhotos`
- `probeInputImage`
- `buildSceneFilter`
- `getRenderPhotos`
- `uniqueOutputPath`
- `ffmpegListPath`
- `getResolution`
- `safeOutputFileName`

The following route/controller logic also remains unchanged:

- Queue Controller
- Queue Operations
- Render Job Store
- Render Job Utilities
- Render POST route
- Legacy `/api/videos` route
- Cancel route
- `cancelAllRenderJobs`
- Electron shutdown handling
- output/upload cleanup orchestration

## New Module Export

`server/ffmpeg-engine.js` exports:

- `createFfmpegEngine`

The created engine instance returns:

- `RENDER_ENCODERS`
- `getFfmpegPath`
- `runFfmpeg`
- `checkFfmpeg`
- `getFfmpegEncodersText`
- `probeFfmpegEncoder`
- `detectRenderEncoders`
- `resolveRenderEncoder`
- `getEncoderArgs`

## Engine Initialization

`server.js` creates one FFmpeg Engine instance:

```js
const ffmpegEngine = createFfmpegEngine({ pushJobLog });
const {
  RENDER_ENCODERS,
  getFfmpegPath,
  runFfmpeg,
  checkFfmpeg,
  detectRenderEncoders,
  resolveRenderEncoder,
  getEncoderArgs
} = ffmpegEngine;
```

The same instance is used by:

- startup encoder detection
- `GET /api/render/encoders`
- `createRenderFromProject`
- `probeInputImage`
- `createVideoFromPhotos`
- `render-job-store` public encoder labels through the shared `RENDER_ENCODERS`

## FFmpeg Binary Path

Path resolution moved into the engine:

1. Default path: `ffmpeg`
2. Preferred bundled package: `@ffmpeg-installer/ffmpeg`
3. Optional factory override: `ffmpegPath`

`/health` now reads the path through `getFfmpegPath()`, preserving the same response field.

## Encoder Cache Single Source

The encoder detection cache now lives inside the single `ffmpegEngine` instance.

The previous module-scope `encoderDetectionCache` was removed from `server.js`, so there is no duplicate cache source.

Cache behavior preserved:

- First `detectRenderEncoders()` call probes FFmpeg.
- Later calls reuse the cached result.
- `{ force: true }` refreshes the cache.
- `checkedAt` remains dynamic.

## Encoder Detection And Selection Flow

Detection:

1. `checkFfmpeg()` runs `ffmpeg -version`.
2. `getFfmpegEncodersText()` runs `ffmpeg -hide_banner -encoders`.
3. Each configured encoder checks compiled support by codec string.
4. Compiled encoders are runtime probed with `probeFfmpegEncoder(codec)`.
5. Auto priority remains:
   - NVIDIA NVENC
   - Intel Quick Sync
   - AMD AMF
   - CPU

Selection:

1. `normalizeRenderEncoder()` maps invalid values to `auto`.
2. `resolveRenderEncoder()` uses cached detection.
3. `auto` selects detected best encoder.
4. Explicit available encoder is selected.
5. Explicit unavailable encoder logs fallback and selects CPU.

## `runFfmpeg` Process Lifecycle

Preserved behavior:

- Spawns the configured FFmpeg executable with `windowsHide: true`.
- Uses the same FFmpeg args passed by executor/legacy callers.
- Sets `job.currentProcess` immediately after spawn when a job is provided.
- Captures `stderr`.
- Logs up to 12 matching `stderr` lines containing `frame=`, `error`, `failed`, or `invalid`.
- Suppresses duplicate last logged line.
- Supports `timeoutMs`.
- On timeout, logs `FFmpeg 응답 지연으로 프로세스 종료: N초 제한` and kills with `SIGTERM`.
- On `error`, clears timeout, clears `job.currentProcess`, rejects with the original error.
- On `close`, clears timeout, clears `job.currentProcess`, then:
  - rejects with `렌더링이 취소되었습니다.` if `job.canceled`
  - rejects with `FFmpeg 처리 시간이 초과되었습니다.` if timed out
  - resolves if exit code is `0`
  - rejects with stderr text or `ffmpeg exited with code N`

## `job.currentProcess` And Cancel

`job.currentProcess` behavior is preserved inside the engine:

- Set to the spawned child process.
- Cleared on `error`.
- Cleared on `close`.

The cancel route still references the same job object and can kill the same child process. No job object copy or render job store copy is introduced.

The cancel state remains `canceled`; no `cancelled` spelling was introduced.

## GPU Fallback Location

GPU fallback orchestration remains in `createRenderFromProject` in `server.js`.

The engine provides:

- detection result
- encoder selection result
- encoder FFmpeg args
- process execution

The executor still decides:

- when to retry with CPU
- how to mutate `job.encoder`
- how to set fallback fields
- when to skip a failed photo

## Render Read API Connection

`server/routes/render-read-routes.js` was not modified.

It still receives `detectRenderEncoders` as a dependency from `server.js`, but that dependency now comes from the single FFmpeg Engine instance.

## Unit Verification

Memory-only stub checks were performed without output files or real render jobs.

`getEncoderArgs`:

- CPU/high returned `["-c:v","libx264","-crf","20","-preset","medium"]`
- NVIDIA/best returned NVENC codec, preset `p5`, cq `17`, zero bitrate
- Intel/default returned QSV codec and global quality `26`
- AMD/high returned AMF codec and qp `22`
- unknown encoder fell back to CPU/libx264 veryfast profile

`runFfmpeg` with stubbed spawn:

- normal close code `0`: resolved
- non-zero close: rejected with `ffmpeg exited with code N`
- spawn error: rejected with original message
- canceled job: rejected with `렌더링이 취소되었습니다.`
- timeout: killed with `SIGTERM`, logged timeout, rejected with timeout message
- `job.currentProcess` was cleared on all terminal paths

Encoder cache:

- First detection call spawned probes.
- Second detection call reused the same cached object.
- `{ force: true }` triggered a new detection.
- Selected priority preserved NVENC before CPU when available.

## API Regression

Read-only or safe fixed-payload checks:

| Endpoint | Status | Hash |
| --- | ---: | --- |
| `GET /api/render/encoders` | 200 | `75e56298cd92a4f670c26e57dd68a7cebe82b7a570c7d5f2559976fc2d01bc6e` after normalizing `checkedAt` |
| `GET /api/render/queue` | 200 | `3f2368a87e1d0fc87b84eb94bbf1770fd1679cdfef720913ad92d20df74e61d7` |
| `GET /api/render/status/__missing__` | 404 | `50263507f7f1067a6b431e9149bc693115520a1b2a794c5264f4ab315c4532a2` |
| `GET /api/health` | 200 | `5987096b61a5c7456d14fe7294aa915680efe66ca23bb77ea049b3323e156e96` |
| `GET /api/templates` | 200 | `96bee505115fd1f78ab66db2529ad96ce08c6986205754869dc2f47405054d48` |
| `GET /api/outputs` | 200 | `4a2a9dc3838dc85a41c4e26b62854f2c52517237b5fe7c4a8b545d7387b9df81` |
| `GET /api/project/recent` | 200 | `83ec6395c2adffe00bb3660d1fb81a4e5bd18455d8af54ed4f8efa0196808383` |
| `GET /api/license/status` | 200 | response shape verified; hash may vary with time-sensitive license fields |
| `POST /api/ai/analyze-photos` fixed JSON | 200 | `e5bce3fe604b4a3cc223625ef5de0862366ea3d124e89d37813b999f8140c292` |

No render, videos, cancel, or upload POST endpoints were called.

## Static Verification

- `node --check server.js`: PASS
- `node --check server/ffmpeg-engine.js`: PASS
- `node --check server/routes/render-read-routes.js`: PASS
- `server/**/*.js` syntax check: PASS
- `node --check desktop/main.js`: PASS
- `node --check desktop/preload.js`: PASS
- `node --check public/app.js`: PASS
- `npm.cmd run check`: PASS
- `git diff --check`: PASS with CRLF normalization warning only

## User Data

No user data was changed.

- `uploads`, `outputs`, and `data/backups` manifest: unchanged
- `package.json`: unchanged
- `package-lock.json`: unchanged
- `data/templates.json`: unchanged
- Port `4000` was stopped after API verification
- No LISTENING process remained on port `4000`

## server.js Line Count

Measurement method: Node CRLF/LF split, excluding final newline.

- Before: 1036 lines
- After: 880 lines
- Reduction: 156 lines

## Next Step Recommendation

Next safe step: survey and extract the render executor only after deciding which render-specific helpers move with it.

Recommended next candidates:

1. `createRenderFromProject` plus render-only helpers:
   - `getRenderPhotos`
   - `getResolution`
   - `ffmpegListPath`
   - `probeInputImage`
   - `buildSceneFilter`
2. Keep `createVideoFromPhotos` legacy path separate until a dedicated legacy route/render survey.
3. Keep cancel/shutdown behavior frozen while executor moves.
