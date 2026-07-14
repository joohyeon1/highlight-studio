# STRUCTURE PHASE 1-21 Render Read Routes

## 1. Render GET Route List

The current render-related GET routes in `server.js` before this phase were:

| Method | Path | Behavior | State Mutation |
| --- | --- | --- | --- |
| GET | `/api/render/encoders` | checks/detects available render encoders and returns selected encoder info | may refresh encoder detection cache inside existing helper |
| GET | `/api/render/status/:jobId` | reads one render job and returns public job shape | none |
| GET | `/api/render/queue` | reads queue summary and public job list | none |

No separate log-only or result-only GET route exists. Those details are part of the public job response from `/api/render/status/:jobId` and `/api/render/queue`.

## 2. Moved Routes

Moved to `server/routes/render-read-routes.js`:

- `GET /api/render/encoders`
- `GET /api/render/status/:jobId`
- `GET /api/render/queue`

## 3. Excluded Routes And Reason

The following stayed in `server.js`:

- `POST /api/render`: creates render jobs, stores files, mutates queue state, and can trigger FFmpeg work.
- `POST /api/videos`: legacy render path, creates outputs and deletes temp files.
- `POST /api/render/cancel/:jobId`: mutates queue/job state, kills current process, and removes temp upload files.
- render queue execution helpers: queue state mutation and FFmpeg lifecycle.
- encoder detection implementation: helper internals and GPU/CPU fallback behavior are unchanged.

## 4. Queue And Encoder Dependencies

The route module receives only helpers/accessors:

- `detectRenderEncoders`
- `getRenderJob`
- `getActiveRenderJobId`
- `getQueuedRenderCount`
- `publicJob`
- `publicQueue`

It does not receive `renderQueue`, `renderJobs`, or `activeRenderJobId` directly.

## 5. Accessor Method

New minimal accessors in `server.js`:

```js
const getRenderJob = jobId => renderJobs.get(jobId);
const getActiveRenderJobId = () => activeRenderJobId;
const getQueuedRenderCount = () => renderQueue.filter(job => job.status === "queued").length;
```

The existing `publicJob` and `publicQueue` functions remain in `server.js`, preserving public response shape and ordering.

## 6. No State Change Confirmation

The moved queue/status routes only read current state. `GET /api/render/encoders` still calls the existing `detectRenderEncoders` helper with the same `force` query behavior and preserves the same cache semantics inside that helper.

No render job was created during verification. No cancel/retry/start route was called.

## 7. API Before/After Comparison

Initial queue state was empty.

| Route | Before | After | Result |
| --- | --- | --- | --- |
| `GET /api/render/encoders` | 200 | 200 | same fields; `checkedAt` is dynamic |
| `GET /api/render/queue` | 200, hash `3f2368a87e1d0fc87b84eb94bbf1770fd1679cdfef720913ad92d20df74e61d7` | 200, same hash | identical |
| `GET /api/render/status/__missing__` | 404, hash `50263507f7f1067a6b431e9149bc693115520a1b2a794c5264f4ab315c4532a2` | 404, same hash | identical |

The encoder response includes `checkedAt`, so exact raw JSON hash changes over time. The response status and fields were preserved:

- `ok`
- `selected`
- `selectedCodec`
- `selectedLabel`
- `checkedAt`
- `encoders`

## 8. Non-Target API Regression

Checked after extraction:

- `GET /api/health`: 200
- `GET /api/templates`: 200
- `GET /api/outputs`: 200
- `GET /api/project/recent`: 200
- `GET /api/license/status`: 200
- `POST /api/ai/analyze-photos` with fixed JSON payload: 200

The license response includes time-based trial expiry information, so raw JSON hash can vary by current time. Status and response structure remained valid.

## 9. User Data Integrity

No upload, render, cancel, or output creation route was called.

Expected unchanged data:

- `uploads`
- `outputs`
- `data/backups`
- `data/templates.json`
- `package.json`
- `package-lock.json`
- `.hsp` files

## 10. server.js Line Count

Using PowerShell `Measure-Object -Line`:

- before: 1046 lines
- after: 1032 lines
- reduction: 14 lines

## 11. Remaining Render Risk Areas

Still in `server.js`:

- render job creation via `POST /api/render`
- legacy `/api/videos`
- render cancellation
- queue processing
- FFmpeg execution
- GPU encoder detection implementation
- output creation and temp cleanup
- `cancelAllRenderJobs`

## 12. Next Step Recommendation

Next safest render step is a survey-only phase for render queue/service extraction. The queue service should not be moved until dependencies are mapped:

- `renderJobs`
- `renderQueue`
- `activeRenderJobId`
- `updateJob`
- `pushJobLog`
- `processRenderQueue`
- `createRenderFromProject`
- cleanup/cancel behavior
- Electron shutdown hook via `cancelAllRenderJobs`
