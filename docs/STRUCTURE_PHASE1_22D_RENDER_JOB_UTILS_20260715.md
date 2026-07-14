# STRUCTURE PHASE 1-22D Render Job Utilities

## 1. Moved Functions

Moved from `server.js` to `server/render-job-utils.js`:

- `pushJobLog`
- `updateJob`
- `scheduleJobCleanup`

## 2. Existing And New Locations

| Function | Previous Location | New Location |
| --- | --- | --- |
| `pushJobLog` | `server.js` | `server/render-job-utils.js` |
| `updateJob` | `server.js` | `server/render-job-utils.js` |
| `scheduleJobCleanup` | `server.js` | `server/render-job-utils.js` |

## 3. New Module Exports

`server/render-job-utils.js` exports:

- `configureRenderJobUtils`
- `pushJobLog`
- `updateJob`
- `scheduleJobCleanup`

## 4. Dependency Connection

`scheduleJobCleanup` needs render job store access. The module uses a minimal configure function:

```js
configureRenderJobUtils({
  getRenderJob,
  deleteRenderJob
});
```

The module does not require `server.js` and does not create render state copies.

## 5. Preserved Log Structure

`pushJobLog(job, message)` keeps the same behavior:

- if `job` is falsy, return
- push `{ time: new Date().toISOString(), message }`
- trim logs to maximum 300 entries by shifting oldest entry

The log object fields remain:

- `time`
- `message`

## 6. Preserved Job Update Behavior

`updateJob(job, patch = {})` keeps the same behavior:

- if `job` is falsy, return
- `Object.assign(job, patch, { updatedAt: new Date().toISOString() })`
- `updatedAt` is refreshed on every update

No job field names, status strings, progress handling, or output field handling were changed.

## 7. Preserved Cleanup Delay And Condition

`scheduleJobCleanup(jobId)` keeps the same behavior:

- uses `setTimeout`
- delay: `30 * 60 * 1000`
- at cleanup time, reads current job with `getRenderJob(jobId)`
- deletes only if status is one of:
  - `completed`
  - `failed`
  - `canceled`
- calls `deleteRenderJob(jobId)`
- timer handle is not stored

## 8. Logic Not Moved

Still in `server.js`:

- `enqueueRenderJob`
- `removeQueuedJob`
- `processRenderQueue`
- `cancelAllRenderJobs`
- `createRenderFromProject`
- `createVideoFromPhotos`
- `runFfmpeg`
- `detectRenderEncoders`
- `resolveRenderEncoder`
- `POST /api/render`
- `POST /api/videos`
- `POST /api/render/cancel/:jobId`
- FFmpeg child process handling
- GPU fallback
- active job control
- render queue order
- output/upload cleanup
- Electron shutdown behavior

## 9. Verification Results

Static checks:

- `node --check server.js`: PASS
- `node --check server/render-job-utils.js`: PASS
- `node --check server/render-job-store.js`: PASS
- `server/**/*.js` syntax check: PASS
- `desktop/main.js`: PASS
- `desktop/preload.js`: PASS
- `public/app.js`: PASS
- `npm.cmd run check`: PASS
- `git diff --check`: PASS, only CRLF warning on `server.js`

Safe unit check:

- `pushJobLog` produced `{ time, message }`
- timestamp type remained string
- message was preserved
- `updateJob` preserved patch fields
- `updatedAt` type remained string
- `scheduleJobCleanup` created the same 30-minute timer behavior; no render job was created

API checks:

| Route | Result |
| --- | --- |
| `GET /api/render/queue` | 200, hash `3f2368a87e1d0fc87b84eb94bbf1770fd1679cdfef720913ad92d20df74e61d7` |
| `GET /api/render/status/__missing__` | 404, hash `50263507f7f1067a6b431e9149bc693115520a1b2a794c5264f4ab315c4532a2` |
| `GET /api/render/encoders` | 200, same fields; `checkedAt` dynamic |
| `GET /api/health` | 200 |
| `GET /api/templates` | 200 |
| `GET /api/outputs` | 200 |
| `GET /api/project/recent` | 200 |
| `GET /api/license/status` | 200 |
| `POST /api/ai/analyze-photos` fixed JSON payload | 200 |

No render/upload/cancel POST route was called.

## 10. User Data Integrity

No real user data was intentionally changed:

- `uploads`: unchanged
- `outputs`: unchanged
- `data/backups`: unchanged
- `data/templates.json`: unchanged
- `package.json`: unchanged
- `package-lock.json`: unchanged
- no `.hsp` file created

Port 4000 was stopped after verification. No LISTENING process remained.

## 11. server.js Line Count

Using PowerShell `Measure-Object -Line`:

- before: 985 lines
- after: 978 lines
- reduction: 7 lines

## 12. Next Step Recommendation

Next phase should still avoid moving FFmpeg execution. The safest follow-up is a small survey or implementation around queue operation helpers:

- `removeQueuedJob`
- `enqueueRenderJob`

Keep `processRenderQueue` in `server.js` until render execution and cancel timing have stronger regression coverage.
