const fs = require("node:fs");
const path = require("node:path");

function createLegacyVideoRenderer(dependencies = {}) {
  const {
    uploadDir,
    outputDir,
    photoSeconds,
    makeId,
    safeName,
    runFfmpeg,
    ffmpegListPath
  } = dependencies;

  async function createVideoFromPhotos(files, options = {}) {
    if (!files.length) throw new Error("사진을 1장 이상 업로드해 주세요.");

    const jobId = makeId("job");
    const workDir = path.join(uploadDir, jobId);
    fs.mkdirSync(workDir, { recursive: true });

    const title = safeName(options.title || "Highlight Studio");
    const outputName = `${title}-${Date.now().toString(36)}.mp4`;
    const outputPath = path.join(outputDir, outputName);
    const segmentPaths = [];
    const duration = Math.max(1, Math.min(10, Number(options.secondsPerPhoto || photoSeconds) || photoSeconds));

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

  return {
    createVideoFromPhotos
  };
}

module.exports = {
  createLegacyVideoRenderer
};
