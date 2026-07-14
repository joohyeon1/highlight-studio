function registerTemplateRoutes(app, dependencies = {}) {
  const {
    DEFAULT_TEMPLATES,
    getAllTemplates,
    readUserTemplates,
    writeUserTemplates,
    sanitizeTemplatePayload
  } = dependencies;

  app.get("/api/templates", (_req, res) => {
    res.json({ ok: true, templates: getAllTemplates() });
  });

  app.post("/api/templates", (req, res) => {
    try {
      const templates = readUserTemplates();
      const template = sanitizeTemplatePayload(req.body);
      templates.push(template);
      writeUserTemplates(templates);
      res.status(201).json({ ok: true, template });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message || "템플릿을 저장하지 못했습니다." });
    }
  });

  app.put("/api/templates/:templateId", (req, res) => {
    try {
      const templateId = req.params.templateId;
      if (DEFAULT_TEMPLATES.some(template => template.id === templateId)) {
        return res.status(403).json({ ok: false, error: "기본 템플릿은 수정할 수 없습니다." });
      }
      const templates = readUserTemplates();
      const index = templates.findIndex(template => template.id === templateId);
      if (index < 0) return res.status(404).json({ ok: false, error: "수정할 템플릿을 찾을 수 없습니다." });
      templates[index] = sanitizeTemplatePayload(req.body, templates[index]);
      writeUserTemplates(templates);
      res.json({ ok: true, template: templates[index] });
    } catch (error) {
      res.status(400).json({ ok: false, error: error.message || "템플릿을 수정하지 못했습니다." });
    }
  });

  app.delete("/api/templates/:templateId", (req, res) => {
    const templateId = req.params.templateId;
    if (DEFAULT_TEMPLATES.some(template => template.id === templateId)) {
      return res.status(403).json({ ok: false, error: "기본 템플릿은 삭제할 수 없습니다." });
    }
    const templates = readUserTemplates();
    const nextTemplates = templates.filter(template => template.id !== templateId);
    if (nextTemplates.length === templates.length) return res.status(404).json({ ok: false, error: "삭제할 템플릿을 찾을 수 없습니다." });
    writeUserTemplates(nextTemplates);
    res.json({ ok: true, templateId });
  });
}

module.exports = {
  registerTemplateRoutes
};
