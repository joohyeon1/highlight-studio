const fs = require("node:fs");
const path = require("node:path");
const { app, BrowserWindow, Menu, dialog, shell, ipcMain } = require("electron");

const ROOT_DIR = path.join(__dirname, "..");
const APP_PORT = Number(process.env.PORT || 4000);
const APP_URL = `http://localhost:${APP_PORT}`;
const APP_VERSION = require(path.join(ROOT_DIR, "package.json")).version;

let mainWindow;
let splashWindow;
let serverInstance;
let settingsWindow;
let settings;

function getUserDataPath(...parts) {
  return path.join(app.getPath("userData"), ...parts);
}

function defaultSettings() {
  const storageRoot = app.isPackaged ? app.getPath("userData") : ROOT_DIR;
  return {
    outputDir: path.join(storageRoot, "outputs"),
    tempDir: path.join(storageRoot, "uploads"),
    defaultResolution: "1080x1920",
    defaultFps: 30,
    defaultTransition: "fade",
    defaultEncoder: "auto"
  };
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readSettings() {
  const settingsPath = getUserDataPath("settings.json");
  const defaults = defaultSettings();
  try {
    const saved = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    return { ...defaults, ...saved };
  } catch (_) {
    return defaults;
  }
}

function writeSettings(nextSettings) {
  settings = { ...settings, ...nextSettings };
  ensureDir(app.getPath("userData"));
  fs.writeFileSync(getUserDataPath("settings.json"), JSON.stringify(settings, null, 2), "utf8");
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("desktop:settings", settings);
}

function logFile(name, message) {
  const logDir = getUserDataPath("logs");
  ensureDir(logDir);
  const line = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(path.join(logDir, name), line, "utf8");
}

function logApp(message) {
  logFile("app.log", message);
}

function logError(error) {
  logFile("error.log", error?.stack || error?.message || String(error));
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 460,
    height: 320,
    frame: false,
    resizable: false,
    show: false,
    backgroundColor: "#0f172a",
    webPreferences: { sandbox: true }
  });
  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml("서버 준비 중", 30))}`);
  splashWindow.once("ready-to-show", () => splashWindow.show());
}

function updateSplash(status, percent) {
  if (!splashWindow || splashWindow.isDestroyed()) return;
  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml(status, percent))}`);
}

function splashHtml(status, percent) {
  return `<!doctype html>
  <html lang="ko">
  <head>
    <meta charset="utf-8">
    <style>
      body { margin:0; display:grid; place-items:center; min-height:100vh; background:#0f172a; color:#e5e7eb; font-family:Arial, sans-serif; }
      .box { width:360px; }
      .logo { width:64px; height:64px; border-radius:18px; display:grid; place-items:center; background:#2563eb; color:white; font-size:30px; font-weight:800; margin-bottom:22px; }
      h1 { font-size:28px; margin:0 0 8px; letter-spacing:0; }
      p { margin:0 0 18px; color:#cbd5e1; }
      .bar { height:10px; overflow:hidden; border-radius:999px; background:#1e293b; }
      .bar span { display:block; width:${percent}%; height:100%; background:#38bdf8; }
      small { display:block; margin-top:12px; color:#94a3b8; }
    </style>
  </head>
  <body>
    <div class="box">
      <div class="logo">HS</div>
      <h1>Highlight Studio</h1>
      <p>${escapeHtml(status)}</p>
      <div class="bar"><span></span></div>
      <small>버전 ${APP_VERSION}</small>
    </div>
  </body>
  </html>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function waitForServer(retries = 40) {
  for (let i = 0; i < retries; i += 1) {
    try {
      const response = await fetch(`${APP_URL}/api/health`);
      if (response.ok) return true;
    } catch (_) {}
    updateSplash("서버 상태 확인 중", Math.min(90, 45 + i));
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error("내부 서버를 시작하지 못했습니다.");
}

function startInternalServer() {
  settings = readSettings();
  ensureDir(settings.outputDir);
  ensureDir(settings.tempDir);
  process.env.PORT = String(APP_PORT);
  process.env.HIGHLIGHT_OUTPUT_DIR = settings.outputDir;
  process.env.HIGHLIGHT_UPLOAD_DIR = settings.tempDir;

  const server = require(path.join(ROOT_DIR, "server.js"));
  serverInstance = server.startServer(APP_PORT);
  logApp(`Internal Express server started on ${APP_URL}`);
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1180,
    minHeight: 760,
    show: false,
    title: "Highlight Studio",
    icon: path.join(ROOT_DIR, "build", "icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.loadURL(APP_URL);
  mainWindow.once("ready-to-show", () => {
    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
    mainWindow.show();
    mainWindow.webContents.send("desktop:settings", settings);
  });
}

function sendCommand(command) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("desktop:command", command);
}

function buildMenu() {
  return Menu.buildFromTemplate([
    {
      label: "파일",
      submenu: [
        { label: "새 프로젝트", accelerator: "CmdOrCtrl+N", click: () => sendCommand("new-project") },
        { label: "프로젝트 열기", accelerator: "CmdOrCtrl+O", click: () => sendCommand("open-project") },
        { label: "최근 프로젝트", enabled: false },
        { type: "separator" },
        { label: "출력 폴더 열기", click: () => shell.openPath(settings.outputDir) },
        { type: "separator" },
        { label: "종료", accelerator: "Alt+F4", click: () => app.quit() }
      ]
    },
    {
      label: "설정",
      submenu: [
        { label: "설정 열기", click: () => openSettingsWindow() },
        { label: "출력 폴더 변경", click: () => chooseDirectory("outputDir", "출력 폴더 선택") },
        { label: "임시 폴더 변경", click: () => chooseDirectory("tempDir", "임시 폴더 선택") },
        { type: "separator" },
        { label: "업데이트 확인", click: () => checkForUpdates() }
      ]
    },
    {
      label: "로그",
      submenu: [
        { label: "로그 폴더 열기", click: () => shell.openPath(getUserDataPath("logs")) },
        { label: "앱 로그 기록", click: () => logApp("User opened log menu") },
        { label: "FFmpeg 로그 위치", click: () => shell.openPath(settings.outputDir) }
      ]
    },
    {
      label: "보기",
      submenu: [
        { role: "reload", label: "새로고침" },
        { role: "toggleDevTools", label: "개발자 도구" }
      ]
    }
  ]);
}

async function chooseDirectory(key, title) {
  const result = await dialog.showOpenDialog(mainWindow, {
    title,
    properties: ["openDirectory", "createDirectory"]
  });
  if (result.canceled || !result.filePaths[0]) return;
  writeSettings({ [key]: result.filePaths[0] });
  await dialog.showMessageBox(mainWindow, {
    type: "info",
    title: "설정 저장",
    message: "설정이 저장되었습니다. 폴더 변경은 다음 앱 실행부터 서버에 적용됩니다."
  });
}

function settingsHtml() {
  return `<!doctype html>
  <html lang="ko">
  <head>
    <meta charset="utf-8">
    <style>
      body { margin:0; padding:22px; background:#f8fafc; color:#111827; font-family:Arial, sans-serif; }
      h1 { margin:0 0 18px; font-size:22px; }
      label { display:block; margin:14px 0; font-weight:700; }
      input, select { width:100%; box-sizing:border-box; margin-top:6px; padding:10px; border:1px solid #cbd5e1; border-radius:8px; font:inherit; }
      button { margin-top:16px; padding:10px 14px; border:0; border-radius:8px; background:#2563eb; color:white; font-weight:700; cursor:pointer; }
    </style>
  </head>
  <body>
    <h1>Highlight Studio 설정</h1>
    <label>출력 폴더<input id="outputDir" value="${escapeHtml(settings.outputDir)}"></label>
    <label>임시 폴더<input id="tempDir" value="${escapeHtml(settings.tempDir)}"></label>
    <label>기본 해상도
      <select id="defaultResolution">
        ${["1080x1920", "1920x1080", "1080x1080"].map(value => `<option value="${value}"${settings.defaultResolution === value ? " selected" : ""}>${value}</option>`).join("")}
      </select>
    </label>
    <label>기본 FPS
      <select id="defaultFps">
        ${[24, 30, 60].map(value => `<option value="${value}"${Number(settings.defaultFps) === value ? " selected" : ""}>${value}</option>`).join("")}
      </select>
    </label>
    <label>기본 전환효과
      <select id="defaultTransition">
        ${[
          ["none", "없음"],
          ["fade", "페이드"],
          ["crossfade", "크로스 페이드"],
          ["slideLeft", "슬라이드 왼쪽"],
          ["flash", "플래시"]
        ].map(([value, label]) => `<option value="${value}"${settings.defaultTransition === value ? " selected" : ""}>${label}</option>`).join("")}
      </select>
    </label>
    <label>기본 렌더링 인코더
      <select id="defaultEncoder">
        ${[
          ["auto", "자동 선택"],
          ["cpu", "CPU"],
          ["nvenc", "NVIDIA NVENC"],
          ["qsv", "Intel Quick Sync"],
          ["amf", "AMD AMF"]
        ].map(([value, label]) => `<option value="${value}"${settings.defaultEncoder === value ? " selected" : ""}>${label}</option>`).join("")}
      </select>
    </label>
    <button id="save">저장</button>
    <script>
      const { ipcRenderer } = require("electron");
      document.getElementById("save").addEventListener("click", () => {
        ipcRenderer.send("settings:save", {
          outputDir: document.getElementById("outputDir").value,
          tempDir: document.getElementById("tempDir").value,
          defaultResolution: document.getElementById("defaultResolution").value,
          defaultFps: Number(document.getElementById("defaultFps").value),
          defaultTransition: document.getElementById("defaultTransition").value,
          defaultEncoder: document.getElementById("defaultEncoder").value
        });
      });
    </script>
  </body>
  </html>`;
}

function openSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }
  settingsWindow = new BrowserWindow({
    width: 560,
    height: 640,
    title: "설정",
    parent: mainWindow,
    modal: false,
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  settingsWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(settingsHtml())}`);
}

async function checkForUpdates() {
  try {
    const response = await fetch(`${APP_URL}/api/update/check`);
    const update = await response.json();
    const message = update.updateAvailable
      ? `새 버전 ${update.latestVersion}을 사용할 수 있습니다.\n${update.releaseNote || ""}`
      : `현재 최신 버전입니다. (${update.currentVersion || APP_VERSION})`;
    await dialog.showMessageBox(mainWindow, { type: "info", title: "업데이트 확인", message });
  } catch (error) {
    logError(error);
    await dialog.showMessageBox(mainWindow, { type: "error", title: "업데이트 확인 실패", message: error.message });
  }
}

ipcMain.on("settings:save", (_event, nextSettings) => {
  writeSettings(nextSettings);
  if (settingsWindow && !settingsWindow.isDestroyed()) settingsWindow.close();
});

app.whenReady().then(async () => {
  try {
    ensureDir(getUserDataPath("logs"));
    logApp(`Highlight Studio desktop ${APP_VERSION} starting`);
    createSplashWindow();
    updateSplash("설정 불러오는 중", 15);
    startInternalServer();
    updateSplash("내부 서버 시작 중", 45);
    await waitForServer();
    updateSplash("메인 화면 여는 중", 95);
    Menu.setApplicationMenu(buildMenu());
    createMainWindow();
  } catch (error) {
    logError(error);
    dialog.showErrorBox("Highlight Studio 시작 실패", error.message);
    app.quit();
  }
});

app.on("window-all-closed", () => {
  app.quit();
});

app.on("before-quit", () => {
  logApp("Highlight Studio desktop quitting");
  if (serverInstance) serverInstance.close();
});

process.on("uncaughtException", error => {
  logError(error);
});

process.on("unhandledRejection", error => {
  logError(error);
});
