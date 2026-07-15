const fs = require("node:fs");
const path = require("node:path");
const { createApplication } = require("./server/bootstrap");

loadLocalEnv();

const PORT = Number(process.env.PORT || 4000);
const LOCAL_BIND_HOST = "127.0.0.1";
const APP_VERSION = "1.0.0";
const ROOT_DIR = __dirname;

const application = createApplication({
  rootDir: ROOT_DIR,
  appVersion: APP_VERSION,
  port: PORT
});

const { app, cancelAllRenderJobs, logStartupEncoderDetection, paths } = application;
const { UPLOAD_DIR, OUTPUT_DIR } = paths;

function loadLocalEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    if (!key || process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

function startServer(port = PORT) {
  const server = app.listen(port, LOCAL_BIND_HOST, () => {
    console.log(`Highlight Studio listening: http://localhost:${port}`);
    console.log(`Local bind: ${LOCAL_BIND_HOST}:${port}`);
    console.log(`Uploads: ${UPLOAD_DIR}`);
    console.log(`Outputs: ${OUTPUT_DIR}`);
    logStartupEncoderDetection();
  });
  server.on("error", error => {
    if (error.code === "EADDRINUSE") {
      console.error(`Highlight Studio를 시작할 수 없습니다. 포트 ${port}가 이미 사용 중입니다.`);
      console.error("다른 Highlight Studio 창이나 localhost:4000을 사용하는 프로그램을 종료한 뒤 다시 실행하세요.");
    } else if (error.code === "EACCES") {
      console.error(`Highlight Studio를 시작할 수 없습니다. 포트 ${port} 접근 권한이 없습니다.`);
      console.error("관리자 권한 또는 다른 포트 설정을 확인해 주세요.");
    } else {
      console.error(`Highlight Studio 서버 시작 실패: ${error.message}`);
    }
    if (require.main === module) process.exit(1);
  });
  return server;
}

if (require.main === module) {
  startServer(PORT);
}

module.exports = {
  app,
  startServer,
  cancelAllRenderJobs,
  PORT,
  UPLOAD_DIR,
  OUTPUT_DIR
};
