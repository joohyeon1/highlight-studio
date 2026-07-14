function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase().slice(0, 120);
}

function buildLicenseStatus(email = "") {
  const normalizedEmail = normalizeEmail(email);
  const configuredStatus = String(process.env.HIGHLIGHT_LICENSE_STATUS || "").trim().toLowerCase();
  const allowedStatuses = new Set(["trial", "active", "expired", "blocked"]);
  const licenseStatus = allowedStatuses.has(configuredStatus) ? configuredStatus : (normalizedEmail ? "trial" : "trial");
  const expiresAt = process.env.HIGHLIGHT_LICENSE_EXPIRES_AT || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const daysLeft = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
  const featuresByStatus = {
    trial: ["사진 업로드", "MP4 생성", "outputs 관리", "공유 준비"],
    active: ["사진 업로드", "MP4 생성", "outputs 관리", "공유", "업데이트 확인"],
    expired: ["프로젝트 열기", "outputs 확인"],
    blocked: ["로그인", "라이선스 확인"]
  };
  return {
    loggedIn: Boolean(normalizedEmail),
    email: normalizedEmail,
    licenseStatus,
    expiresAt,
    daysLeft,
    features: featuresByStatus[licenseStatus] || featuresByStatus.trial
  };
}

module.exports = {
  normalizeEmail,
  buildLicenseStatus
};
