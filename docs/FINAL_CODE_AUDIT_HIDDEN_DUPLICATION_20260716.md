# Final Code Audit - Hidden Duplication and Dead Code Survey

Date: 2026-07-16

Project: Highlight Studio

Scope: read-only source audit plus this document. No source code, package file,
runtime data, upload, output, project, template, or Electron file was modified.

## 1. Baseline

| Item | Result |
| --- | --- |
| Current branch | main |
| Current HEAD observed | `f186e97 docs: finalize v1.0 release documentation` |
| Latest code commit in release notes | `c711379 fix: add idempotent shutdown manager` |
| Working tree before audit | clean |
| Runtime data mutation | none |

`f186e97` is a documentation-only commit above the latest code baseline. This
audit treats `c711379` as the latest code behavior baseline and `f186e97` as
the current repository HEAD.

## 2. Source Inventory

| Area | Files | Notes |
| --- | ---: | --- |
| `server.js` | 1 | Thin entrypoint, env loading, server start, shutdown export |
| `server/*.js` | 18 | Helpers, services, render queue, FFmpeg engine, bootstrap |
| `server/routes/*.js` | 11 | Route modules |
| `desktop/*.js` | 2 | Electron main and preload |
| `public/*` | 4 | Browser app, HTML, CSS, share thumbnail |

Measured active source sizes:

| File | Lines |
| --- | ---: |
| `server.js` | 90 |
| `server/bootstrap.js` | 504 |
| `desktop/main.js` | 534 |
| `desktop/preload.js` | 11 |
| `public/app.js` | 4146 |
| `public/index.html` | 606 |
| `public/styles.css` | 1668 |

## 3. Entrypoints and Module Graph

Main entrypoints:

- Browser/server mode: `npm start` -> `node server.js`
- Electron mode: `desktop/main.js` imports `server.js` and calls `startServer`.
- Browser UI: `public/index.html` loads `public/app.js`.

Server module graph:

- `server.js` imports `server/bootstrap.js` and `server/shutdown-manager.js`.
- `server/bootstrap.js` wires helpers, upload middleware, render queue, FFmpeg
  engine, render executor, legacy renderer, and route modules.
- Route modules are registered once from bootstrap and do not create Express apps.
- Render queue state lives in `server/render-job-store.js`.
- FFmpeg process lifecycle lives in `server/ffmpeg-engine.js`.

No circular require was found in the inspected wiring.

## 4. Registered Route Survey

Actual registered API and health routes observed in source:

| Method | Path | Owner | Classification |
| --- | --- | --- | --- |
| GET | `/health` | `server/bootstrap.js` | legacy/simple browser health |
| OPTIONS | `/api/ping` | `server/routes/system-routes.js` | Electron/browser ping |
| GET | `/api/ping` | `server/routes/system-routes.js` | Electron/browser ping |
| GET | `/api/health` | `server/routes/system-routes.js` | API health |
| POST | `/api/auth/login` | `server/routes/system-routes.js` | local auth |
| POST | `/api/auth/logout` | `server/bootstrap.js` | local auth |
| GET | `/api/license/status` | `server/routes/system-routes.js` | local license state |
| GET | `/api/update/check` | `server/routes/system-routes.js` | update metadata |
| POST | `/api/ai/analyze-photos` | `server/routes/ai-routes.js` | local AI rules |
| POST | `/api/ai/create-storyboard` | `server/routes/ai-routes.js` | local AI rules |
| GET | `/api/templates` | `server/routes/template-routes.js` | templates read |
| POST | `/api/templates` | `server/routes/template-routes.js` | templates write |
| PUT | `/api/templates/:templateId` | `server/routes/template-routes.js` | templates write |
| DELETE | `/api/templates/:templateId` | `server/routes/template-routes.js` | templates write |
| GET | `/api/project/recent` | `server/routes/project-read-routes.js` | project read |
| GET | `/api/project/autosave` | `server/routes/project-read-routes.js` | project read |
| GET | `/api/project/backups` | `server/routes/project-read-routes.js` | project read |
| POST | `/api/project/save` | `server/routes/project-save-routes.js` | project write |
| POST | `/api/project/autosave` | `server/routes/project-save-routes.js` | project write |
| POST | `/api/project/load` | `server/routes/project-load-routes.js` | project load/recent update |
| POST | `/api/project/backups/:backupId/restore` | `server/routes/project-load-routes.js` | restore |
| GET | `/api/render/encoders` | `server/routes/render-read-routes.js` | render read |
| GET | `/api/render/status/:jobId` | `server/routes/render-read-routes.js` | render read |
| GET | `/api/render/queue` | `server/routes/render-read-routes.js` | render read |
| POST | `/api/render` | `server/routes/render-write-routes.js` | queued render |
| POST | `/api/render/cancel/:jobId` | `server/routes/render-write-routes.js` | cancel |
| GET | `/api/outputs` | `server/routes/output-read-routes.js` | output read |
| GET | `/api/outputs/:filename/share-info` | `server/routes/output-read-routes.js` | output read |
| GET | `/api/outputs/:filename/download` | `server/routes/output-read-routes.js` | output read |
| POST | `/api/outputs/:filename/open` | `server/routes/output-read-routes.js` | local file open |
| PATCH | `/api/outputs/:filename` | `server/routes/output-write-routes.js` | output rename |
| DELETE | `/api/outputs/:filename` | `server/routes/output-write-routes.js` | output delete |
| POST | `/api/outputs/open-folder` | `server/bootstrap.js` | local folder open |
| POST | `/api/videos` | `server/routes/legacy-video-routes.js` | deprecated compatibility |

Route duplication result:

- No duplicate method/path registrations were found.
- `/health` and `/api/health` are similar but intentionally separate.
- `POST /api/videos` overlaps the render domain but is intentionally retained
  as deprecated compatibility.
- There is no active `/api/projects` route.
- There is no active `/api/system` route.
- There is no GET `/api/render`; render creation is POST-only.

## 5. Browser API Call Survey

`public/app.js` calls the registered routes directly. Important calls include:

- License/auth/update: `/api/license/status`, `/api/auth/login`,
  `/api/auth/logout`, `/api/update/check`.
- Outputs: `/api/outputs`, `/api/outputs/:filename`,
  `/api/outputs/:filename/open`, `/api/outputs/open-folder`.
- Render: `/api/render`, `/api/render/status/:jobId`,
  `/api/render/cancel/:jobId`, `/api/render/queue`, `/api/render/encoders`.
- Templates: `/api/templates`, `/api/templates/:templateId`.
- Projects: `/api/project/recent`, `/api/project/backups`,
  `/api/project/backups/:backupId/restore`, `/api/project/save`,
  `/api/project/autosave`, `/api/project/load`.
- AI: `/api/ai/analyze-photos`, `/api/ai/create-storyboard`.
- Health: `/health`.

No browser reference to removed or nonexistent `/api/projects` or `/api/system`
was found in `public/app.js`.

## 6. Exact Duplication Findings

No exact duplicate route modules or copied service modules were found. The
following exact-or-near duplicate helper names exist and are scoped separately:

| Finding | Location | Severity | Action |
| --- | --- | --- | --- |
| `safeName` exists in bootstrap and project helpers | `server/bootstrap.js`, `server/project-helpers.js` | Medium | Keep for v1.0; extract common naming helper only with filename regression tests |
| `makeId` exists in bootstrap and template helpers | `server/bootstrap.js`, `server/template-helpers.js` | Low | Keep for v1.0; optional common ID helper in v1.1 |
| `escapeHtml` exists in Electron main and browser app | `desktop/main.js`, `public/app.js` | Low | Accept; different runtimes, no shared bundle |
| upload cleanup loops recur in route/executor/shutdown paths | bootstrap, render route, legacy route, executor | Medium | Keep for v1.0 because lifecycle timing differs |
| JSON/error response try-catch patterns repeat across route modules | `server/routes/*.js` | Low | Optional v1.1 route response helper, not a release blocker |

## 7. Similar Duplication and Responsibility Overlap

| Area | Observation | Severity | v1.0 Action |
| --- | --- | --- | --- |
| Queued render vs legacy render | Both produce MP4 via FFmpeg and concat-like flows, but `/api/render` is queue/project based while `/api/videos` is synchronous compatibility | Medium | Keep separate |
| Cancel and shutdown | Single-job cancel route and `cancelAllRenderJobs` both mutate job cancellation state and kill active process | Medium | Keep; shutdown manager guards duplicate shutdown |
| Output naming | `safeOutputFileName` in bootstrap is shared by executor/output write/legacy dependencies | Low | Keep until common path helper phase |
| File opening | `openLocalPath` remains in bootstrap and is passed to output routes | Low | Keep; local-only shell boundary is centralized enough |
| Browser local AI and server AI | Browser does pixel analysis and local workflow orchestration; server AI routes normalize/rank payloads | Medium | Keep; browser owns interactive local analysis, server owns API fallback |
| Project recent state | Browser local recent list and server in-memory recent list both exist | Medium | Keep; different offline/browser vs server runtime responsibilities |

## 8. Render and Queue Audit

Render queue modules are cleanly separated:

- `server/render-job-store.js`: job map, queue array, active job ID, public views.
- `server/render-job-utils.js`: log, update, cleanup timer.
- `server/render-queue-operations.js`: enqueue/remove operations.
- `server/render-queue-controller.js`: `processRenderQueue`.
- `server/render-executor.js`: project/timeline render orchestration.
- `server/ffmpeg-engine.js`: FFmpeg process execution, encoder detection, encoder args.

No hidden second queue or second active job state was found. The only major
intentional overlap is cancellation:

- route cancel handles one job;
- shutdown cancel handles all non-terminal jobs;
- FFmpeg engine owns `job.currentProcess`.

This is a real responsibility overlap, but not dead code and not currently a
release blocker. It should remain unchanged for v1.0.

## 9. Storage and File API Audit

Storage responsibilities:

- uploads: Multer upload middleware and render/legacy cleanup.
- outputs: output helpers and output route modules.
- data/templates: template helpers.
- data/backups: project helpers and project route modules.
- Electron userData: desktop settings, logs, and Electron runtime data.

Potential duplication:

- path/name safety appears in several domains because output names, project
  names, upload display names, and template names have different rules.
- JSON read/write fallback appears in template/project areas.

No hidden output delete/download route duplication was found. No direct
filesystem mutation was executed during this audit.

## 10. Browser Code Audit

`public/app.js` remains a large single file. It contains:

- project serialization/restoration;
- local AI analysis and duplicate detection;
- timeline/storyboard editing;
- render queue polling;
- outputs management;
- templates management;
- desktop command handling.

This is active code, not dead code. The main maintainability concern is size
and mixed UI/domain responsibilities. It is suitable for v1.0 because it is
the known working surface. A v1.1 split into browser feature modules would be
reasonable after UI regression coverage is available.

## 11. Electron Code Audit

`desktop/main.js` owns:

- userData path and settings;
- splash window;
- internal server startup;
- main window;
- settings window;
- app menus;
- shutdown call into server.

Similar code:

- `escapeHtml` duplicates browser escaping but stays inside Electron-generated
  HTML.
- settings default paths overlap with server env path concerns, but Electron
  explicitly sets the environment before starting the internal server.

No dead Electron preload bridge was found. `desktop/preload.js` exposes
`window.highlightDesktop`, and `public/app.js` checks for desktop commands.

## 12. Unused Export and Import Candidates

These are cleanup candidates, not v1.0 blockers:

| Candidate | Evidence | Severity | Recommendation |
| --- | --- | --- | --- |
| `normalizeAiPhoto` imported by bootstrap | Imported from `ai-local-rules`, but externally unused by bootstrap; used internally by AI helper module | Low | Remove bootstrap import in a later tiny cleanup |
| `getPublicBaseUrl` imported by bootstrap | Imported from `output-helpers`, but used internally by `createShareInfo` | Low | Remove bootstrap import if confirmed by a cleanup diff |
| `safeTemplateName` imported by bootstrap | Imported from `template-helpers`, but route module only needs sanitize/read/write/getAll | Low | Remove bootstrap import in a later tiny cleanup |
| `normalizeAiPhoto` exported publicly | Useful for helper-level tests, but not currently consumed externally | Informational | Keep or document as test helper |
| `safeTemplateName` exported publicly | Used internally by template helper; export may be extra | Informational | Keep unless API of helper module is narrowed later |
| `getPublicBaseUrl` exported publicly | Used internally by output helper; export may be extra | Informational | Keep unless API of helper module is narrowed later |

Because this audit phase forbids source edits, no cleanup was performed.

## 13. Orphan File Candidates

No definite orphan runtime source file was found.

| File/Area | Finding | Action |
| --- | --- | --- |
| `public/share-thumbnail.svg` | Static share asset retained in public tree | Keep |
| `build/icon.ico` | Electron builder icon | Keep |
| `README_DEPLOY.md` | Deployment documentation | Keep |
| `docs/*.md` | Survey/release evidence | Keep |
| `dist/`, `.electron-cache/`, `.electron-builder-cache/` | build/cache artifacts | Generated; not part of source cleanup in this audit |
| `uploads/`, `outputs/` | runtime/user data areas | Do not delete in audit |

The `scripts` directory did not contain active files during this audit.

## 14. Legacy Compatibility Code

Keep for v1.0:

- `server/routes/legacy-video-routes.js`
- `server/legacy-video-renderer.js`
- `POST /api/videos`
- deprecated response metadata:
  - `deprecated: true`
  - `replacement: "/api/render"`
  - compatibility message

This is intentional compatibility code, not dead code.

## 15. Findings by Severity

### Critical

None found.

### High

None found.

### Medium

| ID | Finding | Recommendation |
| --- | --- | --- |
| M1 | Queued render and legacy renderer share similar FFmpeg/output cleanup concepts | Keep for v1.0; consolidate only after legacy policy decision |
| M2 | Cancel/shutdown cancellation state mutation overlaps | Keep for v1.0; test before further consolidation |
| M3 | Naming/path safety helpers are duplicated across domains | Keep for v1.0; extract common helper only with regression coverage |
| M4 | Browser app is monolithic and mixes UI/domain orchestration | Keep for v1.0; split by feature in v1.1 |
| M5 | Browser recent/project state and server recent/project state overlap | Keep; document as browser-local vs server session state |

### Low

| ID | Finding | Recommendation |
| --- | --- | --- |
| L1 | Unused bootstrap imports: `normalizeAiPhoto`, `getPublicBaseUrl`, `safeTemplateName` | Later no-risk cleanup |
| L2 | Extra helper exports beyond current consumers | Later API narrowing if desired |
| L3 | Repeated route try-catch/error JSON patterns | Optional route helper later |
| L4 | Duplicate `escapeHtml` in browser/Electron | Accept due separate runtimes |
| L5 | Duplicate `makeId` patterns | Optional common ID helper later |

### Informational

| ID | Finding | Recommendation |
| --- | --- | --- |
| I1 | `/health` and `/api/health` both exist | Keep for compatibility |
| I2 | `/api/videos` is deprecated but active | Keep for v1.0 |
| I3 | `server.js` exports compatibility helpers for Electron/tests | Keep |

## 16. v1.0 Fix Items

No mandatory v1.0 code fixes were identified by this audit.

Optional, non-blocking cleanup if desired before tagging:

1. Remove the three unused bootstrap destructured imports:
   `normalizeAiPhoto`, `getPublicBaseUrl`, `safeTemplateName`.
2. Do not remove their underlying functions or exports in the same change.
3. Run full static and disposable regression again if any cleanup is accepted.

## 17. v1.1 Backlog

Recommended after v1.0:

1. Split `public/app.js` into browser feature modules.
2. Add a common naming/ID helper only after output/project/template/upload
   filename fixtures are written.
3. Consider a route error helper for repeated JSON error responses.
4. Revisit legacy `/api/videos` removal only after an explicit external
   compatibility decision.
5. Add targeted cancellation/shutdown regression tests before modifying cancel
   responsibility boundaries.

## 18. Keep / Do Not Delete

Do not delete in v1.0:

- `POST /api/videos` and legacy renderer.
- `/health` and `/api/health`.
- render job store/queue utilities/controller split.
- `server.js` public exports used by Electron.
- `desktop/preload.js`.
- `uploads/`, `outputs/`, `data/`, `projects/`, and user runtime folders.
- release/stability/structure documentation.

## 19. Final Verdict

Verdict: **Conditional PASS**

Rationale:

- No critical or high-severity hidden duplication was found.
- No duplicate registered API route was found.
- No definite orphan runtime source file was found.
- Known overlap is intentional compatibility or low-risk maintainability debt.
- The only concrete cleanup candidates are unused imports/extra exports, which
  are not release blockers and should be handled in a separate tiny phase if
  desired.

Release impact:

- v1.0 can proceed from a code-structure perspective.
- Keep the documented Release Candidate caveat for any environment-specific
  manual checks that still require real-user confirmation.

## 20. Verification

Verification commands were run after document creation:

- `node --check server.js`
- `node --check server/bootstrap.js`
- `node --check desktop/main.js`
- `server/**/*.js` syntax check
- `npm.cmd run check`
- `git diff --check`
- `git status --short`

Results are recorded in the final task report.
