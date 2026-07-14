function registerAiRoutes(app, dependencies = {}) {
  const {
    clampScore,
    analyzeAiPhotos,
    createStoryboardFromAnalysis
  } = dependencies;

  app.post("/api/ai/analyze-photos", (req, res) => {
    try {
      const photos = Array.isArray(req.body?.photos) ? req.body.photos : [];
      if (!photos.length) return res.status(400).json({ ok: false, error: "분석할 사진이 없습니다." });
      const analysis = analyzeAiPhotos(photos);
      const recommendedCount = analysis.filter(item => item.recommended && !item.excluded).length;
      const excludedCount = analysis.filter(item => item.excluded).length;
      res.json({
        ok: true,
        engine: "local-rule-v1",
        summary: {
          total: analysis.length,
          recommended: recommendedCount,
          excluded: excludedCount,
          averageScore: clampScore(analysis.reduce((sum, item) => sum + item.score, 0) / analysis.length)
        },
        photos: analysis
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message || "사진 분석에 실패했습니다." });
    }
  });

  app.post("/api/ai/create-storyboard", (req, res) => {
    try {
      const photos = Array.isArray(req.body?.photos) ? req.body.photos : [];
      if (!photos.length) return res.status(400).json({ ok: false, error: "스토리보드를 만들 사진이 없습니다." });
      const analysis = Array.isArray(req.body?.analysis) && req.body.analysis.length ? req.body.analysis : analyzeAiPhotos(photos);
      const storyboard = createStoryboardFromAnalysis(photos, analysis, req.body?.captionMode || "promotion");
      res.json({
        ok: true,
        engine: "local-rule-v1",
        storyboard
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message || "스토리보드 생성에 실패했습니다." });
    }
  });
}

module.exports = {
  registerAiRoutes
};
