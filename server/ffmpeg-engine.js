const { spawn } = require("node:child_process");

const RENDER_ENCODERS = {
  cpu: { value: "cpu", label: "CPU", codec: "libx264", vendor: "CPU" },
  nvenc: { value: "nvenc", label: "NVIDIA NVENC", codec: "h264_nvenc", vendor: "NVIDIA" },
  qsv: { value: "qsv", label: "Intel Quick Sync", codec: "h264_qsv", vendor: "Intel" },
  amf: { value: "amf", label: "AMD AMF", codec: "h264_amf", vendor: "AMD" }
};

function resolveFfmpegPath() {
  let ffmpegPath = "ffmpeg";
  try {
    ffmpegPath = require("@ffmpeg-installer/ffmpeg").path || ffmpegPath;
  } catch (_) {}
  return ffmpegPath;
}

function createFfmpegEngine(dependencies = {}) {
  const pushJobLog = dependencies.pushJobLog || (() => {});
  const spawnProcess = dependencies.spawn || spawn;
  const ffmpegPath = dependencies.ffmpegPath || resolveFfmpegPath();
  let encoderDetectionCache = null;

  function runFfmpeg(args, job, options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawnProcess(ffmpegPath, args, { windowsHide: true });
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
      const child = spawnProcess(ffmpegPath, ["-version"], { windowsHide: true });
      child.on("error", () => resolve(false));
      child.on("close", code => resolve(code === 0));
    });
  }

  function getFfmpegEncodersText() {
    return new Promise(resolve => {
      let output = "";
      const child = spawnProcess(ffmpegPath, ["-hide_banner", "-encoders"], { windowsHide: true });
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
      const child = spawnProcess(ffmpegPath, args, { windowsHide: true });
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

  function getQualityArgs(quality) {
    if (quality === "best") return ["-crf", "16", "-preset", "slow"];
    if (quality === "high") return ["-crf", "20", "-preset", "medium"];
    return ["-crf", "24", "-preset", "veryfast"];
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

  return {
    RENDER_ENCODERS,
    getFfmpegPath: () => ffmpegPath,
    runFfmpeg,
    checkFfmpeg,
    getFfmpegEncodersText,
    probeFfmpegEncoder,
    detectRenderEncoders,
    resolveRenderEncoder,
    getEncoderArgs
  };
}

module.exports = {
  createFfmpegEngine
};
