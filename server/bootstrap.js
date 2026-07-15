const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const express = require("express");
const {
  clampScore,
  normalizeAiPhoto,
  analyzeAiPhotos,
  createStoryboardFromAnalysis
} = require("./ai-local-rules");
const {
  normalizeEmail,
  buildLicenseStatus
} = require("./license-helpers");
const {
  resolveOutputMp4,
  outputFilePayload,
  getPublicBaseUrl,
  createShareInfo
} = require("./output-helpers");
const {
  safeTemplateName,
  readUserTemplates,
  writeUserTemplates,
  sanitizeTemplatePayload,
  getAllTemplates
} = require("./template-helpers");
const {
  displayFileName,
  decodeUploadName,
  normalizeUploadedFiles
} = require("./upload-file-helpers");
const {
  createUploadMiddleware
} = require("./upload-middleware");
const {
  configureRenderJobStore,
  getRenderJobs,
  addRenderJob,
  getRenderJob,
  deleteRenderJob,
  getRenderQueue,
  getActiveRenderJobId,
  setActiveRenderJobId,
  clearActiveRenderJobId,
  getQueuedRenderCount,
  getQueuePosition,
  publicJob,
  publicQueue
} = require("./render-job-store");
const {
  configureRenderJobUtils,
  pushJobLog,
  updateJob,
  scheduleJobCleanup
} = require("./render-job-utils");
const {
  configureRenderQueueOperations,
  removeQueuedJob,
  enqueueRenderJob
} = require("./render-queue-operations");
const {
  createRenderQueueController
} = require("./render-queue-controller");
const {
  createFfmpegEngine
} = require("./ffmpeg-engine");
const {
  createLegacyVideoRenderer
} = require("./legacy-video-renderer");
const {
  createRenderExecutor
} = require("./render-executor");
const {
  registerSystemRoutes
} = require("./routes/system-routes");
const {
  registerAiRoutes
} = require("./routes/ai-routes");
const {
  registerTemplateRoutes
} = require("./routes/template-routes");
const {
  registerOutputReadRoutes
} = require("./routes/output-read-routes");
const {
  registerOutputWriteRoutes
} = require("./routes/output-write-routes");
const {
  registerProjectReadRoutes
} = require("./routes/project-read-routes");
const {
  registerProjectLoadRoutes
} = require("./routes/project-load-routes");
const {
  registerProjectSaveRoutes
} = require("./routes/project-save-routes");
const {
  registerRenderReadRoutes
} = require("./routes/render-read-routes");
const {
  registerRenderWriteRoutes
} = require("./routes/render-write-routes");
const {
  registerLegacyVideoRoutes
} = require("./routes/legacy-video-routes");

function createApplication(options = {}) {
  const {
    rootDir = path.join(__dirname, ".."),
    appVersion = "1.0.0",
    port = 4000
  } = options;
  const APP_VERSION = appVersion;
  const PORT = port;



const PUBLIC_DIR = path.join(rootDir, "public");
const UPLOAD_DIR = path.resolve(process.env.HIGHLIGHT_UPLOAD_DIR || path.join(rootDir, "uploads"));
const OUTPUT_DIR = path.resolve(process.env.HIGHLIGHT_OUTPUT_DIR || path.join(rootDir, "outputs"));
const DATA_DIR = path.resolve(process.env.HIGHLIGHT_DATA_DIR || path.join(rootDir, "data"));
const BACKUP_DIR = path.join(DATA_DIR, "backups");
const MAX_PHOTOS = Number(process.env.HIGHLIGHT_MAX_PHOTOS || 200);
const PHOTO_SECONDS = Number(process.env.HIGHLIGHT_PHOTO_SECONDS || 2);
const SUPPORTED_RENDER_TRANSITIONS = new Set(["none", "fade", "crossfade"]);
const SUPPORTED_RENDER_EFFECTS = new Set(["none", "slowZoomIn", "slowZoomOut"]);
const DEFAULT_TEMPLATES = require("./default-templates");
const {
  validateProjectDocument,
  projectFileName,
  projectBackupFileName,
  cleanupOldBackups,
  listProjectBackups
} = require("./project-helpers");
const ffmpegEngine = createFfmpegEngine({ pushJobLog });
const {
  RENDER_ENCODERS,
  getFfmpegPath,
  runFfmpeg,
  checkFfmpeg,
  detectRenderEncoders,
  resolveRenderEncoder,
  getEncoderArgs
} = ffmpegEngine;
let projectAutosave = null;
const recentProjects = [];

const getRecentProjects = () => recentProjects;
const getProjectAutosave = () => projectAutosave;
const setProjectAutosave = value => {
  projectAutosave = value;
};
configureRenderJobStore({ renderEncoders: RENDER_ENCODERS });
configureRenderJobUtils({
  getRenderJob,
  deleteRenderJob
});

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(BACKUP_DIR, { recursive: true });

const app = express();


function licenseGate(req, res, next) {
  // Future hook: validate license key or signed token here.
  req.license = { mode: "local-dev", valid: true };
  next();
}

function safeName(value) {
  return String(value || "highlight")
    .normalize("NFC")
    .replace(/[^a-zA-Z0-9가-힣_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "highlight";
}

function makeId(prefix = "video") {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`;
}

function openLocalPath(targetPath) {
  const resolvedPath = path.resolve(targetPath);
  if (process.platform === "win32") {
    const child = spawn("cmd", ["/c", "start", "", resolvedPath], {
      detached: true,
      stdio: "ignore",
      windowsHide: true
    });
    child.unref();
    return;
  }
  const command = process.platform === "darwin" ? "open" : "xdg-open";
  const child = spawn(command, [resolvedPath], { detached: true, stdio: "ignore" });
  child.unref();
}

const upload = createUploadMiddleware({
  uploadDir: UPLOAD_DIR,
  maxPhotos: MAX_PHOTOS,
  makeId
});

function cleanupUploadedFiles(files = []) {
  for (const file of files || []) fs.rm(file.path, { force: true }, () => {});
}

async function logStartupEncoderDetection() {
  try {
    const detected = await detectRenderEncoders();
    const gpuList = detected.encoders
      .filter(encoder => encoder.value !== "cpu" && encoder.available)
      .map(encoder => `${encoder.label}(${encoder.codec})`);
    console.log(`Render engine auto: ${detected.selectedLabel || "CPU"} (${detected.selectedCodec || "libx264"})`);
    console.log(`GPU encoders: ${gpuList.length ? gpuList.join(", ") : "none - CPU fallback"}`);
  } catch (error) {
    console.log(`Render encoder detection failed: ${error.message || "unknown error"}; CPU fallback will be used.`);
  }
}

function ffmpegListPath(filePath) {
  return filePath.replace(/\\/g, "/").replace(/'/g, "'\\''");
}

function safeOutputFileName(value) {
  const parsed = path.parse(String(value || "highlight-studio.mp4"));
  const base = safeName(parsed.name || "highlight-studio");
  return `${base}.mp4`;
}

const { createVideoFromPhotos } = createLegacyVideoRenderer({
  uploadDir: UPLOAD_DIR,
  outputDir: OUTPUT_DIR,
  photoSeconds: PHOTO_SECONDS,
  makeId,
  safeName,
  runFfmpeg,
  ffmpegListPath
});

function parseProjectPayload(value) {
  if (!value) throw new Error("프로젝트 데이터가 없습니다.");
  const parsed = JSON.parse(value);
  const photos = Array.isArray(parsed.photos) ? parsed.photos : [];
  if (!photos.length) throw new Error("렌더링할 사진이 없습니다.");
  return parsed;
}

function projectSummary(project, source = "browser") {
  return {
    id: makeId("recent"),
    name: project?.project?.name || project?.video?.title || "Highlight Studio Project",
    fileName: projectFileName(project),
    source,
    photoCount: Array.isArray(project?.photos) ? project.photos.length : 0,
    studentCount: Array.isArray(project?.students) ? project.students.length : 0,
    modifiedAt: project?.project?.modifiedAt || new Date().toISOString(),
    addedAt: new Date().toISOString()
  };
}

function rememberProject(project, source = "browser") {
  const summary = projectSummary(project, source);
  const key = `${summary.name}|${summary.fileName}`;
  const duplicateIndex = recentProjects.findIndex(item => `${item.name}|${item.fileName}` === key);
  if (duplicateIndex >= 0) recentProjects.splice(duplicateIndex, 1);
  recentProjects.unshift(summary);
  recentProjects.splice(10);
  return summary;
}

async function writeProjectBackup(project, source = "manual") {
  const validated = validateProjectDocument(project);
  const fileName = projectBackupFileName(validated);
  const fullPath = path.join(BACKUP_DIR, fileName);
  const payload = {
    version: 1,
    source,
    savedAt: new Date().toISOString(),
    project: validated
  };
  await fs.promises.writeFile(fullPath, JSON.stringify(payload, null, 2), "utf8");
  await cleanupOldBackups();
  return {
    id: fileName,
    fileName,
    name: validated.project?.name || validated.video?.title || "Highlight Studio Project",
    source,
    photoCount: Array.isArray(validated.photos) ? validated.photos.length : 0,
    savedAt: payload.savedAt
  };
}

async function readProjectBackup(backupId) {
  const cleanName = path.basename(String(backupId || ""));
  if (!cleanName || cleanName !== backupId || !cleanName.endsWith(".hsp.json")) {
    throw new Error("복원할 백업 파일을 찾을 수 없습니다.");
  }
  const fullPath = path.resolve(BACKUP_DIR, cleanName);
  const backupRoot = path.resolve(BACKUP_DIR) + path.sep;
  if (!fullPath.startsWith(backupRoot)) throw new Error("백업 폴더 밖 파일은 복원할 수 없습니다.");
  const data = JSON.parse(await fs.promises.readFile(fullPath, "utf8"));
  return validateProjectDocument(data.project);
}

const { createRenderFromProject } = createRenderExecutor({
  uploadDir: UPLOAD_DIR,
  outputDir: OUTPUT_DIR,
  photoSeconds: PHOTO_SECONDS,
  supportedRenderTransitions: SUPPORTED_RENDER_TRANSITIONS,
  supportedRenderEffects: SUPPORTED_RENDER_EFFECTS,
  renderEncoders: RENDER_ENCODERS,
  checkFfmpeg,
  resolveRenderEncoder,
  getEncoderArgs,
  runFfmpeg,
  updateJob,
  pushJobLog,
  displayFileName,
  safeName,
  makeId,
  safeOutputFileName,
  ffmpegListPath
});

const { processRenderQueue } = createRenderQueueController({
  getRenderQueue,
  getActiveRenderJobId,
  setActiveRenderJobId,
  clearActiveRenderJobId,
  pushJobLog,
  updateJob,
  scheduleJobCleanup,
  createRenderFromProject,
  cleanupUploadedFiles
});

configureRenderQueueOperations({
  getRenderQueue,
  getQueuePosition,
  pushJobLog,
  processRenderQueue
});

app.use(licenseGate);
app.use(express.json({ limit: "10mb" }));
app.use("/outputs", express.static(OUTPUT_DIR, { fallthrough: false }));
app.use(express.static(PUBLIC_DIR));

app.get("/health", (_req, res) => {
  res.json({ ok: true, app: "Highlight Studio", port: PORT, ffmpeg: getFfmpegPath() });
});

registerSystemRoutes(app, {
  APP_VERSION,
  PORT,
  normalizeEmail,
  buildLicenseStatus
});

registerRenderReadRoutes(app, {
  detectRenderEncoders,
  getRenderJob,
  getActiveRenderJobId,
  getQueuedRenderCount,
  publicJob,
  publicQueue
});

registerAiRoutes(app, {
  clampScore,
  analyzeAiPhotos,
  createStoryboardFromAnalysis
});

registerProjectSaveRoutes(app, {
  validateProjectDocument,
  projectFileName,
  writeProjectBackup,
  rememberProject,
  projectSummary,
  setProjectAutosave
});

registerProjectLoadRoutes(app, {
  validateProjectDocument,
  readProjectBackup,
  rememberProject
});

registerProjectReadRoutes(app, {
  getRecentProjects,
  getProjectAutosave,
  listProjectBackups
});

registerTemplateRoutes(app, {
  DEFAULT_TEMPLATES,
  getAllTemplates,
  readUserTemplates,
  writeUserTemplates,
  sanitizeTemplatePayload
});

app.post("/api/auth/logout", (_req, res) => {
  res.json({ ok: true, loggedIn: false });
});

registerLegacyVideoRoutes(app, {
  upload,
  maxPhotos: MAX_PHOTOS,
  normalizeUploadedFiles,
  createVideoFromPhotos
});

registerRenderWriteRoutes(app, {
  upload,
  maxPhotos: MAX_PHOTOS,
  normalizeUploadedFiles,
  parseProjectPayload,
  makeId,
  addRenderJob,
  enqueueRenderJob,
  getRenderJob,
  removeQueuedJob,
  updateJob,
  pushJobLog,
  scheduleJobCleanup,
  publicJob,
  processRenderQueue
});

registerOutputReadRoutes(app, {
  OUTPUT_DIR,
  resolveOutputMp4,
  outputFilePayload,
  createShareInfo,
  openLocalPath
});

app.post("/api/outputs/open-folder", (_req, res) => {
  try {
    openLocalPath(OUTPUT_DIR);
    res.json({ ok: true, folder: OUTPUT_DIR });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message || "outputs 폴더를 열지 못했습니다." });
  }
});

registerOutputWriteRoutes(app, {
  resolveOutputMp4,
  outputFilePayload,
  safeOutputFileName
});

function cancelAllRenderJobs(reason = "프로그램 종료") {
  for (const job of getRenderJobs().values()) {
    if (["completed", "failed", "canceled"].includes(job.status)) continue;
    job.canceled = true;
    pushJobLog(job, reason);
    updateJob(job, { status: "canceled", completedAt: new Date().toISOString() });
    if (job.currentProcess) {
      try {
        job.currentProcess.kill("SIGTERM");
      } catch (_) {}
    }
    for (const file of job.files || []) fs.rm(file.path, { force: true }, () => {});
  }
  getRenderQueue().splice(0);
  clearActiveRenderJobId();
}

app.use((error, _req, res, _next) => {
  res.status(400).json({ ok: false, error: error.message || "요청을 처리하지 못했습니다." });
});

  return {
    app,
    cancelAllRenderJobs,
    logStartupEncoderDetection,
    paths: {
      UPLOAD_DIR,
      OUTPUT_DIR,
      DATA_DIR,
      BACKUP_DIR
    },
    constants: {
      APP_VERSION,
      MAX_PHOTOS,
      PHOTO_SECONDS
    }
  };
}

module.exports = {
  createApplication
};
