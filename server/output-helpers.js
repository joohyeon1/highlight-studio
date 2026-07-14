const path = require("node:path");

const ROOT_DIR = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.resolve(process.env.HIGHLIGHT_OUTPUT_DIR || path.join(ROOT_DIR, "outputs"));

function resolveOutputMp4(filename) {
  const cleanName = path.basename(String(filename || ""));
  if (!cleanName || cleanName !== filename || path.extname(cleanName).toLowerCase() !== ".mp4") {
    return null;
  }
  const fullPath = path.resolve(OUTPUT_DIR, cleanName);
  const outputRoot = path.resolve(OUTPUT_DIR) + path.sep;
  if (!fullPath.startsWith(outputRoot)) return null;
  return { cleanName, fullPath };
}

function outputFilePayload(fileName, stat) {
  return {
    filename: fileName,
    size: stat.size,
    createdAt: stat.birthtime.toISOString(),
    modifiedAt: stat.mtime.toISOString(),
    url: `/outputs/${encodeURIComponent(fileName)}`,
    downloadUrl: `/api/outputs/${encodeURIComponent(fileName)}/download`
  };
}

function getPublicBaseUrl(req) {
  const configured = String(process.env.APP_URL || process.env.PUBLIC_SHARE_BASE_URL || process.env.HIGHLIGHT_PUBLIC_URL || "").trim();
  if (configured) return configured.replace(/\/+$/, "");
  return `${req.protocol}://${req.get("host")}`;
}

function createShareInfo(req, fileName) {
  const baseUrl = getPublicBaseUrl(req);
  const encodedName = encodeURIComponent(fileName);
  const title = path.basename(fileName, ".mp4");
  const shareUrl = `${baseUrl}/outputs/${encodedName}`;
  return {
    fileName,
    shareUrl,
    title: `${title} - Highlight Studio`,
    description: "Highlight Studio에서 생성한 태권도 하이라이트 영상입니다.",
    thumbnailUrl: `${baseUrl}/share-thumbnail.svg`,
    kakao: {
      ready: Boolean(process.env.KAKAO_JS_KEY || process.env.KAKAO_JAVASCRIPT_KEY || process.env.KAKAO_SDK_KEY),
      javascriptKeyConfigured: Boolean(process.env.KAKAO_JS_KEY || process.env.KAKAO_JAVASCRIPT_KEY),
      sdkKeyConfigured: Boolean(process.env.KAKAO_SDK_KEY)
    }
  };
}

module.exports = {
  resolveOutputMp4,
  outputFilePayload,
  getPublicBaseUrl,
  createShareInfo
};
