# Structure Phase 1-8 Project Helpers Extraction

Date: 2026-07-14

Baseline:

- Branch: `main`
- Baseline commit: `1824c6d refactor: extract upload file helpers`
- Existing untracked survey doc: `docs/STRUCTURE_PHASE1_7_PROJECT_STORAGE_SURVEY_20260714.md`
- `server.js` before extraction: 1310 lines

## 1. Pre-Change Survey

Target functions and locations before extraction:

| Function | Location | Calls | Notes |
| --- | ---: | --- | --- |
| `validateProjectDocument` | `server.js:448` | save/load/autosave/write backup/read backup | Does not reference module-scope project state. It mutates the input project object. |
| `projectFileName` | `server.js:471` | save route, `projectSummary` | Depends on `safeName`. |
| `projectBackupFileName` | `server.js:498` | `writeProjectBackup` | Depends on `safeName` and current timestamp. |
| `cleanupOldBackups` | `server.js:504` | `writeProjectBackup` | Deletes old backup files. Signature can move unchanged. |
| `listProjectBackups` | `server.js:539` | GET `/api/project/backups` | Reads `data/backups`; no write/delete side effect. |

`cleanupOldBackups` decision:

- Moved.
- Reason: it has no route dependency and no closure dependency on `writeProjectBackup`.
- It requires `BACKUP_DIR`, `fs`, `path`, and `process.env.HIGHLIGHT_BACKUP_LIMIT`.
- The new module computes `BACKUP_DIR` from `process.env.HIGHLIGHT_DATA_DIR` or root `data`, matching the current server rule.
- It was not executed against real backups during verification.

Excluded functions/state:

- `writeProjectBackup`: kept in `server.js` because it writes files and is route-adjacent.
- `rememberProject`: kept in `server.js` because it mutates `recentProjects`.
- `projectAutosave`: kept in `server.js` module scope.
- `recentProjects`: kept in `server.js` module scope.
- `readProjectBackup`: kept in `server.js` because backup restore logic was explicitly excluded.
- All `/api/project*` route handlers: kept in `server.js`.

## 2. Actual Change

Created:

- `server/project-helpers.js`

Moved to `server/project-helpers.js`:

- `validateProjectDocument`
- `projectFileName`
- `projectBackupFileName`
- `cleanupOldBackups`
- `listProjectBackups`

`server.js` now imports:

```js
const {
  validateProjectDocument,
  projectFileName,
  projectBackupFileName,
  cleanupOldBackups,
  listProjectBackups
} = require("./server/project-helpers");
```

No route handler, module-scope state, project response shape, backup path, backup naming rule, retention limit, or API message was intentionally changed.

## 3. Helper Comparison

Comparison method:

- Loaded the pre-change helper implementations from `git show HEAD:server.js`.
- Loaded the new `server/project-helpers.js` module.
- Used fixed sample inputs.
- Used a fixed Date during comparison for timestamp-producing helpers.
- Read current `data/backups` for `listProjectBackups`.
- Did not execute `cleanupOldBackups` against real backups.

Results:

```json
{
  "projectFileName": true,
  "validate": true,
  "backupList": true,
  "backupFileName": true,
  "errors": []
}
```

`cleanupOldBackups` verification:

- Static connection only.
- Not executed because the current signature operates on real `data/backups`.
- Running it would risk deleting user backups due retention behavior.

## 4. Project API Read Regression

Server started with `node server.js`.

Read-only API checks:

- `GET /api/health`: PASS
- `GET /api/project/autosave`: PASS, returned `autosave: null`
- `GET /api/project/recent`: PASS, returned empty recent array
- `GET /api/project/backups`: PASS, returned 10 backup summaries

`/api/project/backups` response hash after extraction:

```text
382fc831c872521875ac8bec56de81098af41f101c0c7a78d453518e45363a5c
```

State-changing project APIs were not called:

- `POST /api/project/save`
- `POST /api/project/load`
- `POST /api/project/autosave`
- `POST /api/project/backups/:backupId/restore`

## 5. Static Verification

- `node --check server.js`: PASS
- `node --check server/project-helpers.js`: PASS
- `npm.cmd run check`: PASS
- `git diff --check`: PASS, with CRLF notice for `server.js` only

## 6. User Data Integrity

Before and after manifests matched:

- `data/backups`: 10 files, 26720 bytes, all file hashes unchanged
- `uploads`: 1 file, 5 bytes, unchanged
- `outputs`: 13 files, 6027534 bytes, unchanged
- `data/templates.json`: unchanged
- `package.json`: unchanged
- `package-lock.json`: unchanged
- No `.hsp` file was created
- No backup file was created, removed, renamed, or restored

Process cleanup:

- Server stopped after tests.
- No Electron process remained.
- Port 4000 had no LISTENING entry after shutdown; only a transient `TIME_WAIT` connection was observed.

## 7. Line Count

- `server.js` before extraction: 1310 lines
- `server.js` after extraction: 1253 lines
- `server/project-helpers.js`: 84 lines

## 8. Next Grouped Split Candidate

Recommended next candidate:

- `readProjectBackup`
- possibly `writeProjectBackup`

Suggested module:

- Keep route handlers and state in `server.js`.
- Extend `server/project-helpers.js` only if the next phase explicitly accepts storage write helpers.

Risk:

- `readProjectBackup`: MEDIUM-HIGH because it combines path traversal guard, JSON parsing, and validation.
- `writeProjectBackup`: HIGH because it writes backup files and invokes cleanup.

Do not move yet without a dedicated write-path validation plan.
