# STABILITY PHASE 5A - Release Regression Gap Survey

## Baseline

- Project: `E:\codex\highlight-studio`
- Branch: `main`
- HEAD: `c7113793874f75c8a9238abb71084e796d1fc2cb`
- Latest code commit: `c711379 fix: add idempotent shutdown manager`
- Working tree at start:
  - `?? docs/STABILITY_PHASE5_FINAL_RELEASE_REGRESSION_20260716.md`
- Code file changes: none

## Scope

This phase only surveys actual routes and designs a disposable release regression strategy.

No upload, render, delete, project save, Electron close, code edit, commit, or push was performed.

## Actual API Route Table

Actual registered route count: **34**

| # | Method | Path | Source | Read/Write | Body or Multipart | User Data Change | Safe Read Regression | Disposable Test |
| ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | GET | `/health` | `server/bootstrap.js` | Read | None | No | Yes | Yes |
| 2 | OPTIONS | `/api/ping` | `server/routes/system-routes.js` | Read/preflight | None | No | Yes | Yes |
| 3 | GET | `/api/ping` | `server/routes/system-routes.js` | Read | None | No | Yes | Yes |
| 4 | GET | `/api/health` | `server/routes/system-routes.js` | Read | None | No | Yes | Yes |
| 5 | POST | `/api/auth/login` | `server/routes/system-routes.js` | Read/session response only | JSON email/password | No file change | Yes with invalid/fixed payload | Yes |
| 6 | POST | `/api/auth/logout` | `server/bootstrap.js` | Read/session response only | None | No file change | Yes | Yes |
| 7 | GET | `/api/license/status` | `server/routes/system-routes.js` | Read | Optional query/header email | No | Yes | Yes |
| 8 | GET | `/api/update/check` | `server/routes/system-routes.js` | Read | None | No | Yes | Yes |
| 9 | POST | `/api/ai/analyze-photos` | `server/routes/ai-routes.js` | Read/compute | JSON `photos` | No | Yes with fixed JSON | Yes |
| 10 | POST | `/api/ai/create-storyboard` | `server/routes/ai-routes.js` | Read/compute | JSON `photos`, optional `analysis` | No | Yes with fixed JSON | Yes |
| 11 | GET | `/api/templates` | `server/routes/template-routes.js` | Read | None | No | Yes | Yes |
| 12 | POST | `/api/templates` | `server/routes/template-routes.js` | Write | JSON template | Writes `data/templates.json` | No | Yes with disposable `HIGHLIGHT_DATA_DIR` |
| 13 | PUT | `/api/templates/:templateId` | `server/routes/template-routes.js` | Write | JSON template | Writes `data/templates.json` | No | Yes with disposable `HIGHLIGHT_DATA_DIR` |
| 14 | DELETE | `/api/templates/:templateId` | `server/routes/template-routes.js` | Write | None | Writes `data/templates.json` | No | Yes with disposable `HIGHLIGHT_DATA_DIR` |
| 15 | GET | `/api/project/recent` | `server/routes/project-read-routes.js` | Read | None | No | Yes | Yes |
| 16 | GET | `/api/project/autosave` | `server/routes/project-read-routes.js` | Read | None | No | Yes | Yes |
| 17 | GET | `/api/project/backups` | `server/routes/project-read-routes.js` | Read | None | No | Yes | Yes |
| 18 | POST | `/api/project/save` | `server/routes/project-save-routes.js` | Write | JSON project | Writes backup; mutates recent memory | No | Yes with disposable `HIGHLIGHT_DATA_DIR` |
| 19 | POST | `/api/project/autosave` | `server/routes/project-save-routes.js` | Write | JSON project | Writes backup; mutates autosave memory | No | Yes with disposable `HIGHLIGHT_DATA_DIR` |
| 20 | POST | `/api/project/load` | `server/routes/project-load-routes.js` | Write-like memory mutation | JSON project | Mutates recent memory | No for main data | Yes in disposable run |
| 21 | POST | `/api/project/backups/:backupId/restore` | `server/routes/project-load-routes.js` | Write-like memory mutation | Path param | Reads backup; mutates recent memory | No | Yes with disposable backup |
| 22 | GET | `/api/render/encoders` | `server/routes/render-read-routes.js` | Read/probe | Optional query | No user file change | Yes | Yes |
| 23 | GET | `/api/render/status/:jobId` | `server/routes/render-read-routes.js` | Read | Path param | No | Yes for missing job | Yes |
| 24 | GET | `/api/render/queue` | `server/routes/render-read-routes.js` | Read | None | No | Yes | Yes |
| 25 | POST | `/api/render` | `server/routes/render-write-routes.js` | Write/run | Multipart `photos`, body `project` | Creates uploads, queue job, output/temp during render | No | Yes with disposable dirs |
| 26 | POST | `/api/render/cancel/:jobId` | `server/routes/render-write-routes.js` | Write/run control | Path param | Mutates job state; may remove uploaded files | No | Yes with disposable render job |
| 27 | POST | `/api/videos` | `server/routes/legacy-video-routes.js` | Write/run legacy | Multipart `photos` | Creates uploads, temp work, output | No | Yes with disposable dirs |
| 28 | GET | `/api/outputs` | `server/routes/output-read-routes.js` | Read | None | No | Yes | Yes |
| 29 | GET | `/api/outputs/:filename/share-info` | `server/routes/output-read-routes.js` | Read | Path param | No | Yes if disposable output exists | Yes |
| 30 | GET | `/api/outputs/:filename/download` | `server/routes/output-read-routes.js` | Read | Path param | No server mutation | Yes if disposable output exists | Yes |
| 31 | POST | `/api/outputs/:filename/open` | `server/routes/output-read-routes.js` | OS side effect | Path param | Opens local file in OS | No | Optional/manual only |
| 32 | POST | `/api/outputs/open-folder` | `server/bootstrap.js` | OS side effect | None | Opens local folder in OS | No | Optional/manual only |
| 33 | PATCH | `/api/outputs/:filename` | `server/routes/output-write-routes.js` | Write | JSON filename | Renames output file | No | Yes with disposable output |
| 34 | DELETE | `/api/outputs/:filename` | `server/routes/output-write-routes.js` | Write | Path param | Deletes output file | No | Yes with disposable output |

## Phase 5 Endpoint Mismatches

### `/api/projects`

Result: **404 due to missing route**

There is no exact `/api/projects` route.

Current project endpoints are singular:

- `GET /api/project/recent`
- `GET /api/project/autosave`
- `GET /api/project/backups`
- `POST /api/project/save`
- `POST /api/project/autosave`
- `POST /api/project/load`
- `POST /api/project/backups/:backupId/restore`

There is no project list route and no direct project-file GET route. Project persistence currently returns downloadable/save-ready project data and backup metadata through the POST routes.

### `/api/system`

Result: **404 due to missing route**

There is no exact `/api/system` route.

Current system-related endpoints are:

- `GET /health`
- `OPTIONS /api/ping`
- `GET /api/ping`
- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/license/status`
- `GET /api/update/check`

### `/api/render`

Current exact registration:

- `POST /api/render`

There is no `GET /api/render`. Read routes are:

- `GET /api/render/encoders`
- `GET /api/render/status/:jobId`
- `GET /api/render/queue`

### `/api/videos`

Current exact registration:

- `POST /api/videos`

There is no read route for `/api/videos`.

## User Data Storage Locations

| Area | Default Path | Env Override | Writes | Auto Cleanup | Disposable Feasible |
| --- | --- | --- | --- | --- | --- |
| uploads | `<root>/uploads` | `HIGHLIGHT_UPLOAD_DIR` | multer uploads, render temp input cleanup | uploaded files removed by render/legacy finally or cancel paths | Yes |
| outputs | `<root>/outputs` | `HIGHLIGHT_OUTPUT_DIR` | MP4 render/legacy output, rename/delete | No automatic cleanup for completed outputs | Yes |
| data | `<root>/data` | `HIGHLIGHT_DATA_DIR` | templates, backups | No global cleanup | Yes |
| backups | `<data>/backups` | via `HIGHLIGHT_DATA_DIR`; limit via `HIGHLIGHT_BACKUP_LIMIT` | project save/autosave backups | `cleanupOldBackups` applies limit | Yes |
| templates | `<data>/templates.json` | via `HIGHLIGHT_DATA_DIR` | template create/update/delete | No automatic cleanup | Yes |
| recent projects | memory only | No direct env | route memory mutation | Cleared by server restart | Yes |
| autosave | memory plus backup write | backup path via `HIGHLIGHT_DATA_DIR` | POST autosave writes backup and memory | Cleared by server restart; backup persists | Yes |
| render job metadata | memory only | No direct env | queue/job store | Cleanup timer for terminal jobs | Yes |
| render work temp | `<uploads>/<render-job-id>` | via `HIGHLIGHT_UPLOAD_DIR` | scene segments, concat list | removed in executor finally | Yes |
| legacy work temp | `<uploads>/<video-job-id>` | via `HIGHLIGHT_UPLOAD_DIR` | segment files, concat list | removed in legacy finally | Yes |
| Electron userData | Electron default | `HIGHLIGHT_DESKTOP_USER_DATA` | settings/log/cache | Not app-auto-cleaned | Yes |

## Disposable Regression Strategy

Create an isolated temporary root before testing, for example:

```powershell
$root = Join-Path $env:TEMP "highlight-studio-release-regression-20260716"
$env:HIGHLIGHT_UPLOAD_DIR = Join-Path $root "uploads"
$env:HIGHLIGHT_OUTPUT_DIR = Join-Path $root "outputs"
$env:HIGHLIGHT_DATA_DIR = Join-Path $root "data"
$env:HIGHLIGHT_BACKUP_LIMIT = "20"
$env:HIGHLIGHT_DESKTOP_USER_DATA = Join-Path $root "electron-userdata"
```

Use unique test prefixes:

- project name: `release_regression_20260716_project`
- uploaded image: `release_regression_20260716_photo.png`
- output file: `release_regression_20260716_output.mp4`
- template id/name prefix: `release_regression_20260716`

Before testing:

1. Record manifests and hashes for default `uploads`, `outputs`, `data`, `data/templates.json`, `package.json`, `package-lock.json`.
2. Confirm port 4000 has no `LISTENING` entry.
3. Start server or Electron only with disposable env vars.
4. Generate tiny test images inside the disposable root only.

After testing:

1. Stop server/Electron.
2. Confirm port 4000 has no `LISTENING` entry.
3. Record default data manifests again.
4. Confirm default manifests/hashes are unchanged.
5. Delete only the disposable root if its resolved path is under `%TEMP%` and exactly matches the generated root.
6. If cleanup fails, report the disposable root path and do not touch default data.

## Existing Data No-Change Proof

Use before/after comparisons:

- recursive file list for `uploads`
- recursive file list for `outputs`
- recursive file list for `data`
- SHA256 for `data/templates.json`
- SHA256 for `package.json`
- SHA256 for `package-lock.json`
- `git status --short`
- `netstat -ano | findstr :4000`

Do not compare only counts; include size, mtime, and hashes for existing files where practical.

## Executability by Feature

| Feature | Safe in Current User Data | Disposable Feasible | Notes |
| --- | --- | --- | --- |
| Photo upload | No | Yes | Use disposable upload dir and generated image |
| Project create | No | Yes | Use generated in-memory/disposable project |
| Project save | No | Yes | Writes disposable backup |
| Project load | No for main recent memory | Yes | Mutates recent memory only in disposable server process |
| Render start | No | Yes | Enqueues job and writes disposable upload/output state |
| Render cancel | No | Yes | Requires disposable active/queued job |
| Render complete | No | Yes | Requires disposable output |
| Output download | No with user output | Yes | Download disposable output only |
| Test output delete | No with user output | Yes | Delete disposable output only |
| Legacy `/api/videos` | No | Yes | Creates disposable legacy output |
| Electron window creation | Yes with temp userData | Yes | Use `HIGHLIGHT_DESKTOP_USER_DATA` |
| Electron window close | No automated guarantee in current tools | Manual/disposable feasible | Requires visible app close or tool capable of window close |
| Electron `before-quit` | Not verified by startup only | Manual/disposable feasible | Must observe shutdown manager logs |
| Node Ctrl+C | Tool backend dependent | Manual/disposable feasible | If backend cannot send interrupt, use manual terminal |
| Duplicate shutdown | Yes with module stub | Yes | Can be unit-checked without user data |

## Electron Shutdown Verification Procedure

Automated startup alone is not enough.

Required proof for PASS:

1. Set disposable environment:
   - `HIGHLIGHT_DESKTOP_USER_DATA`
   - `HIGHLIGHT_UPLOAD_DIR`
   - `HIGHLIGHT_OUTPUT_DIR`
   - `HIGHLIGHT_DATA_DIR`
2. Run `npm.cmd run electron`.
3. Confirm BrowserWindow is visible and main UI loaded.
4. Close the visible app window or request `app.quit()` through a trusted interactive tool.
5. Confirm logs include:
   - `Highlight Studio desktop quitting`
   - `Highlight Studio shutdown started: electron-before-quit`
   - `Highlight Studio shutdown completed`
6. Confirm Electron processes exit.
7. Confirm no `127.0.0.1:4000 LISTENING` remains.
8. Confirm disposable userData contains only test cache/settings/logs.
9. Delete only the disposable userData root.

If no tool can trigger the visible window close, mark Electron `before-quit` as BLOCKED, not PASS.

## Phase 5 Document Handling Recommendation

Recommended option: **3. Preserve the existing Phase 5 document and create a separate final revalidation document after Phase 5B.**

Rationale:

- The current Phase 5 document is historically accurate: the release was blocked by test constraints, not by a confirmed code failure.
- Editing it would blur the audit trail.
- Phase 5B can produce a new disposable-regression result document that either clears or preserves the block.

Suggested future document:

- `docs/STABILITY_PHASE5B_DISPOSABLE_RELEASE_REGRESSION_20260716.md`

## Phase 5B Exact Test List

Run only in disposable environment:

1. Static checks:
   - `node --check server.js`
   - `node --check server/bootstrap.js`
   - `node --check desktop/main.js`
   - `npm.cmd run check`
   - `git diff --check`
2. Start server with disposable env vars.
3. Read APIs:
   - `GET /health`
   - `GET /api/health`
   - `GET /api/ping`
   - `GET /api/templates`
   - `GET /api/project/recent`
   - `GET /api/project/autosave`
   - `GET /api/project/backups`
   - `GET /api/render/encoders`
   - `GET /api/render/queue`
   - `GET /api/outputs`
4. System auth checks:
   - invalid/fixed `POST /api/auth/login`
   - `POST /api/auth/logout`
5. AI fixed payload:
   - `POST /api/ai/analyze-photos`
   - `POST /api/ai/create-storyboard`
6. Template disposable mutation:
   - create, update, delete a disposable template in disposable `data`.
7. Project disposable mutation:
   - `POST /api/project/save`
   - `POST /api/project/load`
   - `POST /api/project/autosave`
   - `GET /api/project/backups`
   - restore a disposable backup if created.
8. Render disposable flow:
   - generate tiny test image(s)
   - `POST /api/render`
   - poll `GET /api/render/status/:jobId`
   - verify queue
   - complete or cancel depending runtime length.
9. Render cancel disposable flow:
   - start a separate disposable render job if needed
   - `POST /api/render/cancel/:jobId`
   - verify terminal job shape.
10. Outputs disposable flow:
   - `GET /api/outputs`
   - download disposable output
   - share-info disposable output
   - rename disposable output
   - delete disposable output.
11. Legacy disposable flow:
   - `POST /api/videos` with generated image(s)
   - verify deprecated metadata and output creation.
12. Shutdown:
   - Node Ctrl+C if supported by shell
   - duplicate shutdown unit check
   - no port 4000 `LISTENING`.
13. Electron:
   - disposable env startup
   - BrowserWindow visible
   - visible app close
   - before-quit and shutdown logs
   - process/port cleanup.
14. Verify default user data manifests/hashes unchanged.
15. Remove disposable root only.

## Can Release Block Be Cleared Without Code Changes?

Yes, conditionally.

The current Release Blocked state is mostly a verification gap caused by test restrictions. Code changes are not required to clear it if Phase 5B runs the blocked workflows in an isolated disposable environment and all results pass.

One caveat:

- `/api/projects` and `/api/system` should not be required release endpoints unless the product specification explicitly demands them. The correct existing endpoints are `/api/project/*` and system endpoints under `/health`, `/api/health`, `/api/ping`, license, auth, and update routes.

## Final Conclusion

The Phase 5 block is not a confirmed release-code failure.

It is a regression coverage gap caused by:

- running final checks against production/default local data,
- avoiding upload/render/delete state changes,
- using two endpoint names that are not actually registered,
- lacking a direct Electron UI close verification mechanism.

Recommended next step:

- Run Phase 5B in disposable directories using the exact route list in this document.
- Preserve the existing Phase 5 report.
- Add a new Phase 5B disposable regression report.
- Only declare Release Ready if disposable upload/render/output/delete/legacy/Electron shutdown workflows all pass and default user data manifests remain unchanged.
