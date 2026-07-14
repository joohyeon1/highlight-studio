# STRUCTURE PHASE 1-5 Template Helpers Extraction

Date: 2026-07-14
Project: Highlight Studio
Scope: move only template helper functions out of `server.js`.

## Baseline

- Branch: `main`
- Starting commit: `1bbeb5b refactor: extract output helpers`
- Working tree before edits: clean

## Target Functions

Moved into `server/template-helpers.js`:

- `safeTemplateName`
- `readUserTemplates`
- `writeUserTemplates`
- `sanitizeTemplatePayload`
- `getAllTemplates`

## Original Declaration Locations

Before extraction:

- `safeTemplateName`: `server.js:443`
- `readUserTemplates`: `server.js:449`
- `writeUserTemplates`: `server.js:458`
- `sanitizeTemplatePayload`: `server.js:462`
- `getAllTemplates`: `server.js:476`

After extraction:

- All target functions are declared in `server/template-helpers.js`.
- `server.js` imports them with CommonJS destructuring.

## Call Sites

Current `server.js` call sites:

- `GET /api/templates`
  - `getAllTemplates`
- `POST /api/templates`
  - `readUserTemplates`
  - `sanitizeTemplatePayload`
  - `writeUserTemplates`
- `PUT /api/templates/:templateId`
  - `readUserTemplates`
  - `sanitizeTemplatePayload`
  - `writeUserTemplates`
- `DELETE /api/templates/:templateId`
  - `readUserTemplates`
  - `writeUserTemplates`

`DEFAULT_TEMPLATES` remains imported in `server.js` for the existing built-in template update/delete guard logic.

## Dependencies

Internal dependencies:

- `sanitizeTemplatePayload` calls `safeTemplateName`.
- `getAllTemplates` calls `readUserTemplates`.

External dependencies:

- `fs`
- `path`
- `crypto`
- `Date`
- `process.env.HIGHLIGHT_DATA_DIR`
- `server/default-templates.js`

No dependency on:

- Express route registration
- render queue
- FFmpeg
- Electron
- AI helpers
- output helpers
- license helpers

## Path And ID Handling

Before extraction:

- `readUserTemplates` and `writeUserTemplates` used `USER_TEMPLATES_PATH` from `server.js`.
- `sanitizeTemplatePayload` used `makeId("template")` from `server.js`.

After extraction:

- `server/template-helpers.js` computes the same template path rule:
  - project root: `path.resolve(__dirname, "..")`
  - data dir: `process.env.HIGHLIGHT_DATA_DIR || path.join(ROOT_DIR, "data")`
  - template path: `path.join(DATA_DIR, "templates.json")`
- A private `makeId` helper with the same implementation is used only inside `server/template-helpers.js`.

No function signatures were changed. No `server.js` reverse require was introduced.

## File Read/Write Impact

Moved read/write functions:

- `readUserTemplates`: reads `data/templates.json`; returns `[]` on any read/parse issue.
- `writeUserTemplates`: writes `{ version: 1, templates }` with 2-space JSON formatting.

The route handlers that decide when writes occur remain in `server.js`.

No state-changing template API was called during verification.

## Helper Comparison

Checked inputs:

- normal template name
- trimmed template name
- special-character name
- empty name
- `null`
- missing user templates
- default template merge order
- new template sanitization
- existing template sanitization

Post-extraction deterministic helper hash with fixed Date/ID:

`f58e009634a9afa8d8a48f7ab73e3a7c564693a2ae32f1375f41805e51b81f1c`

The pre-extraction helper was executed through `git show HEAD:server.js | node` for comparison. PowerShell pipe encoding converted Korean error text to `???`, so that raw hash was not valid for Korean string comparison. The helper source was copied exactly, and the runtime API hash comparison below confirmed identical observable behavior.

## API Verification

Read-only API checks:

- `GET /api/health`: 200
- `GET /api/templates`: 200

`/api/templates` comparison:

- before status: 200
- after status: 200
- before count: 6
- after count: 6
- before response hash: `96bee505115fd1f78ab66db2529ad96ce08c6986205754869dc2f47405054d48`
- after response hash: `96bee505115fd1f78ab66db2529ad96ce08c6986205754869dc2f47405054d48`
- order: `default-basic`, `default-emotional`, `default-sports`, `default-competition`, `default-promotion`, `default-graduation`

No template save, update, or delete API was called.

## Static Verification

- `node --check server.js`: PASS
- `node --check server/template-helpers.js`: PASS
- `npm.cmd run check`: PASS
- `git diff --check`: PASS

## User Data Integrity

Before and after verification:

- `data/templates.json`: size 37, hash `38fcbc0fbed94930a76e74a22b43b0d3b1e371668c918082bebff8e448614071`
- `outputs`: files 13, size 6027534, manifest hash `c1fdda98a0dd769945c3741178828606bef2cf2bb757d3f73d35e536fc8f688f`
- `uploads`: files 1, size 5, manifest hash `6d947e515147663dbc405eeafc524b405075898b8ca07adb17b718880677f4f6`
- `projects`: missing
- `backups`: missing
- `package.json`: hash `5849264501847f4a827cd568edd748fb6bd884f9549613768e52232ce1d6f848`
- `package-lock.json`: hash `f00887dd1379b9eff83fac71c1e0dfe6966e743abb152879f5bfc13fc867dd2c`

Runtime cleanup:

- Port 4000 LISTENING after shutdown: none
- Electron process after verification: none

## Actual Move Scope

Moved:

- `safeTemplateName`
- `readUserTemplates`
- `writeUserTemplates`
- `sanitizeTemplatePayload`
- `getAllTemplates`

Not moved:

- `/api/templates` route handlers
- built-in template update/delete guard logic
- `DEFAULT_TEMPLATES` data
- project backup/autosave helpers

Reason:

Routes and guard behavior are API-facing. Keeping them in `server.js` avoids changing status codes, error messages, and route order.

## Risk Assessment

Risk: MEDIUM

Reason:

- Template file read/write helpers are local file persistence behavior.
- However, no route was moved and `/api/templates` response hash matched exactly.

## Next Safe Split Candidate

Recommended next candidate:

- project helper functions, but only after a focused survey because they write backups and mutate in-memory recent/autosave state.

Lower-risk alternative:

- naming helpers:
  - `safeName`
  - `displayFileName`
  - `decodeUploadName`
  - `normalizeUploadedFiles`

Keep upload middleware and render routes in `server.js` until upload/render regression tests are broader.
