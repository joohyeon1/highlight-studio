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
} = require("./server/ai-local-rules");
const {
  normalizeEmail,
  buildLicenseStatus
} = require("./server/license-helpers");
const {
  resolveOutputMp4,
  outputFilePayload,
  getPublicBaseUrl,
  createShareInfo
} = require("./server/output-helpers");
const {
  safeTemplateName,
  readUserTemplates,
  writeUserTemplates,
  sanitizeTemplatePayload,
  getAllTemplates
} = require("./server/template-helpers");
const {
  displayFileName,
  decodeUploadName,
  normalizeUploadedFiles
} = require("./server/upload-file-helpers");
const {
  createUploadMiddleware
} = require("./server/upload-middleware");
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
} = require("./server/render-job-store");
const {
  configureRenderJobUtils,
  pushJobLog,
  updateJob,
  scheduleJobCleanup
} = require("./server/render-job-utils");
const {
  configureRenderQueueOperations,
  removeQueuedJob,
  enqueueRenderJob
} = require("./server/render-queue-operations");
const {
  createRenderQueueController
} = require("./server/render-queue-controller");
const {
  createFfmpegEngine
} = require("./server/ffmpeg-engine");
const {
  createRenderExecutor
} = require("./server/render-executor");
const {
  registerSystemRoutes
} = require("./server/routes/system-routes");
const {
  registerAiRoutes
} = require("./server/routes/ai-routes");
const {
  registerTemplateRoutes
} = require("./server/routes/template-routes");
const {
  registerOutputReadRoutes
} = require("./server/routes/output-read-routes");
const {
  registerOutputWriteRoutes
} = require("./server/routes/output-write-routes");
const {
  registerProjectReadRoutes
} = require("./server/routes/project-read-routes");
const {
  registerProjectLoadRoutes
} = require("./server/routes/project-load-routes");
const {
  registerProjectSaveRoutes
} = require("./server/routes/project-save-routes");
const {
  registerRenderReadRoutes
} = require("./server/routes/render-read-routes");

loadLocalEnv();

const PORT = Number(process.env.PORT || 4000);
const LOCAL_BIND_HOST = "127.0.0.1";
const APP_VERSION = "1.0.0";
const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const UPLOAD_DIR = path.resolve(process.env.HIGHLIGHT_UPLOAD_DIR || path.join(ROOT_DIR, "uploads"));
const OUTPUT_DIR = path.resolve(process.env.HIGHLIGHT_OUTPUT_DIR || path.join(ROOT_DIR, "outputs"));
const DATA_DIR = path.resolve(process.env.HIGHLIGHT_DATA_DIR || path.join(ROOT_DIR, "data"));
const BACKUP_DIR = path.join(DATA_DIR, "backups");
const MAX_PHOTOS = Number(process.env.HIGHLIGHT_MAX_PHOTOS || 200);
const PHOTO_SECONDS = Number(process.env.HIGHLIGHT_PHOTO_SECONDS || 2);
const SUPPORTED_RENDER_TRANSITIONS = new Set(["none", "fade", "crossfade"]);
const SUPPORTED_RENDER_EFFECTS = new Set(["none", "slowZoomIn", "slowZoomOut"]);
const DEFAULT_TEMPLATES = require("./server/default-templates");
const {
  validateProjectDocument,
  projectFileName,
  projectBackupFileName,
  cleanupOldBackups,
  listProjectBackups
} = require("./server/project-helpers");
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

async function createVideoFromPhotos(files, options = {}) {
  if (!files.length) throw new Error("사진을 1장 이상 업로드해 주세요.");

  const jobId = makeId("job");
  const workDir = path.join(UPLOAD_DIR, jobId);
  fs.mkdirSync(workDir, { recursive: true });

  const title = safeName(options.title || "Highlight Studio");
  const outputName = `${title}-${Date.now().toString(36)}.mp4`;
  const outputPath = path.join(OUTPUT_DIR, outputName);
  const segmentPaths = [];
  const duration = Math.max(1, Math.min(10, Number(options.secondsPerPhoto || PHOTO_SECONDS) || PHOTO_SECONDS));

  try {
    for (const [index, file] of files.entries()) {
      const segmentPath = path.join(workDir, `segment-${String(index + 1).padStart(3, "0")}.mp4`);
      await runFfmpeg([
        "-y",
        "-loop", "1",
        "-t", String(duration),
        "-i", file.path,
        "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p",
        "-r", "30",
        "-an",
        "-c:v", "libx264",
        "-preset", "veryfast",
        segmentPath
      ]);
      segmentPaths.push(segmentPath);
    }

    const listPath = path.join(workDir, "segments.txt");
    fs.writeFileSync(listPath, segmentPaths.map(item => `file '${ffmpegListPath(item)}'`).join("\n"), "utf8");

    await runFfmpeg([
      "-y",
      "-f", "concat",
      "-safe", "0",
      "-i", listPath,
      "-c", "copy",
      outputPath
    ]);

    const stat = fs.statSync(outputPath);
    return {
      id: jobId,
      filename: outputName,
      downloadUrl: `/outputs/${encodeURIComponent(outputName)}`,
      photoCount: files.length,
      durationSeconds: files.length * duration,
      bytes: stat.size
    };
  } finally {
    for (const file of files) {
      fs.rm(file.path, { force: true }, () => {});
    }
    fs.rm(workDir, { recursive: true, force: true }, () => {});
  }
}

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

app.post("/api/videos", upload.array("photos", MAX_PHOTOS), async (req, res) => {
  try {
    normalizeUploadedFiles(req.files);
    const result = await createVideoFromPhotos(req.files || [], {
      title: req.body.title,
      secondsPerPhoto: req.body.secondsPerPhoto
    });
    res.status(201).json({
      ok: true,
      video: result,
      deprecated: true,
      replacement: "/api/render",
      message: "POST /api/videos is deprecated. Use POST /api/render for new integrations."
    });
  } catch (error) {
    for (const file of req.files || []) fs.rm(file.path, { force: true }, () => {});
    res.status(500).json({ ok: false, error: error.message || "영상 생성에 실패했습니다." });
  }
});

app.post("/api/render", upload.array("photos", MAX_PHOTOS), async (req, res) => {
  try {
    normalizeUploadedFiles(req.files);
    const project = parseProjectPayload(req.body.project);
    const jobId = makeId("render");
    const now = new Date().toISOString();
    const job = {
      jobId,
      status: "queued",
      progress: 0,
      currentPhoto: 0,
      currentPhotoName: "",
      totalPhotos: Array.isArray(project.photos) ? project.photos.filter(photo => photo.selected !== false).length : 0,
      filename: "",
      downloadUrl: "",
      durationSeconds: 0,
      bytes: 0,
      error: "",
      failedPhotos: [],
      logs: [{ time: now, message: "렌더링 작업 대기" }],
      project,
      files: req.files || [],
      currentProcess: null,
      canceled: false,
      createdAt: now,
      startedAt: "",
      completedAt: "",
      updatedAt: now
    };
    addRenderJob(job);
    enqueueRenderJob(job);
    res.status(202).json({
      ok: true,
      jobId,
      statusUrl: `/api/render/status/${encodeURIComponent(jobId)}`
    });
  } catch (error) {
    for (const file of req.files || []) fs.rm(file.path, { force: true }, () => {});
    res.status(500).json({
      ok: false,
      error: error.message || "MP4 생성에 실패했습니다."
    });
  }
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

app.post("/api/render/cancel/:jobId", (req, res) => {
  const job = getRenderJob(req.params.jobId);
  if (!job) return res.status(404).json({ ok: false, error: "렌더링 작업을 찾을 수 없습니다." });
  if (["completed", "failed", "canceled"].includes(job.status)) {
    return res.json({ ok: true, job: publicJob(job) });
  }
  job.canceled = true;
  pushJobLog(job, "사용자 취소 요청");
  if (job.status === "queued") {
    removeQueuedJob(job.jobId);
    updateJob(job, { status: "canceled", completedAt: new Date().toISOString() });
    for (const file of job.files || []) fs.rm(file.path, { force: true }, () => {});
    pushJobLog(job, "대기 중 작업 취소 완료");
    scheduleJobCleanup(job.jobId);
    return res.json({ ok: true, job: publicJob(job) });
  }
  updateJob(job, { status: "canceled", completedAt: new Date().toISOString() });
  if (job.currentProcess) {
    try {
      job.currentProcess.kill("SIGTERM");
    } catch (_) {}
  }
  processRenderQueue();
  res.json({ ok: true, job: publicJob(job) });
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
