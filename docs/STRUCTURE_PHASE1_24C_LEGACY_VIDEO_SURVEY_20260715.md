# STRUCTURE PHASE 1-24C Legacy Video Survey

## Scope

This is a read-only survey of the deprecated legacy `POST /api/videos` route and the direct renderer `createVideoFromPhotos`.

Baseline:

- Branch: `main`
- Latest local commit: `b439623`
- `server.js`: 584 lines
- Render Queue, FFmpeg Engine, Render Executor, and Render Write Routes are already separated.

No source code, route, helper, FFmpeg, queue, package file, or user data was modified.

## Survey Target

Route:

- `POST /api/videos`

Legacy renderer and helpers:

- `createVideoFromPhotos`
- `ffmpegListPath`
- `safeOutputFileName`

Related dependencies:

- FFmpeg Engine
- upload helper
- output path handling
- filesystem
- concat list handling
- cleanup
- deprecated metadata

## `/api/videos` Full Flow

Location: `server.js:469`

Actual code order:

1. Route is registered with `upload.array("photos", MAX_PHOTOS)`.
2. Multer stores uploaded files under the configured `UPLOAD_DIR`.
3. Handler calls `normalizeUploadedFiles(req.files)`.
4. Handler calls `createVideoFromPhotos(req.files || [], { title, secondsPerPhoto })`.
5. The route waits for `createVideoFromPhotos` to finish.
6. On success, route returns HTTP `201`.
7. Success JSON shape:

```js
{
  ok: true,
  video: result,
  deprecated: true,
  replacement: "/api/render",
  message: "POST /api/videos is deprecated. Use POST /api/render for new integrations."
}
```

8. On error, route removes all `req.files` paths with `fs.rm(file.path, { force: true }, () => {})`.
9. Error response status is `500`.
10. Error JSON shape:

```js
{
  ok: false,
  error: error.message || "영상 생성에 실패했습니다."
}
```

The route does not create a render job, does not enqueue, does not expose progress, and does not use the cancel route.

## `createVideoFromPhotos`

Location: `server.js:345`

### Inputs

```js
async function createVideoFromPhotos(files, options = {})
```

Inputs used:

- `files`
- `options.title`
- `options.secondsPerPhoto`

### Validation

First line:

```js
if (!files.length) throw new Error("사진을 1장 이상 업로드해 주세요.");
```

No project payload or timeline validation occurs.

### Output And Temp Paths

The function creates:

- `jobId = makeId("job")`
- `workDir = path.join(UPLOAD_DIR, jobId)`
- `title = safeName(options.title || "Highlight Studio")`
- `outputName = `${title}-${Date.now().toString(36)}.mp4``
- `outputPath = path.join(OUTPUT_DIR, outputName)`
- `segmentPaths = []`

The output name is timestamp-like and does not use `safeOutputFileName`.

### Duration

Duration is:

```js
Math.max(1, Math.min(10, Number(options.secondsPerPhoto || PHOTO_SECONDS) || PHOTO_SECONDS))
```

This is fixed for all photos in the request.

### FFmpeg Segment Rendering

For each uploaded file:

1. Builds a segment path:

```js
segment-001.mp4
```

2. Calls `runFfmpeg()` with:

- `-loop 1`
- fixed `-t`
- input `file.path`
- fixed filter:
  - `scale=1920:1080:force_original_aspect_ratio=decrease`
  - `pad=1920:1080:(ow-iw)/2:(oh-ih)/2`
  - `format=yuv420p`
- `-r 30`
- `-an`
- `-c:v libx264`
- `-preset veryfast`

3. Pushes each segment path into `segmentPaths`.

The renderer uses CPU only. It does not call encoder detection, `resolveRenderEncoder`, or `getEncoderArgs`.

### Concat

After all segments:

1. Writes `segments.txt` under `workDir`.
2. Uses `ffmpegListPath(item)` for each segment path.
3. Calls `runFfmpeg()` with:

- `-f concat`
- `-safe 0`
- `-i segments.txt`
- `-c copy`
- final `outputPath`

### Return Shape

After output stat:

```js
{
  id: jobId,
  filename: outputName,
  downloadUrl: `/outputs/${encodeURIComponent(outputName)}`,
  photoCount: files.length,
  durationSeconds: files.length * duration,
  bytes: stat.size
}
```

### Cleanup

In `finally`:

- removes each uploaded file path
- removes `workDir` recursively

The route catch also removes `req.files` on error. This is duplicate cleanup, but both calls use force deletion and are part of the existing compatibility behavior.

## Captions And Transitions

Legacy renderer does not support:

- caption text
- caption position
- transitions
- photo effects
- project timeline
- storyboard
- output ratio/fps/quality settings

It always creates a simple photo slideshow with fixed 1920x1080 scale/pad and CPU encoding.

## Dependency Analysis

### `ffmpegListPath`

Current location: `server.js:231`

Actual users:

- `createVideoFromPhotos`
- `server/render-executor.js` through dependency injection

Role:

- Converts Windows separators to `/`.
- Escapes apostrophes for FFmpeg concat list lines.

Recommendation:

- Keep as shared helper until legacy renderer is moved.
- If legacy renderer is extracted, pass `ffmpegListPath` into that factory or move it to a small FFmpeg path helper only if both executor and legacy renderer import that helper directly.

### `safeOutputFileName`

Current location: `server.js:235`

Actual users:

- `server/render-executor.js` through dependency injection
- `server/routes/output-write-routes.js` through dependency injection

Legacy renderer does not use it.

Recommendation:

- Do not move with legacy renderer.
- Keep in `server.js` or later move with output write/output planning scope.

### FFmpeg Engine

Legacy renderer uses:

- `runFfmpeg`

Legacy renderer does not use:

- `detectRenderEncoders`
- `resolveRenderEncoder`
- `getEncoderArgs`
- encoder cache
- GPU fallback

### Upload Helper

Legacy route uses:

- `upload.array("photos", MAX_PHOTOS)`
- `normalizeUploadedFiles(req.files)`

Legacy renderer receives already-normalized multer files.

### Filesystem

Legacy renderer uses:

- `fs.mkdirSync`
- `fs.writeFileSync`
- `fs.statSync`
- `fs.rm`
- `path.join`

Filesystem side effects:

- creates temp work directory under `UPLOAD_DIR`
- creates segment MP4 files
- creates `segments.txt`
- creates final MP4 under `OUTPUT_DIR`
- deletes uploaded files
- deletes temp work directory

## Comparison With Queued Render Executor

### Actual Overlap

Shared concepts:

- uploaded files become slideshow segments
- segment files are concatenated through FFmpeg concat demuxer
- `runFfmpeg` executes child processes
- `ffmpegListPath` creates concat-safe path lines
- uploaded files and temp work directory are cleaned up
- output metadata includes `filename`, `downloadUrl`, `durationSeconds`, and `bytes`

### Similar Names, Different Meaning

`jobId`:

- Legacy: temp/output identity returned as `id`.
- Queued render: queue job identity used by status/cancel APIs.

`durationSeconds`:

- Legacy: `files.length * fixed duration`.
- Queued render: sum of successfully rendered scene durations.

`runFfmpeg`:

- Legacy: called without a job object, so there is no `currentProcess` for cancel.
- Queued render: called with job object and timeout options, so it links to status/log/cancel.

`outputName`:

- Legacy: title plus timestamp suffix.
- Queued render: project output option filename through unique output planning.

### Code To Keep Separate For v1.0

Keep separate:

- fixed 1920x1080 legacy segment args
- deprecated response metadata
- synchronous route response after full MP4 generation
- no-progress/no-cancel behavior
- no GPU fallback behavior

Combining this with queued render would alter legacy compatibility.

## Legacy Strategy Options

### A. Keep Legacy Renderer In `server.js`

Risk: LOW

Pros:

- No behavior risk.
- Current deprecated compatibility remains stable.

Cons:

- `server.js` still owns direct render implementation.
- Legacy code remains near route bootstrap.

Recommendation: Acceptable if structure cleanup pauses here.

### B. Extract Legacy Renderer Only

Target:

- `server/legacy-video-renderer.js`

Move:

- `createVideoFromPhotos`

Dependencies:

- `uploadDir`
- `outputDir`
- `photoSeconds`
- `makeId`
- `safeName`
- `runFfmpeg`
- `ffmpegListPath`

Risk: MEDIUM-LOW

Pros:

- Removes direct FFmpeg slideshow implementation from `server.js`.
- Keeps route response compatibility easy to compare.
- Does not change `/api/videos` route registration.

Cons:

- Needs careful factory dependency wiring.
- Cleanup behavior must remain identical.

Recommendation: Best next actual extraction.

### C. Keep Route Wrapper And Extract Renderer

This is nearly the same as B if route stays in `server.js`.

If a later `server/routes/legacy-video-routes.js` is created:

- route wrapper can be extracted after renderer extraction
- dependency list becomes cleaner because route depends on a renderer function

Recommendation: Good second step after B.

### D. Prepare Removal

Risk: HIGH

Reasons not to do now:

- README documents `POST /api/videos` as deprecated but existing compatibility.
- Response semantics differ from `/api/render`.
- External scripts may still depend on synchronous `201` and `video` object shape.

Recommendation: Do not remove before v1.0 unless explicitly approved.

## Bootstrap Impact

If only `createVideoFromPhotos` is moved to `server/legacy-video-renderer.js`:

- `server.js` must require `createLegacyVideoRenderer` or similar.
- Factory can be created after FFmpeg Engine creation because it needs `runFfmpeg`.
- It also needs `UPLOAD_DIR`, `OUTPUT_DIR`, `PHOTO_SECONDS`, `makeId`, `safeName`, and `ffmpegListPath`.
- No queue initialization order changes.
- No Electron startup order changes.
- No route order changes if `/api/videos` stays in `server.js`.

Suggested initialization order:

1. Create FFmpeg Engine.
2. Define/shared `ffmpegListPath`.
3. Create Render Executor.
4. Create Queue Controller and Queue Operations.
5. Create Legacy Video Renderer.
6. Register routes.

This avoids circular require and keeps one FFmpeg Engine instance.

## Recommended Next Step

Recommendation: `Legacy renderer 분리`

Next module:

- `server/legacy-video-renderer.js`

Move:

- `createVideoFromPhotos`

Do not move yet:

- `POST /api/videos`
- `ffmpegListPath`
- `safeOutputFileName`
- output write routes
- FFmpeg Engine internals
- queue/cancel/shutdown

Expected files:

- `server.js`
- `server/legacy-video-renderer.js`
- new phase document

Expected `server.js` reduction:

- about 55-65 lines

Risk:

- MEDIUM-LOW

Main verification requirement:

- Use memory/OS temp stub with fake files and stub `runFfmpeg`.
- Verify success return shape, no-file error, concat list generation, output stat, and cleanup.
- Do not call real `/api/videos` POST or FFmpeg against user data.

## Alternative Next Steps

Bootstrap cleanup:

- Not recommended before legacy renderer extraction because `server.js` still contains a direct renderer.

Shutdown cleanup:

- Not recommended in the same sequence because shutdown is queue/cancel stateful and separate from legacy route compatibility.

Structure Baseline:

- Useful after legacy renderer extraction or after deciding to leave legacy code in place.

## Validation

Required validation for this survey:

- `node --check server.js`
- all `server/**/*.js`
- `node --check desktop/main.js`
- `node --check desktop/preload.js`
- `node --check public/app.js`
- `npm.cmd run check`
- `git diff --check`
- `git status --short`

## Commit And Push

No commit and no push are performed in this survey phase.
