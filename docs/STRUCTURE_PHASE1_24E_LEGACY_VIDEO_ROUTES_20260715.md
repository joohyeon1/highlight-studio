# STRUCTURE PHASE 1-24E Legacy Video Routes

## Scope

This phase extracted only the legacy compatibility route:

- `POST /api/videos`

The legacy renderer, FFmpeg engine, render executor, queue controller, cancel logic, shutdown flow, and bootstrap structure were not changed.

## Moved Route

Moved from `server.js` to:

- `server/routes/legacy-video-routes.js`

The new module exports:

```js
module.exports = {
  registerLegacyVideoRoutes
};
```

`server.js` registers it with:

```js
registerLegacyVideoRoutes(app, {
  upload,
  maxPhotos: MAX_PHOTOS,
  normalizeUploadedFiles,
  createVideoFromPhotos
});
```

## Dependencies

The route module receives only the dependencies used by the legacy route:

- `upload`
- `maxPhotos`
- `normalizeUploadedFiles`
- `createVideoFromPhotos`

The module requires `node:fs` only for the existing catch-path upload cleanup.

## Middleware Preservation

The upload middleware remains equivalent:

```js
upload.array("photos", maxPhotos)
```

`server.js` passes `MAX_PHOTOS` as `maxPhotos`, so the existing upload limit is preserved.

No new upload middleware instance was created. The route continues to use the single existing `upload` instance from `server.js`.

## Sync Completion Response

The route still waits for `createVideoFromPhotos(...)` to finish before responding.

The success status remains:

- `201`

The success response shape remains:

```json
{
  "ok": true,
  "video": {},
  "deprecated": true,
  "replacement": "/api/render",
  "message": "POST /api/videos is deprecated. Use POST /api/render for new integrations."
}
```

## Deprecated Metadata

The following compatibility metadata was preserved exactly:

- `deprecated: true`
- `replacement: "/api/render"`
- `message: "POST /api/videos is deprecated. Use POST /api/render for new integrations."`

## Renderer Connection

The route still calls the existing legacy renderer function:

```js
createVideoFromPhotos(req.files || [], {
  title: req.body.title,
  secondsPerPhoto: req.body.secondsPerPhoto
});
```

`createVideoFromPhotos` remains provided by `server/legacy-video-renderer.js`.

## Cleanup Preservation

On route-level failure, the route still removes uploaded files from `req.files`:

```js
for (const file of req.files || []) fs.rm(file.path, { force: true }, () => {});
```

No success-path cleanup was added or removed.

## Stub Verification

The route was verified with an in-memory stub app and stub upload middleware. No real upload, FFmpeg execution, or output creation was performed.

Verified cases:

- Valid input returns status `201`
- Upload middleware field remains `photos`
- Upload middleware max value is forwarded from the registered dependency
- `normalizeUploadedFiles(req.files)` is called
- `createVideoFromPhotos` receives `(req.files || [], { title, secondsPerPhoto })`
- Renderer result is returned under `video`
- Deprecated metadata remains unchanged
- Empty photo renderer error returns status `500`
- Renderer failure returns status `500`
- Failure cleanup calls `fs.rm` for uploaded file paths

Stub result highlights:

- Success status: `201`
- Failure status: `500`
- Replacement: `/api/render`
- Message: `POST /api/videos is deprecated. Use POST /api/render for new integrations.`

## Structure Verification

Search results after extraction:

- `/api/videos` route definition exists once, in `server/routes/legacy-video-routes.js`
- `registerLegacyVideoRoutes` is imported and called once from `server.js`
- `createLegacyVideoRenderer` remains instantiated once
- `createVideoFromPhotos` implementation remains only in `server/legacy-video-renderer.js`
- No renderer implementation was copied into the route module

## Read API Regression

Server was started with `node server.js` and only read/safe requests were used.

Checked endpoints:

- `GET /api/health` -> `200`
- `GET /api/render/encoders` -> `200`
- `GET /api/render/queue` -> `200`
- `GET /api/render/status/__missing__` -> `404`
- `GET /api/templates` -> `200`
- `GET /api/outputs` -> `200`
- `GET /api/project/recent` -> `200`
- `GET /api/license/status` -> `200`
- `POST /api/ai/analyze-photos` with fixed JSON payload -> `200`

The following were not called:

- real `POST /api/videos`
- `POST /api/render`
- cancel POST
- upload POST
- FFmpeg execution

## User Data

No user upload, output, project, template, package, or lockfile was intentionally modified.

Observed manifest summary after verification:

- `uploads`: count `1`, size `5`
- `outputs`: count `13`, size `6027534`
- `data`: count `11`, size `26757`

Known unchanged hashes:

- `package.json`: `5849264501847F4A827CD568EDD748FB6BD884F9549613768E52232CE1D6F848`
- `package-lock.json`: `F00887DD1379B9EFF83FAC71C1E0DFE6966E743ABB152879F5BFC13FC867DD2C`
- `data/templates.json`: `38FCBC0FBED94930A76E74A22B43B0D3B1E371668C918082BEBFF8E448614071`

## Static Verification

Passed:

- `node --check server.js`
- `node --check server/routes/legacy-video-routes.js`
- `node --check server/legacy-video-renderer.js`
- full `server/**/*.js` syntax check
- `node --check desktop/main.js`
- `node --check desktop/preload.js`
- `node --check public/app.js`
- `npm.cmd run check`
- `git diff --check`

`git diff --check` reported only the existing CRLF warning for `server.js`.

## Port Cleanup

After stopping the server, `netstat` showed only `TIME_WAIT` connections for port `4000`; no `LISTENING` entry remained.

## server.js Line Count

Node/PowerShell line count:

- Before: `537`
- After: `527`
- Reduction: `10`

The reduction is smaller than the route body size because `server.js` now imports and registers the new route module.

## Next Step Recommendation

Recommended next step:

1. Create a Structure Phase baseline survey for the now-split server route/module layout.

Reason:

- Render Queue, FFmpeg Engine, Render Executor, Render Write Routes, Legacy Renderer, and Legacy Video Route are now separated.
- The remaining server work is more about bootstrap and shutdown boundaries than simple low-risk route extraction.

Alternative next step:

2. Survey bootstrap/shutdown only before any further movement.

This should remain survey-only first because shutdown touches server lifecycle, Electron cleanup, render cancellation, and process cleanup.
