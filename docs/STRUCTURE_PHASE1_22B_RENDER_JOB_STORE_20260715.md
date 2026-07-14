# STRUCTURE PHASE 1-22B Render Job Store

## 1. Moved State And Functions

Moved to `server/render-job-store.js`:

- `renderJobs`
- `renderQueue`
- `activeRenderJobId`
- `getRenderJob`
- `getActiveRenderJobId`
- `getQueuedRenderCount`
- `getQueuePosition`
- `publicJob`
- `publicQueue`

Additional minimal accessors/mutators were added so existing `server.js` lifecycle code can keep the same behavior without owning duplicate state:

- `configureRenderJobStore`
- `getRenderJobs`
- `addRenderJob`
- `deleteRenderJob`
- `getRenderQueue`
- `setActiveRenderJobId`
- `clearActiveRenderJobId`

## 2. New Module Export List

`server/render-job-store.js` exports:

- `configureRenderJobStore`
- `getRenderJobs`
- `addRenderJob`
- `getRenderJob`
- `deleteRenderJob`
- `getRenderQueue`
- `getActiveRenderJobId`
- `setActiveRenderJobId`
- `clearActiveRenderJobId`
- `getQueuedRenderCount`
- `getQueuePosition`
- `publicJob`
- `publicQueue`

## 3. server.js Connection

`server.js` imports the store helpers and configures the module with the existing encoder map:

```js
configureRenderJobStore({ renderEncoders: RENDER_ENCODERS });
```

The render lifecycle functions remain in `server.js`, but now use store helpers:

- job creation uses `addRenderJob(job)`
- queue push/shift uses `getRenderQueue()`
- active state uses `getActiveRenderJobId`, `setActiveRenderJobId`, and `clearActiveRenderJobId`
- cleanup uses `getRenderJob` and `deleteRenderJob`
- cancel and shutdown iterate through `getRenderJobs()` and `getRenderQueue()`

## 4. Single State Source

There is no local `renderJobs`, `renderQueue`, or `activeRenderJobId` declaration left in `server.js`.

The single state source is now:

- `server/render-job-store.js`

The store returns the original `Map` and array references where mutation is still owned by existing lifecycle functions. This preserves:

- `currentProcess` references
- queue order
- job object identity
- cancel behavior
- Electron shutdown cleanup

## 5. Render Read Routes Connection

`server/routes/render-read-routes.js` did not need to change. It still receives:

- `detectRenderEncoders`
- `getRenderJob`
- `getActiveRenderJobId`
- `getQueuedRenderCount`
- `publicJob`
- `publicQueue`

Those functions now come from the render job store.

## 6. Logic Not Moved

Still in `server.js`:

- `processRenderQueue`
- `enqueueRenderJob`
- `removeQueuedJob`
- `createRenderFromProject`
- `createVideoFromPhotos`
- `runFfmpeg`
- `detectRenderEncoders`
- `resolveRenderEncoder`
- `scheduleJobCleanup`
- `cancelAllRenderJobs`
- `pushJobLog`
- `updateJob`
- `POST /api/render`
- `POST /api/videos`
- `POST /api/render/cancel/:jobId`
- FFmpeg child process handling
- GPU fallback
- upload/output cleanup

## 7. Verification Results

Static checks:

- `node --check server.js`: PASS
- `node --check server/render-job-store.js`: PASS
- `node --check server/routes/render-read-routes.js`: PASS
- `server/**/*.js` syntax check: PASS
- `desktop/main.js`: PASS
- `desktop/preload.js`: PASS
- `public/app.js`: PASS
- `npm.cmd run check`: PASS
- `git diff --check`: PASS, only CRLF warning on `server.js`

API checks:

| Route | Result |
| --- | --- |
| `GET /api/render/encoders` | 200, same fields; `checkedAt` dynamic |
| `GET /api/render/queue` | 200, hash `3f2368a87e1d0fc87b84eb94bbf1770fd1679cdfef720913ad92d20df74e61d7` |
| `GET /api/render/status/__missing__` | 404, hash `50263507f7f1067a6b431e9149bc693115520a1b2a794c5264f4ab315c4532a2` |
| `GET /api/health` | 200 |
| `GET /api/templates` | 200 |
| `GET /api/outputs` | 200 |
| `GET /api/project/recent` | 200 |
| `GET /api/license/status` | 200 |
| `POST /api/ai/analyze-photos` fixed JSON payload | 200 |

No render job was created. No upload/render/cancel POST route was called.

## 8. User Data Integrity

No real user data was intentionally changed:

- `uploads`: unchanged
- `outputs`: unchanged
- `data/backups`: unchanged
- `data/templates.json`: unchanged
- `package.json`: unchanged
- `package-lock.json`: unchanged
- no `.hsp` file created

Port 4000 was stopped after verification. No LISTENING process remained.

## 9. server.js Line Count

Using PowerShell `Measure-Object -Line`:

- before: 1032 lines
- after: 985 lines
- reduction: 47 lines

## 10. Next Recommended Scope

Next phase should not jump to full FFmpeg service extraction. A safer next split is one of:

1. Survey-only phase for render execution helpers:
   - `processRenderQueue`
   - `enqueueRenderJob`
   - `removeQueuedJob`
   - `scheduleJobCleanup`
   - cancel route coupling

2. Extract render lifecycle controller only if the store API is stable:
   - keep FFmpeg and `createRenderFromProject` in `server.js`
   - move only queue process control after hash-based route verification

Still avoid moving:

- `runFfmpeg`
- `createRenderFromProject`
- GPU fallback
- output/upload cleanup
- Electron shutdown contract
