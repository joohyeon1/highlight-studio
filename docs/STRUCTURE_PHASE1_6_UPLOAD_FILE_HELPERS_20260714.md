# STRUCTURE PHASE 1-6 Upload File Helpers Extraction

Date: 2026-07-14
Project: Highlight Studio
Scope: move upload filename/display normalization helpers out of `server.js`.

## Baseline

- Branch: `main`
- Starting commit: `0e10f8f refactor: extract template helpers`
- Working tree before edits: clean

## Target Functions

Moved into `server/upload-file-helpers.js`:

- `displayFileName`
- `decodeUploadName`
- `normalizeUploadedFiles`

## Original Declaration Locations

Before extraction:

- `displayFileName`: `server.js:149`
- `decodeUploadName`: `server.js:157`
- `normalizeUploadedFiles`: `server.js:167`

After extraction:

- All three functions are declared in `server/upload-file-helpers.js`.
- `server.js` imports them with CommonJS destructuring.

## Call Sites

Current `server.js` call sites:

- `probeInputImage`
  - `displayFileName(file?.originalname, "photo")`
- `createRenderFromProject`
  - `displayFileName(item.file.originalname || photo.fileName || ..., fallback)`
- `POST /api/videos`
  - `normalizeUploadedFiles(req.files)`
- `POST /api/render`
  - `normalizeUploadedFiles(req.files)`

## Function Dependencies

Internal dependencies:

- `normalizeUploadedFiles` calls `decodeUploadName`.

External dependencies:

- `Buffer` global in `decodeUploadName`.
- Multer-style file object shape in `normalizeUploadedFiles`.

No dependency on:

- `fs`
- `path`
- `crypto`
- `express`
- `multer`
- render queue state
- FFmpeg process helpers
- Electron
- project/autosave/recent state

## Multer Object Assumptions

`normalizeUploadedFiles` expects an array of file-like objects and mutates each object's `originalname` field in place:

- reads `file.originalname`
- writes decoded value back to `file.originalname`
- preserves `filename`, `path`, `mimetype`, `size`, and any other fields
- returns the same array reference

This behavior is unchanged.

## Excluded Upload Areas

Not moved:

- multer import
- `multer.diskStorage`
- destination callback
- filename callback
- fileFilter
- limits
- `upload.array(...)`
- `/api/videos`
- `/api/render`

Reason:

The current phase is helper-only. Multer configuration and upload routes are behavior-sensitive and remain in `server.js`.

## Helper Comparison

Checked `displayFileName` inputs:

- English filename
- Korean filename
- filename with spaces
- special characters: `< > : / \\ | ? *`
- extensionless name
- empty string
- `null`
- `undefined`

Checked `decodeUploadName` inputs:

- UTF-8 Korean filename
- latin1-misread Korean filename
- English filename
- numeric value
- spaces and parentheses
- damaged encoding-like string
- `null`
- `undefined`

Checked `normalizeUploadedFiles` inputs:

- empty array
- multiple file-like objects
- `originalname`
- `filename`
- `path`
- `mimetype`
- `size`
- missing `originalname`

Before extraction helper result hash:

`1bf9b056d5229848c129fbfe9e6664446940055d8475371704fddabd335cdd4e`

After extraction helper result hash:

`1bf9b056d5229848c129fbfe9e6664446940055d8475371704fddabd335cdd4e`

Comparison result:

- JSON result identical
- array order identical
- display filename sanitization identical
- Korean filename restore behavior identical
- object fields preserved
- missing `originalname` still becomes an empty string

## API Connection

Connected routes:

- `POST /api/videos`
- `POST /api/render`

No actual upload was performed in this phase because it would create files in `uploads` and require cleanup. The task allowed blocking actual upload when user data changes are not explicitly permitted.

Verification was instead performed through:

- direct helper fixed-input comparison
- route source connection check
- `GET /api/health`

## API Verification

Read-only API check:

- `GET /api/health`: 200

Actual upload test:

- BLOCKED
- Reason: it would create a temporary upload file and alter `uploads`; this phase prioritizes user data immutability.

## Static Verification

- `node --check server.js`: PASS
- `node --check server/upload-file-helpers.js`: PASS
- `npm.cmd run check`: PASS
- `git diff --check`: PASS

## User Data Integrity

Before and after verification:

- `uploads`: files 1, size 5, manifest hash `6d947e515147663dbc405eeafc524b405075898b8ca07adb17b718880677f4f6`
- `outputs`: files 13, size 6027534, manifest hash `c1fdda98a0dd769945c3741178828606bef2cf2bb757d3f73d35e536fc8f688f`
- `data/templates.json`: size 37, hash `38fcbc0fbed94930a76e74a22b43b0d3b1e371668c918082bebff8e448614071`
- `projects`: missing
- `backups`: missing
- `package.json`: hash `5849264501847f4a827cd568edd748fb6bd884f9549613768e52232ce1d6f848`
- `package-lock.json`: hash `f00887dd1379b9eff83fac71c1e0dfe6966e743abb152879f5bfc13fc867dd2c`

Runtime cleanup:

- Port 4000 LISTENING after shutdown: none
- Electron process after verification: none

## server.js Line Count

After extraction:

- `server.js`: 1421 lines

## Risk Assessment

Risk: LOW

Reason:

- The moved functions are pure or file-object normalization helpers.
- No multer configuration or route logic moved.
- Helper result hash matched exactly.

## Next Split Candidate

Recommended next candidate:

- project helper survey before any movement:
  - project validation
  - recent project summaries
  - backups
  - autosave

These are higher risk because they write backup files and mutate in-memory state.

Lower-risk alternative:

- small naming helpers with no route side effects:
  - `safeName`
  - `makeId`

But `makeId` is shared by uploads, render jobs, project recent IDs, and templates, so it needs a separate dependency survey before moving.
