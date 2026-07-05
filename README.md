# Highlight Studio

SportsLink와 분리된 독립 AI 영상 제작 프로그램입니다.

## 로컬 실행

```bash
npm install
npm start
```

브라우저에서 `http://localhost:4000`을 엽니다.

## 구조

- `server.js`: 독립 Express 서버
- `public/`: 업로드/생성 UI
- `uploads/`: 임시 업로드 이미지
- `outputs/`: 생성된 MP4 파일
- `render.yaml`: 향후 `highlight.sportlink.kr` 배포용 기본 설정

## 라이선스 확장 지점

현재는 인증 없이 로컬 실행 우선입니다. 추후 `licenseGate` 미들웨어에 라이선스 검증을 추가하면 됩니다.
