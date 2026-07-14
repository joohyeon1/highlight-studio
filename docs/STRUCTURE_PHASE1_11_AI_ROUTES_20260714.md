# Structure Phase 1-11 AI Routes Extraction

Date: 2026-07-14

Baseline:

- Branch: `main`
- Baseline commit: `5e86dbc refactor: extract system routes`
- `server.js` before extraction: 1205 lines
- Git status before work: clean

## 1. Pre-Change Survey

AI route declarations found in `server.js`:

| Route | Previous Location | Request Body | Helpers | State/File Dependency |
| --- | ---: | --- | --- | --- |
| `POST /api/ai/analyze-photos` | 897 | `{ photos: [] }` | `analyzeAiPhotos`, `clampScore` | none |
| `POST /api/ai/create-storyboard` | 920 | `{ photos: [], analysis?: [], captionMode?: string }` | `analyzeAiPhotos`, `createStoryboardFromAnalysis` | none |

No additional AI route using local AI helpers was found.

The target routes do not read or write files, do not mutate module-scope server state, and do not use `Date`, `process.env`, or `APP_VERSION`.

## 2. Actual Change

Created:

- `server/routes/ai-routes.js`

Export:

```js
module.exports = {
  registerAiRoutes
};
```

`server.js` now registers:

```js
registerAiRoutes(app, {
  clampScore,
  analyzeAiPhotos,
  createStoryboardFromAnalysis
});
```

Moved routes:

- `POST /api/ai/analyze-photos`
- `POST /api/ai/create-storyboard`

No template route was moved.

## 3. Dependencies

Injected dependencies:

- `clampScore`
- `analyzeAiPhotos`
- `createStoryboardFromAnalysis`

No `server.js` import is used by `server/routes/ai-routes.js`, so no circular dependency was introduced.

## 4. Request And Response Structure

`POST /api/ai/analyze-photos`:

- Input: `photos` array from `req.body.photos`; non-array input becomes `[]`.
- Empty array response: status `400`, `{ ok: false, error: "분석할 사진이 없습니다." }`
- Success response:
  - `ok`
  - `engine`
  - `summary.total`
  - `summary.recommended`
  - `summary.excluded`
  - `summary.averageScore`
  - `photos`

`POST /api/ai/create-storyboard`:

- Input: `photos` array, optional `analysis`, optional `captionMode`.
- Empty array response: status `400`, `{ ok: false, error: "스토리보드를 만들 사진이 없습니다." }`
- Success response:
  - `ok`
  - `engine`
  - `storyboard`

## 5. API Before/After Comparison

Fixed payload comparisons:

| Case | Route | Status | Hash Result |
| --- | --- | ---: | --- |
| normal two-photo analysis | `/api/ai/analyze-photos` | 200 | identical |
| empty analysis payload | `/api/ai/analyze-photos` | 400 | identical |
| missing metric photo | `/api/ai/analyze-photos` | 200 | identical |
| wrong payload shape | `/api/ai/analyze-photos` | 400 | identical |
| normal storyboard | `/api/ai/create-storyboard` | 200 | identical |
| empty storyboard payload | `/api/ai/create-storyboard` | 400 | identical |
| minimum storyboard photo | `/api/ai/create-storyboard` | 200 | identical |

Observed identical hashes after extraction:

- `analyze-normal`: `ac5da1cb56dd1233f883f06a1142979c165db44f62ba7a38cf05a59c486dcf41`
- `analyze-empty`: `18552a881b6e0f512e81d078db97b58d9b6ed4793161d29e90551a1862ea4f3e`
- `analyze-missing`: `88960f82cfed1c41dd33c41f4cdf4384d3dcfbd7fbe75df51e6848b6ce299aff`
- `analyze-bad`: `18552a881b6e0f512e81d078db97b58d9b6ed4793161d29e90551a1862ea4f3e`
- `story-normal`: `c547a5b99b755d042c529d94bbf49aeabc41d5005d86e716e42235d8785547d5`
- `story-empty`: `f7bd1391b505ffb5d9bef668d854ef10496b05f093f55dfe1ccd43cec31420c8`
- `story-min`: `7c67221c4070ef8cf29b1d3375984d8b1d690d86a630913489557b424de81cdc`

## 6. Non-Target API Regression

Read-only non-target checks:

- `GET /api/health`: PASS, hash identical
- `GET /api/templates`: PASS, hash identical
- `GET /api/outputs`: PASS, hash identical
- `GET /api/project/autosave`: PASS, hash identical
- `GET /api/render/queue`: PASS, hash identical
- `GET /api/license/status`: PASS; structure unchanged, hash may vary because `expiresAt` is generated from current time when not configured

No state-changing non-target route was called.

## 7. Static Verification

- `node --check server.js`: PASS
- `node --check server/routes/ai-routes.js`: PASS
- all `server/**/*.js` with `node --check`: PASS
- `npm.cmd run check`: PASS
- `git diff --check`: PASS with CRLF notice for `server.js` only

## 8. User Data Integrity

Before and after manifests matched:

- `data/backups`: 10 files, 26720 bytes, hashes unchanged
- `uploads`: 1 file, 5 bytes, hash unchanged
- `outputs`: 13 files, 6027534 bytes, hashes unchanged
- `data/templates.json`: hash unchanged
- `package.json`: hash unchanged
- `package-lock.json`: hash unchanged

No `.hsp`, AI, project, upload, or output file was created.

Server cleanup:

- Server was stopped after API checks.
- Port `4000` had no LISTENING entry after shutdown; only transient `TIME_WAIT` entries were observed.

## 9. Line Count

- `server.js` before extraction: 1205 lines
- `server.js` after extraction: 1176 lines

## 10. Next Template Route Risk Notes

Template route extraction should be split from AI because template routes include write operations:

- `POST /api/templates`
- `PUT /api/templates/:templateId`
- `DELETE /api/templates/:templateId`

Risks:

- `data/templates.json` can be modified by write routes.
- Default template protection uses `DEFAULT_TEMPLATES`.
- `sanitizeTemplatePayload` can generate IDs.

Recommended test strategy:

- First compare `GET /api/templates`.
- For write routes, use a temporary isolated `HIGHLIGHT_DATA_DIR` or helper-level tests instead of mutating the real `data/templates.json`.

