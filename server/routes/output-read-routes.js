const fs = require("node:fs");
const path = require("node:path");

function registerOutputReadRoutes(app, dependencies = {}) {
  const {
    OUTPUT_DIR,
    resolveOutputMp4,
    outputFilePayload,
    createShareInfo,
    openLocalPath
  } = dependencies;

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
}

module.exports = {
  registerOutputReadRoutes
};
