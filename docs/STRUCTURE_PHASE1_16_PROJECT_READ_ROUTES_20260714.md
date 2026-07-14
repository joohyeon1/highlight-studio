# STRUCTURE PHASE 1-16 Project Read Routes

## 기준선

- 브랜치: main
- 기준 커밋: eeaffb0 `refactor: extract output write routes`
- 작업 전 server.js 줄 수: 1088
- 작업 후 server.js 줄 수: 1084
- 기존 미추적 문서: `docs/STRUCTURE_PHASE1_15_PROJECT_ROUTES_STATE_SURVEY_20260714.md`

## 조사 결과

project read route 3개는 상태를 변경하지 않는다.

- GET `/api/project/recent`: `recentProjects` 현재 배열 참조를 반환
- GET `/api/project/autosave`: `projectAutosave` 현재 값이 없으면 null, 있으면 summary/project/savedAt 반환
- GET `/api/project/backups`: `listProjectBackups()`로 backup summary 목록 반환

`projectAutosave`는 `let` 변수로 재할당되고, `recentProjects`는 배열 참조를 유지한 채 내부만 변경된다. 따라서 상태 객체 직접 전달은 피하고 accessor 함수만 전달했다.

## 이동 route

다음 route handler를 `server/routes/project-read-routes.js`로 이동했다.

- GET `/api/project/recent`
- GET `/api/project/autosave`
- GET `/api/project/backups`

## 제외 route와 이유

- POST `/api/project/save`: recent 변경과 backup 생성/정리가 있어 제외
- POST `/api/project/load`: recent 변경이 있어 제외
- POST `/api/project/autosave`: `projectAutosave` 재할당과 backup 생성이 있어 제외
- POST `/api/project/backups/:backupId/restore`: backup read와 recent 변경이 있어 제외
- `projectAutosave`, `recentProjects`: module-scope 상태 생명주기 보존을 위해 이동하지 않음
- `rememberProject`, `writeProjectBackup`, `readProjectBackup`: 상태 변경 및 파일 read/write와 결합되어 제외

## accessor 방식

server.js에 최소 accessor만 추가했다.

- `getRecentProjects = () => recentProjects`
- `getProjectAutosave = () => projectAutosave`

getter는 기본값을 추가하거나 배열/객체를 복사하지 않는다. 기존 route가 참조하던 현재 상태를 그대로 반환한다.

## 전달 dependency

`registerProjectReadRoutes(app, dependencies)`에 아래 dependency를 전달했다.

- `getRecentProjects`
- `getProjectAutosave`
- `listProjectBackups`

새 route module은 server.js를 require하지 않는다.

## 상태 생명주기 유지 확인

- `projectAutosave` 선언 및 재할당 위치는 유지했다.
- `recentProjects` 선언 및 `rememberProject` mutation 흐름은 유지했다.
- POST project route는 이동하지 않았다.
- 상태 store 객체를 새로 만들지 않았다.
- route module은 accessor로 조회만 한다.

## API 전후 비교

서버 재시작 직후 초기 상태에서 비교했다.

| route | before | after | 결과 |
| --- | --- | --- | --- |
| GET `/api/project/recent` | 200, hash `83ec6395c2adffe00bb3660d1fb81a4e5bd18455d8af54ed4f8efa0196808383`, `{"ok":true,"recent":[]}` | 200, 동일 hash, 동일 body | PASS |
| GET `/api/project/autosave` | 200, hash `b54f1fe28baadda026eab2d7851890562b547ce6993582c99454adf875ed4378`, `{"ok":true,"autosave":null}` | 200, 동일 hash, 동일 body | PASS |
| GET `/api/project/backups` | 200, hash `382fc831c872521875ac8bec56de81098af41f101c0c7a78d453518e45363a5c`, 10개 | 200, 동일 hash, 동일 count/order/body | PASS |

## 서버 재시작 초기 상태 비교

서버 재시작 후:

- recentProjects 초기 응답: 빈 배열 유지
- projectAutosave 초기 응답: null 유지
- backup 목록: count/order/hash 동일

POST project API는 호출하지 않았다.

## 비대상 API 회귀

분리 후 다음 API를 확인했다.

- GET `/api/health`: 200
- GET `/api/templates`: 200, hash 동일
- GET `/api/outputs`: 200, hash 동일
- GET `/api/render/queue`: 200, hash 동일
- GET `/api/license/status`: 200. 날짜 필드가 동적이라 status/구조 확인
- POST `/api/ai/analyze-photos`: 200, fixed payload hash 동일

## 정적 검증

- `node --check server.js`: PASS
- `node --check server/routes/project-read-routes.js`: PASS
- `server/**/*.js node --check`: PASS
- `npm.cmd run check`: PASS
- `git diff --check`: PASS. server.js CRLF 안내만 확인됨.

## 데이터 무결성

상태 변경 project API는 호출하지 않았다.

- `data/backups`: count 10, size 26720, hash/mtime 유지
- `uploads`: count 1, size 5
- `outputs`: count 13, size 6027534
- `data/templates.json`: hash `38FCBC0FBED94930A76E74A22B43B0D3B1E371668C918082BEBFF8E448614071`
- `package.json`: 변경 없음
- `package-lock.json`: 변경 없음
- `.hsp` 생성 없음
- autosave/recent 관련 파일 생성 없음

## 다음 project write route 단계 위험 요소

다음 단계는 write route를 한 번에 옮기기보다 아래 순서가 안전하다.

1. POST `/api/project/load`와 backup restore처럼 recent만 변경하거나 backup read만 수행하는 route를 별도 검토
2. POST `/api/project/save`와 POST `/api/project/autosave`는 임시 `HIGHLIGHT_DATA_DIR`에서 backup write/cleanup 전후 비교
3. `writeProjectBackup`/`readProjectBackup` 이동은 route 이동 후 별도 단계로 검토

write route 검증은 실제 `data/`가 아니라 전용 임시 데이터 경로에서 수행해야 한다.
