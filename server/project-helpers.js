const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.resolve(process.env.HIGHLIGHT_DATA_DIR || path.join(ROOT_DIR, "data"));
const BACKUP_DIR = path.join(DATA_DIR, "backups");

function safeName(value) {
  return String(value || "highlight")
    .normalize("NFC")
    .replace(/[^a-zA-Z0-9가-힣_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "highlight";
}

function validateProjectDocument(value) {
  const project = value && typeof value === "object" ? value : null;
  if (!project) throw new Error("프로젝트 데이터가 없습니다.");
  if (project.extension && project.extension !== ".hsp") throw new Error(".hsp 프로젝트 형식이 아닙니다.");
  if (project.format && project.format !== "Highlight Studio Project") throw new Error("Highlight Studio 프로젝트 파일이 아닙니다.");
  if (!Array.isArray(project.photos)) throw new Error("사진 목록이 없는 프로젝트입니다.");
  if (!project.project || typeof project.project !== "object") {
    project.project = {
      name: project.video?.title || "Highlight Studio Project",
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString()
    };
  }
  if (!project.video || typeof project.video !== "object") project.video = {};
  project.extension = ".hsp";
  project.format = "Highlight Studio Project";
  project.version = Number(project.version || 1);
  project.project.name = String(project.project.name || project.video.title || "Highlight Studio Project").slice(0, 120);
  project.project.createdAt = project.project.createdAt || new Date().toISOString();
  project.project.modifiedAt = new Date().toISOString();
  return project;
}

function projectFileName(project, fallback = "highlight-studio-project.hsp") {
  return `${safeName(project?.project?.name || project?.video?.title || fallback.replace(/\.hsp$/i, ""))}.hsp`;
}

function projectBackupFileName(project) {
  const base = safeName(project?.project?.name || project?.video?.title || "highlight-studio-project");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${stamp}-${base}.hsp.json`;
}

async function cleanupOldBackups(limit = Number(process.env.HIGHLIGHT_BACKUP_LIMIT || 10)) {
  const entries = await fs.promises.readdir(BACKUP_DIR, { withFileTypes: true });
  const backups = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".hsp.json")) continue;
    const fullPath = path.join(BACKUP_DIR, entry.name);
    const stat = await fs.promises.stat(fullPath);
    backups.push({ name: entry.name, fullPath, modifiedAt: stat.mtime });
  }
  backups.sort((a, b) => b.modifiedAt - a.modifiedAt);
  await Promise.all(backups.slice(Math.max(0, limit)).map(item => fs.promises.rm(item.fullPath, { force: true })));
}

async function listProjectBackups() {
  const entries = await fs.promises.readdir(BACKUP_DIR, { withFileTypes: true });
  const backups = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".hsp.json")) continue;
    const fullPath = path.join(BACKUP_DIR, entry.name);
    try {
      const data = JSON.parse(await fs.promises.readFile(fullPath, "utf8"));
      const project = data.project || {};
      backups.push({
        id: entry.name,
        fileName: entry.name,
        name: project.project?.name || project.video?.title || "Highlight Studio Project",
        source: data.source || "backup",
        photoCount: Array.isArray(project.photos) ? project.photos.length : 0,
        savedAt: data.savedAt || project.project?.modifiedAt || ""
      });
    } catch (_) {}
  }
  backups.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
  return backups.slice(0, Number(process.env.HIGHLIGHT_BACKUP_LIMIT || 10));
}

module.exports = {
  validateProjectDocument,
  projectFileName,
  projectBackupFileName,
  cleanupOldBackups,
  listProjectBackups
};
