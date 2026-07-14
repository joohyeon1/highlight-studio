const fs = require("node:fs");

function registerOutputWriteRoutes(app, dependencies = {}) {
  const {
    resolveOutputMp4,
    outputFilePayload,
    safeOutputFileName
  } = dependencies;

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
}

module.exports = {
  registerOutputWriteRoutes
};
