# STRUCTURE PHASE 1-4 Output Helpers Extraction

Date: 2026-07-14
Project: Highlight Studio
Scope: move only outputs-related helper functions out of `server.js`.

## Baseline

- Branch: `main`
- Starting commit: `c08c17e refactor: extract license status helpers`
- Working tree before edits: clean

## Target Functions

Moved into `server/output-helpers.js`:

- `resolveOutputMp4`
- `outputFilePayload`
- `getPublicBaseUrl`
- `createShareInfo`

## Original Declaration Locations

Before extraction:

- `resolveOutputMp4`: `server.js:95`
- `outputFilePayload`: `server.js:106`
- `getPublicBaseUrl`: `server.js:133`
- `createShareInfo`: `server.js:139`

After extraction:

- All four functions are declared in `server/output-helpers.js`.
- `server.js` imports them with CommonJS destructuring.

## Call Sites

Current `server.js` call sites:

- `GET /api/outputs`
  - `resolveOutputMp4`
  - `outputFilePayload`
- `GET /api/outputs/:filename/share-info`
  - `resolveOutputMp4`
  - `createShareInfo`
- `GET /api/outputs/:filename/download`
  - `resolveOutputMp4`
- `POST /api/outputs/:filename/open`
  - `resolveOutputMp4`
- `PATCH /api/outputs/:filename`
  - `resolveOutputMp4`
  - `outputFilePayload`
- `DELETE /api/outputs/:filename`
  - `resolveOutputMp4`

## Function Dependencies

Internal dependencies:

- `createShareInfo` calls `getPublicBaseUrl`.

External dependencies:

- `path`
- `process.env.HIGHLIGHT_OUTPUT_DIR`
- `process.env.APP_URL`
- `process.env.PUBLIC_SHARE_BASE_URL`
- `process.env.HIGHLIGHT_PUBLIC_URL`
- `process.env.KAKAO_JS_KEY`
- `process.env.KAKAO_JAVASCRIPT_KEY`
- `process.env.KAKAO_SDK_KEY`
- Express-style request object for `getPublicBaseUrl` and `createShareInfo`
- stat-like object for `outputFilePayload`

No dependency on:

- `fs`
- `crypto`
- `express`
- `multer`
- render queue
- FFmpeg
- Electron

## Upper Scope Path Handling

Before extraction, `resolveOutputMp4` used `OUTPUT_DIR` from `server.js`.

After extraction, `server/output-helpers.js` computes the same path rule locally:

- project root: `path.resolve(__dirname, "..")`
- output dir: `process.env.HIGHLIGHT_OUTPUT_DIR || path.join(ROOT_DIR, "outputs")`

No function signatures were changed. No `server.js` reverse require was introduced. No route handler was moved.

## File System Mutation

The moved helpers do not create, delete, rename, or modify files.

They only:

- normalize and validate filenames
- build output file paths
- build response payload objects
- build public/share URL metadata

Actual file operations remain in existing route handlers in `server.js`.

## Security Behavior Preserved

`resolveOutputMp4` still preserves:

- `path.basename` clean-name check
- `.mp4` extension requirement
- rejection of path-containing input such as `../evil.mp4` and `folder/file.mp4`
- output-root prefix check
- null result for empty, null, undefined, or non-MP4 input

## Function Result Comparison

Fixed sample file:

`_2026-07-07.mp4`

Inputs checked:

- normal MP4 filename
- existing and missing MP4 names
- extensionless name
- path traversal input
- nested path input
- empty string
- `null`
- `undefined`
- localhost request
- `127.0.0.1` request

Before extraction helper result hash:

`29a035f3ee169f898c2aff28a34e84468bf0c6c4b7d0a6f8beaa715770410efe`

After extraction helper result hash:

`29a035f3ee169f898c2aff28a34e84468bf0c6c4b7d0a6f8beaa715770410efe`

Comparison result:

- path strings identical
- URL strings identical
- payload fields identical
- share-info fields identical
- null handling identical

## API Verification

Read-only API checks:

- `GET /api/health`: 200
- `GET /api/outputs`: 200
- `GET /api/outputs/:filename/share-info`: 200

`/api/outputs` comparison:

- before status: 200
- after status: 200
- before count: 12
- after count: 12
- before response hash: `4a2a9dc3838dc85a41c4e26b62854f2c52517237b5fe7c4a8b545d7387b9df81`
- after response hash: `4a2a9dc3838dc85a41c4e26b62854f2c52517237b5fe7c4a8b545d7387b9df81`

share-info comparison:

- before hash: `afc70ef699ad6a5b4a5d97c455d88258fbd102e5837329f44fb7d79e3ad64763`
- after hash: `afc70ef699ad6a5b4a5d97c455d88258fbd102e5837329f44fb7d79e3ad64763`

No delete, rename, open, download, render, or file-writing endpoint was called.

## Static Verification

- `node --check server.js`: PASS
- `node --check server/output-helpers.js`: PASS
- `npm.cmd run check`: PASS
- `git diff --check`: PASS

## User Data Integrity

Before and after verification:

- `outputs`: files 13, size 6027534, manifest hash `c1fdda98a0dd769945c3741178828606bef2cf2bb757d3f73d35e536fc8f688f`
- `uploads`: files 1, size 5, manifest hash `6d947e515147663dbc405eeafc524b405075898b8ca07adb17b718880677f4f6`
- `projects`: missing
- `backups`: missing
- `data/templates.json`: size 37, hash `38fcbc0fbed94930a76e74a22b43b0d3b1e371668c918082bebff8e448614071`
- `package.json`: hash `5849264501847f4a827cd568edd748fb6bd884f9549613768e52232ce1d6f848`
- `package-lock.json`: hash `f00887dd1379b9eff83fac71c1e0dfe6966e743abb152879f5bfc13fc867dd2c`

Runtime cleanup:

- Port 4000 LISTENING after shutdown: none
- Electron process after verification: none

## Actual Move Scope

Moved:

- `resolveOutputMp4`
- `outputFilePayload`
- `getPublicBaseUrl`
- `createShareInfo`

Not moved:

- `/api/outputs` route handlers
- `openLocalPath`
- rename/delete/download/open route logic
- render output creation logic

Reason:

Route handlers and local open/rename/delete actions are state-changing or OS-integrated behavior. They should be split only after helper extraction remains stable and targeted route regression tests exist.

## Risk Assessment

Risk: MEDIUM

Reason:

- Path traversal and `.mp4` validation are security-sensitive.
- However, helper output and `/api/outputs` response hashes matched exactly.
- No route movement or state-changing endpoint was performed.

## Next Safe Split Candidate

Recommended next candidate:

- template helper functions:
  - `safeTemplateName`
  - `readUserTemplates`
  - `writeUserTemplates`
  - `sanitizeTemplatePayload`
  - `getAllTemplates`

Keep template routes in `server.js` for the first template-helper split.
