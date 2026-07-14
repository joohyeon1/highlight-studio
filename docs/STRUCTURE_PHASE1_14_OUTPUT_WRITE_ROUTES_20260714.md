# STRUCTURE PHASE 1-14 Output Write Routes

## 기준선

- 브랜치: main
- 기준 커밋: c74a0a5 `refactor: extract output read routes`
- 작업 전 git status: clean
- 작업 전 server.js 줄 수: 1109
- 작업 후 server.js 줄 수: 1088

## 이동 route

다음 outputs 상태 변경 route를 `server/routes/output-write-routes.js`로 이동했다.

- PATCH `/api/outputs/:filename`
- DELETE `/api/outputs/:filename`

## 제외 route와 이유

- POST `/api/outputs/open-folder`: 이번 단계의 이동 대상이 아니며 OS 폴더 열기 route라 유지했다.
- GET 계열 output route: 이전 Phase 1-13에서 이미 `output-read-routes.js`로 분리되어 있어 수정하지 않았다.
- render/re-render 관련 route: output 생성 및 render queue/FFmpeg 영역이라 제외했다.

## dependency 목록

`server/routes/output-write-routes.js`는 server.js를 역참조하지 않고 아래 dependency만 주입받는다.

- `resolveOutputMp4`
- `outputFilePayload`
- `safeOutputFileName`

새 모듈 내부에서는 기존 handler와 동일하게 Node 기본 모듈 `fs`를 직접 require한다.

## rename/delete 동작 구조

PATCH는 기존 순서를 그대로 유지한다.

1. source filename을 `resolveOutputMp4`로 검증
2. body의 `fileName` 또는 `filename`을 `safeOutputFileName`으로 정규화
3. 기존 파일명과 같으면 `{ ok: true, filename }` 반환
4. target filename을 `resolveOutputMp4`로 검증
5. target 존재 시 409 반환
6. `fs.promises.rename`
7. renamed file stat 조회 후 `outputFilePayload` 반환

DELETE는 기존 순서를 그대로 유지한다.

1. filename을 `resolveOutputMp4`로 검증
2. `fs.promises.unlink`
3. 성공 시 `{ ok: true, filename }`
4. `ENOENT`는 404
5. 그 외 오류는 500

## path/filename 보호 방식

보호 로직은 기존 helper를 그대로 사용한다.

- source filename: `resolveOutputMp4`
- target filename: `safeOutputFileName` 후 `resolveOutputMp4`
- path traversal 차단: `resolveOutputMp4`
- 확장자 강제: `safeOutputFileName`은 `.mp4` 결과를 만든다.
- 중복 파일명 충돌: `fs.existsSync(nextResolved.fullPath)` 후 409

## 임시 HIGHLIGHT_OUTPUT_DIR 구성

실제 사용자 `outputs/`에서는 PATCH/DELETE를 호출하지 않았다.

검증은 전용 임시 디렉터리에서만 수행했다.

- 경로: `E:\codex\highlight-studio.tmp\structure-phase1-14-outputs`
- 서버 실행: `HIGHLIGHT_OUTPUT_DIR`를 임시 경로로 지정
- 테스트 파일:
  - `alpha.mp4`
  - `collision.mp4`
  - `delete-me.mp4`
- 테스트 종료 후 임시 디렉터리 전체 삭제 완료

## PATCH 전후 비교

동일한 임시 입력으로 분리 전/후를 비교했다.

| 시나리오 | before | after | 결과 |
| --- | --- | --- | --- |
| 정상 rename `alpha.mp4` -> `renamed` | 200 / `877f3109a39509cb24404fce193d6e1c5d880b527310ed0529af2dcb1d005d9c` | 200 / `877f3109a39509cb24404fce193d6e1c5d880b527310ed0529af2dcb1d005d9c` | 동일 |
| 충돌 `renamed.mp4` -> `collision.mp4` | 409 | 409 | 동일 |
| 존재하지 않는 source | 500 | 500 | 동일 |
| path traversal source | 400 | 400 | 동일 |
| non-mp4 source | 400 | 400 | 동일 |
| 빈 이름 body | 200 / `7e977e55313dbd0e64e8ec38f695a151d35640b36c68ff8d40e1455e13eb8a52` | 200 / `7e977e55313dbd0e64e8ec38f695a151d35640b36c68ff8d40e1455e13eb8a52` | 동일 |

응답의 `createdAt`, `modifiedAt`은 임시 파일 생성 시각에 따라 달라질 수 있어 normalized 비교에서 제외했다.

## DELETE 전후 비교

| 시나리오 | before | after | 결과 |
| --- | --- | --- | --- |
| 정상 삭제 `delete-me.mp4` | 200 / `46e100ae287458fc7a8de78b6091d59607dab64e0dd667c5acf8f9fabe0f9888` | 200 / `46e100ae287458fc7a8de78b6091d59607dab64e0dd667c5acf8f9fabe0f9888` | 동일 |
| 존재하지 않는 파일 | 404 | 404 | 동일 |
| path traversal filename | 400 | 400 | 동일 |
| non-mp4 filename | 400 | 400 | 동일 |

## 오류/충돌 입력 결과

PowerShell `Invoke-WebRequest`의 error response stream 수집에서는 일부 오류 body가 빈 문자열로 기록되었지만, 동일한 수집 방식 기준 전후 status와 body hash가 같았다.

- PATCH 충돌: 409
- PATCH missing source: 500
- PATCH path traversal: 400
- PATCH non-mp4 source: 400
- DELETE missing: 404
- DELETE path traversal: 400
- DELETE non-mp4 source: 400

## 최종 임시 manifest 비교

분리 전/후 최종 임시 manifest는 동일했다.

- `collision.mp4`, size 17, hash `C94B82C7EF70F689F6B65778C4A275ACCAFBD7364E2CF46F06AB87EA7EAD8D88`
- `highlight-studio.mp4`, size 13, hash `3B867BBFE4D276005FFAE3DB17950428A12F1F61DD8EA55CD1EED11EA02B85A2`

## 비대상 API 회귀

분리 후 임시 output 환경에서 다음 API가 정상 응답했다.

- GET `/api/outputs`: 200
- GET `/api/outputs/:filename/share-info`: 200
- GET `/api/health`: 200
- GET `/api/templates`: 200
- GET `/api/project/autosave`: 200
- GET `/api/render/queue`: 200
- GET `/api/license/status`: 200

## 정적 검증

- `node --check server.js`: PASS
- `node --check server/routes/output-write-routes.js`: PASS
- `server/**/*.js node --check`: PASS
- `npm.cmd run check`: PASS
- `git diff --check`: PASS. server.js CRLF 안내만 확인됨.

## 실제 데이터 무결성

실제 사용자 outputs에서는 PATCH/DELETE를 호출하지 않았다.

- outputs: count 13, size 6027534, 각 파일 hash/mtime 유지
- uploads: count 1, `.gitkeep` 유지
- data/backups: count 10, size 26720, 각 파일 hash/mtime 유지
- data/templates.json: size 37, hash `38FCBC0FBED94930A76E74A22B43B0D3B1E371668C918082BEBFF8E448614071`
- package.json: 변경 없음
- package-lock.json: 변경 없음
- `.hsp` 생성 없음

## 임시 데이터 정리 결과

검증 종료 후 `E:\codex\highlight-studio.tmp\structure-phase1-14-outputs`를 삭제했다. 포트 4000 LISTENING도 남지 않았다.

## open-folder route 유지 이유

`POST /api/outputs/open-folder`는 이번 단계의 명시 이동 대상이 아니고, OS 폴더 열기 동작을 포함한다. outputs write route 분리 범위를 PATCH/DELETE로 제한하기 위해 기존 위치에 남겼다.

## 다음 묶음 분리 후보

다음 후보는 project route/state 묶음 또는 render queue/FFmpeg 조사 단계다. render queue/FFmpeg는 위험도가 높으므로 먼저 project route의 read/write 분리 가능성을 다시 좁히는 편이 안전하다.
