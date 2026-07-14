# STRUCTURE PHASE 1-18 Project Save Routes

## Scope

- Baseline branch: `main`
- Baseline commit: `84c3127 refactor: extract project load routes`
- Goal: move project save write routes into a route module without changing API behavior.
- New module: `server/routes/project-save-routes.js`

## Moved Routes

| Method | Path | Result |
| --- | --- | --- |
| POST | `/api/project/save` | Moved to `registerProjectSaveRoutes` |
| POST | `/api/project/autosave` | Moved to `registerProjectSaveRoutes` |

## Excluded Routes And State

The following stayed in `server.js`:

- `projectAutosave`
- `recentProjects`
- `rememberProject`
- `writeProjectBackup`
- `readProjectBackup`
- `POST /api/project/load`
- `POST /api/project/backups/:backupId/restore`
- all project read routes already handled by `project-read-routes`

No render, queue, FFmpeg, output, upload, template, AI, desktop, public, or package files were changed.

## Accessor And Dependency Pattern

`server.js` keeps module-scope state ownership. The save route module receives only the dependencies it needs:

- `validateProjectDocument`
- `projectFileName`
- `writeProjectBackup`
- `rememberProject`
- `projectSummary`
- `setProjectAutosave`

`setProjectAutosave` is a minimal setter in `server.js` so `POST /api/project/autosave` can preserve the existing reassignment behavior without moving state into the route module.

## Behavior Preservation

The moved handlers preserve:

- request body handling: `req.body?.project || req.body`
- `.hsp` response filename behavior
- recent project update behavior
- autosave state assignment behavior
- backup write behavior
- success response fields
- Korean success and error messages
- status `400` on validation/write errors

## Temporary Data Verification

State-changing API tests used only a temporary data directory:

- `HIGHLIGHT_DATA_DIR=E:\codex\highlight-studio\.tmp-structure-phase1-18-data`
- `HIGHLIGHT_BACKUP_LIMIT=3`

The real `data/backups` directory and user project files were not used for POST tests.

### POST/API Results

| Check | Status |
| --- | --- |
| `POST /api/project/save` normal payload | 200 |
| `POST /api/project/save` minimal payload | 200 |
| `POST /api/project/save` invalid payload | 400 |
| `POST /api/project/autosave` normal payload | 200 |
| `POST /api/project/autosave` minimal payload | 200 |
| `POST /api/project/autosave` invalid payload | 400 |
| `GET /api/project/recent` after save/autosave | 200 |
| `GET /api/project/autosave` after save/autosave | 200 |
| `GET /api/project/backups` after save/autosave | 200 |

Dynamic fields such as backup IDs, timestamps, and backup filenames remain dynamic. Normalized backup content hashes matched the expected payload content after route extraction, and backup cleanup kept the temp directory at three files with `HIGHLIGHT_BACKUP_LIMIT=3`.

### Non-Target API Regression

| Route | Status |
| --- | --- |
| `GET /api/health` | 200 |
| `GET /api/templates` | 200 |
| `GET /api/outputs` | 200 |
| `GET /api/render/queue` | 200 |
| `GET /api/license/status` | 200 |
| `POST /api/ai/analyze-photos` with fixed JSON payload | 200 |

## Static Verification

Planned final checks:

- `node --check server.js`
- `node --check server/routes/project-save-routes.js`
- node syntax check for all `server/**/*.js`
- `npm.cmd run check`
- `git diff --check`

## User Data Integrity

The temporary verification directory was removed after testing. No real user backup, upload, output, template, package, or `.hsp` files were intentionally modified.

## Line Count

- `server.js` before: 1074 lines
- `server.js` after: 1057 lines
- Reduction: 17 lines

## Next Project Route Step

The remaining project write/restore area should stay separate until another focused phase:

- keep `POST /api/project/load` and backup restore together or split restore last
- keep `writeProjectBackup` and `readProjectBackup` in `server.js` unless storage state is moved as a complete module
- avoid moving `recentProjects` or `projectAutosave` until a dedicated state module is designed
