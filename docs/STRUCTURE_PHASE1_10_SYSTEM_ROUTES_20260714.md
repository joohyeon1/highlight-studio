# Structure Phase 1-10 System Routes Extraction

Date: 2026-07-14

Baseline:

- Branch: `main`
- Baseline commit: `9b4111a refactor: extract project storage helpers`
- `server.js` before extraction: 1253 lines
- Existing untracked survey doc: `docs/STRUCTURE_PHASE1_9_SERVER_REMAINING_SURVEY_20260714.md`

## 1. Pre-Change Survey

Target routes found in `server.js`:

| Route | Previous Location | Dependencies | State/File Mutation |
| --- | ---: | --- | --- |
| `OPTIONS /api/ping` | 871 | response headers only | none |
| `GET /api/ping` | 878 | hard-coded app/version response | none |
| `GET /api/health` | 887 | `APP_VERSION`, `PORT`, `process.env.NODE_ENV` | none |
| `POST /api/auth/login` | 1070 | `normalizeEmail`, `buildLicenseStatus`, request body, `Date` | none |
| `GET /api/license/status` | 1089 | `normalizeEmail`, `buildLicenseStatus`, request header/query | none |
| `GET /api/update/check` | 1094 | `APP_VERSION`, `process.env` update variables | none |

Excluded routes:

- `GET /health`: left in `server.js` because it reports `ffmpegPath` and was not in the requested `/api` system/license/update move list.
- `POST /api/auth/logout`: left in `server.js` because the requested move list only included login, license status, update, health, and ping.

No target route reads/writes files or mutates module-scope state.

## 2. Actual Change

Created:

- `server/routes/system-routes.js`

Export:

```js
module.exports = {
  registerSystemRoutes
};
```

`server.js` now imports and registers:

```js
const {
  registerSystemRoutes
} = require("./server/routes/system-routes");

registerSystemRoutes(app, {
  APP_VERSION,
  PORT,
  normalizeEmail,
  buildLicenseStatus
});
```

Moved routes:

- `OPTIONS /api/ping`
- `GET /api/ping`
- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/license/status`
- `GET /api/update/check`

The `OPTIONS /api/ping` preflight was moved with `GET /api/ping` because it is part of the same ping/handshake surface.

## 3. Dependency List

Injected dependencies:

- `APP_VERSION`
- `PORT`
- `normalizeEmail`
- `buildLicenseStatus`

Dependencies intentionally not injected:

- `process.env`: kept as process-global inside the route module, matching prior behavior.
- `Date`: native global, matching prior behavior.
- `express`: not required because the existing app instance is passed in.

No new dependency imports `server.js`, so no circular dependency was introduced.

## 4. Route Order Impact

Middleware order is unchanged:

- `licenseGate`
- `express.json`
- `/outputs` static
- public static

The moved `/api` routes are registered immediately after `GET /health`, before render/template/project/output routes.

Impact:

- No route path conflicts were found.
- `/api/auth/login` is now registered earlier than before, but the path is unique and no wildcard route precedes it.
- `POST /api/auth/logout` remains in `server.js` and still has a unique path.

## 5. API Before/After Comparison

Pre-change and post-change checks were run with `node server.js`.

Exact hash matches:

| Route | Status Before | Status After | Hash Result |
| --- | ---: | ---: | --- |
| `GET /api/health` | 200 | 200 | identical |
| `GET /api/ping` | 200 | 200 | identical |
| `GET /api/update/check` | 200 | 200 | identical |
| `POST /api/auth/login` invalid payload | 400 | 400 | identical |

Dynamic license route comparison:

- `GET /api/license/status`: status and field structure matched.
- `GET /api/license/status?email=USER%40Example.COM`: status, normalized email, `loggedIn`, `licenseStatus`, `daysLeft`, and features matched.
- Full JSON hash differs because `expiresAt` is generated from current time when `HIGHLIGHT_LICENSE_EXPIRES_AT` is not set.

Invalid login payload used for comparison:

```json
{
  "email": "bad",
  "password": "x"
}
```

Result stayed:

```json
{
  "ok": false,
  "error": "이메일을 확인해 주세요."
}
```

No successful login request was sent.

## 6. Non-Target API Regression

Read-only non-target checks:

- `GET /api/templates`: PASS, hash identical
- `GET /api/outputs`: PASS, hash identical
- `GET /api/project/autosave`: PASS, hash identical
- `GET /api/render/queue`: PASS, hash identical

No state-changing project/output/template/render route was called.

## 7. Static Verification

- `node --check server.js`: PASS
- `node --check server/routes/system-routes.js`: PASS
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

No license/session/token file was created.

Server cleanup:

- Server was stopped after API checks.
- Port `4000` had no LISTENING entry after shutdown; only transient `TIME_WAIT` entries were observed.

## 9. Line Count

- `server.js` before extraction: 1253 lines
- `server.js` after extraction: 1205 lines

## 10. Next Route Group Candidate

Recommended next grouped extraction:

1. AI routes:
   - `POST /api/ai/analyze-photos`
   - `POST /api/ai/create-storyboard`
   - Risk: low-medium

2. Template routes:
   - `GET /api/templates`
   - `POST /api/templates`
   - `PUT /api/templates/:templateId`
   - `DELETE /api/templates/:templateId`
   - Risk: medium because writes touch `data/templates.json`

Keep these as separate route modules if the next phase wants the lowest risk:

- `server/routes/ai-routes.js`
- `server/routes/template-routes.js`

