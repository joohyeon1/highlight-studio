function registerRenderReadRoutes(app, dependencies = {}) {
  const {
    detectRenderEncoders,
    getRenderJob,
    getActiveRenderJobId,
    getQueuedRenderCount,
    publicJob,
    publicQueue
  } = dependencies;

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

  app.get("/api/render/status/:jobId", (req, res) => {
    const job = getRenderJob(req.params.jobId);
    if (!job) return res.status(404).json({ ok: false, error: "렌더링 작업을 찾을 수 없습니다." });
    res.json({ ok: true, job: publicJob(job) });
  });

  app.get("/api/render/queue", (_req, res) => {
    res.json({
      ok: true,
      activeJobId: getActiveRenderJobId(),
      queuedCount: getQueuedRenderCount(),
      jobs: publicQueue()
    });
  });
}

module.exports = {
  registerRenderReadRoutes
};
