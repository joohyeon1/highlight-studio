function registerProjectLoadRoutes(app, dependencies = {}) {
  const {
    validateProjectDocument,
    readProjectBackup,
    rememberProject
  } = dependencies;

  app.post("/api/project/load", (req, res) => {
    try {
      const project = validateProjectDocument(req.body?.project || req.body);
      const summary = rememberProject(project, "load");
      res.json({ ok: true, project, recent: summary });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message || "프로젝트 불러오기에 실패했습니다." });
    }
  });

  app.post("/api/project/backups/:backupId/restore", async (req, res) => {
    try {
      const project = await readProjectBackup(req.params.backupId);
      const summary = rememberProject(project, "backup-restore");
      res.json({ ok: true, project, recent: summary });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message || "프로젝트 백업을 복원하지 못했습니다." });
    }
  });
}

module.exports = {
  registerProjectLoadRoutes
};
