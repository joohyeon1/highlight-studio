const fs = require("node:fs");

function registerRenderWriteRoutes(app, dependencies = {}) {
  const {
    upload,
    maxPhotos,
    normalizeUploadedFiles,
    parseProjectPayload,
    makeId,
    addRenderJob,
    enqueueRenderJob,
    getRenderJob,
    removeQueuedJob,
    updateJob,
    pushJobLog,
    scheduleJobCleanup,
    publicJob,
    processRenderQueue
  } = dependencies;

  app.post("/api/render", upload.array("photos", maxPhotos), async (req, res) => {
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
}

module.exports = {
  registerRenderWriteRoutes
};
