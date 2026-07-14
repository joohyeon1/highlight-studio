# STRUCTURE PHASE 1-13 Output Read Routes

## 기준선

- 브랜치: main
- 기준 커밋: 1460982 `refactor: extract template routes`
- 작업 전 git status: clean
- 작업 전 server.js 줄 수: 1145
- 작업 후 server.js 줄 수: 1109

## 조사 결과

server.js의 outputs 영역에는 읽기/공유/다운로드/로컬 열기 route와 파일명 변경/삭제 route가 함께 있었다. 이번 단계에서는 읽기 성격의 route만 이동하고, output 파일을 변경하는 route는 그대로 유지했다.

## 이동한 route

다음 route handler를 `server/routes/output-read-routes.js`로 이동했다.

- GET `/api/outputs`
- GET `/api/outputs/:filename/share-info`
- GET `/api/outputs/:filename/download`
- POST `/api/outputs/:filename/open`

`POST /api/outputs/:filename/open`은 실제 MP4 파일을 열 수 있는 route지만, handler가 module-scope 상태에 의존하지 않고 `openLocalPath`를 dependency로 그대로 전달할 수 있어 함께 이동했다.

## 제외 route와 이유

- POST `/api/outputs/open-folder`: 이번 단계의 명시 대상이 아니며 outputs 폴더를 OS에서 여는 route라 유지했다.
- PATCH `/api/outputs/:filename`: 파일명 변경 route이므로 write route 단계로 제외했다.
- DELETE `/api/outputs/:filename`: 파일 삭제 route이므로 write route 단계로 제외했다.
- render 결과 생성/다시 렌더링 관련 route: render queue/FFmpeg 영역이라 제외했다.

## dependency 목록

`server/routes/output-read-routes.js`는 server.js를 역참조하지 않고 아래 dependency만 주입받는다.

- `OUTPUT_DIR`
- `resolveOutputMp4`
- `outputFilePayload`
- `createShareInfo`
- `openLocalPath`

새 모듈 내부에서 Node 기본 모듈 `fs`, `path`만 직접 require한다.

## route 선언 순서

분리 후 등록 순서는 render queue route 다음, `POST /api/outputs/open-folder` 이전이다.

- GET `/api/outputs`
- GET `/api/outputs/:filename/share-info`
- GET `/api/outputs/:filename/download`
- POST `/api/outputs/:filename/open`
- POST `/api/outputs/open-folder`
- PATCH `/api/outputs/:filename`
- DELETE `/api/outputs/:filename`

`POST /api/outputs/:filename/open`은 `/api/outputs/open-folder`와 path segment 수가 달라 충돌하지 않는다. PATCH/DELETE는 method가 달라 영향이 없다.

## 파일/OS 의존성

- GET `/api/outputs`: `OUTPUT_DIR` 읽기, MP4 stat 조회만 수행
- GET `/api/outputs/:filename/share-info`: 대상 MP4 stat 조회 후 share info 계산
- GET `/api/outputs/:filename/download`: 대상 MP4 stat 조회 후 `res.download`
- POST `/api/outputs/:filename/open`: 대상 MP4 stat 조회 후 `openLocalPath`

실제 검증에서는 사용자 MP4를 OS에서 여는 성공 요청은 수행하지 않았다. 오류 입력만 사용해 OS 실행 없이 응답을 비교했다.

## `/api/outputs` 전후 비교

- before: HTTP 200, count 12, hash `4a2a9dc3838dc85a41c4e26b62854f2c52517237b5fe7c4a8b545d7387b9df81`, length 2777
- after: HTTP 200, count 12, hash `4a2a9dc3838dc85a41c4e26b62854f2c52517237b5fe7c4a8b545d7387b9df81`, length 2777

목록 개수, 정렬 순서, 전체 JSON hash가 동일했다.

## share-info 비교

대상 파일: `태권도-하이라이트_2026-07-13.mp4`

- before: HTTP 200, hash `afc70ef699ad6a5b4a5d97c455d88258fbd102e5837329f44fb7d79e3ad64763`, length 437
- after: HTTP 200, hash `afc70ef699ad6a5b4a5d97c455d88258fbd102e5837329f44fb7d79e3ad64763`, length 437

공유 URL 형식과 JSON 구조가 동일했다.

## download 비교

대상 파일: `태권도-하이라이트_2026-07-13.mp4`

- before status: 200
- after status: 200
- Content-Type: `video/mp4`
- Content-Disposition: `attachment; filename="???-?????_2026-07-13.mp4"; filename*=UTF-8''%ED%83%9C%EA%B6%8C%EB%8F%84-%ED%95%98%EC%9D%B4%EB%9D%BC%EC%9D%B4%ED%8A%B8_2026-07-13.mp4`
- Content-Length: `2921521`
- body hash: `350056492bb99f9ce852e1d61f8441bb60721d16e3b61b8c885cbd9644427c34`

다운로드 응답은 별도 위치에 파일을 저장하지 않고 응답 본문과 header만 비교했다. 실제 output 파일은 변경하지 않았다.

## open route 검증

성공 요청은 OS Explorer/기본 앱 실행을 유발할 수 있어 수행하지 않았다.

오류 입력만 비교했다.

- `POST /api/outputs/no-such-file.mp4/open`: before/after HTTP 404
- `POST /api/outputs/..%2Fbad.mp4/open`: before/after HTTP 400
- `POST /api/outputs/bad.txt/open`: before/after HTTP 400

PowerShell `Invoke-WebRequest`의 error response stream 처리에서는 본문이 빈 문자열로 수집되었지만, 같은 방식의 전후 비교에서 status와 body hash가 동일했다.

## 오류 입력 비교

다음 오류 입력은 전후 status와 body hash가 동일했다.

- GET `/api/outputs/no-such-file.mp4/share-info`: 404
- GET `/api/outputs/..%2Fbad.mp4/share-info`: 400
- GET `/api/outputs/bad.txt/share-info`: 400
- GET `/api/outputs/no-such-file.mp4/download`: 404
- GET `/api/outputs/..%2Fbad.mp4/download`: 400
- GET `/api/outputs/bad.txt/download`: 400
- POST `/api/outputs/no-such-file.mp4/open`: 404
- POST `/api/outputs/..%2Fbad.mp4/open`: 400
- POST `/api/outputs/bad.txt/open`: 400

## 비대상 API 회귀

분리 후 다음 API가 정상 응답했다.

- GET `/api/health`: 200
- GET `/api/templates`: 200
- POST `/api/ai/analyze-photos`: 200
- GET `/api/project/autosave`: 200
- GET `/api/render/queue`: 200
- GET `/api/license/status`: 200

`/api/license/status`는 동적 날짜 필드 때문에 hash가 실행마다 달라질 수 있어 status와 응답 가능 여부를 확인했다.

## 정적 검증

- `node --check server.js`: PASS
- `node --check server/routes/output-read-routes.js`: PASS
- `server/**/*.js node --check`: PASS
- `npm.cmd run check`: PASS
- `git diff --check`: PASS. server.js CRLF 안내만 확인됨.

## 데이터 무결성

실제 사용자 데이터에는 쓰기/삭제/이름 변경 요청을 수행하지 않았다.

- outputs: count 13, size 6027534, 각 파일 hash/mtime 유지
- uploads: count 1, `.gitkeep` 유지
- data/backups: count 10, size 26720, 각 파일 hash/mtime 유지
- data/templates.json: size 37, hash `38FCBC0FBED94930A76E74A22B43B0D3B1E371668C918082BEBFF8E448614071`
- package.json: 변경 없음
- package-lock.json: 변경 없음
- `.hsp` 생성 없음

## 다음 output write route 단계 위험 요소

다음 단계에서 PATCH/DELETE를 이동하려면 실제 output 파일명을 변경하거나 삭제하지 않는 검증 전략이 필요하다. 전용 임시 `HIGHLIGHT_OUTPUT_DIR`를 사용해 rename/delete를 비교하는 방식이 가장 안전하다.
