const fs = require("node:fs");
const path = require("node:path");
const { app, BrowserWindow, Menu, dialog, shell, ipcMain } = require("electron");

const ROOT_DIR = path.join(__dirname, "..");
const PACKAGE_JSON = require(path.join(ROOT_DIR, "package.json"));
const APP_VERSION = PACKAGE_JSON.version;
const APP_PORT = Number(process.env.PORT || 4000);
const APP_URL = `http://127.0.0.1:${APP_PORT}`;
const APP_PROTOCOL = "highlightstudio";

if (process.env.HIGHLIGHT_DESKTOP_USER_DATA) {
  app.setPath("userData", process.env.HIGHLIGHT_DESKTOP_USER_DATA);
}

let mainWindow;
let splashWindow;
let settingsWindow;
let serverModule;
let serverInstance;
let settings;
let ownsInternalServer = false;
let allowQuit = false;
let quitInProgress = false;

const START_FAILED_MESSAGE = [
  "Highlight Studio를 실행할 수 없습니다.",
  "",
  "프로그램을 다시 실행하거나,",
  "개발 중이라면 아래 명령을 확인하세요.",
  "",
  "npm start",
  "npm run electron"
].join("\n");

function registerAppProtocol() {
  try {
    if (process.defaultApp) {
      app.setAsDefaultProtocolClient(APP_PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
    } else {
      app.setAsDefaultProtocolClient(APP_PROTOCOL);
    }
    logApp(`Protocol registered: ${APP_PROTOCOL}://open`);
  } catch (error) {
    logError(error);
  }
}

function isHighlightStudioProtocolUrl(value) {
  return String(value || "").toLowerCase().startsWith(`${APP_PROTOCOL}://`);
}

function focusMainWindowFromProtocol() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
  mainWindow.loadURL(APP_URL);
}

function getUserDataPath(...parts) {
  return path.join(app.getPath("userData"), ...parts);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function defaultSettings() {
  const storageRoot = app.isPackaged ? app.getPath("userData") : ROOT_DIR;
  return {
    outputDir: path.join(storageRoot, "outputs"),
    tempDir: path.join(storageRoot, "uploads"),
    dataDir: path.join(storageRoot, "data"),
    defaultResolution: "1080x1920",
    defaultFps: 30,
    defaultTransition: "fade",
    defaultEncoder: "auto",
    defaultTemplate: "taekwondo-class",
    autosaveEnabled: true,
    autoBackupEnabled: true,
    backupLimit: 10
  };
}

function readSettings() {
  const defaults = defaultSettings();
  try {
    const saved = JSON.parse(fs.readFileSync(getUserDataPath("settings.json"), "utf8"));
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
  try {
    const logDir = getUserDataPath("logs");
    ensureDir(logDir);
    fs.appendFileSync(path.join(logDir, name), `[${new Date().toISOString()}] ${message}\n`, "utf8");
  } catch (_) {
    // Logging must never prevent the desktop app from starting or quitting.
  }
}

function logApp(message) {
  logFile("app.log", message);
}

function logError(error) {
  logFile("error.log", error?.stack || error?.message || String(error));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function splashHtml(status, percent) {
  return `<!doctype html>
  <html lang="ko">
  <head>
    <meta charset="utf-8">
    <style>
      body { margin:0; display:grid; place-items:center; min-height:100vh; background:#0f172a; color:#e5e7eb; font-family:Arial, "Malgun Gothic", sans-serif; }
      .box { width:360px; }
      .logo { width:68px; height:68px; border-radius:18px; display:grid; place-items:center; background:#2563eb; color:white; font-size:30px; font-weight:900; margin-bottom:22px; }
      h1 { font-size:28px; margin:0 0 8px; letter-spacing:0; }
      p { margin:0 0 18px; color:#cbd5e1; }
      .bar { height:10px; overflow:hidden; border-radius:999px; background:#1e293b; }
      .bar span { display:block; width:${Math.max(0, Math.min(100, percent))}%; height:100%; background:#38bdf8; }
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

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 460,
    height: 320,
    frame: false,
    resizable: false,
    show: false,
    backgroundColor: "#0f172a",
    icon: path.join(ROOT_DIR, "build", "icon.ico")
  });
  updateSplash("설정 불러오는 중", 15);
  splashWindow.once("ready-to-show", () => splashWindow.show());
}

function updateSplash(status, percent) {
  if (!splashWindow || splashWindow.isDestroyed()) return;
  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml(status, percent))}`);
}

async function waitForServer(retries = 60) {
  for (let i = 0; i < retries; i += 1) {
    try {
      const response = await fetch(`${APP_URL}/api/ping`);
      if (response.ok) return true;
    } catch (_) {}
    updateSplash("내부 서버 준비 중", Math.min(90, 35 + i));
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error("내부 Express 서버를 시작하지 못했습니다.");
}

async function pingLocalServer() {
  try {
    const response = await fetch(`${APP_URL}/api/ping`);
    if (!response.ok) return null;
    return await response.json();
  } catch (_) {
    return null;
  }
}

async function startInternalServer() {
  settings = readSettings();
  ensureDir(settings.outputDir);
  ensureDir(settings.tempDir);
  ensureDir(settings.dataDir);

  process.env.PORT = String(APP_PORT);
  process.env.HIGHLIGHT_OUTPUT_DIR = settings.outputDir;
  process.env.HIGHLIGHT_UPLOAD_DIR = settings.tempDir;
  process.env.HIGHLIGHT_DATA_DIR = settings.dataDir;
  process.env.HIGHLIGHT_BACKUP_LIMIT = String(settings.backupLimit || 10);

  const existingServer = await pingLocalServer();
  if (existingServer?.ok && existingServer?.app === "Highlight Studio") {
    ownsInternalServer = false;
    logApp(`Reusing existing Highlight Studio server: ${APP_URL}`);
    return;
  }

  serverModule = require(path.join(ROOT_DIR, "server.js"));
  await new Promise((resolve, reject) => {
    const nextServer = serverModule.startServer(APP_PORT);
    serverInstance = nextServer;
    ownsInternalServer = true;

    const cleanup = () => {
      nextServer.off("error", onError);
      nextServer.off("listening", onListening);
    };
    const onError = error => {
      cleanup();
      if (error?.code === "EADDRINUSE") {
        reject(new Error(`localhost:${APP_PORT} 포트를 사용할 수 없습니다. 다른 프로그램이 사용 중인지 확인하세요.`));
        return;
      }
      reject(error);
    };
    const onListening = () => {
      cleanup();
      resolve();
    };

    nextServer.once("error", onError);
    if (nextServer.listening) onListening();
    else nextServer.once("listening", onListening);
  });
  logApp(`Internal Express server started: ${APP_URL}`);
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
        { label: "저장", accelerator: "CmdOrCtrl+S", click: () => sendCommand("save-project") },
        { label: "다른 이름으로 저장", accelerator: "CmdOrCtrl+Shift+S", click: () => sendCommand("save-as-project") },
        { type: "separator" },
        { label: "종료", accelerator: "Alt+F4", click: () => app.quit() }
      ]
    },
    {
      label: "도구",
      submenu: [
        { label: "출력 폴더 열기", click: () => shell.openPath(settings.outputDir) },
        { label: "로그 폴더 열기", click: () => shell.openPath(getUserDataPath("logs")) },
        { type: "separator" },
        { label: "설정", click: () => openSettingsWindow() }
      ]
    },
    {
      label: "도움말",
      submenu: [
        { label: "버전 정보", click: () => showAboutDialog() },
        { label: "업데이트 확인", click: () => checkForUpdates() },
        { type: "separator" },
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
    message: "설정이 저장되었습니다. 폴더 변경은 다음 실행부터 내부 서버에 적용됩니다."
  });
}

function settingsHtml() {
  return `<!doctype html>
  <html lang="ko">
  <head>
    <meta charset="utf-8">
    <style>
      body { margin:0; padding:22px; background:#f8fafc; color:#111827; font-family:Arial, "Malgun Gothic", sans-serif; }
      h1 { margin:0 0 18px; font-size:22px; }
      label { display:block; margin:14px 0; font-weight:800; }
      input, select { width:100%; box-sizing:border-box; margin-top:6px; padding:10px; border:1px solid #cbd5e1; border-radius:8px; font:inherit; }
      button { margin-top:16px; padding:10px 14px; border:0; border-radius:8px; background:#2563eb; color:white; font-weight:800; cursor:pointer; }
      .row { display:grid; grid-template-columns:1fr auto; gap:8px; align-items:end; }
    </style>
  </head>
  <body>
    <h1>Highlight Studio 설정</h1>
    <div class="row">
      <label>출력 폴더<input id="outputDir" value="${escapeHtml(settings.outputDir)}"></label>
      <button id="chooseOutput" type="button">선택</button>
    </div>
    <div class="row">
      <label>임시 폴더<input id="tempDir" value="${escapeHtml(settings.tempDir)}"></label>
      <button id="chooseTemp" type="button">선택</button>
    </div>
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
        <label>기본 템플릿
      <select id="defaultTemplate">
        ${[
          ["taekwondo-class", "태권도 수업"],
          ["demo-team", "시범단"],
          ["kids-sports", "유아체육"],
          ["promotion", "홍보형"]
        ].map(([value, label]) => `<option value="${value}"${settings.defaultTemplate === value ? " selected" : ""}>${label}</option>`).join("")}
      </select>
    </label>
    <label><input id="autosaveEnabled" type="checkbox"${settings.autosaveEnabled !== false ? " checked" : ""}> 자동 저장 사용</label>
    <label><input id="autoBackupEnabled" type="checkbox"${settings.autoBackupEnabled !== false ? " checked" : ""}> 프로젝트 자동 백업 사용</label>
    <label>백업 보관 개수<input id="backupLimit" type="number" min="1" max="50" value="${Number(settings.backupLimit || 10)}"></label>
<button id="save" type="button">저장</button>
    <script>
      const { ipcRenderer } = require("electron");
      document.getElementById("chooseOutput").addEventListener("click", () => ipcRenderer.send("settings:choose-directory", "outputDir"));
      document.getElementById("chooseTemp").addEventListener("click", () => ipcRenderer.send("settings:choose-directory", "tempDir"));
      document.getElementById("save").addEventListener("click", () => {
        ipcRenderer.send("settings:save", {
          outputDir: document.getElementById("outputDir").value,
          tempDir: document.getElementById("tempDir").value,
          defaultResolution: document.getElementById("defaultResolution").value,
          defaultFps: Number(document.getElementById("defaultFps").value),
          defaultTransition: document.getElementById("defaultTransition").value,
          defaultEncoder: document.getElementById("defaultEncoder").value,\n          defaultTemplate: document.getElementById("defaultTemplate").value,\n          autosaveEnabled: document.getElementById("autosaveEnabled").checked,\n          autoBackupEnabled: document.getElementById("autoBackupEnabled").checked,\n          backupLimit: Number(document.getElementById("backupLimit").value) || 10
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
    width: 620,
    height: 680,
    title: "설정",
    parent: mainWindow,
    modal: false,
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  settingsWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(settingsHtml())}`);
}

async function showAboutDialog() {
  await dialog.showMessageBox(mainWindow, {
    type: "info",
    title: "Highlight Studio",
    message: "Highlight Studio",
    detail: `버전 ${APP_VERSION}\n로컬 Express 서버와 FFmpeg를 사용하는 Windows 데스크톱 앱입니다.`
  });
}

async function checkForUpdates() {
  // TODO: Connect electron-updater to GitHub Releases when the public release
  // channel is ready. This step intentionally keeps update checks local-only.
  try {
    const response = await fetch(`${APP_URL}/api/update/check`);
    const result = await response.json();
    const update = result.update || {};
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

ipcMain.on("settings:choose-directory", async (_event, key) => {
  const title = key === "outputDir" ? "출력 폴더 선택" : "임시 폴더 선택";
  await chooseDirectory(key, title);
});

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    if (argv.some(isHighlightStudioProtocolUrl)) logApp("Protocol open requested from second instance");
    focusMainWindowFromProtocol();
  });

  app.on("open-url", (event, url) => {
    event.preventDefault();
    if (isHighlightStudioProtocolUrl(url)) {
      logApp(`Protocol open requested: ${url}`);
      focusMainWindowFromProtocol();
    }
  });

  app.whenReady().then(async () => {
  try {
    try {
      ensureDir(getUserDataPath("logs"));
    } catch (_) {}
    logApp(`Highlight Studio desktop ${APP_VERSION} starting`);
    registerAppProtocol();
    createSplashWindow();
    updateSplash("내부 서버 시작 중", 35);
    await startInternalServer();
    await waitForServer();
    updateSplash("메인 화면 여는 중", 95);
    Menu.setApplicationMenu(buildMenu());
    createMainWindow();
  } catch (error) {
    logError(error);
    dialog.showErrorBox("Highlight Studio 시작 실패", `${START_FAILED_MESSAGE}\n\n오류 내용:\n${error.message}`);
    app.quit();
  }
  });
}

app.on("window-all-closed", () => {
  app.quit();
});

app.on("before-quit", event => {
  logApp("Highlight Studio desktop quitting");
  if (allowQuit) return;
  event.preventDefault();
  if (quitInProgress) return;
  quitInProgress = true;
  const shutdown = serverModule?.shutdownServer
    ? serverModule.shutdownServer(ownsInternalServer ? serverInstance : null, "electron-before-quit")
    : Promise.resolve();
  shutdown
    .catch(error => {
      logError(error);
    })
    .finally(() => {
      allowQuit = true;
      app.quit();
    });
});

process.on("uncaughtException", error => {
  logError(error);
});

process.on("unhandledRejection", error => {
  logError(error);
});
