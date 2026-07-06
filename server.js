const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const express = require("express");
const multer = require("multer");

const PORT = Number(process.env.PORT || 4000);
const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const UPLOAD_DIR = path.join(ROOT_DIR, "uploads");
const OUTPUT_DIR = path.join(ROOT_DIR, "outputs");
const MAX_PHOTOS = Number(process.env.HIGHLIGHT_MAX_PHOTOS || 100);
const PHOTO_SECONDS = Number(process.env.HIGHLIGHT_PHOTO_SECONDS || 2);
const SUPPORTED_RENDER_TRANSITIONS = new Set(["none", "fade", "crossfade"]);
const SUPPORTED_RENDER_EFFECTS = new Set(["none", "slowZoomIn", "slowZoomOut"]);

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

let ffmpegPath = "ffmpeg";
try {
  ffmpegPath = require("@ffmpeg-installer/ffmpeg").path || ffmpegPath;
} catch (_) {}

const app = express();

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

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { windowsHide: true });
    let stderr = "";
    child.stderr.on("data", chunk => { stderr += String(chunk); });
    child.on("error", reject);
    child.on("close", code => {
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

async function createRenderFromProject(project, files) {
  const ffmpegReady = await checkFfmpeg();
  if (!ffmpegReady) throw new Error("FFmpeg를 실행할 수 없습니다. 서버 PC에 FFmpeg를 설치하거나 @ffmpeg-installer/ffmpeg 패키지를 확인해 주세요.");

  const renderPhotos = getRenderPhotos(project, files);
  if (!renderPhotos.length) throw new Error("선택된 사진 파일이 없습니다. 프로젝트를 불러온 경우 원본 사진을 다시 업로드해 주세요.");

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
      const photo = item.photo;
      const duration = Math.max(0.5, Math.min(30, Number(photo.durationSeconds || photo.duration || outputOptions.defaultPhotoDuration || PHOTO_SECONDS)));
      const segmentPath = path.join(workDir, `scene-${String(index + 1).padStart(3, "0")}.mp4`);
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
      ]);
      segmentPaths.push({ path: segmentPath, duration });
    }

    const listPath = path.join(workDir, "segments.txt");
    fs.writeFileSync(listPath, segmentPaths.map(item => `file '${ffmpegListPath(item.path)}'`).join("\n"), "utf8");

    await runFfmpeg([
      "-y",
      "-f", "concat",
      "-safe", "0",
      "-i", listPath,
      "-c", "copy",
      outputPath
    ]);

    const stat = fs.statSync(outputPath);
    const filename = path.basename(outputPath);
    return {
      filename,
      downloadUrl: `/outputs/${encodeURIComponent(filename)}`,
      durationSeconds: segmentPaths.reduce((sum, item) => sum + item.duration, 0),
      bytes: stat.size
    };
  } finally {
    for (const file of files) fs.rm(file.path, { force: true }, () => {});
    fs.rm(workDir, { recursive: true, force: true }, () => {});
  }
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
    const result = await createRenderFromProject(project, req.files || []);
    res.status(201).json({
      ok: true,
      filename: result.filename,
      downloadUrl: result.downloadUrl,
      durationSeconds: result.durationSeconds,
      bytes: result.bytes
    });
  } catch (error) {
    for (const file of req.files || []) fs.rm(file.path, { force: true }, () => {});
    res.status(500).json({
      ok: false,
      error: error.message || "MP4 생성에 실패했습니다."
    });
  }
});

app.use((error, _req, res, _next) => {
  res.status(400).json({ ok: false, error: error.message || "요청을 처리하지 못했습니다." });
});

app.listen(PORT, () => {
  console.log(`Highlight Studio listening: http://localhost:${PORT}`);
  console.log(`Uploads: ${UPLOAD_DIR}`);
  console.log(`Outputs: ${OUTPUT_DIR}`);
});
