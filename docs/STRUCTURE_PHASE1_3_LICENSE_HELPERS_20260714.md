# STRUCTURE PHASE 1-3 License Helpers Extraction

Date: 2026-07-14
Project: Highlight Studio
Scope: move only local license helper functions out of `server.js`.

## Baseline

- Branch: `main`
- Starting commit: `31b13a3 refactor: extract local ai rule helpers`
- Working tree before edits: clean

## Target Functions

Moved into `server/license-helpers.js`:

- `normalizeEmail`
- `buildLicenseStatus`

## Original Declaration Locations

Before extraction:

- `normalizeEmail`: `server.js:154`
- `buildLicenseStatus`: `server.js:158`

After extraction:

- Both functions are declared in `server/license-helpers.js`.
- `server.js` imports both helpers with CommonJS destructuring.

## Call Sites

Current `server.js` call sites:

- `POST /api/auth/login`
  - `normalizeEmail(req.body?.email)`
  - `buildLicenseStatus(email)`
- `GET /api/license/status`
  - `normalizeEmail(req.get("x-highlight-email") || req.query.email)`
  - `buildLicenseStatus(email)`

## Dependencies

Internal dependency:

- `buildLicenseStatus` calls `normalizeEmail`.

External dependencies:

- `process.env.HIGHLIGHT_LICENSE_STATUS`
- `process.env.HIGHLIGHT_LICENSE_EXPIRES_AT`
- `Date.now()`
- `Date`

No dependency on:

- `fs`
- `path`
- `crypto`
- `express`
- `multer`
- `APP_VERSION`
- update URL constants
- license file path
- render queue
- FFmpeg
- Electron

## Input Mutation

The helpers do not mutate input objects and do not write local files. They return normalized strings and a new license status object.

## Environment And Time Behavior

The implementation was moved as-is:

- supported statuses remain `trial`, `active`, `expired`, `blocked`
- unsupported statuses such as `inactive` still fall back to `trial`
- default expiration still uses `Date.now() + 14 days`
- fixed expiration still uses `HIGHLIGHT_LICENSE_EXPIRES_AT`

## Function Result Checks

Checked `normalizeEmail` inputs:

- normal email
- uppercase email
- surrounding whitespace
- empty string
- `null`
- `undefined`
- numeric value

Checked `buildLicenseStatus` states:

- no configured status
- `active`
- `inactive`
- `expired`
- `trial`
- `blocked`
- unsupported value

With fixed `HIGHLIGHT_LICENSE_EXPIRES_AT=2026-07-20T00:00:00.000Z`, post-extraction deterministic result hash:

`e295d8b7c7ec35477a09b50f5159fc3c5507123be662a399fc1a6f3f0e31528d`

The pre-extraction source was also inspected. A direct `git show HEAD:server.js | node` comparison was attempted, but the PowerShell pipeline converted Korean strings to `??`, making the raw hash unusable for Korean feature labels. The moved source text itself preserved the Korean strings exactly, and API response verification confirmed correct runtime behavior.

## API Verification

Read-only API checks:

- `GET /api/health`: 200
- `GET /api/license/status?email=USER%40Example.COM`: 200
  - email: `user@example.com`
  - licenseStatus: `trial`
  - daysLeft: 14
  - feature count: 4
- `GET /api/update/check`: 200
  - currentVersion: `1.0.0`
  - latestVersion: `1.0.0`
  - updateAvailable: `false`

No license activation, logout, save, delete, or state-changing license request was performed.

## Static Verification

- `node --check server.js`: PASS
- `node --check server/license-helpers.js`: PASS
- `npm.cmd run check`: PASS
- `git diff --check`: PASS

## User Data Integrity

Before and after verification:

- `data/license.json`: missing
- `license.json`: missing
- `outputs`: count 13, size 6027534
- `uploads`: count 1, size 5
- `projects`: missing
- `backups`: missing
- `data/templates.json`: size 37, hash `38fcbc0fbed94930a76e74a22b43b0d3b1e371668c918082bebff8e448614071`
- `package.json`: hash `5849264501847f4a827cd568edd748fb6bd884f9549613768e52232ce1d6f848`
- `package-lock.json`: hash `f00887dd1379b9eff83fac71c1e0dfe6966e743abb152879f5bfc13fc867dd2c`

Runtime cleanup:

- Port 4000 LISTENING after shutdown: none
- Electron process after verification: none

## Actual Move Scope

Only these helper declarations were moved:

- `normalizeEmail`
- `buildLicenseStatus`

No update helper was moved. `/api/update/check` still remains in `server.js` and continues to use `APP_VERSION` directly.

## Risk Assessment

Risk: LOW

Reason:

- The moved helpers have no filesystem or route registration dependency.
- No API path, status code, response field, environment variable name, or license status rule changed.

## Next Safe Split Candidate

Recommended next candidate:

- output helper functions only:
  - `resolveOutputMp4`
  - `outputFilePayload`
  - `getPublicBaseUrl`
  - `createShareInfo`

Keep `/api/outputs` route handlers in `server.js` for the first output-helper split because file path validation and local file operations are security-sensitive.
