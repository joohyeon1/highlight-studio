# Structure Phase 1-7 Project Storage Survey

Date: 2026-07-14

Scope: survey only. No server code, route, UI, package, project, upload, output, template, or backup data was intentionally changed.

## 1. Related Constants And State

Current baseline:

- Branch: `main`
- Latest commit: `1824c6d refactor: extract upload file helpers`
- `server.js` line count observed in this survey: 1310

Project-related constants and state in `server.js`:

| Name | Line | Type | Purpose | Notes |
| --- | ---: | --- | --- | --- |
| `DATA_DIR` | 45 | constant path | Base local data directory | `process.env.HIGHLIGHT_DATA_DIR` or `data` under root. |
| `BACKUP_DIR` | 46 | constant path | Project backup directory | Always `path.join(DATA_DIR, "backups")`. |
| `projectAutosave` | 62 | module state | Last server-side autosave in memory | Not persisted directly as an autosave file. |
| `recentProjects` | 63 | module state array | Recent project summaries | Memory-only and reset on server restart. |
| `HIGHLIGHT_BACKUP_LIMIT` | 504, 559 | environment setting | Backup retention/list limit | Defaults to `10`. Electron sets it from settings. |

Directory initialization:

- `fs.mkdirSync(DATA_DIR, { recursive: true })`
- `fs.mkdirSync(BACKUP_DIR, { recursive: true })`

There is no `PROJECTS_DIR` constant in the current server code.

## 2. Project Helper Function List

| Function | Line | Category | Calls | Called By |
| --- | ---: | --- | --- | --- |
| `parseProjectPayload` | 440 | render payload parser | `JSON.parse` | Render route at line 1193 |
| `validateProjectDocument` | 448 | project validation/normalization | `new Date().toISOString` | save/load/autosave/write backup/read backup |
| `projectFileName` | 471 | project file naming | `safeName` | save route, `projectSummary` |
| `projectSummary` | 475 | recent/autosave summary | `makeId`, `projectFileName`, `new Date` | `rememberProject`, autosave route |
| `rememberProject` | 488 | in-memory recent mutation | `projectSummary`, `recentProjects.splice/unshift` | save/load/backup restore routes |
| `projectBackupFileName` | 498 | backup file naming | `safeName`, `new Date` | `writeProjectBackup` |
| `cleanupOldBackups` | 504 | backup retention | `fs.promises.readdir/stat/rm`, `process.env` | `writeProjectBackup` |
| `writeProjectBackup` | 517 | backup writer | `validateProjectDocument`, `projectBackupFileName`, `fs.promises.writeFile`, `cleanupOldBackups` | save/autosave routes |
| `listProjectBackups` | 539 | backup reader/list builder | `fs.promises.readdir/readFile/stat`, `JSON.parse`, `process.env` | GET backup list route |
| `readProjectBackup` | 562 | backup restore reader | `path.basename/resolve`, `fs.promises.readFile`, `JSON.parse`, `validateProjectDocument` | POST backup restore route |

`parseProjectPayload` is project-shaped data parsing, but it belongs to render request processing rather than project storage.

## 3. Project Route List

| Method | Path | Line | State Change | Handler Summary |
| --- | --- | ---: | --- | --- |
| `POST` | `/api/project/save` | 1021 | Yes | Validates project, updates recent memory, writes backup, returns `.hsp` payload metadata. |
| `POST` | `/api/project/load` | 1039 | Yes | Validates project and updates recent memory. |
| `GET` | `/api/project/recent` | 1049 | No file write | Returns in-memory `recentProjects`. |
| `POST` | `/api/project/autosave` | 1053 | Yes | Validates project, updates in-memory autosave, writes backup. |
| `GET` | `/api/project/autosave` | 1068 | No | Returns in-memory autosave or `null`. |
| `GET` | `/api/project/backups` | 1073 | No | Reads `data/backups` and returns backup summaries. |
| `POST` | `/api/project/backups/:backupId/restore` | 1081 | Yes | Reads backup file, validates project, updates recent memory. |

No `PUT`, `PATCH`, or `DELETE` project routes were found.

## 4. Function Dependency Table

| Function | Internal Dependencies | External Dependencies | Scope Dependencies | Mutates Input | File System Effect | Return Shape | Risk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `parseProjectPayload` | none | `JSON` | none | No | None | parsed project object | LOW, but render-coupled |
| `validateProjectDocument` | none | `Date` | none | Yes | None | normalized project object | MEDIUM |
| `projectFileName` | `safeName` | none | none | No | None | string `.hsp` filename | LOW |
| `projectSummary` | `makeId`, `projectFileName` | `Date` | none | No | None | summary object | LOW-MEDIUM due generated ID/time |
| `rememberProject` | `projectSummary` | none | `recentProjects` | No | None | summary object | MEDIUM |
| `projectBackupFileName` | `safeName` | `Date` | none | No | None | string `.hsp.json` filename | LOW |
| `cleanupOldBackups` | none | `fs`, `process.env` | `BACKUP_DIR` | No | Deletes old backup files | void | MEDIUM-HIGH |
| `writeProjectBackup` | `validateProjectDocument`, `projectBackupFileName`, `cleanupOldBackups` | `fs`, `JSON`, `Date` | `BACKUP_DIR` | Yes via validation | Writes backup and may delete old backups | backup summary object | HIGH |
| `listProjectBackups` | none | `fs`, `JSON`, `Date`, `process.env` | `BACKUP_DIR` | No | Read only | backup summary array | MEDIUM |
| `readProjectBackup` | `validateProjectDocument` | `path`, `fs`, `JSON` | `BACKUP_DIR` | Yes via validation | Read only | project object | MEDIUM-HIGH |

## 5. File System Structure

Observed filesystem state before document creation:

- `projects`: missing
- root `backups`: missing
- `data/backups`: exists, 10 files, total 26720 bytes
- `uploads`: exists, 1 file (`.gitkeep`), total 5 bytes
- `outputs`: exists, 13 files, total 6027534 bytes
- `data/templates.json`: exists, 37 bytes
- `package.json`: exists
- `package-lock.json`: exists

Project storage behavior:

- There is no default saved-project directory in server code.
- Browser `.hsp` save is downloaded by the frontend with `downloadProject`.
- Server `/api/project/save` prepares and returns project data, and writes a backup under `data/backups`.
- Server autosave is memory-only plus a backup side effect on POST.
- Server recent projects are memory-only.
- Browser autosave and recent projects are stored in `localStorage` using:
  - `highlightStudio.autosaveProject`
  - `highlightStudio.recentProjects`

Backup file format:

```json
{
  "version": 1,
  "source": "save|autosave|...",
  "savedAt": "ISO timestamp",
  "project": {}
}
```

Backup filename format:

```text
<ISO timestamp with colon/dot replaced by hyphen>-<safe project name>.hsp.json
```

Atomic writes:

- No temporary file or rename-based atomic write is used for project backups.
- `writeProjectBackup` writes directly with `fs.promises.writeFile`.

Overwrite behavior:

- Backup filenames include timestamps, so normal backup writes create a new file.
- Cleanup removes older backups beyond `HIGHLIGHT_BACKUP_LIMIT`.

## 6. In-Memory State

| State | Location | Persisted | Changed By | Read By | Restart Behavior |
| --- | --- | --- | --- | --- | --- |
| `recentProjects` | server module scope | No | `rememberProject` | GET `/api/project/recent` | Lost on restart |
| `projectAutosave` | server module scope | No direct autosave file | POST `/api/project/autosave` | GET `/api/project/autosave` | Lost on restart |

Moving stateful helpers to a separate module would create singleton lifecycle questions. This is especially important under Electron because `desktop/main.js` sets `HIGHLIGHT_DATA_DIR` and then requires `server.js`; module initialization order must remain unchanged.

## 7. Frontend And Desktop Connections

`public/app.js` project API calls:

| Function | Method | URL | State Change |
| --- | --- | --- | --- |
| `loadRecentProjects` | GET | `/api/project/recent` | No |
| `loadProjectBackups` | GET | `/api/project/backups` | No |
| `restoreProjectBackup` | POST | `/api/project/backups/:backupId/restore` | Yes |
| `saveProject` | POST | `/api/project/save` | Yes |
| `autosaveProject` | POST | `/api/project/autosave` | Yes |
| `openProjectFile` | POST | `/api/project/load` | Yes |
| `restoreServerAutosaveIfAvailable` | GET | `/api/project/autosave` | No |

`desktop/main.js` does not directly call project routes. It configures:

- `process.env.HIGHLIGHT_DATA_DIR = settings.dataDir`
- `process.env.HIGHLIGHT_BACKUP_LIMIT = String(settings.backupLimit || 10)`

No project route references were found in `desktop/main.js` or `desktop/preload.js`.

## 8. Risk Classification

LOW:

- `projectFileName`
- `projectBackupFileName`
- `parseProjectPayload`, if treated as render payload helper rather than storage helper

LOW-MEDIUM:

- `projectSummary`, because it generates `id` and timestamps using `makeId` and `Date`

MEDIUM:

- `validateProjectDocument`, because it mutates the input object and updates timestamps
- `rememberProject`, because it mutates in-memory singleton state
- `listProjectBackups`, because it reads backup files and parses permissively

MEDIUM-HIGH:

- `readProjectBackup`, because it combines path traversal protection, JSON parse, and validation mutation

HIGH:

- `writeProjectBackup`, because it writes files and validates/mutates input
- `cleanupOldBackups`, because it deletes files
- Any route movement
- Any module extraction that moves `projectAutosave` or `recentProjects` without explicit singleton design

## 9. safeName And makeId Survey

`safeName`:

- Declared in `server.js` at line 99.
- Uses string conversion, NFC normalization, regex replacement, dash collapse/trim, 80-character limit, and fallback `highlight`.
- Current call sites:
  - `safeOutputFileName`
  - `projectFileName`
  - `projectBackupFileName`
  - render output filename generation
  - legacy `/api/videos` title handling

`makeId`:

- Declared in `server.js` at line 108.
- Format: `<prefix>-<Date.now base36>-<4 random bytes hex>`.
- Current server call sites:
  - upload filename generation: `photo`
  - recent project summary ID: `recent`
  - render job ID: `render`
  - legacy video job ID: `job`
- `server/template-helpers.js` has its own local `makeId` implementation for template IDs.

Risk notes:

- `safeName` is shared by upload-adjacent, output/render, project, and legacy video flows.
- `makeId` is shared by upload, project, render, and legacy video flows.
- Moving these now would widen the scope beyond project storage and could create unrelated regression risk.
- A future dedicated common helper survey is safer before extracting them.

## 10. Duplicate Patterns Found

No duplicate removal was performed. Duplicates and near-duplicates observed:

- Safe file naming:
  - `safeName`
  - `safeOutputFileName`
  - `projectFileName`
  - `projectBackupFileName`
  - `readProjectBackup` basename/path checks
- Timestamp generation:
  - `validateProjectDocument`
  - `projectSummary`
  - `projectBackupFileName`
  - `writeProjectBackup`
  - autosave route
  - render/job code elsewhere
- JSON read/write:
  - project backup read/write in `server.js`
  - template JSON read/write in `server/template-helpers.js`
- Directory/path traversal protection:
  - output helpers already extracted
  - `readProjectBackup`
- Retention limit:
  - `cleanupOldBackups`
  - `listProjectBackups`

## 11. Recommended Next Split

Recommended approach: D, split autosave/recent/backups into separate steps, with a first very small helper-only extraction.

Do not extract the whole project storage module yet.

First safe candidate:

- Module: `server/project-file-helpers.js`
- Move only:
  - `projectFileName`
  - `projectBackupFileName`
- Required dependencies:
  - local copy or imported `safeName`
- Signature changes:
  - Avoid adding new parameters if possible.
  - If sharing `safeName` requires a new common module, do that in a separate phase first.
- Expected route changes:
  - require/import only; no route movement.
- Expected files:
  - `server.js`
  - `server/project-file-helpers.js`
  - survey/finalization doc
- Risk: LOW-MEDIUM because of `safeName` coupling.

Alternative if a slightly larger phase is accepted:

- Module: `server/project-document-helpers.js`
- Move:
  - `validateProjectDocument`
  - `projectFileName`
  - `projectSummary`
  - `projectBackupFileName`
- Exclude:
  - `rememberProject`
  - `writeProjectBackup`
  - `cleanupOldBackups`
  - `listProjectBackups`
  - `readProjectBackup`
- Risk: MEDIUM because `validateProjectDocument` mutates input and `projectSummary` uses `makeId` and `Date`.

Explicitly excluded from the next minimal extraction:

- Routes: all `/api/project*`
- `projectAutosave`
- `recentProjects`
- `writeProjectBackup`
- `cleanupOldBackups`
- backup restore
- any POST route behavior
- render `parseProjectPayload` unless handled in a render-focused phase

Rollback criterion for the next phase:

- Any change in `/api/project/save` response shape.
- Any change in `/api/project/backups` count/order/fields.
- Any change in `.hsp` normalization output.
- Any user data file hash/mtime change outside intentional test-only files.
- Any route status code or error message change.

## 12. Read-Only API Verification Plan

Allowed read-only routes after server startup:

- `GET /api/health`
- `GET /api/project/autosave`
- `GET /api/project/recent`
- `GET /api/project/backups`

Forbidden in this phase:

- `POST /api/project/save`
- `POST /api/project/load`
- `POST /api/project/autosave`
- `POST /api/project/backups/:backupId/restore`

## 13. Verification Results

Static checks:

- `node --check server.js`: PASS
- `node --check desktop/main.js`: PASS
- `node --check desktop/preload.js`: PASS
- `node --check public/app.js`: PASS
- `npm.cmd run check`: PASS
- `git diff --check`: PASS

Read-only server/API checks:

- `GET /api/health`: PASS, returned `ok: true`, `app: Highlight Studio`, `version: 1.0.0`
- `GET /api/project/autosave`: PASS, returned `ok: true`, `autosave: null`
- `GET /api/project/recent`: PASS, returned `ok: true`, empty `recent` array
- `GET /api/project/backups`: PASS, returned `ok: true`, 10 backup summaries

No project-changing routes were called.

Process cleanup:

- Server was stopped after API checks.
- Port 4000 had no remaining LISTENING entry.
- No Electron process was found after checks.

User data integrity:

- `projects`: missing before and after
- root `backups`: missing before and after
- `data/backups`: 10 files, 26720 bytes before and after
- `uploads`: 1 file, 5 bytes before and after
- `outputs`: 13 files, 6027534 bytes before and after
- `data/templates.json`: hash unchanged
- `package.json`: hash unchanged
- `package-lock.json`: hash unchanged

Final expected git state for this survey:

- Only `docs/STRUCTURE_PHASE1_7_PROJECT_STORAGE_SURVEY_20260714.md` is untracked.
- No code files were modified.
