# STRUCTURE PHASE 1-17 Project Load Routes

## 기준선

- 브랜치: main
- 기준 커밋: 0c7bc7f `refactor: extract project read routes`
- 작업 전 server.js 줄 수: 1084
- 작업 후 server.js 줄 수: 1074

## 이동 route

다음 route handler를 `server/routes/project-load-routes.js`로 이동했다.

- POST `/api/project/load`
- POST `/api/project/backups/:backupId/restore`

## 제외 route와 이유

- POST `/api/project/save`: backup 생성/정리와 recent 갱신이 함께 있어 제외
- POST `/api/project/autosave`: `projectAutosave` 재할당과 backup 생성/정리가 있어 제외
- `projectAutosave`: 이동하지 않음
- `recentProjects`: 이동하지 않음
- `rememberProject`: 기존 상태 변경 방식 보존을 위해 server.js에 유지
- `writeProjectBackup`: 파일 write/cleanup 포함이라 제외

## 전달 dependency

`registerProjectLoadRoutes(app, dependencies)`에 아래 dependency를 전달했다.

- `validateProjectDocument`
- `readProjectBackup`
- `rememberProject`

`projectFileName`은 실제 이동 대상 route에서 사용되지 않아 전달하지 않았다.

## load 처리 흐름

기존 흐름을 그대로 유지했다.

1. `req.body?.project || req.body`에서 project document 획득
2. `validateProjectDocument`
3. `rememberProject(project, "load")`
4. `{ ok: true, project, recent }` 응답
5. 오류 시 HTTP 400, `{ ok: false, error }`

load route는 파일을 직접 읽거나 쓰지 않는다. 다만 recent 메모리 상태를 변경한다.

## restore 처리 흐름

기존 흐름을 그대로 유지했다.

1. `req.params.backupId`
2. `readProjectBackup(backupId)`
3. backup 파일 path guard, read, JSON parse, validation
4. `rememberProject(project, "backup-restore")`
5. `{ ok: true, project, recent }` 응답
6. 오류 시 HTTP 400, `{ ok: false, error }`

restore route는 backup 파일을 읽지만 생성/삭제/수정하지 않는다. autosave 상태도 변경하지 않는다.

## 상태 변경 범위

- 변경됨: `recentProjects`
- 변경 안 됨: `projectAutosave`
- 파일 생성 안 됨: backup, `.hsp`, outputs, uploads
- 파일 삭제 안 됨

상태 변경은 기존 `rememberProject` 함수만 통해 수행한다.

## load API 전후 비교

프론트와 동일한 wrapper payload `{ project: data }` 기준으로 비교했다. 날짜와 recent id는 동적이므로 구조/상태/오류 메시지를 중심으로 확인했다.

| 시나리오 | before | after | 결과 |
| --- | --- | --- | --- |
| 정상 project document | 200, `{ ok, project, recent }` | 200, 동일 구조 | PASS |
| 최소 유효 document | 200, `{ ok, project, recent }` | 200, 동일 구조 | PASS |
| photos 누락 | 400, `사진 목록이 없는 프로젝트입니다.` | 400, 동일 | PASS |
| 잘못된 extension | 400, `.hsp 프로젝트 형식이 아닙니다.` | 400, 동일 | PASS |

load 후 `GET /api/project/recent`는 recent 2개가 최신순으로 들어오는 기존 동작을 유지했다.

## 임시 backup restore 전후 비교

실제 `data/backups`에서는 restore POST를 호출하지 않았다.

검증은 전용 임시 데이터 경로에서만 수행했다.

- 임시 경로: `E:\codex\highlight-studio.tmp\structure-phase1-17-data`
- 서버 실행: `HIGHLIGHT_DATA_DIR` 지정
- 임시 backup 파일:
  - `valid-backup.hsp.json`
  - `missing.hsp.json`은 생성하지 않음
  - `broken-json.hsp.json`
  - `invalid-project.hsp.json`

| 시나리오 | before | after | 결과 |
| --- | --- | --- | --- |
| 정상 backup restore | 200, restored project + recent | 200, 동일 구조 | PASS |
| 존재하지 않는 backup ID | 400, ENOENT 메시지 | 400, 동일 | PASS |
| path traversal ID | 400, `복원할 백업 파일을 찾을 수 없습니다.` | 400, 동일 | PASS |
| 손상된 JSON | 400, JSON parse 오류 | 400, 동일 | PASS |
| validation 실패 project | 400, `사진 목록이 없는 프로젝트입니다.` | 400, 동일 | PASS |

## recentProjects 비교

- load 후 recent 갱신: 유지
- restore 후 recent 갱신: 유지
- recent 배열 직접 전달 없음
- route module은 `rememberProject` dependency만 호출

## autosave 미변경 확인

- load 후 `GET /api/project/autosave`: `{ ok: true, autosave: null }`
- restore 후 `GET /api/project/autosave`: `{ ok: true, autosave: null }`

## 비대상 API 회귀

분리 후 다음 API를 확인했다.

- GET `/api/project/backups`: 200
- GET `/api/health`: 200
- GET `/api/templates`: 200
- GET `/api/outputs`: 200
- GET `/api/render/queue`: 200
- GET `/api/license/status`: 200

## 정적 검증

- `node --check server.js`: PASS
- `node --check server/routes/project-load-routes.js`: PASS
- `server/**/*.js node --check`: PASS
- `npm.cmd run check`: PASS
- `git diff --check`: PASS. server.js CRLF 안내만 확인됨.

## 실제 데이터 무결성

실제 사용자 데이터에는 쓰기 요청을 수행하지 않았다.

- 실제 `data/backups`: count 10, size 26720, hash/mtime 유지
- `uploads`: count 1, size 5
- `outputs`: count 13, size 6027534
- `data/templates.json`: hash `38FCBC0FBED94930A76E74A22B43B0D3B1E371668C918082BEBFF8E448614071`
- `package.json`: 변경 없음
- `package-lock.json`: 변경 없음
- `.hsp` 생성 없음

## 임시 데이터 정리

검증 종료 후 `E:\codex\highlight-studio.tmp\structure-phase1-17-data`를 삭제했다. 포트 4000은 LISTENING 없이 TIME_WAIT만 확인됐다.

## 다음 save/autosave 단계 위험 요소

남은 project write route는 backup 생성/정리와 직접 연결된다.

- POST `/api/project/save`
- POST `/api/project/autosave`

다음 단계에서는 반드시 전용 임시 `HIGHLIGHT_DATA_DIR`에서 backup write, cleanup, recent/autosave 상태를 비교해야 한다. 실제 `data/backups`에서는 POST 요청을 호출하지 않는다.
