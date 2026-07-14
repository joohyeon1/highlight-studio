const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const express = require("express");
const multer = require("multer");
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
const RENDER_ENCODERS = {
  cpu: { value: "cpu", label: "CPU", codec: "libx264", vendor: "CPU" },
  nvenc: { value: "nvenc", label: "NVIDIA NVENC", codec: "h264_nvenc", vendor: "NVIDIA" },
  qsv: { value: "qsv", label: "Intel Quick Sync", codec: "h264_qsv", vendor: "Intel" },
  amf: { value: "amf", label: "AMD AMF", codec: "h264_amf", vendor: "AMD" }
};
const renderJobs = new Map();
const renderQueue = [];
let activeRenderJobId = null;
let encoderDetectionCache = null;
let projectAutosave = null;
const recentProjects = [];

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(BACKUP_DIR, { recursive: true });

let ffmpegPath = "ffmpeg";
try {
  ffmpegPath = require("@ffmpeg-installer/ffmpeg").path || ffmpegPath;
} catch (_) {}

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

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    cb(null, `${makeId("photo")}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    files: MAX_PHOTOS,
    fileSize: 30 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp)$/i.test(file.mimetype || "")) return cb(null, true);
    cb(new Error("JPG, PNG, WEBP 이미지만 업로드할 수 있습니다."));
  }
});

function pushJobLog(job, message) {
  if (!job) return;
  job.logs.push({ time: new Date().toISOString(), message });
  if (job.logs.length > 300) job.logs.shift();
}

function updateJob(job, patch = {}) {
  if (!job) return;
  Object.assign(job, patch, { updatedAt: new Date().toISOString() });
}

function getQueuePosition(job) {
  if (!job || job.status !== "queued") return 0;
  const index = renderQueue.findIndex(item => item.jobId === job.jobId);
  return index >= 0 ? index + 1 : 0;
}

function publicJob(job) {
  if (!job) return null;
  const encoderInfo = RENDER_ENCODERS[job.encoder] || null;
  return {
    jobId: job.jobId,
    status: job.status,
    progress: job.progress,
    currentPhoto: job.currentPhoto,
    currentPhotoName: job.currentPhotoName,
    totalPhotos: job.totalPhotos,
    filename: job.filename,
    downloadUrl: job.downloadUrl,
    durationSeconds: job.durationSeconds,
    bytes: job.bytes,
    error: job.error,
    failedPhotos: job.failedPhotos || [],
    logs: job.logs,
    encoderRequested: job.encoderRequested || "auto",
    encoder: job.encoder || "",
    encoderCodec: job.encoderCodec || "",
    encoderLabel: job.encoderLabel || encoderInfo?.label || "",
    encoderFallback: Boolean(job.encoderFallback),
    encoderFallbackMessage: job.encoderFallbackMessage || "",
    queuePosition: getQueuePosition(job),
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    updatedAt: job.updatedAt
  };
}

function publicQueue() {
  return Array.from(renderJobs.values())
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map(job => ({
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      currentPhoto: job.currentPhoto,
      currentPhotoName: job.currentPhotoName,
      totalPhotos: job.totalPhotos,
      queuePosition: getQueuePosition(job),
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      filename: job.filename,
      encoder: job.encoder || "",
      encoderCodec: job.encoderCodec || "",
      encoderLabel: job.encoderLabel || RENDER_ENCODERS[job.encoder]?.label || "",
      encoderFallback: Boolean(job.encoderFallback),
      failedCount: (job.failedPhotos || []).length,
      error: job.error
    }));
}

function scheduleJobCleanup(jobId) {
  setTimeout(() => {
    const job = renderJobs.get(jobId);
    if (job && ["completed", "failed", "canceled"].includes(job.status)) {
      renderJobs.delete(jobId);
    }
  }, 30 * 60 * 1000);
}

function runFfmpeg(args, job, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { windowsHide: true });
    if (job) job.currentProcess = child;
    let stderr = "";
    let timedOut = false;
    let loggedLines = 0;
    let lastLoggedLine = "";
    const timeoutMs = Number(options.timeoutMs || 0);
    const timeout = timeoutMs > 0 ? setTimeout(() => {
      timedOut = true;
      pushJobLog(job, `FFmpeg 응답 지연으로 프로세스 종료: ${Math.round(timeoutMs / 1000)}초 제한`);
      try {
        child.kill("SIGTERM");
      } catch (_) {}
    }, timeoutMs) : null;
    child.stderr.on("data", chunk => {
      stderr += String(chunk);
      const lines = String(chunk).split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      for (const line of lines.slice(-2)) {
        if (loggedLines >= 12) continue;
        if (/frame=|error|failed|invalid/i.test(line) && line !== lastLoggedLine) {
          pushJobLog(job, line);
          lastLoggedLine = line;
          loggedLines += 1;
        }
      }
    });
    child.on("error", error => {
      if (timeout) clearTimeout(timeout);
      if (job) job.currentProcess = null;
      reject(error);
    });
    child.on("close", code => {
      if (timeout) clearTimeout(timeout);
      if (job) job.currentProcess = null;
      if (job?.canceled) return reject(new Error("렌더링이 취소되었습니다."));
      if (timedOut) return reject(new Error("FFmpeg 처리 시간이 초과되었습니다."));
      if (code === 0) return resolve();
      reject(new Error(stderr.trim() || `ffmpeg exited with code ${code}`));
    });
  });
}

function checkFfmpeg() {
  return new Promise(resolve => {
    const child = spawn(ffmpegPath, ["-version"], { windowsHide: true });
    child.on("error", () => resolve(false));
    child.on("close", code => resolve(code === 0));
  });
}

function getFfmpegEncodersText() {
  return new Promise(resolve => {
    let output = "";
    const child = spawn(ffmpegPath, ["-hide_banner", "-encoders"], { windowsHide: true });
    child.stdout.on("data", chunk => { output += chunk.toString(); });
    child.stderr.on("data", chunk => { output += chunk.toString(); });
    child.on("error", () => resolve(""));
    child.on("close", () => resolve(output));
  });
}

function probeFfmpegEncoder(codec) {
  return new Promise(resolve => {
    const args = [
      "-hide_banner",
      "-loglevel", "error",
      "-f", "lavfi",
      "-i", "color=c=black:s=64x64:d=0.2",
      "-frames:v", "1",
      "-c:v", codec,
      "-f", "null",
      "-"
    ];
    const child = spawn(ffmpegPath, args, { windowsHide: true });
    child.on("error", () => resolve(false));
    child.on("close", code => resolve(code === 0));
  });
}

async function detectRenderEncoders(options = {}) {
  if (encoderDetectionCache && !options.force) return encoderDetectionCache;
  const ffmpegReady = await checkFfmpeg();
  const encodersText = ffmpegReady ? await getFfmpegEncodersText() : "";
  const available = [];
  for (const encoder of Object.values(RENDER_ENCODERS)) {
    const compiled = ffmpegReady && encodersText.includes(encoder.codec);
    const availableInRuntime = compiled ? await probeFfmpegEncoder(encoder.codec) : false;
    available.push({
      ...encoder,
      compiled,
      available: availableInRuntime
    });
  }
  const auto = available.find(encoder => ["nvenc", "qsv", "amf"].includes(encoder.value) && encoder.available)
    || available.find(encoder => encoder.value === "cpu" && encoder.available)
    || { ...RENDER_ENCODERS.cpu, available: false };
  encoderDetectionCache = {
    ok: ffmpegReady,
    selected: auto.value,
    selectedCodec: auto.codec,
    selectedLabel: auto.label,
    encoders: available,
    checkedAt: new Date().toISOString()
  };
  return encoderDetectionCache;
}

function normalizeRenderEncoder(value) {
  const requested = String(value || "auto");
  if (requested === "auto") return "auto";
  return RENDER_ENCODERS[requested] ? requested : "auto";
}

async function resolveRenderEncoder(requestedValue, job) {
  const requested = normalizeRenderEncoder(requestedValue);
  const detected = await detectRenderEncoders();
  if (requested === "auto") {
    const selected = detected.selected || "cpu";
    pushJobLog(job, `렌더링 인코더 자동 선택: ${RENDER_ENCODERS[selected]?.label || "CPU"}`);
    return { requested, selected, detected };
  }
  const target = detected.encoders.find(encoder => encoder.value === requested);
  if (target?.available) {
    pushJobLog(job, `렌더링 인코더 선택: ${target.label}`);
    return { requested, selected: requested, detected };
  }
  pushJobLog(job, `${RENDER_ENCODERS[requested]?.label || requested} 미지원 - CPU 렌더링으로 전환`);
  return { requested, selected: "cpu", detected };
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

function getEncoderArgs(encoderValue, quality) {
  const encoder = RENDER_ENCODERS[encoderValue] || RENDER_ENCODERS.cpu;
  if (encoder.value === "cpu") return ["-c:v", encoder.codec, ...getQualityArgs(quality)];
  if (encoder.value === "nvenc") {
    const preset = quality === "best" ? "p5" : quality === "high" ? "p4" : "p1";
    const cq = quality === "best" ? "17" : quality === "high" ? "21" : "24";
    return ["-c:v", encoder.codec, "-preset", preset, "-cq", cq, "-b:v", "0"];
  }
  if (encoder.value === "qsv") {
    const globalQuality = quality === "best" ? "18" : quality === "high" ? "22" : "26";
    return ["-c:v", encoder.codec, "-global_quality", globalQuality, "-look_ahead", "0"];
  }
  if (encoder.value === "amf") {
    const qp = quality === "best" ? "18" : quality === "high" ? "22" : "26";
    return ["-c:v", encoder.codec, "-quality", "balanced", "-qp_i", qp, "-qp_p", qp];
  }
  return ["-c:v", "libx264", ...getQualityArgs(quality)];
}

function ffmpegListPath(filePath) {
  return filePath.replace(/\\/g, "/").replace(/'/g, "'\\''");
}

async function probeInputImage(file, job) {
  const name = displayFileName(file?.originalname, "photo");
  if (!file?.path || !fs.existsSync(file.path)) {
    return { ok: false, error: `${name} 파일을 찾을 수 없습니다.` };
  }
  try {
    const stat = fs.statSync(file.path);
    if (!stat.size) return { ok: false, error: `${name} 파일 크기가 0입니다.` };
  } catch (error) {
    return { ok: false, error: `${name} 파일 정보를 읽을 수 없습니다: ${error.message}` };
  }

  try {
    await runFfmpeg([
      "-v", "error",
      "-i", file.path,
      "-frames:v", "1",
      "-f", "null",
      "-"
    ], job, { timeoutMs: 30000 });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: `${name} 이미지 확인 실패: ${error.message || "손상되었거나 지원하지 않는 이미지입니다."}` };
  }
}

function safeOutputFileName(value) {
  const parsed = path.parse(String(value || "highlight-studio.mp4"));
  const base = safeName(parsed.name || "highlight-studio");
  return `${base}.mp4`;
}

function uniqueOutputPath(fileName) {
  const parsed = path.parse(safeOutputFileName(fileName));
  let candidate = path.join(OUTPUT_DIR, `${parsed.name}${parsed.ext}`);
  let index = 1;
  while (fs.existsSync(candidate)) {
    candidate = path.join(OUTPUT_DIR, `${parsed.name}-${index}${parsed.ext}`);
    index += 1;
  }
  return candidate;
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

function getRenderPhotos(project, files) {
  const fileById = new Map();
  const fileByName = new Map();
  const usedFiles = new Set();
  for (const file of files) {
    const id = path.parse(file.originalname || "").name;
    if (id) fileById.set(id, file);
    if (file.originalname) fileByName.set(file.originalname, file);
  }

  const selectedPhotos = project.photos.filter(photo => photo.selected !== false);
  return selectedPhotos
    .map((photo, index) => {
      const candidates = [
        photo.id,
        photo.fileName,
        photo.name,
        photo.originalName
      ].filter(Boolean).map(String);
      let file = null;
      for (const candidate of candidates) {
        file = fileById.get(path.parse(candidate).name) || fileByName.get(candidate);
        if (file && !usedFiles.has(file.path)) break;
        file = null;
      }
      if (!file && files[index] && !usedFiles.has(files[index].path)) file = files[index];
      if (file) usedFiles.add(file.path);
      return { photo, file };
    })
    .filter(item => item.file);
}

function getResolution(outputOptions = {}) {
  const resolution = outputOptions.resolution || {};
  const width = Math.max(320, Math.min(7680, Number(resolution.width || 1920)));
  const height = Math.max(320, Math.min(7680, Number(resolution.height || 1080)));
  return { width, height };
}

function getQualityArgs(quality) {
  if (quality === "best") return ["-crf", "16", "-preset", "slow"];
  if (quality === "high") return ["-crf", "20", "-preset", "medium"];
  return ["-crf", "24", "-preset", "veryfast"];
}

function escapeDrawText(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/\n/g, " ");
}

function getCaptionY(position) {
  if (position === "top") return "h*0.12";
  if (position === "center") return "(h-text_h)/2";
  return "h*0.82";
}

function buildSceneFilter(photo, width, height, fps, duration) {
  const baseScale = `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`;
  const effect = SUPPORTED_RENDER_EFFECTS.has(photo.photoEffect) ? photo.photoEffect : "none";
  const frames = Math.max(1, Math.round(duration * fps));
  let filter = baseScale;

  if (effect === "slowZoomIn") {
    filter = `scale=${width * 2}:${height * 2}:force_original_aspect_ratio=increase,crop=${width * 2}:${height * 2},zoompan=z='min(zoom+0.0015,1.12)':d=${frames}:s=${width}x${height}:fps=${fps}`;
  } else if (effect === "slowZoomOut") {
    filter = `scale=${width * 2}:${height * 2}:force_original_aspect_ratio=increase,crop=${width * 2}:${height * 2},zoompan=z='max(1.12-on/${frames}*0.12,1)':d=${frames}:s=${width}x${height}:fps=${fps}`;
  }

  const caption = photo.caption || {};
  const text = String(caption.text || "").trim();
  if (text) {
    filter += `,drawtext=text='${escapeDrawText(text)}':x=(w-text_w)/2:y=${getCaptionY(caption.position)}:fontsize=${Math.max(24, Math.round(height * 0.045))}:fontcolor=white:box=1:boxcolor=black@0.35:boxborderw=18:shadowcolor=black:shadowx=2:shadowy=2`;
  }

  const transition = photo.transitionAfter || {};
  const transitionType = SUPPORTED_RENDER_TRANSITIONS.has(transition.type) ? transition.type : "none";
  if (transitionType === "fade" || transitionType === "crossfade") {
    const transitionDuration = Math.min(Number(transition.duration || 0.5), Math.max(0.2, duration / 2));
    const outStart = Math.max(0, duration - transitionDuration);
    filter += `,fade=t=in:st=0:d=${transitionDuration},fade=t=out:st=${outStart}:d=${transitionDuration}`;
  }

  return `${filter},format=yuv420p`;
}

async function createRenderFromProject(project, files, job) {
  updateJob(job, { status: "preparing", progress: 2, startedAt: new Date().toISOString() });
  pushJobLog(job, "FFmpeg 설치 여부 확인 시작");
  const ffmpegReady = await checkFfmpeg();
  if (!ffmpegReady) throw new Error("FFmpeg를 실행할 수 없습니다. 서버 PC에 FFmpeg를 설치하거나 @ffmpeg-installer/ffmpeg 패키지를 확인해 주세요.");
  pushJobLog(job, "FFmpeg 실행 가능 확인");

  const renderPhotos = getRenderPhotos(project, files);
  if (!renderPhotos.length) throw new Error("선택된 사진 파일이 없습니다. 프로젝트를 불러온 경우 원본 사진을 다시 업로드해 주세요.");
  updateJob(job, { status: "rendering", totalPhotos: renderPhotos.length, progress: 5 });
  pushJobLog(job, `입력 파일 확인: ${renderPhotos.length}장`);

  const jobId = makeId("render");
  const workDir = path.join(UPLOAD_DIR, jobId);
  fs.mkdirSync(workDir, { recursive: true });

  const outputOptions = project.video?.outputOptions || {};
  const { width, height } = getResolution(outputOptions);
  const fps = Math.max(24, Math.min(60, Number(outputOptions.fps || 30)));
  const encoderPlan = await resolveRenderEncoder(outputOptions.encoder || project.encoder || "auto", job);
  job.encoderRequested = encoderPlan.requested;
  job.encoder = encoderPlan.selected;
  job.encoderCodec = RENDER_ENCODERS[encoderPlan.selected]?.codec || "libx264";
  job.encoderLabel = RENDER_ENCODERS[encoderPlan.selected]?.label || "CPU";
  job.encoderFallback = false;
  job.encoderFallbackMessage = "";
  job.failedPhotos = [];
  pushJobLog(job, `현재 사용 인코더: ${RENDER_ENCODERS[encoderPlan.selected]?.label || "CPU"} (${job.encoderCodec})`);
  const outputPath = uniqueOutputPath(outputOptions.fileName || `${safeName(project.video?.title || "highlight-studio")}.mp4`);
  const segmentPaths = [];
  const sceneTimeoutMs = Math.max(45000, Math.min(180000, (width * height >= 1920 * 1080 ? 90000 : 60000)));

  try {
    for (const [index, item] of renderPhotos.entries()) {
      if (job?.canceled) throw new Error("렌더링이 취소되었습니다.");
      const photo = item.photo;
      const displayName = displayFileName(item.file.originalname || photo.fileName || `photo-${index + 1}`, `photo-${index + 1}`);
      const duration = Math.max(0.5, Math.min(30, Number(photo.durationSeconds || photo.duration || outputOptions.defaultPhotoDuration || PHOTO_SECONDS)));
      const segmentPath = path.join(workDir, `scene-${String(index + 1).padStart(3, "0")}.mp4`);
      updateJob(job, {
        status: "rendering",
        currentPhoto: index + 1,
        currentPhotoName: displayName,
        totalPhotos: renderPhotos.length,
        progress: Math.round(8 + (index / renderPhotos.length) * 62)
      });
      pushJobLog(job, `사진 처리 중: ${index + 1}/${renderPhotos.length} - ${displayName}`);
      const probe = await probeInputImage(item.file, job);
      if (!probe.ok) {
        job.failedPhotos.push({ index: index + 1, name: displayName, error: probe.error });
        pushJobLog(job, `사진 스킵: ${index + 1}/${renderPhotos.length} - ${probe.error}`);
        continue;
      }
      if (String(photo.caption?.text || "").trim()) {
        pushJobLog(job, `자막 적용: ${index + 1}/${renderPhotos.length}`);
      }
      if (photo.transitionAfter && photo.transitionAfter.type && photo.transitionAfter.type !== "none") {
        pushJobLog(job, `전환효과 적용: ${photo.transitionAfter.type}`);
      }
      const segmentArgs = [
        "-y",
        "-loop", "1",
        "-t", String(duration),
        "-i", item.file.path,
        "-vf", buildSceneFilter(photo, width, height, fps, duration),
        "-r", String(fps),
        "-an",
        ...getEncoderArgs(job.encoder, outputOptions.quality),
        segmentPath
      ];
      try {
        await runFfmpeg(segmentArgs, job, { timeoutMs: sceneTimeoutMs });
      } catch (error) {
        if (job?.canceled) throw error;
        if (job.encoder !== "cpu") {
          job.encoderFallback = true;
          job.encoderFallbackMessage = "GPU 사용 불가. CPU로 전환하여 계속 렌더링합니다.";
          pushJobLog(job, `${job.encoderCodec} 인코딩 실패`);
          pushJobLog(job, job.encoderFallbackMessage);
          job.encoder = "cpu";
          job.encoderCodec = "libx264";
          job.encoderLabel = "CPU";
          try {
            await runFfmpeg([
              "-y",
              "-loop", "1",
              "-t", String(duration),
              "-i", item.file.path,
              "-vf", buildSceneFilter(photo, width, height, fps, duration),
              "-r", String(fps),
              "-an",
              ...getEncoderArgs("cpu", outputOptions.quality),
              segmentPath
            ], job, { timeoutMs: sceneTimeoutMs });
          } catch (retryError) {
            if (job?.canceled) throw retryError;
            job.failedPhotos.push({ index: index + 1, name: displayName, error: retryError.message || "사진 처리 실패" });
            pushJobLog(job, `사진 스킵: ${index + 1}/${renderPhotos.length} - ${displayName} - ${retryError.message || "사진 처리 실패"}`);
            continue;
          }
        } else {
          job.failedPhotos.push({ index: index + 1, name: displayName, error: error.message || "사진 처리 실패" });
          pushJobLog(job, `사진 스킵: ${index + 1}/${renderPhotos.length} - ${displayName} - ${error.message || "사진 처리 실패"}`);
          continue;
        }
      }
      segmentPaths.push({ path: segmentPath, duration });
      updateJob(job, {
        progress: Math.round(8 + ((index + 1) / renderPhotos.length) * 62)
      });
    }
    if (!segmentPaths.length) {
      throw new Error("처리 가능한 사진이 없습니다. 손상된 사진 또는 지원하지 않는 이미지 파일을 확인해 주세요.");
    }

    const listPath = path.join(workDir, "segments.txt");
    fs.writeFileSync(listPath, segmentPaths.map(item => `file '${ffmpegListPath(item.path)}'`).join("\n"), "utf8");
    updateJob(job, { status: "rendering", progress: 76, currentPhoto: renderPhotos.length, currentPhotoName: "MP4 인코딩", totalPhotos: renderPhotos.length });
    pushJobLog(job, "MP4 인코딩 시작");

    await runFfmpeg([
      "-y",
      "-f", "concat",
      "-safe", "0",
      "-i", listPath,
      "-c", "copy",
      outputPath
    ], job, { timeoutMs: 180000 });

    const stat = fs.statSync(outputPath);
    const filename = path.basename(outputPath);
    pushJobLog(job, `출력 파일 생성: ${filename}`);
    if (job.failedPhotos.length) pushJobLog(job, `스킵된 사진: ${job.failedPhotos.length}장`);
    pushJobLog(job, `완료 시간: ${new Date().toLocaleString("ko-KR", { hour12: false })}`);
    return {
      filename,
      downloadUrl: `/outputs/${encodeURIComponent(filename)}`,
      durationSeconds: segmentPaths.reduce((sum, item) => sum + item.duration, 0),
      bytes: stat.size
    };
  } finally {
    for (const file of files) fs.rm(file.path, { force: true }, () => {});
    fs.rm(workDir, { recursive: true, force: true }, () => {});
    pushJobLog(job, "임시 파일 정리 완료");
  }
}

function removeQueuedJob(jobId) {
  const index = renderQueue.findIndex(item => item.jobId === jobId);
  if (index >= 0) return renderQueue.splice(index, 1)[0];
  return null;
}

function enqueueRenderJob(job) {
  renderQueue.push(job);
  pushJobLog(job, `렌더링 대기열 추가: ${getQueuePosition(job)}번째`);
  processRenderQueue();
}

function processRenderQueue() {
  if (activeRenderJobId) return;
  const nextJob = renderQueue.shift();
  if (!nextJob) return;
  if (nextJob.canceled || nextJob.status === "canceled") {
    process.nextTick(processRenderQueue);
    return;
  }
  activeRenderJobId = nextJob.jobId;
  pushJobLog(nextJob, "대기열에서 렌더링 시작");
  createRenderFromProject(nextJob.project, nextJob.files || [], nextJob)
    .then(result => {
      if (nextJob.canceled) return;
      updateJob(nextJob, {
        status: "completed",
        progress: 100,
        filename: result.filename,
        downloadUrl: result.downloadUrl,
        durationSeconds: result.durationSeconds,
        bytes: result.bytes,
        completedAt: new Date().toISOString()
      });
      scheduleJobCleanup(nextJob.jobId);
    })
    .catch(error => {
      updateJob(nextJob, {
        status: nextJob.canceled ? "canceled" : "failed",
        error: error.message || "MP4 생성에 실패했습니다.",
        progress: nextJob.canceled ? nextJob.progress : 0,
        completedAt: new Date().toISOString()
      });
      pushJobLog(nextJob, `오류 메시지: ${nextJob.error}`);
      for (const file of nextJob.files || []) fs.rm(file.path, { force: true }, () => {});
      scheduleJobCleanup(nextJob.jobId);
    })
    .finally(() => {
      activeRenderJobId = null;
      processRenderQueue();
    });
}

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
  res.json({ ok: true, app: "Highlight Studio", port: PORT, ffmpeg: ffmpegPath });
});

app.options("/api/ping", (_req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.sendStatus(204);
});

app.get("/api/ping", (_req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.json({
    ok: true,
    app: "Highlight Studio",
    version: "1.0.0"
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    app: "Highlight Studio",
    version: APP_VERSION,
    port: PORT,
    environment: process.env.NODE_ENV || "development",
    storageMode: "local",
    firebase: false,
    firestore: false
  });
});

app.get("/api/render/encoders", async (req, res) => {
  try {
    const detected = await detectRenderEncoders({ force: req.query.refresh === "1" });
    res.json({
      ok: true,
      selected: detected.selected,
      selectedCodec: detected.selectedCodec,
      selectedLabel: detected.selectedLabel,
      checkedAt: detected.checkedAt,
      encoders: detected.encoders
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message || "렌더링 인코더를 확인하지 못했습니다." });
  }
});

app.post("/api/ai/analyze-photos", (req, res) => {
  try {
    const photos = Array.isArray(req.body?.photos) ? req.body.photos : [];
    if (!photos.length) return res.status(400).json({ ok: false, error: "분석할 사진이 없습니다." });
    const analysis = analyzeAiPhotos(photos);
    const recommendedCount = analysis.filter(item => item.recommended && !item.excluded).length;
    const excludedCount = analysis.filter(item => item.excluded).length;
    res.json({
      ok: true,
      engine: "local-rule-v1",
      summary: {
        total: analysis.length,
        recommended: recommendedCount,
        excluded: excludedCount,
        averageScore: clampScore(analysis.reduce((sum, item) => sum + item.score, 0) / analysis.length)
      },
      photos: analysis
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message || "사진 분석에 실패했습니다." });
  }
});

app.post("/api/ai/create-storyboard", (req, res) => {
  try {
    const photos = Array.isArray(req.body?.photos) ? req.body.photos : [];
    if (!photos.length) return res.status(400).json({ ok: false, error: "스토리보드를 만들 사진이 없습니다." });
    const analysis = Array.isArray(req.body?.analysis) && req.body.analysis.length ? req.body.analysis : analyzeAiPhotos(photos);
    const storyboard = createStoryboardFromAnalysis(photos, analysis, req.body?.captionMode || "promotion");
    res.json({
      ok: true,
      engine: "local-rule-v1",
      storyboard
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message || "스토리보드 생성에 실패했습니다." });
  }
});

app.get("/api/templates", (_req, res) => {
  res.json({ ok: true, templates: getAllTemplates() });
});

app.post("/api/project/save", async (req, res) => {
  try {
    const project = validateProjectDocument(req.body?.project || req.body);
    const summary = rememberProject(project, "save");
    const backup = await writeProjectBackup(project, "save");
    res.json({
      ok: true,
      fileName: projectFileName(project, req.body?.fileName),
      project,
      recent: summary,
      backup,
      message: ".hsp 프로젝트 저장 준비가 완료되었습니다."
    });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message || "프로젝트 저장에 실패했습니다." });
  }
});

app.post("/api/project/load", (req, res) => {
  try {
    const project = validateProjectDocument(req.body?.project || req.body);
    const summary = rememberProject(project, "load");
    res.json({ ok: true, project, recent: summary });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message || "프로젝트 불러오기에 실패했습니다." });
  }
});

app.get("/api/project/recent", (_req, res) => {
  res.json({ ok: true, recent: recentProjects });
});

app.post("/api/project/autosave", async (req, res) => {
  try {
    const project = validateProjectDocument(req.body?.project || req.body);
    projectAutosave = {
      project,
      savedAt: new Date().toISOString(),
      summary: projectSummary(project, "autosave")
    };
    const backup = await writeProjectBackup(project, "autosave");
    res.json({ ok: true, autosave: projectAutosave.summary, backup });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message || "자동 저장에 실패했습니다." });
  }
});

app.get("/api/project/autosave", (_req, res) => {
  if (!projectAutosave) return res.json({ ok: true, autosave: null });
  res.json({ ok: true, autosave: projectAutosave.summary, project: projectAutosave.project, savedAt: projectAutosave.savedAt });
});

app.get("/api/project/backups", async (_req, res) => {
  try {
    res.json({ ok: true, backups: await listProjectBackups() });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message || "프로젝트 백업 목록을 불러오지 못했습니다." });
  }
});

app.post("/api/project/backups/:backupId/restore", async (req, res) => {
  try {
    const project = await readProjectBackup(req.params.backupId);
    const summary = rememberProject(project, "backup-restore");
    res.json({ ok: true, project, recent: summary });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message || "프로젝트 백업을 복원하지 못했습니다." });
  }
});

app.post("/api/templates", (req, res) => {
  try {
    const templates = readUserTemplates();
    const template = sanitizeTemplatePayload(req.body);
    templates.push(template);
    writeUserTemplates(templates);
    res.status(201).json({ ok: true, template });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message || "템플릿을 저장하지 못했습니다." });
  }
});

app.put("/api/templates/:templateId", (req, res) => {
  try {
    const templateId = req.params.templateId;
    if (DEFAULT_TEMPLATES.some(template => template.id === templateId)) {
      return res.status(403).json({ ok: false, error: "기본 템플릿은 수정할 수 없습니다." });
    }
    const templates = readUserTemplates();
    const index = templates.findIndex(template => template.id === templateId);
    if (index < 0) return res.status(404).json({ ok: false, error: "수정할 템플릿을 찾을 수 없습니다." });
    templates[index] = sanitizeTemplatePayload(req.body, templates[index]);
    writeUserTemplates(templates);
    res.json({ ok: true, template: templates[index] });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message || "템플릿을 수정하지 못했습니다." });
  }
});

app.delete("/api/templates/:templateId", (req, res) => {
  const templateId = req.params.templateId;
  if (DEFAULT_TEMPLATES.some(template => template.id === templateId)) {
    return res.status(403).json({ ok: false, error: "기본 템플릿은 삭제할 수 없습니다." });
  }
  const templates = readUserTemplates();
  const nextTemplates = templates.filter(template => template.id !== templateId);
  if (nextTemplates.length === templates.length) return res.status(404).json({ ok: false, error: "삭제할 템플릿을 찾을 수 없습니다." });
  writeUserTemplates(nextTemplates);
  res.json({ ok: true, templateId });
});

app.post("/api/auth/login", (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");
  if (!email || !email.includes("@")) return res.status(400).json({ ok: false, error: "이메일을 확인해 주세요." });
  if (password.length < 4) return res.status(400).json({ ok: false, error: "비밀번호는 4자 이상 입력해 주세요." });
  res.json({
    ok: true,
    session: {
      email,
      loggedInAt: new Date().toISOString()
    },
    license: buildLicenseStatus(email)
  });
});

app.post("/api/auth/logout", (_req, res) => {
  res.json({ ok: true, loggedIn: false });
});

app.get("/api/license/status", (req, res) => {
  const email = normalizeEmail(req.get("x-highlight-email") || req.query.email);
  res.json({ ok: true, license: buildLicenseStatus(email) });
});

app.get("/api/update/check", (_req, res) => {
  const latestVersion = process.env.HIGHLIGHT_LATEST_VERSION || APP_VERSION;
  res.json({
    ok: true,
    update: {
      currentVersion: APP_VERSION,
      latestVersion,
      updateAvailable: latestVersion !== APP_VERSION,
      downloadUrl: process.env.HIGHLIGHT_UPDATE_URL || "",
      releaseNote: process.env.HIGHLIGHT_RELEASE_NOTE || "현재 로컬 개발 버전입니다. 실제 업데이트 서버 연동은 다음 단계에서 연결합니다."
    }
  });
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
    renderJobs.set(jobId, job);
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

app.get("/api/render/status/:jobId", (req, res) => {
  const job = renderJobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ ok: false, error: "렌더링 작업을 찾을 수 없습니다." });
  res.json({ ok: true, job: publicJob(job) });
});

app.get("/api/render/queue", (_req, res) => {
  res.json({
    ok: true,
    activeJobId: activeRenderJobId,
    queuedCount: renderQueue.filter(job => job.status === "queued").length,
    jobs: publicQueue()
  });
});

app.get("/api/outputs", async (_req, res) => {
  try {
    const entries = await fs.promises.readdir(OUTPUT_DIR, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== ".mp4") continue;
      const resolved = resolveOutputMp4(entry.name);
      if (!resolved) continue;
      const stat = await fs.promises.stat(resolved.fullPath);
      files.push(outputFilePayload(entry.name, stat));
    }
    files.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));
    res.json({ ok: true, outputs: files });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message || "출력 파일 목록을 불러오지 못했습니다." });
  }
});

app.get("/api/outputs/:filename/share-info", (req, res) => {
  const resolved = resolveOutputMp4(req.params.filename);
  if (!resolved) return res.status(400).json({ ok: false, error: "MP4 출력 파일명만 공유할 수 있습니다." });
  fs.stat(resolved.fullPath, (error, stat) => {
    if (error || !stat.isFile()) return res.status(404).json({ ok: false, error: "공유할 출력 파일을 찾을 수 없습니다." });
    res.json({ ok: true, share: createShareInfo(req, resolved.cleanName) });
  });
});

app.get("/api/outputs/:filename/download", (req, res) => {
  const resolved = resolveOutputMp4(req.params.filename);
  if (!resolved) return res.status(400).json({ ok: false, error: "MP4 출력 파일명만 사용할 수 있습니다." });
  fs.stat(resolved.fullPath, (error, stat) => {
    if (error || !stat.isFile()) return res.status(404).json({ ok: false, error: "출력 파일을 찾을 수 없습니다." });
    res.download(resolved.fullPath, resolved.cleanName);
  });
});

app.post("/api/outputs/open-folder", (_req, res) => {
  try {
    openLocalPath(OUTPUT_DIR);
    res.json({ ok: true, folder: OUTPUT_DIR });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message || "outputs 폴더를 열지 못했습니다." });
  }
});

app.post("/api/outputs/:filename/open", (req, res) => {
  const resolved = resolveOutputMp4(req.params.filename);
  if (!resolved) return res.status(400).json({ ok: false, error: "MP4 출력 파일명만 열 수 있습니다." });
  fs.stat(resolved.fullPath, (error, stat) => {
    if (error || !stat.isFile()) return res.status(404).json({ ok: false, error: "열 출력 파일을 찾을 수 없습니다." });
    try {
      openLocalPath(resolved.fullPath);
      res.json({ ok: true, filename: resolved.cleanName });
    } catch (openError) {
      res.status(500).json({ ok: false, error: openError.message || "영상 파일을 열지 못했습니다." });
    }
  });
});

app.patch("/api/outputs/:filename", async (req, res) => {
  const resolved = resolveOutputMp4(req.params.filename);
  if (!resolved) return res.status(400).json({ ok: false, error: "MP4 출력 파일명만 변경할 수 있습니다." });
  const nextName = safeOutputFileName(req.body?.fileName || req.body?.filename || "");
  if (!nextName || nextName === resolved.cleanName) return res.json({ ok: true, filename: resolved.cleanName });
  const nextResolved = resolveOutputMp4(nextName);
  if (!nextResolved) return res.status(400).json({ ok: false, error: "새 파일명은 .mp4 형식이어야 합니다." });
  if (fs.existsSync(nextResolved.fullPath)) {
    return res.status(409).json({ ok: false, error: "같은 이름의 출력 파일이 이미 있습니다." });
  }
  try {
    await fs.promises.rename(resolved.fullPath, nextResolved.fullPath);
    const stat = await fs.promises.stat(nextResolved.fullPath);
    res.json({ ok: true, output: outputFilePayload(nextResolved.cleanName, stat) });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message || "출력 파일명을 변경하지 못했습니다." });
  }
});

app.delete("/api/outputs/:filename", async (req, res) => {
  const resolved = resolveOutputMp4(req.params.filename);
  if (!resolved) return res.status(400).json({ ok: false, error: "MP4 출력 파일명만 삭제할 수 있습니다." });
  try {
    await fs.promises.unlink(resolved.fullPath);
    res.json({ ok: true, filename: resolved.cleanName });
  } catch (error) {
    if (error.code === "ENOENT") return res.status(404).json({ ok: false, error: "삭제할 출력 파일을 찾을 수 없습니다." });
    res.status(500).json({ ok: false, error: error.message || "출력 파일을 삭제하지 못했습니다." });
  }
});

app.post("/api/render/cancel/:jobId", (req, res) => {
  const job = renderJobs.get(req.params.jobId);
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
  for (const job of renderJobs.values()) {
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
  renderQueue.splice(0);
  activeRenderJobId = null;
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
