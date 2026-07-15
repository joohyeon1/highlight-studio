# STABILITY PHASE 5B - Disposable Final Release Regression

## Final Verdict

**Release Blocked**

This run removed many Phase 5 gaps by executing state-changing API, render, output, legacy, and Electron shutdown checks in a disposable environment.

Release is still blocked because not every required release criterion reached PASS:

- Browser UI file upload/render/cancel/download/delete workflows were not directly operated through visible UI controls.
- Node `Ctrl+C` / SIGINT could not be delivered by the current execution backend.
- Electron first reuse-server run showed disposable desktop userData worked, but server storage paths were inherited from the already-running server. A later standalone Electron run verified internal server startup and `before-quit` shutdown, but logged default server storage paths, so Electron disposable storage path isolation was not cleanly proven.

No code was modified.

## Git Baseline

| Item | Result |
| --- | --- |
| Branch | `main` |
| HEAD | `c7113793874f75c8a9238abb71084e796d1fc2cb` |
| Latest commit | `c711379 fix: add idempotent shutdown manager` |
| Initial status | only Phase 5 and Phase 5A docs untracked |
| Code changes | none |
| Commit | not performed |
| Push | not performed |

## Disposable Environment

Disposable root:

```text
C:\Users\김주현\AppData\Local\Temp\highlight-studio-release-regression-20260716
```

Subdirectories created:

- `uploads`
- `outputs`
- `data`
- `desktop-user-data`
- `fixtures`
- `logs`

Environment variables used for the direct server run:

- `HIGHLIGHT_UPLOAD_DIR=<disposable-root>\uploads`
- `HIGHLIGHT_OUTPUT_DIR=<disposable-root>\outputs`
- `HIGHLIGHT_DATA_DIR=<disposable-root>\data`
- `HIGHLIGHT_BACKUP_LIMIT=20`

Electron was also launched with:

- `HIGHLIGHT_DESKTOP_USER_DATA=<disposable-root>\desktop-user-data`

## Existing User Data - Before

| Root | Count | Size | Manifest Hash |
| --- | ---: | ---: | --- |
| `uploads` | 1 | 5 | `666FA7E742E39DCBB09E936B2348A94F5A752F00A371AFAB1535248D48334029` |
| `outputs` | 13 | 6027534 | `B6D70C2882985F54084BC507A9028E9F5E06685964CD0F5CA5A988D71AF59DFF` |
| `data` | 11 | 26757 | `E7352693B8FD8C27CA4ACC1B5C0604B8FAB5B45693883C8C9AAA1F66145680FC` |

Stable file hashes:

| File | SHA256 |
| --- | --- |
| `package.json` | `5849264501847F4A827CD568EDD748FB6BD884F9549613768E52232CE1D6F848` |
| `package-lock.json` | `F00887DD1379B9EFF83FAC71C1E0DFE6966E743ABB152879F5BFC13FC867DD2C` |
| `data/templates.json` | `38FCBC0FBED94930A76E74A22B43B0D3B1E371668C918082BEBFF8E448614071` |

## Test Fixtures

Created only under disposable `fixtures`.

| Fixture | Purpose | Result |
| --- | --- | --- |
| `__release_regression_20260716__photo1.png` | initial PNG fixture | FFmpeg rejected it as invalid/unusable |
| `__release_regression_20260716__photo2.png` | initial PNG fixture | not used after invalid fixture finding |
| `__release_regression_20260716__photo_valid.jpg` | PPM bytes uploaded as JPEG mimetype | FFmpeg accepted it; render and legacy tests passed |

The invalid PNG finding affected only disposable files.

## Static Verification

| Check | Result |
| --- | --- |
| `node --check server.js` | PASS |
| `node --check server/bootstrap.js` | PASS |
| `node --check desktop/main.js` | PASS |
| `server/**/*.js` syntax check | PASS |
| `npm.cmd run check` | PASS |
| `git diff --check` | PASS |

## Direct Server Startup

The direct server was started with disposable upload/output/data environment variables.

Startup log confirmed:

```text
Uploads: C:\Users\김주현\AppData\Local\Temp\highlight-studio-release-regression-20260716\uploads
Outputs: C:\Users\김주현\AppData\Local\Temp\highlight-studio-release-regression-20260716\outputs
```

Result: PASS

## API Route Results

| Method | Path | Result | Notes |
| --- | --- | --- | --- |
| GET | `/health` | PASS `200` | disposable server |
| GET | `/api/health` | PASS `200` | disposable server |
| GET | `/api/ping` | PASS `200` | disposable server |
| GET | `/api/templates` | PASS `200` | list route |
| GET | `/api/project/recent` | PASS `200` | initial read |
| GET | `/api/project/autosave` | PASS `200` | initial read |
| GET | `/api/project/backups` | PASS `200` | initial read |
| GET | `/api/render/encoders` | PASS `200` | CPU fallback observed |
| GET | `/api/render/queue` | PASS `200` | queue read |
| GET | `/api/outputs` | PASS `200` | disposable output list |
| POST | `/api/auth/login` | PASS `200` | fixed test account |
| POST | `/api/auth/logout` | PASS `200` | no persisted session file |
| POST | `/api/ai/analyze-photos` | PASS `200` | fixed JSON payload |
| POST | `/api/ai/create-storyboard` | PASS `200` | fixed JSON payload |

Excluded by design:

- `/api/projects`
- `/api/system`
- `GET /api/render`

These are not actual current routes.

## Template Mutation Results

Disposable `HIGHLIGHT_DATA_DIR` only.

| Operation | Result |
| --- | --- |
| `POST /api/templates` | PASS `201` |
| `PUT /api/templates/:id` | PASS `200` |
| `DELETE /api/templates/:id` | PASS `200` |

Default `data/templates.json` hash remained unchanged after cleanup.

## Project Save / Load / Autosave Results

Disposable `HIGHLIGHT_DATA_DIR` only.

| Operation | Result |
| --- | --- |
| `POST /api/project/save` | PASS `200` |
| `POST /api/project/load` | PASS `200` |
| `POST /api/project/autosave` | PASS `200` |
| `GET /api/project/backups` after save/autosave | PASS `200`, 2 backups |
| `POST /api/project/backups/:backupId/restore` | PASS `200` |

Created backups were under disposable `data/backups` and removed with disposable root.

## Render Cancel Results

Disposable upload/data paths only.

| Operation | Result | Notes |
| --- | --- | --- |
| `POST /api/render` cancel job | PASS `202` | job id returned |
| `POST /api/render/cancel/:jobId` | PASS `200` | status became `canceled` |
| `GET /api/render/status/:jobId` | PASS | canceled job visible |
| `GET /api/render/queue` after cancel | PASS | no active queued job after terminal state |

Observed canceled job:

- status: `canceled`
- error: `렌더링이 취소되었습니다.`

## Render Complete Results

First completion attempt with invalid PNG fixture failed as expected due fixture quality:

- status: `failed`
- error: `처리 가능한 사진이 없습니다. 손상된 사진 또는 지원하지 않는 이미지 파일을 확인해 주세요.`

Second completion attempt with valid disposable fixture:

| Operation | Result |
| --- | --- |
| `POST /api/render` | PASS `202` |
| status polling | PASS `completed` |
| output file | `__release_regression_20260716__complete_valid.mp4` |
| output download | PASS `200`, 2342 bytes |
| output share-info | PASS `200` |
| output rename | PASS `200` |
| output delete | PASS `200` |

The generated output existed only in disposable `outputs` and was deleted during the test.

## Outputs Results

| Operation | Result |
| --- | --- |
| `GET /api/outputs` before output | PASS `200`, count 0 |
| `GET /api/outputs/:filename/share-info` | PASS `200` |
| `GET /api/outputs/:filename/download` | PASS `200` |
| `PATCH /api/outputs/:filename` | PASS `200` |
| `DELETE /api/outputs/:filename` | PASS `200` |
| `GET /api/outputs` final | PASS `200`, count 0 |

No existing user output was renamed or deleted.

## Legacy `/api/videos` Results

Disposable upload/output paths only.

| Operation | Result |
| --- | --- |
| `POST /api/videos` | PASS `201` |
| deprecated metadata | PASS `deprecated=true` |
| replacement metadata | PASS `replacement=/api/render` |
| legacy output | `__release_regression_20260716__legacy_valid-mrmfpswd.mp4` |
| cleanup of legacy output | PASS `DELETE 200` |

The generated legacy output existed only under disposable `outputs`.

## Browser UI Results

In-app browser was connected to:

```text
http://127.0.0.1:4000/
```

Observed:

- page title: `Highlight Studio`
- app text includes `Highlight Studio`
- upload text present
- template text present
- render text present
- output text present
- major controls present, including:
  - 새 프로젝트
  - 프로젝트 열기
  - 프로젝트 저장
  - AI 분석
  - AI 원클릭 제작
  - MP4 생성
  - 취소
  - 새로고침
  - 파일 열기
  - 링크 복사
- file inputs present:
  - `projectInput`
  - `photoInput`
  - `bgmInput`
- console errors: `0`

Result:

- Browser load and major UI presence: PASS
- Console Error 0: PASS
- Direct visible UI upload/render/cancel/download/delete operation: NOT TESTED

Reason:

- Available browser API did not expose a safe file chooser / set-input-files workflow in this runtime.
- API-level upload/render/output flows were verified separately.

## Electron Results

### Reuse-server Electron run

Disposable userData was applied and app log showed:

```text
Highlight Studio desktop 1.0.0 starting
Protocol registered: highlightstudio://open
Reusing existing Highlight Studio server: http://127.0.0.1:4000
Highlight Studio desktop quitting
```

Result:

- Electron startup: PASS
- visible window close via `WM_CLOSE`: PASS
- Electron process exit: PASS
- before-quit log: PASS
- server close: NOT APPLICABLE because Electron reused existing server

### Standalone Electron run

After stopping the direct server, Electron started its own server.

Console output:

```text
Highlight Studio listening: http://localhost:4000
Local bind: 127.0.0.1:4000
Render engine auto: CPU (libx264)
GPU encoders: none - CPU fallback
Highlight Studio shutdown started: electron-before-quit
Highlight Studio shutdown completed
```

App log:

```text
Highlight Studio desktop 1.0.0 starting
Protocol registered: highlightstudio://open
Internal Express server started: http://127.0.0.1:4000
Highlight Studio desktop quitting
```

Result:

- Electron standalone startup: PASS
- internal server auto start: PASS
- BrowserWindow close via `WM_CLOSE`: PASS
- `before-quit`: PASS
- shutdown manager call: PASS
- HTTP server close completion log: PASS
- Electron process exit: PASS
- port 4000 LISTENING removed: PASS

Concern:

- The standalone Electron server startup log showed default project upload/output paths, not the disposable upload/output paths. No upload/render was executed in that Electron run, so user data was not changed, but Electron disposable storage path isolation was not fully proven.

## Node Shutdown Results

| Scenario | Result | Notes |
| --- | --- | --- |
| `Ctrl+C` / SIGINT | BLOCKED | current exec backend did not support interrupt delivery |
| SIGTERM | NOT TESTED | no reliable Windows-safe signal path used |
| duplicate shutdown | PASS | module stub returned same Promise and called cancel/close once |

Duplicate shutdown stub result:

```json
{"samePromise":true,"cancelCount":1,"closeCount":1,"isShuttingDown":true}
```

## Port and Process Cleanup

After tests:

- port 4000: no `LISTENING`, only temporary `TIME_WAIT`
- Electron process: none
- FFmpeg process: none
- direct server process: stopped

Result: PASS

## Disposable Cleanup

Disposable root:

```text
C:\Users\김주현\AppData\Local\Temp\highlight-studio-release-regression-20260716
```

Cleanup result:

```text
DISPOSABLE_ROOT_REMOVED
DISPOSABLE_ROOT_REMOVED_CONFIRMED
```

Result: PASS

## Existing User Data - After

| Root | Count | Size | Manifest Hash |
| --- | ---: | ---: | --- |
| `uploads` | 1 | 5 | `666FA7E742E39DCBB09E936B2348A94F5A752F00A371AFAB1535248D48334029` |
| `outputs` | 13 | 6027534 | `B6D70C2882985F54084BC507A9028E9F5E06685964CD0F5CA5A988D71AF59DFF` |
| `data` | 11 | 26757 | `E7352693B8FD8C27CA4ACC1B5C0604B8FAB5B45693883C8C9AAA1F66145680FC` |

Stable file hashes after:

| File | SHA256 |
| --- | --- |
| `package.json` | `5849264501847F4A827CD568EDD748FB6BD884F9549613768E52232CE1D6F848` |
| `package-lock.json` | `F00887DD1379B9EFF83FAC71C1E0DFE6966E743ABB152879F5BFC13FC867DD2C` |
| `data/templates.json` | `38FCBC0FBED94930A76E74A22B43B0D3B1E371668C918082BEBFF8E448614071` |

Existing user data unchanged: PASS

## PASS / FAIL / BLOCKED / NOT TESTED Summary

| Area | PASS | FAIL | BLOCKED | NOT TESTED |
| --- | ---: | ---: | ---: | ---: |
| Static checks | 6 | 0 | 0 | 0 |
| API read/system | 14 | 0 | 0 | 0 |
| Templates | 3 | 0 | 0 | 0 |
| Project | 5 | 0 | 0 | 0 |
| Render/Queue | 8 | 0 | 0 | 0 |
| Outputs | 6 | 0 | 0 | 0 |
| Legacy `/api/videos` | 4 | 0 | 0 | 0 |
| Browser UI | 2 | 0 | 0 | 1 |
| Electron | 9 | 0 | 0 | 0 |
| Node shutdown | 1 | 0 | 1 | 1 |
| Data integrity/cleanup | 4 | 0 | 0 | 0 |

## Remaining Risks

1. Browser UI file chooser and visual upload/render workflows were not directly exercised.
2. Node SIGINT/SIGTERM shutdown could not be proven in this execution backend.
3. Electron standalone startup did not show disposable upload/output paths, although no state-changing Electron workflow was run and existing data remained unchanged.
4. Initial invalid PNG fixture caused one disposable failed render job; a later valid fixture completed successfully.

## Final Git State Expected

Expected untracked docs only:

- `docs/STABILITY_PHASE5_FINAL_RELEASE_REGRESSION_20260716.md`
- `docs/STABILITY_PHASE5A_RELEASE_REGRESSION_GAP_SURVEY_20260716.md`
- `docs/STABILITY_PHASE5B_DISPOSABLE_FINAL_RELEASE_REGRESSION_20260716.md`

No source file changes are expected.

## Final Release Decision

**Release Blocked**

This is no longer blocked by core API/render/legacy/output regression coverage. Those disposable checks passed.

The remaining release blockers are verification gaps:

- direct Browser UI upload/render workflow not tested,
- Node SIGINT/SIGTERM not tested,
- Electron disposable storage path isolation not fully proven in standalone mode.

No code fix is currently required based on the observed API/render regression results.
