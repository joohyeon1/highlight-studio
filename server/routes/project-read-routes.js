function registerProjectReadRoutes(app, dependencies = {}) {
  const {
    getRecentProjects,
    getProjectAutosave,
    listProjectBackups
  } = dependencies;

  app.get("/api/project/recent", (_req, res) => {
    res.json({ ok: true, recent: getRecentProjects() });
  });

  app.get("/api/project/autosave", (_req, res) => {
    const projectAutosave = getProjectAutosave();
    if (!projectAutosave) return res.json({ ok: true, autosave: null });
    res.json({ ok: true, autosave: projectAutosave.summary, project: projectAutosave.project, savedAt: projectAutosave.savedAt });
  });

  app.get("/api/project/backups", async (_req, res) => {
    try {
      res.json({ ok: true, backups: await listProjectBackups() });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message || "프로젝트 백업 목록을 불러오지 못했습니다." });
    }
  });
}

module.exports = {
  registerProjectReadRoutes
};
