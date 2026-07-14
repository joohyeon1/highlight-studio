function registerSystemRoutes(app, dependencies = {}) {
  const {
    APP_VERSION,
    PORT,
    normalizeEmail,
    buildLicenseStatus
  } = dependencies;

  app.options("/api/ping", (_req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.sendStatus(204);
  });

  app.get("/api/ping", (_req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.json({
      ok: true,
      app: "Highlight Studio",
      version: "1.0.0"
    });
  });

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      app: "Highlight Studio",
      version: APP_VERSION,
      port: PORT,
      environment: process.env.NODE_ENV || "development",
      storageMode: "local",
      firebase: false,
      firestore: false
    });
  });

  app.post("/api/auth/login", (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    if (!email || !email.includes("@")) return res.status(400).json({ ok: false, error: "이메일을 확인해 주세요." });
    if (password.length < 4) return res.status(400).json({ ok: false, error: "비밀번호는 4자 이상 입력해 주세요." });
    res.json({
      ok: true,
      session: {
        email,
        loggedInAt: new Date().toISOString()
      },
      license: buildLicenseStatus(email)
    });
  });

  app.get("/api/license/status", (req, res) => {
    const email = normalizeEmail(req.get("x-highlight-email") || req.query.email);
    res.json({ ok: true, license: buildLicenseStatus(email) });
  });

  app.get("/api/update/check", (_req, res) => {
    const latestVersion = process.env.HIGHLIGHT_LATEST_VERSION || APP_VERSION;
    res.json({
      ok: true,
      update: {
        currentVersion: APP_VERSION,
        latestVersion,
        updateAvailable: latestVersion !== APP_VERSION,
        downloadUrl: process.env.HIGHLIGHT_UPDATE_URL || "",
        releaseNote: process.env.HIGHLIGHT_RELEASE_NOTE || "현재 로컬 개발 버전입니다. 실제 업데이트 서버 연동은 다음 단계에서 연결합니다."
      }
    });
  });
}

module.exports = {
  registerSystemRoutes
};
