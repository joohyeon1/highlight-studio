# STRUCTURE PHASE 1-20 Upload Middleware

## 1. Moved Multer Settings

The upload middleware setup was moved from `server.js` into:

`server/upload-middleware.js`

Moved code:

- `multer.diskStorage`
- `destination` callback
- `filename` callback
- `fileFilter`
- `limits`
- `multer(...)` upload instance creation

Not moved:

- `POST /api/videos`
- `POST /api/render`
- `upload.array("photos", MAX_PHOTOS)` calls
- `normalizeUploadedFiles`
- render queue
- FFmpeg logic
- upload cleanup logic

## 2. Factory Dependency

The new module exports:

`createUploadMiddleware({ uploadDir, maxPhotos, makeId })`

Dependencies are passed from `server.js`:

- `uploadDir`: current `UPLOAD_DIR`
- `maxPhotos`: current `MAX_PHOTOS`
- `makeId`: current server-scoped ID helper

The module does not require `server.js`, does not read `process.env`, does not duplicate `UPLOAD_DIR`, and does not create a separate `MAX_PHOTOS` constant.

## 3. Destination Behavior

Current behavior is preserved:

```js
destination: (_req, _file, cb) => cb(null, uploadDir)
```

The destination still resolves to the same `UPLOAD_DIR` configured in `server.js`. The module does not create or change directories; existing startup directory creation remains in `server.js`.

## 4. Filename Rule

Current behavior is preserved:

```js
const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
cb(null, `${makeId("photo")}${ext}`);
```

Rules:

- original extension is lowercased
- missing extension falls back to `.jpg`
- saved filename uses the `photo` ID prefix
- no `safeName` or display-name logic is introduced
- original filename decoding remains in `normalizeUploadedFiles`

## 5. FileFilter Rule

Current MIME allowlist is preserved:

- `image/jpeg`
- `image/png`
- `image/webp`

Rejected MIME error is unchanged:

`JPG, PNG, WEBP 이미지만 업로드할 수 있습니다.`

## 6. Limits

Current limits are preserved:

- `files: maxPhotos`
- `fileSize: 30 * 1024 * 1024`

No size or count rules were changed.

## 7. Route Connection Preserved

Routes remain in `server.js` and still use the same middleware call shape:

```js
app.post("/api/videos", upload.array("photos", MAX_PHOTOS), ...)
app.post("/api/render", upload.array("photos", MAX_PHOTOS), ...)
```

The field name `photos` is unchanged.

## 8. Temporary Verification Method

Production upload/render routes were not called.

Verification used a temporary Express harness connected directly to `createUploadMiddleware` with:

- workspace-local temp directory: `.tmp-structure-phase1-20-uploads`
- deterministic `makeId` stub returning `photo-fixed-XX`
- test route `/upload`
- `upload.array("photos", 2)`

The temp directory was removed after verification.

## 9. Before/After Behavior Comparison

The factory code is the same logic moved out of `server.js`. Route middleware usage remains unchanged.

Harness results:

| Scenario | Status | Result |
| --- | --- | --- |
| JPEG MIME + `.jpg` | 200 | `photo-fixed-01.jpg` |
| PNG MIME + `.PNG` | 200 | `photo-fixed-02.png` |
| WEBP MIME + `.webp` | 200 | `photo-fixed-03.webp` |
| image with no extension | 200 | `photo-fixed-04.jpg` |
| unsupported MIME `image/gif` | 400 | Korean MIME error unchanged |
| `MAX_PHOTOS` exceeded in harness | 400 | `Too many files` |

The large 30 MB limit was not tested with a real large file to avoid unnecessary temp data. The limit object is unchanged in code.

## 10. Actual POST Test Status

No production POST was called:

- no `POST /api/render`
- no `POST /api/videos`
- no real `uploads/` use

This avoids render queue/FFmpeg side effects and user upload directory changes.

## 11. Non-Target API Regression

Read-only APIs were checked:

- `GET /api/health`
- `GET /api/templates`
- `GET /api/outputs`
- `GET /api/project/recent`
- `GET /api/render/queue`
- `GET /api/license/status`

All returned HTTP 200 during verification.

## 12. User Data Integrity

No real user data was intentionally changed:

- `uploads` unchanged
- `outputs` unchanged
- `data/backups` unchanged
- `data/templates.json` hash unchanged
- `package.json` hash unchanged
- `package-lock.json` hash unchanged
- no `.hsp` file created

## 13. Temporary Data Cleanup

Temporary upload directory:

`.tmp-structure-phase1-20-uploads`

Cleanup result: removed.

## 14. server.js Line Count

Using the same PowerShell `Measure-Object -Line` method as prior phases:

- before: 1057 lines
- after: 1046 lines
- reduction: 11 lines

## 15. Next Render Area Candidate

The next safe candidate is a survey or extraction around render read routes:

- `GET /api/render/encoders`
- `GET /api/render/status/:jobId`
- `GET /api/render/queue`

Do not move `POST /api/render`, render queue mutation, cancel, or FFmpeg execution until the render queue dependency surface is documented separately.
