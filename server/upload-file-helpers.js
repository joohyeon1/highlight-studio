function displayFileName(value, fallback = "photo") {
  return String(value || fallback)
    .replace(/[\r\n\t]/g, " ")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .trim()
    .slice(0, 160) || fallback;
}

function decodeUploadName(value) {
  const name = String(value || "");
  if (!name || /[가-힣]/.test(name)) return name;
  try {
    const decoded = Buffer.from(name, "latin1").toString("utf8");
    if (decoded && !decoded.includes("\uFFFD") && /[가-힣]/.test(decoded)) return decoded;
  } catch (_) {}
  return name;
}

function normalizeUploadedFiles(files = []) {
  for (const file of files) {
    file.originalname = decodeUploadName(file.originalname);
  }
  return files;
}

module.exports = {
  displayFileName,
  decodeUploadName,
  normalizeUploadedFiles
};
