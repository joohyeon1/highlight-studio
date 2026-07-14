const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const DEFAULT_TEMPLATES = require("./default-templates");

const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.resolve(process.env.HIGHLIGHT_DATA_DIR || path.join(ROOT_DIR, "data"));
const USER_TEMPLATES_PATH = path.join(DATA_DIR, "templates.json");

function makeId(prefix = "video") {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`;
}

function safeTemplateName(value) {
  const name = String(value || "").trim().slice(0, 80);
  if (!name) throw new Error("템플릿 이름을 입력해 주세요.");
  return name;
}

function readUserTemplates() {
  try {
    const data = JSON.parse(fs.readFileSync(USER_TEMPLATES_PATH, "utf8"));
    return Array.isArray(data.templates) ? data.templates : [];
  } catch (_) {
    return [];
  }
}

function writeUserTemplates(templates) {
  fs.writeFileSync(USER_TEMPLATES_PATH, JSON.stringify({ version: 1, templates }, null, 2), "utf8");
}

function sanitizeTemplatePayload(body = {}, existing = {}) {
  const now = new Date().toISOString();
  return {
    id: existing.id || makeId("template"),
    name: safeTemplateName(body.name || existing.name),
    category: String(body.category || existing.category || "custom").slice(0, 40),
    description: String(body.description || existing.description || "").slice(0, 240),
    builtIn: false,
    settings: body.settings && typeof body.settings === "object" ? body.settings : existing.settings || {},
    createdAt: existing.createdAt || now,
    updatedAt: now
  };
}

function getAllTemplates() {
  const userTemplates = readUserTemplates().map(template => ({ ...template, builtIn: false }));
  return [...DEFAULT_TEMPLATES, ...userTemplates];
}

module.exports = {
  safeTemplateName,
  readUserTemplates,
  writeUserTemplates,
  sanitizeTemplatePayload,
  getAllTemplates
};
