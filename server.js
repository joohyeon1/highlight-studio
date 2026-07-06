const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const express = require("express");
const multer = require("multer");

loadLocalEnv();

const PORT = Number(process.env.PORT || 4000);
const APP_VERSION = "0.1.0";
const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const UPLOAD_DIR = path.join(ROOT_DIR, "uploads");
const OUTPUT_DIR = path.join(ROOT_DIR, "outputs");
const MAX_PHOTOS = Number(process.env.HIGHLIGHT_MAX_PHOTOS || 100);
const PHOTO_SECONDS = Number(process.env.HIGHLIGHT_PHOTO_SECONDS || 2);
const SUPPORTED_RENDER_TRANSITIONS = new Set(["none", "fade", "crossfade"]);
const SUPPORTED_RENDER_EFFECTS = new Set(["none", "slowZoomIn", "slowZoomOut"]);
const renderJobs = new Map();
const renderQueue = [];
let activeRenderJobId = null;

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

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
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9가-힣_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "highlight";
}

function makeId(prefix = "video") {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`;
}

function resolveOutputMp4(filename) {
  const cleanName = path.basename(String(filename || ""));
  if (!cleanName || cleanName !== filename || path.extname(cleanName).toLowerCase() !== ".mp4") {
    return null;
  }
  const fullPath = path.resolve(OUTPUT_DIR, cleanName);
  const outputRoot = path.resolve(OUTPUT_DIR) + path.sep;
  if (!fullPath.startsWith(outputRoot)) return null;
  return { cleanName, fullPath };
}

function outputFilePayload(fileName, stat) {
  return {
    filename: fileName,
    size: stat.size,
    createdAt: stat.birthtime.toISOString(),
    modifiedAt: stat.mtime.toISOString(),
    url: `/outputs/${encodeURIComponent(fileName)}`,
    downloadUrl: `/api/outputs/${encodeURIComponent(fileName)}/download`
  };
}

function getPublicBaseUrl(req) {
  const configured = String(process.env.PUBLIC_SHARE_BASE_URL || process.env.HIGHLIGHT_PUBLIC_URL || "").trim();
  if (configured) return configured.replace(/\/+$/, "");
  return `${req.protocol}://${req.get("host")}`;
}

function createShareInfo(req, fileName) {
  const baseUrl = getPublicBaseUrl(req);
  const encodedName = encodeURIComponent(fileName);
  const title = path.basename(fileName, ".mp4");
  const shareUrl = `${baseUrl}/outputs/${encodedName}`;
  return {
    fileName,
    shareUrl,
    title: `${title} - Highlight Studio`,
    description: "Highlight Studio에서 생성한 태권도 하이라이트 영상입니다.",
    thumbnailUrl: `${baseUrl}/share-thumbnail.svg`,
    kakao: {
      ready: Boolean(process.env.KAKAO_JAVASCRIPT_KEY || process.env.KAKAO_SDK_KEY),
      javascriptKeyConfigured: Boolean(process.env.KAKAO_JAVASCRIPT_KEY),
      sdkKeyConfigured: Boolean(process.env.KAKAO_SDK_KEY)
    }
  };
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase().slice(0, 120);
}

function buildLicenseStatus(email = "") {
  const normalizedEmail = normalizeEmail(email);
  const configuredStatus = String(process.env.HIGHLIGHT_LICENSE_STATUS || "").trim().toLowerCase();
  const allowedStatuses = new Set(["trial", "active", "expired", "blocked"]);
  const licenseStatus = allowedStatuses.has(configuredStatus) ? configuredStatus : (normalizedEmail ? "trial" : "trial");
  const expiresAt = process.env.HIGHLIGHT_LICENSE_EXPIRES_AT || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const daysLeft = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
  const featuresByStatus = {
    trial: ["사진 업로드", "MP4 생성", "outputs 관리", "공유 준비"],
    active: ["사진 업로드", "MP4 생성", "outputs 관리", "공유", "업데이트 확인"],
    expired: ["프로젝트 열기", "outputs 확인"],
    blocked: ["로그인", "라이선스 확인"]
  };
  return {
    loggedIn: Boolean(normalizedEmail),
    email: normalizedEmail,
    licenseStatus,
    expiresAt,
    daysLeft,
    features: featuresByStatus[licenseStatus] || featuresByStatus.trial
  };
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
    fileSize: 18 * 1024 * 1024
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
    logs: job.logs,
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

function runFfmpeg(args, job) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { windowsHide: true });
    if (job) job.currentProcess = child;
    let stderr = "";
    child.stderr.on("data", chunk => {
      stderr += String(chunk);
      const lines = String(chunk).split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      for (const line of lines.slice(-2)) {
        if (/frame=|error|failed|invalid/i.test(line)) pushJobLog(job, line);
      }
    });
    child.on("error", error => {
      if (job) job.currentProcess = null;
      reject(error);
    });
    child.on("close", code => {
      if (job) job.currentProcess = null;
      if (job?.canceled) return reject(new Error("렌더링이 취소되었습니다."));
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

function ffmpegListPath(filePath) {
  return filePath.replace(/\\/g, "/").replace(/'/g, "'\\''");
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

function getRenderPhotos(project, files) {
  const fileById = new Map();
  for (const file of files) {
    const id = path.parse(file.originalname || "").name;
    fileById.set(id, file);
  }

  return project.photos
    .filter(photo => photo.selected !== false)
    .map(photo => ({ photo, file: fileById.get(photo.id) }))
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
  const outputPath = uniqueOutputPath(outputOptions.fileName || `${safeName(project.video?.title || "highlight-studio")}.mp4`);
  const segmentPaths = [];

  try {
    for (const [index, item] of renderPhotos.entries()) {
      if (job?.canceled) throw new Error("렌더링이 취소되었습니다.");
      const photo = item.photo;
      const duration = Math.max(0.5, Math.min(30, Number(photo.durationSeconds || photo.duration || outputOptions.defaultPhotoDuration || PHOTO_SECONDS)));
      const segmentPath = path.join(workDir, `scene-${String(index + 1).padStart(3, "0")}.mp4`);
      updateJob(job, {
        status: "rendering",
        currentPhoto: index + 1,
        currentPhotoName: item.file.originalname || photo.fileName || `photo-${index + 1}`,
        totalPhotos: renderPhotos.length,
        progress: Math.round(8 + (index / renderPhotos.length) * 62)
      });
      pushJobLog(job, `사진 처리 중: ${index + 1}/${renderPhotos.length}`);
      if (String(photo.caption?.text || "").trim()) {
        pushJobLog(job, `자막 적용: ${index + 1}/${renderPhotos.length}`);
      }
      if (photo.transitionAfter && photo.transitionAfter.type && photo.transitionAfter.type !== "none") {
        pushJobLog(job, `전환효과 적용: ${photo.transitionAfter.type}`);
      }
      await runFfmpeg([
        "-y",
        "-loop", "1",
        "-t", String(duration),
        "-i", item.file.path,
        "-vf", buildSceneFilter(photo, width, height, fps, duration),
        "-r", String(fps),
        "-an",
        "-c:v", "libx264",
        ...getQualityArgs(outputOptions.quality),
        segmentPath
      ], job);
      segmentPaths.push({ path: segmentPath, duration });
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
    ], job);

    const stat = fs.statSync(outputPath);
    const filename = path.basename(outputPath);
    pushJobLog(job, `출력 파일 생성: ${filename}`);
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
app.use(express.json({ limit: "1mb" }));
app.use("/outputs", express.static(OUTPUT_DIR, { fallthrough: false }));
app.use(express.static(PUBLIC_DIR));

app.get("/health", (_req, res) => {
  res.json({ ok: true, app: "Highlight Studio", port: PORT, ffmpeg: ffmpegPath });
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
    const result = await createVideoFromPhotos(req.files || [], {
      title: req.body.title,
      secondsPerPhoto: req.body.secondsPerPhoto
    });
    res.status(201).json({ ok: true, video: result });
  } catch (error) {
    for (const file of req.files || []) fs.rm(file.path, { force: true }, () => {});
    res.status(500).json({ ok: false, error: error.message || "영상 생성에 실패했습니다." });
  }
});

app.post("/api/render", upload.array("photos", MAX_PHOTOS), async (req, res) => {
  try {
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

app.use((error, _req, res, _next) => {
  res.status(400).json({ ok: false, error: error.message || "요청을 처리하지 못했습니다." });
});

app.listen(PORT, () => {
  console.log(`Highlight Studio listening: http://localhost:${PORT}`);
  console.log(`Uploads: ${UPLOAD_DIR}`);
  console.log(`Outputs: ${OUTPUT_DIR}`);
});
