function registerProjectSaveRoutes(app, dependencies = {}) {
  const {
    validateProjectDocument,
    projectFileName,
    writeProjectBackup,
    rememberProject,
    projectSummary,
    setProjectAutosave
  } = dependencies;

  app.post("/api/project/save", async (req, res) => {
    try {
      const project = validateProjectDocument(req.body?.project || req.body);
      const summary = rememberProject(project, "save");
      const backup = await writeProjectBackup(project, "save");
      res.json({
        ok: true,
        fileName: projectFileName(project, req.body?.fileName),
        project,
        recent: summary,
        backup,
        message: ".hsp 프로젝트 저장 준비가 완료되었습니다."
      });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message || "프로젝트 저장에 실패했습니다." });
    }
  });

  app.post("/api/project/autosave", async (req, res) => {
    try {
      const project = validateProjectDocument(req.body?.project || req.body);
      const projectAutosave = {
        project,
        savedAt: new Date().toISOString(),
        summary: projectSummary(project, "autosave")
      };
      setProjectAutosave(projectAutosave);
      const backup = await writeProjectBackup(project, "autosave");
      res.json({ ok: true, autosave: projectAutosave.summary, backup });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message || "자동 저장에 실패했습니다." });
    }
  });
}

module.exports = {
  registerProjectSaveRoutes
};
