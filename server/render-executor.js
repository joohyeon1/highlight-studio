const fs = require("node:fs");
const path = require("node:path");

function createRenderExecutor(dependencies = {}) {
  const {
    uploadDir,
    outputDir,
    photoSeconds,
    supportedRenderTransitions,
    supportedRenderEffects,
    renderEncoders,
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
  } = dependencies;

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

  function uniqueOutputPath(fileName) {
    const parsed = path.parse(safeOutputFileName(fileName));
    let candidate = path.join(outputDir, `${parsed.name}${parsed.ext}`);
    let index = 1;
    while (fs.existsSync(candidate)) {
      candidate = path.join(outputDir, `${parsed.name}-${index}${parsed.ext}`);
      index += 1;
    }
    return candidate;
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
    const effect = supportedRenderEffects.has(photo.photoEffect) ? photo.photoEffect : "none";
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
    const transitionType = supportedRenderTransitions.has(transition.type) ? transition.type : "none";
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
    const workDir = path.join(uploadDir, jobId);
    fs.mkdirSync(workDir, { recursive: true });

    const outputOptions = project.video?.outputOptions || {};
    const { width, height } = getResolution(outputOptions);
    const fps = Math.max(24, Math.min(60, Number(outputOptions.fps || 30)));
    const encoderPlan = await resolveRenderEncoder(outputOptions.encoder || project.encoder || "auto", job);
    job.encoderRequested = encoderPlan.requested;
    job.encoder = encoderPlan.selected;
    job.encoderCodec = renderEncoders[encoderPlan.selected]?.codec || "libx264";
    job.encoderLabel = renderEncoders[encoderPlan.selected]?.label || "CPU";
    job.encoderFallback = false;
    job.encoderFallbackMessage = "";
    job.failedPhotos = [];
    pushJobLog(job, `현재 사용 인코더: ${renderEncoders[encoderPlan.selected]?.label || "CPU"} (${job.encoderCodec})`);
    const outputPath = uniqueOutputPath(outputOptions.fileName || `${safeName(project.video?.title || "highlight-studio")}.mp4`);
    const segmentPaths = [];
    const sceneTimeoutMs = Math.max(45000, Math.min(180000, (width * height >= 1920 * 1080 ? 90000 : 60000)));

    try {
      for (const [index, item] of renderPhotos.entries()) {
        if (job?.canceled) throw new Error("렌더링이 취소되었습니다.");
        const photo = item.photo;
        const displayName = displayFileName(item.file.originalname || photo.fileName || `photo-${index + 1}`, `photo-${index + 1}`);
        const duration = Math.max(0.5, Math.min(30, Number(photo.durationSeconds || photo.duration || outputOptions.defaultPhotoDuration || photoSeconds)));
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

  return {
    createRenderFromProject
  };
}

module.exports = {
  createRenderExecutor
};
