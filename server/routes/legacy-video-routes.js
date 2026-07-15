const fs = require("node:fs");

function registerLegacyVideoRoutes(app, dependencies = {}) {
  const {
    upload,
    maxPhotos,
    normalizeUploadedFiles,
    createVideoFromPhotos
  } = dependencies;

  app.post("/api/videos", upload.array("photos", maxPhotos), async (req, res) => {
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
}

module.exports = {
  registerLegacyVideoRoutes
};
