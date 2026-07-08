# Highlight Studio Deploy Guide

Highlight Studio is an independent local/server app for creating temporary MP4 highlight videos. SportsLink only opens this app by URL. Do not copy Highlight Studio rendering code into SportsLink.

## Local Run

```powershell
cd E:\codex\highlight-studio
npm install
npm start
```

Default local URL:

```text
http://localhost:4000
```

Health check:

```text
GET http://localhost:4000/api/health
```

## Environment Variables

```text
PORT=4000
NODE_ENV=production
APP_URL=https://highlight.sportlink.kr
LOCAL_APP_URL=http://localhost:4000
PUBLIC_SHARE_BASE_URL=https://highlight.sportlink.kr
KAKAO_JS_KEY=
KAKAO_JAVASCRIPT_KEY=
LICENSE_MODE=local
HIGHLIGHT_LICENSE_STATUS=trial
HIGHLIGHT_LICENSE_EXPIRES_AT=
HIGHLIGHT_LATEST_VERSION=1.0.0
HIGHLIGHT_UPDATE_URL=
HIGHLIGHT_RELEASE_NOTE=Current local development version.
```

`APP_URL` is used when generating share links. For production, set it to:

```text
https://highlight.sportlink.kr
```

## Render Deployment

1. Create a new Web Service.
2. Connect the `highlight-studio` repository.
3. Set the runtime to Node.js 20 or later.
4. Build command:

```text
npm install
```

5. Start command:

```text
npm start
```

6. Add the environment variables above.
7. Confirm `/api/health` returns `ok: true`.

## Domain Connection

1. Add `highlight.sportlink.kr` as a custom domain in the hosting provider.
2. Create the DNS record requested by the provider.
3. Set `APP_URL=https://highlight.sportlink.kr`.
4. Restart the service.
5. Check:

```text
https://highlight.sportlink.kr/api/health
```

## Storage Policy

This step does not implement long-term storage.

- `uploads/` is temporary upload storage.
- `outputs/` is temporary MP4 output storage.
- Files may disappear after server restart or redeploy.
- Do not use Firestore, Firebase, or an external DB for this app in this step.
- Do not save generated MP4 files in SportsLink.

## Security Checklist

- Output download and delete APIs only accept `.mp4` files inside `outputs/`.
- Path traversal such as `../server.js` is rejected.
- Uploads are handled through Multer into `uploads/`.
- Login is local-development only and stores session state in browser `localStorage`.
- Passwords are not logged.
- Firebase and Firestore are not used.

## SportsLink Integration

SportsLink should only open this app in a new window:

```js
window.open("https://highlight.sportlink.kr", "_blank", "noopener,noreferrer");
```

Development URL:

```text
http://localhost:4000
```

Production URL:

```text
https://highlight.sportlink.kr
```
