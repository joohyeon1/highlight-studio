# STRUCTURE PHASE 1-12 Template Routes

## 기준선

- 브랜치: main
- 기준 커밋: 1f50258 `refactor: extract ai routes`
- 작업 전 git status: clean
- 작업 전 server.js 줄 수: 1176
- 작업 후 server.js 줄 수: 1145

## 조사 결과

server.js의 템플릿 route는 사용자 템플릿 CRUD와 기본 템플릿 조회/보호만 담당하고 있었다.

- GET `/api/templates`
- POST `/api/templates`
- PUT `/api/templates/:templateId`
- DELETE `/api/templates/:templateId`

실제 구현은 PATCH가 아니라 PUT을 사용하고 있었으므로 기존 method를 유지했다.

## 이동한 route

다음 route handler를 `server/routes/template-routes.js`로 이동했다.

- GET `/api/templates`
- POST `/api/templates`
- PUT `/api/templates/:templateId`
- DELETE `/api/templates/:templateId`

server.js에는 `registerTemplateRoutes(app, dependencies)` 호출만 남겼다.

## 제외 route

없음. 템플릿 관련 CRUD route 전체가 동일한 helper 집합에만 의존했고, project/render/output/upload 영역과 강하게 결합되어 있지 않았다.

## 전달 dependency

`server/routes/template-routes.js`는 server.js를 역참조하지 않고, 아래 dependency만 주입받는다.

- `DEFAULT_TEMPLATES`
- `getAllTemplates`
- `readUserTemplates`
- `writeUserTemplates`
- `sanitizeTemplatePayload`

기존 helper 구현은 변경하지 않았다.

## route 순서 영향

기존 GET `/api/templates`는 AI route 다음, project route 전에 있었다. 분리 후 템플릿 route 묶음은 project backup restore route 다음에 등록된다.

경로가 `/api/project/*`, `/api/templates`, `/api/templates/:templateId`로 서로 충돌하지 않아 동작 영향은 없다.

## request/response 구조

기존 handler 본문을 그대로 이동했다.

- GET: `{ ok: true, templates }`
- POST 성공: HTTP 201, `{ ok: true, template }`
- POST 실패: HTTP 400, `{ ok: false, error }`
- PUT 기본 템플릿: HTTP 403, `{ ok: false, error: "기본 템플릿은 수정할 수 없습니다." }`
- PUT 누락 ID: HTTP 404, `{ ok: false, error: "수정할 템플릿을 찾을 수 없습니다." }`
- DELETE 기본 템플릿: HTTP 403, `{ ok: false, error: "기본 템플릿은 삭제할 수 없습니다." }`
- DELETE 누락 ID: HTTP 404, `{ ok: false, error: "삭제할 템플릿을 찾을 수 없습니다." }`
- DELETE 성공: `{ ok: true, templateId }`

## API 전후 비교

### 실제 데이터 읽기

실제 `data/templates.json`는 수정하지 않고 GET만 비교했다.

- GET `/api/templates` before: HTTP 200, count 6, hash `96bee505115fd1f78ab66db2529ad96ce08c6986205754869dc2f47405054d48`
- GET `/api/templates` after: HTTP 200, count 6, hash `96bee505115fd1f78ab66db2529ad96ce08c6986205754869dc2f47405054d48`
- 기본 템플릿 순서 동일:
  - `default-basic`
  - `default-emotional`
  - `default-sports`
  - `default-competition`
  - `default-promotion`
  - `default-graduation`

### 임시 데이터 쓰기 비교

상태 변경 API는 실제 `data/`가 아니라 전용 임시 환경에서만 검증했다.

- 임시 경로: `E:\codex\highlight-studio.tmp\structure-phase1-12-data`
- 실행 방식: 서버 시작 전 `HIGHLIGHT_DATA_DIR` 지정
- 테스트 종료 후 임시 경로 삭제

| 항목 | before | after | 결과 |
| --- | --- | --- | --- |
| initial GET hash | `96bee505115fd1f78ab66db2529ad96ce08c6986205754869dc2f47405054d48` | `96bee505115fd1f78ab66db2529ad96ce08c6986205754869dc2f47405054d48` | 동일 |
| POST status | 201 | 201 | 동일 |
| POST normalized hash | `f68e71cfa5ac2c3ff1764e66fa91d65b52d7d392f342821e2609796b2de20817` | `f68e71cfa5ac2c3ff1764e66fa91d65b52d7d392f342821e2609796b2de20817` | 동일 |
| after POST normalized hash | `e980ca6de39ba88bc2714f523260a8e1ac9b48ea2bd55e9b7fdceeb15939559c` | `e980ca6de39ba88bc2714f523260a8e1ac9b48ea2bd55e9b7fdceeb15939559c` | 동일 |
| PUT user normalized hash | `62466234788846eb55678ee655e6b789a5b1a9807c69cb8772fc236cdff65cf8` | `62466234788846eb55678ee655e6b789a5b1a9807c69cb8772fc236cdff65cf8` | 동일 |
| PUT default status/hash | 403 / `1958163c1f6fba64d86689e5ffecd364a0b297847f53af29409b2e626d01c7ab` | 403 / `1958163c1f6fba64d86689e5ffecd364a0b297847f53af29409b2e626d01c7ab` | 동일 |
| DELETE default status/hash | 403 / `326c343150f8853fd16d947a2e558ad3841065aaa8836a194868e8a0f22a12d5` | 403 / `326c343150f8853fd16d947a2e558ad3841065aaa8836a194868e8a0f22a12d5` | 동일 |
| final GET hash | `96bee505115fd1f78ab66db2529ad96ce08c6986205754869dc2f47405054d48` | `96bee505115fd1f78ab66db2529ad96ce08c6986205754869dc2f47405054d48` | 동일 |

템플릿 ID와 timestamp는 기존 구현상 동적으로 생성되므로 normalized hash로 비교했다.

## 기본 템플릿 보호 검증

임시 환경에서 기본 템플릿 수정/삭제 보호가 유지됨을 확인했다.

- PUT `/api/templates/default-basic`: HTTP 403, `기본 템플릿은 수정할 수 없습니다.`
- DELETE `/api/templates/default-basic`: HTTP 403, `기본 템플릿은 삭제할 수 없습니다.`

## 비대상 API 회귀

분리 후 읽기/무상태 회귀를 확인했다.

- GET `/api/health`: 200
- POST `/api/ai/analyze-photos`: 200
- GET `/api/outputs`: 200
- GET `/api/project/autosave`: 200
- GET `/api/render/queue`: 200
- GET `/api/license/status`: 200

## 정적 검증

- `node --check server.js`: PASS
- `node --check server/routes/template-routes.js`: PASS
- `server/**/*.js node --check`: PASS
- `npm.cmd run check`: PASS
- `git diff --check`: PASS. server.js CRLF 안내만 확인됨.

## 사용자 데이터 무결성

실제 사용자 데이터에는 쓰기 요청을 수행하지 않았다.

- 실제 `data/templates.json`: 변경 없음
- uploads: 변경 없음
- outputs: 변경 없음
- data/backups: 변경 없음
- package.json: 변경 없음
- package-lock.json: 변경 없음
- `.hsp` 생성 없음
- 임시 `HIGHLIGHT_DATA_DIR`: 테스트 후 삭제 완료

## 다음 route 묶음 후보

다음 단계 후보는 outputs route 묶음이다. 이미 output helper가 분리되어 있어 route module화가 가능하지만, 파일 열기/다운로드/삭제/이름 변경이 포함되어 있으므로 읽기 route와 상태 변경 route를 분리해서 검증하는 것이 안전하다.
