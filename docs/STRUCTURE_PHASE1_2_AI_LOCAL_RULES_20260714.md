# STRUCTURE PHASE 1-2 AI Local Rules Extraction

Date: 2026-07-14
Project: Highlight Studio
Scope: move only local AI rule helper functions out of `server.js`.

## Baseline

- Branch: `main`
- Starting commit: `10f92b1 refactor: extract default template definitions`
- Working tree before edits: clean
- User data baseline:
  - `outputs`: count 13, size 6027534
  - `uploads`: count 1, size 5
  - `projects`: missing
  - `backups`: missing
  - `data/templates.json`: size 37
  - `package.json`: size 1904
  - `package-lock.json`: size 187789

## Target Functions

Moved from `server.js` into `server/ai-local-rules.js`:

- `clampScore`
- `normalizeAiPhoto`
- `analyzeAiPhotos`
- `createStoryboardFromAnalysis`

## Original Declaration Locations

Before extraction:

- `clampScore`: `server.js:723`
- `normalizeAiPhoto`: `server.js:727`
- `analyzeAiPhotos`: `server.js:747`
- `createStoryboardFromAnalysis`: `server.js:804`

After extraction:

- All four functions are declared in `server/ai-local-rules.js`.
- `server.js` imports them with CommonJS destructuring.

## Call Sites

Current `server.js` references after extraction:

- `analyzeAiPhotos`
  - `POST /api/ai/analyze-photos`
  - `POST /api/ai/create-storyboard` fallback when request analysis is missing
- `createStoryboardFromAnalysis`
  - `POST /api/ai/create-storyboard`
- `clampScore`
  - average score calculation in `POST /api/ai/analyze-photos`
- `normalizeAiPhoto`
  - imported for target-function traceability
  - used internally by `server/ai-local-rules.js`

## Function Dependencies

Internal dependencies:

- `analyzeAiPhotos` calls `normalizeAiPhoto` and `clampScore`.
- `createStoryboardFromAnalysis` calls `normalizeAiPhoto`.
- `normalizeAiPhoto` is a pure normalizer.
- `clampScore` is a pure numeric clamp helper.

External dependencies:

- No `fs`
- No `path`
- No `crypto`
- No `express`
- No `multer`
- No FFmpeg/process dependency
- No server route dependency
- No server global state dependency

## Input Mutation Check

The functions build normalized objects and result arrays. They do not write files and do not mutate server process state. The implementation was moved as-is. No scoring formulas, default values, branch order, sort order, or return object shapes were intentionally changed.

## API Connection

The functions are connected to local, state-free AI endpoints:

- `POST /api/ai/analyze-photos`
- `POST /api/ai/create-storyboard`

These endpoints consume JSON payloads and return analysis/storyboard JSON. The verification used fixed JSON payloads only and did not touch uploads, outputs, projects, backups, or template files.

## Result Comparison

Fixed sample result hash before extraction:

`07591cae4d2f132e0f35b3fa76334d0cea3fe2d62aa94ff5c38cb1985032fcbc`

Fixed sample result hash after extraction:

`07591cae4d2f132e0f35b3fa76334d0cea3fe2d62aa94ff5c38cb1985032fcbc`

Comparison result:

- JSON result identical
- array order identical
- numeric values identical
- default values identical
- no missing fields
- no added fields

## API Verification

Server checks:

- `GET /api/health`: 200
- `GET /api/templates`: 200, 6 templates
- `POST /api/ai/analyze-photos`: 200, 3 photos, average score 58
- `POST /api/ai/create-storyboard`: 200

Combined AI API response hash for the fixed payload:

`dd10b7e4c3f387166777b5cec6727792dcedadab4244939cb728a92e1e7468c2`

## Static Verification

- `node --check server.js`: PASS
- `node --check server/ai-local-rules.js`: PASS
- `npm.cmd run check`: PASS
- `git diff --check`: PASS

## Runtime Cleanup

- Server was stopped after verification.
- Port 4000 LISTENING after shutdown: none
- Electron process after verification: none

## User Data Integrity

After verification:

- `outputs`: count 13, size 6027534
- `uploads`: count 1, size 5
- `projects`: missing
- `backups`: missing
- `data/templates.json`: size 37, unchanged timestamp
- `package.json`: unchanged
- `package-lock.json`: unchanged

No user files, rendered videos, uploads, projects, backups, or templates were modified.

## Risk Assessment

Risk: LOW

Reason:

- Target functions are local rule helpers.
- No filesystem, Express, Electron, render queue, FFmpeg, or upload middleware dependency.
- API output for fixed payload remained identical.

## Next Safe Split Candidate

Recommended next split:

- License/update helper logic:
  - `normalizeEmail`
  - `buildLicenseStatus`
  - update check response helper if introduced with no route behavior change

Alternative medium-risk candidate:

- Output file helper functions only, without moving `/api/outputs` routes yet.
