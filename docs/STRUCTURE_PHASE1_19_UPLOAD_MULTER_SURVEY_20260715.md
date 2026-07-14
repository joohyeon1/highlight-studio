# STRUCTURE PHASE 1-19 Upload/Multer Survey

## 1. Multer Configuration Map

Current upload/multer code is still in `server.js`.

| Area | Location | Current Behavior |
| --- | --- | --- |
| `multer` import | `server.js:6` | `const multer = require("multer")` |
| upload dir | `server.js:67` | `path.resolve(process.env.HIGHLIGHT_UPLOAD_DIR || path.join(ROOT_DIR, "uploads"))` |
| max files | `server.js:71` | `Number(process.env.HIGHLIGHT_MAX_PHOTOS || 200)` |
| directory ensure | `server.js:102` | `fs.mkdirSync(UPLOAD_DIR, { recursive: true })` |
| storage | `server.js:165-171` | `multer.diskStorage` |
| destination | `server.js:166` | always `UPLOAD_DIR` |
| filename | `server.js:167-170` | `${makeId("photo")}${ext}` |
| extension fallback | `server.js:168` | `path.extname(file.originalname || "").toLowerCase() || ".jpg"` |
| upload instance | `server.js:173-183` | `multer({ storage, limits, fileFilter })` |
| limits.files | `server.js:176` | `MAX_PHOTOS` |
| limits.fileSize | `server.js:177` | `30 * 1024 * 1024` |
| fileFilter | `server.js:179-182` | accepts `image/jpeg`, `image/png`, `image/webp`; otherwise Korean error |
| global multer error handler | `server.js:1109-1111` | returns `400 { ok:false, error }` |

No `memoryStorage`, `upload.single`, or `upload.fields` use was found. Only `upload.array("photos", MAX_PHOTOS)` is used.

## 2. Related Constants

| Constant | Location | Environment Override | Role |
| --- | --- | --- | --- |
| `UPLOAD_DIR` | `server.js:67` | `HIGHLIGHT_UPLOAD_DIR` | multer destination and render working directory parent |
| `MAX_PHOTOS` | `server.js:71` | `HIGHLIGHT_MAX_PHOTOS` | multer max file count and route array max |
| `PHOTO_SECONDS` | `server.js:72` | `HIGHLIGHT_PHOTO_SECONDS` | legacy `/api/videos` and render defaults |
| file size limit | `server.js:177` | none | 30 MB per file |
| MIME allowlist | `server.js:180` | none | jpeg/png/webp only |

There is no separate allowed extension allowlist. The saved extension is copied from `originalname`, lowercased, with `.jpg` fallback. Actual accept/reject currently depends on MIME.

## 3. Middleware Usage Routes

| Method | Path | Middleware | File Field | Max Count | Body Use | File Use | Failure Cleanup |
| --- | --- | --- | --- | --- | --- | --- | --- |
| POST | `/api/videos` | `upload.array("photos", MAX_PHOTOS)` | `photos` | `MAX_PHOTOS` | `title`, `secondsPerPhoto` | `req.files` passed to `createVideoFromPhotos` | catch removes `req.files` paths |
| POST | `/api/render` | `upload.array("photos", MAX_PHOTOS)` | `photos` | `MAX_PHOTOS` | `project` JSON string | `req.files` stored on render job and matched to project photos | catch removes `req.files` paths |

`/api/videos` is documented as deprecated compatibility. `/api/render` is the active frontend route.

## 4. Frontend Connection

`public/app.js` builds a `FormData` payload for rendering:

- appends `project` as JSON string
- appends each selected photo as `photos`
- filename sent to the browser upload API is `photo.id + original extension fallback`
- sends `fetch("/api/render", { method: "POST", body: formData })`

No active frontend call to `/api/videos` was found in `public/app.js`.

## 5. Filename Generation Flow

Current server-side upload filename path:

1. Browser sends multipart file under `photos`.
2. Multer receives `file.originalname`.
3. `filename` callback reads `path.extname(file.originalname || "").toLowerCase()`.
4. If no extension exists, `.jpg` is used.
5. Saved filename becomes `${makeId("photo")}${ext}`.
6. Saved file path is under `UPLOAD_DIR`.
7. Route handler calls `normalizeUploadedFiles(req.files)`.
8. `normalizeUploadedFiles` mutates each multer file object by replacing `originalname` with `decodeUploadName(originalname)`.
9. Render matching uses normalized `file.originalname` in `getRenderPhotos`.
10. User-facing names use `displayFileName` in `probeInputImage` and render progress logs.

The file system saved name is ID-based; display/original names remain on the multer file object.

## 6. Existing Upload Helper Connections

| Helper | Location | Upload/Render Role |
| --- | --- | --- |
| `displayFileName` | `server/upload-file-helpers.js` | user-facing photo name in validation/progress logs |
| `decodeUploadName` | `server/upload-file-helpers.js` | restores uploaded `originalname` where possible |
| `normalizeUploadedFiles` | `server/upload-file-helpers.js` | mutates `req.files[*].originalname`; called in `/api/videos` and `/api/render` |
| `safeName` | `server.js` and other modules | used for output titles, project names, output file names; not directly used by multer filename |
| `makeId` | `server.js`, `server/template-helpers.js` | multer saved file IDs, render job IDs, project recent IDs |

`safeName` and `makeId` are shared beyond upload, so moving them with upload/multer would create a broader common-helper change.

## 7. Risk Classification

### LOW

- Exporting pure upload constants if values are passed in from `server.js`.
- Extracting a pure MIME predicate only if behavior and error message stay exactly the same.
- Extracting a `createUploadMiddleware` factory that receives `multer`, `uploadsDir`, `maxPhotos`, `makeId`, and `path`.

### MEDIUM

- Moving `multer.diskStorage`.
- Moving destination/filename callbacks.
- Moving `fileFilter`.
- Moving `limits`.
- Moving the `upload` instance.

These are medium because any mismatch can affect file creation, saved filenames, MIME rejection, or middleware errors.

### HIGH

- Moving `/api/render` or `/api/videos` routes together with middleware.
- Changing middleware order.
- Changing cleanup on failed render/video requests.
- Moving render queue or FFmpeg file handling.
- Moving `makeId` or `safeName` as part of this phase.

## 8. Module Split Options

| Option | Shape | Dependencies | Signature Change | Server.js Reduction | Verification Difficulty | Risk |
| --- | --- | --- | --- | --- | --- | --- |
| A. Multer settings only | `server/upload-middleware.js` exports `createUploadMiddleware` | `multer`, `path`, `uploadsDir`, `maxPhotos`, `makeId` | no route signature change | about 20 lines | syntax + temp upload fixture later | MEDIUM |
| B. Upload middleware factory | same as A, plus exports `createUploadStorage` or `createUploadFileFilter` | same as A | no route signature change | about 20-25 lines | easier unit inspection; still file-creating middleware | MEDIUM |
| C. Settings + helpers module | merge `upload-file-helpers` and multer config | `Buffer`, `multer`, `path`, `makeId` | route imports change | about 25-35 lines | higher because existing helper module changes | MEDIUM-HIGH |
| D. Move upload routes with render | route module owns `/api/videos` and `/api/render` | render queue, FFmpeg helpers, cleanup, output paths, parser | many dependencies | large | hard; requires POST and render queue tests | HIGH |
| E. Keep current structure | no move | none | none | none | none | LOW operational risk |

## 9. Recommended Next Split

Recommended next actual move: Option A/B as a focused middleware factory.

Proposed module:

`server/upload-middleware.js`

Proposed export:

```js
function createUploadMiddleware({ multer, path, uploadsDir, maxPhotos, makeId }) {
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
      cb(null, `${makeId("photo")}${ext}`);
    }
  });

  return multer({
    storage,
    limits: {
      files: maxPhotos,
      fileSize: 30 * 1024 * 1024
    },
    fileFilter: (_req, file, cb) => {
      if (/^image\/(jpeg|png|webp)$/i.test(file.mimetype || "")) return cb(null, true);
      cb(new Error("JPG, PNG, WEBP 이미지만 업로드할 수 있습니다."));
    }
  });
}
```

The actual implementation should copy current code exactly and avoid helper rewrites.

Do not move:

- `POST /api/videos`
- `POST /api/render`
- render queue/status/cancel
- `createVideoFromPhotos`
- `createRenderFromProject`
- `normalizeUploadedFiles`
- `safeName`
- `makeId`

Expected reduction: about 18-22 lines from `server.js`.

Rollback criterion: any changed saved filename pattern, MIME rejection message, `multer` error response, `req.files` shape, or `/api/render` status response means revert the middleware extraction.

## 10. Temporary Upload Verification Plan

No actual upload was performed in this survey.

For the next implementation phase, a safe upload verification can be done only if all of these are true:

- set `HIGHLIGHT_UPLOAD_DIR` to a workspace-local disposable temp directory
- set `HIGHLIGHT_OUTPUT_DIR` and `HIGHLIGHT_DATA_DIR` to disposable temp directories if render route is invoked
- use a generated tiny JPEG/PNG test file
- call only the needed route
- identify and delete only files under the disposable temp directory
- never use real `uploads/`

Because `/api/render` queues work and can invoke FFmpeg, a pure middleware test route does not exist today. If no test-only route is added, verification should prefer a direct unit-like invocation of the factory or defer actual multipart POST to a phase that explicitly allows temporary upload files.

## 11. Duplicates Found

| Duplicate Type | Locations | Notes |
| --- | --- | --- |
| cleanup loops over `file.path` | `/api/videos` catch, `/api/render` catch, render queue failure, cancel paths | Similar but tied to different lifecycle states. Do not unify yet. |
| `makeId` ID creation | upload filename, render job/work dir, recent project, templates | Shared utility candidate, but broad impact. |
| filename safety | `safeName`, `displayFileName`, project helper `safeName` | Similar goals but different allowed characters and output surfaces. Keep separate for now. |
| `req.files || []` handling | `/api/videos`, `/api/render` | Simple duplicate, safe to leave until route modules move. |
| upload field name `"photos"` | `/api/videos`, `/api/render`, frontend render FormData | Must remain unchanged. |
| file cleanup via `fs.rm(... force:true ...)` | multiple render/upload paths | Lifecycle-specific; consolidation is risky before render module split. |

## 12. Read-Only Verification

Planned/required checks for this survey:

- `node --check server.js`
- node syntax check for all `server/**/*.js`
- `node --check desktop/main.js`
- `node --check desktop/preload.js`
- `node --check public/app.js`
- `npm.cmd run check`
- `git diff --check`
- GET `/api/health`
- GET `/api/templates`
- GET `/api/outputs`
- GET `/api/project/recent`
- GET `/api/render/queue`

No upload, render POST, or `/api/videos` POST should be called in this phase.

## 13. Data Integrity Notes

The survey is read-only except this document. It should not create, modify, or delete:

- `uploads`
- `outputs`
- `data/backups`
- `data/templates.json`
- `.hsp` files
- `package.json`
- `package-lock.json`

## 14. Current Line Count

Line counting differs by tool because of file newline handling:

- Node split count: 1148 entries / 1147 newline characters
- PowerShell `Measure-Object -Line`: 1057 lines
- User baseline for this phase: 1057 lines

For continuity with prior phase reports, use the PowerShell `Measure-Object -Line` value.
