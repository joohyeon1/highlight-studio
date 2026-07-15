# STRUCTURE PHASE 1-24D Legacy Video Renderer

## Scope

This phase extracted only the legacy slideshow renderer into `server/legacy-video-renderer.js`.

Moved function:

- `createVideoFromPhotos`

Not moved:

- `POST /api/videos`
- `ffmpegListPath`
- `safeOutputFileName`
- Render Executor
- FFmpeg Engine internals
- Queue Controller
- Queue Operations
- Job Store
- Job Utilities
- `cancelAllRenderJobs`
- Electron shutdown
- deprecated metadata

## Changed Files

- `server.js`
- `server/legacy-video-renderer.js`
- `docs/STRUCTURE_PHASE1_24C_LEGACY_VIDEO_SURVEY_20260715.md`
- `docs/STRUCTURE_PHASE1_24D_LEGACY_VIDEO_RENDERER_20260715.md`

## New Module Export

`server/legacy-video-renderer.js` exports:

```js
module.exports = {
  createLegacyVideoRenderer
};
```

The factory returns:

```js
{
  createVideoFromPhotos
}
```

## Factory Dependencies

`server.js` creates the legacy renderer with:

- `uploadDir: UPLOAD_DIR`
- `outputDir: OUTPUT_DIR`
- `photoSeconds: PHOTO_SECONDS`
- `makeId`
- `safeName`
- `runFfmpeg`
- `ffmpegListPath`

No unused dependencies are injected.

## Initialization Order

Current relevant order:

1. Create FFmpeg Engine.
2. Define shared path/name helpers.
3. Create Legacy Video Renderer with existing `runFfmpeg`.
4. Create Render Executor.
5. Create Queue Controller.
6. Configure Queue Operations.
7. Register routes.
8. Start server.

The extracted renderer uses the same FFmpeg Engine instance. `runFfmpeg` implementation was not copied.

## Legacy Slideshow Flow Preserved

The moved `createVideoFromPhotos(files, options = {})` keeps the existing flow:

1. Throw `"사진을 1장 이상 업로드해 주세요."` when `files` is empty.
2. Create `jobId = makeId("job")`.
3. Create `workDir = path.join(uploadDir, jobId)`.
4. Create output title with `safeName(options.title || "Highlight Studio")`.
5. Create `outputName = `${title}-${Date.now().toString(36)}.mp4``.
6. Write output to `outputDir`.
7. Calculate per-photo duration from `options.secondsPerPhoto || photoSeconds`, clamped to 1-10 seconds.
8. Render one CPU-only segment per photo with the same FFmpeg args.
9. Write `segments.txt` with `ffmpegListPath`.
10. Concatenate segments with FFmpeg concat demuxer and `-c copy`.
11. Stat the final output.
12. Return the same result shape.
13. Remove uploaded files and temp work directory in `finally`.

## Return Shape Preserved

The return shape remains:

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

No fields were added or removed.

## Cleanup Preserved

The renderer still cleans up:

- uploaded files passed in `files`
- per-job temp work directory
- segment files through work directory removal
- concat list file through work directory removal

Cleanup is still in `finally`, so both success and failure paths run it.

The route catch cleanup in `/api/videos` remains unchanged.

## `/api/videos` Route Compatibility

The route remains in `server.js`.

Preserved behavior:

- `upload.array("photos", MAX_PHOTOS)`
- `normalizeUploadedFiles(req.files)`
- `createVideoFromPhotos(req.files || [], { title, secondsPerPhoto })`
- success status `201`
- success shape:

```js
{
  ok: true,
  video: result,
  deprecated: true,
  replacement: "/api/render",
  message: "POST /api/videos is deprecated. Use POST /api/render for new integrations."
}
```

- failure status `500`
- failure shape:

```js
{
  ok: false,
  error: error.message || "영상 생성에 실패했습니다."
}
```

The route still completes after the legacy MP4 generation promise resolves. It was not converted to queue-backed behavior.

## Static Structure Checks

Expected after extraction:

- one `createLegacyVideoRenderer` implementation
- one `createVideoFromPhotos` implementation, inside `server/legacy-video-renderer.js`
- one legacy renderer instance in `server.js`
- one FFmpeg Engine instance
- one `POST /api/videos` route in `server.js`
- no copied `runFfmpeg`
- no copied `ffmpegListPath`
- no circular require

## Memory Stub Verification

The renderer was verified with OS temp directories and stubbed `runFfmpeg`.

Covered:

- normal two-photo input
- segment render calls
- concat render call
- return shape
- duration calculation
- empty input error
- segment failure cleanup
- concat failure cleanup
- uploaded file cleanup
- work directory cleanup

Result: PASS

Stub did not call real `/api/videos`, did not run real FFmpeg, and did not touch workspace uploads or outputs.

## Read API Regression

Read-only regression endpoints:

- `GET /api/render/encoders`
- `GET /api/render/queue`
- `GET /api/render/status/__missing__`
- `GET /api/health`
- `GET /api/templates`
- `GET /api/outputs`
- `GET /api/project/recent`
- `GET /api/license/status`
- `POST /api/ai/analyze-photos` with fixed JSON payload only

No real `/api/videos`, `/api/render`, cancel, upload, or FFmpeg POST was called.

## User Data

No user data was intentionally changed:

- no real upload
- no real `/api/videos` POST
- no real `/api/render` POST
- no real cancel POST
- no real FFmpeg execution
- no workspace output creation
- no changes to uploads, outputs, data, projects, templates, or backups
- no package file changes

## Line Count

- Before: `server.js` 584 lines
- After: `server.js` 537 lines
- Reduction: 47 lines

## Next Step

Recommended next phase: decide between `POST /api/videos` route extraction and a structure baseline.

Recommended order:

1. Extract `POST /api/videos` into `server/routes/legacy-video-routes.js`, keeping deprecated metadata unchanged.
2. Then take a Structure Baseline survey to decide if bootstrap/shutdown cleanup is still needed.

Do not remove `/api/videos` or convert it to queue-backed behavior before an explicit compatibility decision.
