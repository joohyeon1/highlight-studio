# STRUCTURE PHASE 1-15 Project Routes and State Survey

## 기준선

- 브랜치: main
- 기준 커밋: eeaffb0 `refactor: extract output write routes`
- 작업 전 git status: clean
- server.js 줄 수: 1088
- 코드 수정: 없음

## project route 전체 목록

| method | path | 위치 | 상태 변경 | 파일 변경 | 요약 |
| --- | --- | ---: | --- | --- | --- |
| POST | `/api/project/save` | server.js:915 | `recentProjects` 변경 | backup 생성/정리 | 프로젝트 검증, recent 갱신, backup 생성, `.hsp` 저장 준비 응답 |
| POST | `/api/project/load` | server.js:933 | `recentProjects` 변경 | 없음 | 브라우저가 전달한 프로젝트를 검증하고 recent 갱신 |
| GET | `/api/project/recent` | server.js:943 | 없음 | 없음 | 메모리 recent 목록 반환 |
| POST | `/api/project/autosave` | server.js:947 | `projectAutosave` 재할당 | backup 생성/정리 | autosave 메모리 갱신, backup 생성 |
| GET | `/api/project/autosave` | server.js:962 | 없음 | 없음 | 메모리 autosave 반환 |
| GET | `/api/project/backups` | server.js:967 | 없음 | backup 파일 읽기 | backup summary 목록 반환 |
| POST | `/api/project/backups/:backupId/restore` | server.js:975 | `recentProjects` 변경 | backup 파일 읽기 | backup 파일 읽기, 프로젝트 검증, recent 갱신 |

추가 project route는 발견되지 않았다. public/app.js는 위 7개 route만 호출한다.

## projectAutosave 생명주기

- 초기값: `let projectAutosave = null`
- 쓰기 위치: `POST /api/project/autosave`
- 읽기 위치: `GET /api/project/autosave`
- reset 위치: 없음. 서버 프로세스 재시작 시 초기화된다.
- 저장 방식: 메모리 전용. 파일 autosave 저장은 없음.
- 객체 직접 수정 여부: route에서 새 객체를 만들어 `projectAutosave = { project, savedAt, summary }`로 재할당한다.
- route response 참조 방식:
  - POST autosave: `projectAutosave.summary`
  - GET autosave: `projectAutosave.summary`, `projectAutosave.project`, `projectAutosave.savedAt`

`projectAutosave`는 재할당되는 변수이므로 route module로 이동할 때 primitive/object 값을 한 번 전달하면 stale reference 위험이 있다.

## recentProjects 생명주기

- 초기값: `const recentProjects = []`
- 쓰기 위치:
  - `rememberProject(project, "save")`
  - `rememberProject(project, "load")`
  - `rememberProject(project, "backup-restore")`
- 읽기 위치: `GET /api/project/recent`
- 갱신 방식:
  - `projectSummary` 생성
  - `name|fileName` 기준 중복 검색
  - 중복이 있으면 `splice`
  - `unshift`
  - `splice(10)`로 최대 10개 유지
- 정렬 방식: 최신 항목이 앞에 오도록 `unshift`
- 서버 재시작 동작: 메모리 전용이라 초기화된다.
- 객체 직접 수정 여부: 배열 참조는 유지하고 내부만 `splice/unshift`로 변경한다.

`recentProjects`는 배열 참조 유지 방식이므로 state 객체로 감싸는 것은 가능하지만, route module이 배열을 직접 mutate하게 되면 상태 소유권이 흐려진다.

## route별 상태/파일 의존성

| route | 읽는 상태 | 변경 상태 | 호출 helper | 파일 read/write | 응답 구조 | 위험도 |
| --- | --- | --- | --- | --- | --- | --- |
| POST `/api/project/save` | 없음 | recent | `validateProjectDocument`, `rememberProject`, `writeProjectBackup`, `projectFileName` | backup write, cleanup delete 가능 | `{ ok, fileName, project, recent, backup, message }` | HIGH |
| POST `/api/project/load` | 없음 | recent | `validateProjectDocument`, `rememberProject` | 없음 | `{ ok, project, recent }` | MEDIUM |
| GET `/api/project/recent` | recent | 없음 | 없음 | 없음 | `{ ok, recent }` | LOW |
| POST `/api/project/autosave` | 없음 | autosave | `validateProjectDocument`, `projectSummary`, `writeProjectBackup` | backup write, cleanup delete 가능 | `{ ok, autosave, backup }` | HIGH |
| GET `/api/project/autosave` | autosave | 없음 | 없음 | 없음 | `{ ok, autosave }` 또는 `{ ok, autosave, project, savedAt }` | LOW |
| GET `/api/project/backups` | 없음 | 없음 | `listProjectBackups` | backup read | `{ ok, backups }` | LOW-MEDIUM |
| POST `/api/project/backups/:backupId/restore` | 없음 | recent | `readProjectBackup`, `rememberProject` | backup read | `{ ok, project, recent }` | HIGH |

## backup 처리 흐름

### save

`POST /api/project/save`

1. request project 검증: `validateProjectDocument`
2. recent 갱신: `rememberProject(project, "save")`
3. backup 생성: `writeProjectBackup(project, "save")`
4. 파일명 생성: `projectFileName(project, req.body?.fileName)`
5. 응답: `.hsp` 저장 준비 metadata

### autosave

`POST /api/project/autosave`

1. request project 검증: `validateProjectDocument`
2. `projectAutosave` 재할당
3. backup 생성: `writeProjectBackup(project, "autosave")`
4. 응답: autosave summary와 backup

### backup list

`GET /api/project/backups`

1. `listProjectBackups()` 호출
2. `data/backups`에서 `.hsp.json` 읽기
3. backup summary 반환

### backup restore

`POST /api/project/backups/:backupId/restore`

1. backup ID path guard: `readProjectBackup`
2. backup JSON read
3. project 검증: `validateProjectDocument`
4. recent 갱신: `rememberProject(project, "backup-restore")`
5. 응답: restored project와 recent summary

## dependency injection 대안 비교

### A. 상태 객체 직접 전달

예: `registerProjectRoutes(app, { state: { projectAutosave, recentProjects } })`

- 장점: 코드량이 적다.
- 문제: `projectAutosave`가 재할당되므로 route module이 받은 값이 stale reference가 된다.
- 판정: 비추천.

### B. 상태 접근 함수 전달

예: `getProjectAutosave`, `setProjectAutosave`, `getRecentProjects`, `rememberProject`

- 장점: 재할당과 배열 mutation을 server.js가 계속 소유할 수 있다.
- 장점: 기존 상태 생명주기를 보존하면서 read route만 먼저 이동 가능하다.
- 단점: dependency 목록이 늘어난다.
- 판정: 다음 실제 분리 단계의 추천 방식.

### C. state store 객체 생성

예: `const projectState = { autosave: null, recentProjects: [] }`

- 장점: 상태 소유권이 명확해진다.
- 문제: 기존 module-scope 상태 구조 변경이 필요하고 초기화/테스트 영향이 커진다.
- 판정: 별도 상태 정리 단계 전까지 보류.

### D. server.js 상태 유지, handler factory만 생성

- 장점: 상태 이동 없이 route handler만 분리 가능하다.
- 문제: closure factory가 많아지고 dependency가 복잡해질 수 있다.
- 판정: B 방식과 결합하면 read route에는 유효하나 write route 전체 이동에는 아직 위험하다.

## 추천 상태 전달 방식

다음 단계에서는 B 방식, 즉 상태 접근 함수 전달을 추천한다.

- `getRecentProjects: () => recentProjects`
- `getProjectAutosave: () => projectAutosave`
- `listProjectBackups`

처음에는 read route만 이동하면 `setProjectAutosave`와 `rememberProject`를 전달하지 않아도 된다. write route는 이후 별도 단계에서 다룬다.

## 다음 실제 분리 범위

추천: A. GET read routes만 먼저 분리.

이동 대상:

- GET `/api/project/recent`
- GET `/api/project/autosave`
- GET `/api/project/backups`

생성 모듈명:

- `server/routes/project-read-routes.js`

상태 전달 방식:

- accessor 함수 전달

예상 dependency:

- `getRecentProjects`
- `getProjectAutosave`
- `listProjectBackups`

함수 시그니처 변경 여부:

- route response와 helper 시그니처 변경 없음
- server.js에 아주 얇은 getter 함수 또는 inline dependency 함수가 필요할 수 있음

예상 server.js 감소:

- 약 15-20줄

위험도:

- LOW-MEDIUM. `GET /api/project/backups`는 파일 read가 있으나 상태 변경은 없다.

## 제외 범위와 이유

- POST `/api/project/save`: recent 변경과 backup 생성/정리가 함께 있어 HIGH.
- POST `/api/project/load`: recent 변경이 있어 read route 단계에서 제외.
- POST `/api/project/autosave`: autosave 재할당과 backup 생성이 있어 HIGH.
- POST `/api/project/backups/:backupId/restore`: backup read와 recent 변경이 있어 HIGH.
- `projectAutosave`, `recentProjects` 상태 store 이동: 기존 생명주기 변경 위험.
- `writeProjectBackup`, `readProjectBackup` 이동: 파일 write/read와 validation 결합이 있어 별도 단계 필요.

## 임시 write-path 검증 계획

다음 write route 분리 전에는 실제 `data/`가 아니라 전용 임시 환경을 사용해야 한다.

- 임시 경로: `E:\codex\highlight-studio.tmp\structure-phase-project-data`
- 서버 실행 전 `HIGHLIGHT_DATA_DIR` 지정
- 빈 `data/backups` 생성
- 고정 project JSON 사용
- `POST /api/project/save`
- `POST /api/project/load`
- `POST /api/project/autosave`
- `GET /api/project/autosave`
- `GET /api/project/recent`
- `GET /api/project/backups`
- `POST /api/project/backups/:backupId/restore`

비교 방식:

- ID/timestamp/date 필드는 normalized 비교
- backup 파일명 timestamp는 패턴 비교
- backup 파일 내용은 normalized hash 비교
- before/after 서버는 별도 프로세스로 실행
- 테스트 종료 후 임시 폴더 전체 삭제

이번 단계에서는 POST route를 호출하지 않았다.

## 발견된 중복

- project validation과 `modifiedAt` 갱신이 여러 write 흐름의 전제다.
- recent entry payload 생성은 `projectSummary`로 통합되어 있다.
- backup entry payload 생성은 `writeProjectBackup`과 `listProjectBackups`에 각각 존재한다.
- `{ ok: false, error }` 응답 패턴이 project route 전체에서 반복된다.
- backup lookup/path guard는 `readProjectBackup`에 집중되어 있으나 route error message wrapper가 별도다.
- timestamp 생성이 `projectSummary`, `writeProjectBackup`, `projectBackupFileName`, `validateProjectDocument`에 흩어져 있다.

이번 단계에서는 중복 제거를 하지 않았다.

## 정적 검증

- `node --check server.js`: PASS
- `server/**/*.js node --check`: PASS
- `node --check desktop/main.js`: PASS
- `node --check desktop/preload.js`: PASS
- `node --check public/app.js`: PASS
- `npm.cmd run check`: PASS
- `git diff --check`: PASS

## 읽기 API 검증

상태 변경 API는 호출하지 않았다.

- GET `/api/health`: 200
- GET `/api/project/recent`: 200
- GET `/api/project/autosave`: 200
- GET `/api/project/backups`: 200
- GET `/api/outputs`: 200
- GET `/api/render/queue`: 200

## 사용자 데이터 무결성

조사 후 실제 사용자 데이터 변경은 없었다.

- `data/backups`: 기존 10개 파일 유지
- `data/templates.json`: hash `38FCBC0FBED94930A76E74A22B43B0D3B1E371668C918082BEBFF8E448614071`
- `uploads`: count 1, size 5
- `outputs`: count 13, size 6027534
- `package.json`: 변경 없음
- `package-lock.json`: 변경 없음
- `.hsp` 생성 없음

## 위험도와 rollback 기준

다음 단계 read route 분리 rollback 기준:

- GET `/api/project/recent` response hash 또는 구조 변경
- GET `/api/project/autosave` null/project 포함 조건 변경
- GET `/api/project/backups` count/order/field 변경
- backup 파일 read 중 오류 메시지/status 변경
- 실제 `data/backups` mtime/hash 변경

위 기준 중 하나라도 깨지면 route 이동을 되돌리고 상태 전달 방식을 재검토한다.
