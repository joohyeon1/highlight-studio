const photoInput = document.getElementById("photoInput");
const dropZone = document.getElementById("dropZone");
const photoList = document.getElementById("photoList");
const photoCount = document.getElementById("photoCount");
const photoSize = document.getElementById("photoSize");
const selectedCount = document.getElementById("selectedCount");
const estimatedDuration = document.getElementById("estimatedDuration");
const secondsInput = document.getElementById("secondsInput");
const selectAllButton = document.getElementById("selectAllButton");
const clearSelectionButton = document.getElementById("clearSelectionButton");
const clearAllButton = document.getElementById("clearAllButton");
const largePreview = document.getElementById("largePreview");
const prevPreviewButton = document.getElementById("prevPreviewButton");
const nextPreviewButton = document.getElementById("nextPreviewButton");
const generateButton = document.getElementById("generateButton");
const message = document.getElementById("message");
const serverStatus = document.getElementById("serverStatus");
const studentNameInput = document.getElementById("studentNameInput");
const addStudentButton = document.getElementById("addStudentButton");
const studentList = document.getElementById("studentList");
const tagFilter = document.getElementById("tagFilter");
const studentPrepSummary = document.getElementById("studentPrepSummary");
const selectStudentPhotosButton = document.getElementById("selectStudentPhotosButton");
const defaultTransitionInput = document.getElementById("defaultTransitionInput");
const transitionPresetInput = document.getElementById("transitionPresetInput");
const applyPresetButton = document.getElementById("applyPresetButton");
const timelineList = document.getElementById("timelineList");
const timelineStatus = document.getElementById("timelineStatus");
const transitionEditor = document.getElementById("transitionEditor");
const titleInput = document.getElementById("titleInput");
const templateInput = document.getElementById("templateInput");
const bgmInput = document.getElementById("bgmInput");
const bgmName = document.getElementById("bgmName");
const openingCaptionInput = document.getElementById("openingCaptionInput");
const endingCaptionInput = document.getElementById("endingCaptionInput");
const newProjectButton = document.getElementById("newProjectButton");
const openProjectButton = document.getElementById("openProjectButton");
const saveProjectButton = document.getElementById("saveProjectButton");
const saveAsProjectButton = document.getElementById("saveAsProjectButton");
const projectInput = document.getElementById("projectInput");
const projectStatus = document.getElementById("projectStatus");

const supportedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const autosaveKey = "highlightStudio.autosaveProject";
const projectFormatVersion = 1;
const labelColors = ["#2563eb", "#16a34a", "#f97316", "#9333ea", "#0891b2", "#dc2626", "#4f46e5", "#0f766e"];

const photoEffectOptions = [
  { value: "none", label: "\uc5c6\uc74c" },
  { value: "slowZoomIn", label: "\ucc9c\ucc9c\ud788 \ud655\ub300" },
  { value: "slowZoomOut", label: "\ucc9c\ucc9c\ud788 \ucd95\uc18c" },
  { value: "panLeft", label: "\uc67c\ucabd \uc774\ub3d9" },
  { value: "panRight", label: "\uc624\ub978\ucabd \uc774\ub3d9" },
  { value: "panUp", label: "\uc704\ub85c \uc774\ub3d9" },
  { value: "panDown", label: "\uc544\ub798\ub85c \uc774\ub3d9" },
  { value: "shake", label: "\ud754\ub4e4\ub9bc" },
  { value: "bright", label: "\ubc1d\uac8c" },
  { value: "dynamicZoom", label: "\uc5ed\ub3d9\ud615 \uc90c" }
];

const captionPositionOptions = [
  { value: "top", label: "\uc0c1\ub2e8" },
  { value: "center", label: "\uc911\uc559" },
  { value: "bottom", label: "\ud558\ub2e8" }
];

const captionStyleOptions = [
  { value: "basic", label: "\uae30\ubcf8" },
  { value: "bold", label: "\uad75\uac8c" },
  { value: "shadow", label: "\uadf8\ub9bc\uc790" },
  { value: "backdrop", label: "\ubc18\ud22c\uba85 \ubc30\uacbd" }
];

const captionTimingOptions = [
  { value: "full", label: "\uc0ac\uc9c4 \uc804\uccb4 \uc2dc\uac04 \ub3d9\uc548 \ud45c\uc2dc" },
  { value: "start", label: "\uc2dc\uc791 1\ucd08\ub9cc \ud45c\uc2dc" },
  { value: "end", label: "\ub05d 1\ucd08\ub9cc \ud45c\uc2dc" }
];

const transitionOptions = [
  { value: "none", label: "\uc5c6\uc74c", icon: "--" },
  { value: "fade", label: "\ud398\uc774\ub4dc", icon: "F" },
  { value: "crossfade", label: "\ud06c\ub85c\uc2a4 \ud398\uc774\ub4dc", icon: "XF" },
  { value: "slideLeft", label: "\uc2ac\ub77c\uc774\ub4dc \uc67c\ucabd", icon: "L" },
  { value: "slideRight", label: "\uc2ac\ub77c\uc774\ub4dc \uc624\ub978\ucabd", icon: "R" },
  { value: "slideUp", label: "\uc2ac\ub77c\uc774\ub4dc \uc704", icon: "U" },
  { value: "slideDown", label: "\uc2ac\ub77c\uc774\ub4dc \uc544\ub798", icon: "D" },
  { value: "zoomIn", label: "\ud655\ub300", icon: "+" },
  { value: "zoomOut", label: "\ucd95\uc18c", icon: "-" },
  { value: "flash", label: "\ud50c\ub798\uc2dc", icon: "FL" },
  { value: "blur", label: "\ube14\ub7ec", icon: "BL" },
  { value: "push", label: "\ubc00\uc5b4\ub0b4\uae30", icon: "P" },
  { value: "rotate", label: "\ud68c\uc804", icon: "RT" },
  { value: "dissolve", label: "\ub514\uc878\ube0c", icon: "DZ" }
];

const transitionDurationOptions = [0.2, 0.5, 1, 1.5, 2];

const transitionPresets = {
  basic: [
    { type: "fade", duration: 0.5 },
    { type: "crossfade", duration: 0.5 }
  ],
  emotional: [
    { type: "fade", duration: 1 },
    { type: "crossfade", duration: 1.5 },
    { type: "fade", duration: 1 },
    { type: "blur", duration: 1 }
  ],
  taekwondo: [
    { type: "slideLeft", duration: 0.5 },
    { type: "flash", duration: 0.2 },
    { type: "slideRight", duration: 0.5 },
    { type: "flash", duration: 0.2 }
  ],
  dynamic: [
    { type: "zoomIn", duration: 0.5 },
    { type: "push", duration: 0.5 },
    { type: "zoomOut", duration: 0.5 },
    { type: "push", duration: 0.5 }
  ],
  kids: [
    { type: "crossfade", duration: 1 },
    { type: "fade", duration: 1.5 },
    { type: "crossfade", duration: 1 }
  ],
  competition: [
    { type: "zoomIn", duration: 0.5 },
    { type: "rotate", duration: 0.5 },
    { type: "zoomIn", duration: 0.5 },
    { type: "rotate", duration: 0.5 }
  ]
};

const photoEffectPresets = {
  basic: ["none", "slowZoomIn", "slowZoomOut"],
  emotional: ["slowZoomIn", "bright", "slowZoomOut", "none"],
  taekwondo: ["dynamicZoom", "shake", "panLeft", "panRight", "slowZoomIn"],
  dynamic: ["dynamicZoom", "panUp", "shake", "panDown", "slowZoomIn"],
  kids: ["bright", "panRight", "panLeft", "slowZoomIn"],
  competition: ["dynamicZoom", "bright", "shake", "slowZoomOut"]
};

let photos = [];
let students = [];
let selectedPhotoIds = new Set();
let activePreviewId = null;
let draggedPhotoId = null;
let draggedTimelinePhotoId = null;
let activeFilter = "all";
let timelineZoom = 100;
let activeTransitionPhotoId = null;
let projectName = "\ud0dc\uad8c\ub3c4 \ud558\uc774\ub77c\uc774\ud2b8";
let projectCreatedAt = new Date().toISOString();
let projectModifiedAt = projectCreatedAt;
let currentProjectFileName = "";
let bgmReference = null;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]));
}

function formatBytes(value) {
  if (!value) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(unit ? 1 : 0)} ${units[unit]}`;
}

function formatDuration(seconds) {
  const total = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return minutes ? `${minutes}\ubd84 ${rest}\ucd08` : `${rest}\ucd08`;
}

function formatDateTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("ko-KR", { hour12: false });
}

function safeFileName(value) {
  return String(value || "highlight-studio-project")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 80) || "highlight-studio-project";
}

function createPhotoPlaceholder(photo) {
  const name = photo.file?.name || photo.fileName || "\uc0ac\uc9c4 \ucc38\uc870";
  const resolution = photo.width && photo.height ? `${photo.width} x ${photo.height}` : "\uc6d0\ubcf8 \ud30c\uc77c \ucc38\uc870";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
      <rect width="640" height="400" fill="#0f172a"/>
      <rect x="40" y="40" width="560" height="320" rx="18" fill="#1e293b" stroke="#60a5fa" stroke-width="3" stroke-dasharray="10 8"/>
      <text x="320" y="182" text-anchor="middle" fill="#e2e8f0" font-family="Arial, sans-serif" font-size="28" font-weight="700">${escapeHtml(name)}</text>
      <text x="320" y="226" text-anchor="middle" fill="#93c5fd" font-family="Arial, sans-serif" font-size="20">${escapeHtml(resolution)}</text>
      <text x="320" y="266" text-anchor="middle" fill="#cbd5e1" font-family="Arial, sans-serif" font-size="18">\uc6d0\ubcf8 \uc0ac\uc9c4\uc740 .hsp\uc5d0 \ud3ec\ud568\ub418\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function getPhotoUrl(photo) {
  if (!photo.url) photo.url = createPhotoPlaceholder(photo);
  return photo.url;
}

function getSecondsPerPhoto() {
  return Number(secondsInput.value || 2);
}

function createTransition(type = "fade", duration = 0.5) {
  return {
    type,
    duration: Number(duration) || 0.5
  };
}

function getTransitionType(transition) {
  if (!transition) return "none";
  if (typeof transition === "string") return transition;
  return transition.type || "none";
}

function getTransitionDuration(transition) {
  if (!transition) return 0.5;
  if (typeof transition === "string") return 0.5;
  return Number(transition.duration) || 0.5;
}

function getTransitionOption(type) {
  return transitionOptions.find(option => option.value === type) || transitionOptions[0];
}

function formatTransitionDuration(value) {
  return `${Number(value).toFixed(1).replace(/\.0$/, "")}\ucd08`;
}

function renderTransitionSummary(transition) {
  const option = getTransitionOption(getTransitionType(transition));
  return {
    icon: option.icon,
    label: option.label,
    duration: formatTransitionDuration(getTransitionDuration(transition))
  };
}

function createCaption(overrides = {}) {
  return {
    text: "",
    position: "bottom",
    style: "shadow",
    timing: "full",
    ...overrides
  };
}

function normalizeCaption(caption) {
  return createCaption(caption || {});
}

function serializePhoto(photo, index) {
  return {
    id: photo.id,
    order: index,
    fileName: photo.file?.name || photo.fileName || "",
    fileType: photo.file?.type || photo.fileType || "",
    fileSize: photo.file?.size || photo.fileSize || 0,
    lastModified: photo.file?.lastModified || photo.lastModified || null,
    referencePath: photo.referencePath || photo.file?.name || photo.fileName || "",
    width: photo.width || 0,
    height: photo.height || 0,
    selected: selectedPhotoIds.has(photo.id),
    students: Array.from(photo.studentIds || photo.students || []),
    photoEffect: photo.photoEffect || "none",
    duration: Number(photo.duration || photo.durationSeconds || getSecondsPerPhoto()),
    durationSeconds: Number(photo.durationSeconds || photo.duration || getSecondsPerPhoto()),
    transitionAfter: photo.transitionAfter ? createTransition(getTransitionType(photo.transitionAfter), getTransitionDuration(photo.transitionAfter)) : null,
    caption: normalizeCaption(photo.caption)
  };
}

function createProjectData() {
  const now = new Date().toISOString();
  projectModifiedAt = now;
  projectName = titleInput.value.trim() || projectName || "Highlight Studio Project";
  return {
    format: "Highlight Studio Project",
    extension: ".hsp",
    version: projectFormatVersion,
    project: {
      name: projectName,
      createdAt: projectCreatedAt,
      modifiedAt: projectModifiedAt
    },
    video: {
      title: titleInput.value,
      template: templateInput.value,
      defaultTransition: defaultTransitionInput.value,
      secondsPerPhoto: getSecondsPerPhoto(),
      openingCaption: openingCaptionInput.value,
      endingCaption: endingCaptionInput.value,
      bgm: bgmReference,
      outputOptions: {
        format: "mp4",
        generationEnabled: false
      }
    },
    students: students.map(student => ({ ...student })),
    photos: photos.map(serializePhoto)
  };
}

function restoreProjectData(data) {
  if (!data || !Array.isArray(data.photos)) throw new Error("Invalid project file");
  photos.forEach(photo => {
    if (photo.url && photo.url.startsWith("blob:")) URL.revokeObjectURL(photo.url);
  });

  projectName = data.project?.name || data.video?.title || "Highlight Studio Project";
  projectCreatedAt = data.project?.createdAt || new Date().toISOString();
  projectModifiedAt = data.project?.modifiedAt || projectCreatedAt;
  titleInput.value = data.video?.title || projectName;
  templateInput.value = data.video?.template || "dynamic";
  defaultTransitionInput.value = data.video?.defaultTransition || "fade";
  secondsInput.value = String(data.video?.secondsPerPhoto || 2);
  openingCaptionInput.value = data.video?.openingCaption || "";
  endingCaptionInput.value = data.video?.endingCaption || "";
  bgmReference = data.video?.bgm || null;
  bgmName.textContent = bgmReference?.name ? `BGM: ${bgmReference.name}` : "\uc120\ud0dd\ub41c BGM \uc5c6\uc74c";

  students = (data.students || []).map((student, index) => ({
    id: student.id || `student-${Date.now()}-${index}`,
    name: student.name || "\ud559\uc0dd",
    color: student.color || labelColors[index % labelColors.length]
  }));

  photos = data.photos
    .slice()
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    .map((photo, index) => {
      const file = {
        name: photo.fileName || photo.referencePath || `photo-${index + 1}`,
        type: photo.fileType || "image/reference",
        size: Number(photo.fileSize || 0),
        lastModified: photo.lastModified || null
      };
      const studentIds = new Set(photo.students || []);
      return {
        id: photo.id || `restored-${Date.now()}-${index}`,
        file,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        referencePath: photo.referencePath || file.name,
        previewUrl: "",
        url: "",
        selected: Boolean(photo.selected),
        students: Array.from(studentIds),
        studentIds,
        width: Number(photo.width || 0),
        height: Number(photo.height || 0),
        duration: Number(photo.duration || photo.durationSeconds || getSecondsPerPhoto()),
        durationSeconds: Number(photo.durationSeconds || photo.duration || getSecondsPerPhoto()),
        photoEffect: photo.photoEffect || "none",
        caption: normalizeCaption(photo.caption),
        transitionAfter: photo.transitionAfter ? createTransition(getTransitionType(photo.transitionAfter), getTransitionDuration(photo.transitionAfter)) : null
      };
    });
  selectedPhotoIds = new Set(photos.filter(photo => photo.selected).map(photo => photo.id));
  activePreviewId = photos[0]?.id || null;
  activeFilter = "all";
  normalizeLastTransition();
  setProjectStatus(`\ubd88\ub7ec\uc634: ${formatDateTime(projectModifiedAt)}`);
  renderStudents();
  renderList();
}

function setProjectStatus(text) {
  if (projectStatus) projectStatus.textContent = text;
}

function getEstimatedSeconds() {
  return photos.reduce((sum, photo) => sum + Number(photo.durationSeconds || getSecondsPerPhoto()), 0);
}

function optionMarkup(options, selectedValue) {
  return options.map(option => {
    const selected = option.value === selectedValue ? "selected" : "";
    return `<option value="${option.value}" ${selected}>${option.label}</option>`;
  }).join("");
}

function getImageSize(url) {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve({ width: 0, height: 0 });
    image.src = url;
  });
}

function getFilteredPhotos() {
  if (activeFilter === "untagged") return photos.filter(photo => photo.studentIds.size === 0);
  if (activeFilter.startsWith("student:")) {
    const studentId = activeFilter.slice("student:".length);
    return photos.filter(photo => photo.studentIds.has(studentId));
  }
  return photos;
}

function updateStats() {
  const totalSize = photos.reduce((sum, photo) => sum + photo.file.size, 0);
  photoCount.textContent = `${photos.length}\uc7a5`;
  photoSize.textContent = formatBytes(totalSize);
  selectedCount.textContent = `${selectedPhotoIds.size}\uc7a5 \uc120\ud0dd`;
  estimatedDuration.textContent = formatDuration(getEstimatedSeconds());
  generateButton.disabled = photos.length === 0;
  updateStudentPrep();
  updateTimelineStatus();
}

function setMessage(text) {
  message.textContent = text;
}

function downloadProject(data, fileName) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName.endsWith(".hsp") ? fileName : `${fileName}.hsp`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function saveProject(options = {}) {
  const data = createProjectData();
  if (options.askName || !currentProjectFileName) {
    const nextName = window.prompt("\ud504\ub85c\uc81d\ud2b8 \ud30c\uc77c\uba85\uc744 \uc785\ub825\ud558\uc138\uc694.", currentProjectFileName || safeFileName(data.project.name));
    if (!nextName) return;
    currentProjectFileName = safeFileName(nextName.replace(/\.hsp$/i, ""));
  }
  downloadProject(data, currentProjectFileName);
  localStorage.setItem(autosaveKey, JSON.stringify(data));
  setProjectStatus(`\uc800\uc7a5\ub428: ${formatDateTime(data.project.modifiedAt)}`);
  setMessage(".hsp \ud504\ub85c\uc81d\ud2b8 \ud30c\uc77c\uc744 \uc800\uc7a5\ud588\uc2b5\ub2c8\ub2e4. \uc0ac\uc9c4 \uc6d0\ubcf8\uc740 \ud3ec\ud568\ub418\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.");
}

function autosaveProject() {
  try {
    const data = createProjectData();
    localStorage.setItem(autosaveKey, JSON.stringify(data));
    setProjectStatus(`\uc790\ub3d9 \uc800\uc7a5: ${formatDateTime(data.project.modifiedAt)}`);
  } catch (error) {
    setProjectStatus("\uc790\ub3d9 \uc800\uc7a5 \uc2e4\ud328");
  }
}

function newProject() {
  if (photos.length && !window.confirm("\ud604\uc7ac \uc791\uc5c5\uc744 \ucd08\uae30\ud654\ud558\uace0 \uc0c8 \ud504\ub85c\uc81d\ud2b8\ub97c \uc2dc\uc791\ud560\uae4c\uc694?")) return;
  photos.forEach(photo => {
    if (photo.url && photo.url.startsWith("blob:")) URL.revokeObjectURL(photo.url);
  });
  photos = [];
  students = [];
  selectedPhotoIds = new Set();
  activePreviewId = null;
  activeFilter = "all";
  activeTransitionPhotoId = null;
  projectName = "\ud0dc\uad8c\ub3c4 \ud558\uc774\ub77c\uc774\ud2b8";
  projectCreatedAt = new Date().toISOString();
  projectModifiedAt = projectCreatedAt;
  currentProjectFileName = "";
  bgmReference = null;
  titleInput.value = projectName;
  templateInput.value = "dynamic";
  secondsInput.value = "2";
  defaultTransitionInput.value = "fade";
  openingCaptionInput.value = "";
  endingCaptionInput.value = "";
  bgmInput.value = "";
  bgmName.textContent = "\uc120\ud0dd\ub41c BGM \uc5c6\uc74c";
  localStorage.removeItem(autosaveKey);
  setProjectStatus("\uc0c8 \ud504\ub85c\uc81d\ud2b8");
  setMessage("\uc0c8 \ud504\ub85c\uc81d\ud2b8\ub97c \uc2dc\uc791\ud588\uc2b5\ub2c8\ub2e4.");
  renderStudents();
  renderList();
}

function openProjectFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      currentProjectFileName = safeFileName(file.name.replace(/\.hsp$/i, ""));
      restoreProjectData(data);
      localStorage.setItem(autosaveKey, JSON.stringify(createProjectData()));
      setMessage(".hsp \ud504\ub85c\uc81d\ud2b8\ub97c \ubd88\ub7ec\uc654\uc2b5\ub2c8\ub2e4. \uc6d0\ubcf8 \uc0ac\uc9c4\uc740 \ucc38\uc870 \uc815\ubcf4\ub85c\ub9cc \ubcf5\uc6d0\ub429\ub2c8\ub2e4.");
    } catch (error) {
      setMessage("\ud504\ub85c\uc81d\ud2b8 \ud30c\uc77c\uc744 \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4. .hsp \ud30c\uc77c\uc744 \ud655\uc778\ud558\uc138\uc694.");
    }
  };
  reader.readAsText(file);
}

function restoreAutosaveIfWanted() {
  const raw = localStorage.getItem(autosaveKey);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    if (window.confirm("\uc774\uc804 \uc791\uc5c5\uc744 \ubcf5\uc6d0\ud558\uc2dc\uaca0\uc2b5\ub2c8\uae4c?")) {
      restoreProjectData(data);
      setMessage("\uc774\uc804 \uc790\ub3d9 \uc800\uc7a5 \uc791\uc5c5\uc744 \ubcf5\uc6d0\ud588\uc2b5\ub2c8\ub2e4.");
    }
  } catch (error) {
    localStorage.removeItem(autosaveKey);
  }
}

function getStudent(studentId) {
  return students.find(student => student.id === studentId);
}

function renderStudents() {
  if (!students.length) {
    studentList.innerHTML = `<div class="empty-state compact">\ud559\uc0dd\uc744 \ucd94\uac00\ud55c \ud6c4 \uc0ac\uc9c4\uc744 \ud0dc\uadf8\ud558\uc138\uc694.</div>`;
  } else {
    studentList.innerHTML = students.map(student => {
      const taggedCount = photos.filter(photo => photo.studentIds.has(student.id)).length;
      return `
        <article class="student-card">
          <span class="student-dot" style="background:${student.color}"></span>
          <div>
            <strong>${escapeHtml(student.name)}</strong>
            <small>${taggedCount}\uc7a5 \ud0dc\uadf8\ub428</small>
          </div>
        </article>
      `;
    }).join("");
  }

  const options = [
    `<option value="all">\uc804\uccb4 \uc0ac\uc9c4</option>`,
    ...students.map(student => `<option value="student:${student.id}">${escapeHtml(student.name)} \uc0ac\uc9c4\ub9cc \ubcf4\uae30</option>`),
    `<option value="untagged">\ud0dc\uadf8 \uc5c6\ub294 \uc0ac\uc9c4</option>`
  ];
  tagFilter.innerHTML = options.join("");
  tagFilter.value = activeFilter;
}

function renderPhotoTags(photo) {
  if (!photo.studentIds.size) return `<span class="tag-empty">\ud559\uc0dd \ud0dc\uadf8 \uc5c6\uc74c</span>`;
  return Array.from(photo.studentIds).map(studentId => {
    const student = getStudent(studentId);
    if (!student) return "";
    return `<span class="student-pill" style="--tag-color:${student.color}">${escapeHtml(student.name)}</span>`;
  }).join("");
}

function renderTagButtons(photo) {
  if (!students.length) return `<span class="tag-hint">\uba3c\uc800 \ud559\uc0dd\uc744 \ucd94\uac00\ud558\uc138\uc694.</span>`;
  return students.map(student => {
    const activeClass = photo.studentIds.has(student.id) ? " is-on" : "";
    const pressed = photo.studentIds.has(student.id) ? "true" : "false";
    return `
      <button class="tag-toggle${activeClass}" type="button" data-action="tag" data-id="${photo.id}" data-student-id="${student.id}" aria-pressed="${pressed}" style="--tag-color:${student.color}">
        ${escapeHtml(student.name)}
      </button>
    `;
  }).join("");
}

function renderPhotoEffectControl(photo) {
  return `
    <label class="inline-select">\uc0ac\uc9c4 \ud6a8\uacfc
      <select data-action="photo-effect" data-id="${escapeHtml(photo.id)}">
        ${optionMarkup(photoEffectOptions, photo.photoEffect)}
      </select>
    </label>
  `;
}

function renderList() {
  const visiblePhotos = getFilteredPhotos();
  if (!photos.length) {
    photoList.innerHTML = `<div class="empty-state">\uc5c5\ub85c\ub4dc\ud55c \uc0ac\uc9c4\uc774 \uc5ec\uae30\uc5d0 \ud45c\uc2dc\ub429\ub2c8\ub2e4.</div>`;
    activePreviewId = null;
    renderPreview();
    renderTimeline();
    updateStats();
    return;
  }

  if (!visiblePhotos.length) {
    photoList.innerHTML = `<div class="empty-state">\ud604\uc7ac \ud544\ud130\uc5d0 \ud574\ub2f9\ud558\ub294 \uc0ac\uc9c4\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.</div>`;
    renderPreview();
    renderTimeline();
    updateStats();
    return;
  }

  photoList.innerHTML = visiblePhotos.map(photo => {
    const realIndex = photos.findIndex(item => item.id === photo.id);
    const isSelected = selectedPhotoIds.has(photo.id) ? "checked" : "";
    const isActive = photo.id === activePreviewId ? " is-active" : "";
    const resolution = photo.width && photo.height ? `${photo.width} x ${photo.height}` : "\ud574\uc0c1\ub3c4 \ud655\uc778 \uc911";
    return `
      <article class="photo-row${isActive}" draggable="true" data-id="${escapeHtml(photo.id)}">
        <label class="select-cell">
          <input type="checkbox" data-action="select" data-id="${escapeHtml(photo.id)}" ${isSelected}>
        </label>
        <button class="thumb-button" type="button" data-action="preview" data-id="${escapeHtml(photo.id)}">
          <img src="${getPhotoUrl(photo)}" alt="">
        </button>
        <div class="photo-meta">
          <strong>${realIndex + 1}. ${escapeHtml(photo.file.name)}</strong>
          <span>${resolution}</span>
          <span>${formatBytes(photo.file.size)}</span>
          ${renderPhotoEffectControl(photo)}
          <div class="tag-list">${renderPhotoTags(photo)}</div>
          <div class="tag-controls">${renderTagButtons(photo)}</div>
        </div>
        <div class="row-actions">
          <button type="button" data-action="up" data-id="${escapeHtml(photo.id)}" ${realIndex === 0 ? "disabled" : ""}>\uc704\ub85c</button>
          <button type="button" data-action="down" data-id="${escapeHtml(photo.id)}" ${realIndex === photos.length - 1 ? "disabled" : ""}>\uc544\ub798\ub85c</button>
          <button type="button" data-action="remove" data-id="${escapeHtml(photo.id)}">\uc0ad\uc81c</button>
        </div>
      </article>
    `;
  }).join("");

  if (!activePreviewId || !photos.some(photo => photo.id === activePreviewId)) {
    activePreviewId = visiblePhotos[0]?.id || photos[0].id;
  }
  renderPreview();
  renderTimeline();
  updateStats();
}

function renderPreview() {
  const activeIndex = photos.findIndex(photo => photo.id === activePreviewId);
  const activePhoto = photos[activeIndex];

  if (!activePhoto) {
    largePreview.innerHTML = `<div class="empty-state">\uc0ac\uc9c4\uc744 \uc120\ud0dd\ud558\uba74 \ud06c\uac8c \ubcfc \uc218 \uc788\uc2b5\ub2c8\ub2e4.</div>`;
    prevPreviewButton.disabled = true;
    nextPreviewButton.disabled = true;
    return;
  }

  const resolution = activePhoto.width && activePhoto.height ? `${activePhoto.width} x ${activePhoto.height}` : "\ud574\uc0c1\ub3c4 \ud655\uc778 \uc911";
  const effectLabel = photoEffectOptions.find(option => option.value === activePhoto.photoEffect)?.label || "\uc5c6\uc74c";
  const caption = normalizeCaption(activePhoto.caption);
  activePhoto.caption = caption;
  const captionPreview = caption.text.trim() ? escapeHtml(caption.text) : "\uc7a5\uba74\ubcc4 \uc790\ub9c9 \ubbf8\ub9ac\ubcf4\uae30";
  largePreview.innerHTML = `
    <div class="preview-stage">
      <img src="${getPhotoUrl(activePhoto)}" alt="">
      <div class="scene-caption is-${caption.position} is-${caption.style}">${captionPreview}</div>
    </div>
    <div class="preview-caption property-sheet">
      <strong>${escapeHtml(activePhoto.file.name)}</strong>
      <span>${activeIndex + 1} / ${photos.length} - ${resolution} - ${formatBytes(activePhoto.file.size)}</span>
      <span>\uc0ac\uc9c4 \ud6a8\uacfc: ${effectLabel}</span>
      <div class="tag-list">${renderPhotoTags(activePhoto)}</div>
      <label>\uc0ac\uc9c4 \ud6a8\uacfc
        <select data-action="property-photo-effect" data-id="${escapeHtml(activePhoto.id)}">
          ${optionMarkup(photoEffectOptions, activePhoto.photoEffect)}
        </select>
      </label>
      <label>\uc0ac\uc9c4\ub2f9 \uc2dc\uac04
        <select data-action="property-duration" data-id="${escapeHtml(activePhoto.id)}">
          ${[1, 2, 3, 4, 5, 6].map(value => `<option value="${value}" ${Number(activePhoto.durationSeconds) === value ? "selected" : ""}>${value}\ucd08</option>`).join("")}
        </select>
      </label>
      <div class="caption-editor">
        <strong>\uc7a5\uba74\ubcc4 \uc790\ub9c9</strong>
        <label>\uc790\ub9c9 \ub0b4\uc6a9
          <textarea data-action="property-caption-text" data-id="${escapeHtml(activePhoto.id)}" rows="3" maxlength="120" placeholder="\uc774 \uc0ac\uc9c4\uc5d0 \ub4e4\uc5b4\uac08 \uc790\ub9c9\uc744 \uc785\ub825\ud558\uc138\uc694.">${escapeHtml(caption.text)}</textarea>
        </label>
        <div class="caption-property-grid">
          <label>\uc790\ub9c9 \uc704\uce58
            <select data-action="property-caption-position" data-id="${escapeHtml(activePhoto.id)}">
              ${optionMarkup(captionPositionOptions, caption.position)}
            </select>
          </label>
          <label>\uc790\ub9c9 \uc2a4\ud0c0\uc77c
            <select data-action="property-caption-style" data-id="${escapeHtml(activePhoto.id)}">
              ${optionMarkup(captionStyleOptions, caption.style)}
            </select>
          </label>
          <label>\ud45c\uc2dc \uc2dc\uac04
            <select data-action="property-caption-timing" data-id="${escapeHtml(activePhoto.id)}">
              ${optionMarkup(captionTimingOptions, caption.timing)}
            </select>
          </label>
        </div>
      </div>
      <button class="danger-button" type="button" data-action="property-remove" data-id="${escapeHtml(activePhoto.id)}">\uc0ac\uc9c4 \uc0ad\uc81c</button>
    </div>
  `;
  prevPreviewButton.disabled = activeIndex <= 0;
  nextPreviewButton.disabled = activeIndex >= photos.length - 1;
}

function renderTimeline() {
  if (!timelineList) return;
  if (!photos.length) {
    timelineList.innerHTML = `<div class="empty-state">\uc0ac\uc9c4\uc744 \ucd94\uac00\ud558\uba74 \ud0c0\uc784\ub77c\uc778\uc774 \uc5ec\uae30\uc5d0 \ud45c\uc2dc\ub429\ub2c8\ub2e4.</div>`;
    return;
  }

  timelineList.className = `timeline-list timeline-zoom-${timelineZoom}`;
  timelineList.innerHTML = photos.map((photo, index) => {
    const effectLabel = photoEffectOptions.find(option => option.value === photo.photoEffect)?.label || "\uc5c6\uc74c";
    const transition = renderTransitionSummary(photo.transitionAfter);
    const isActive = photo.id === activePreviewId ? " is-active" : "";
    const transitionBlock = index < photos.length - 1 ? `
      <div class="timeline-transition">
        <span>${index + 1} \u2192 ${index + 2}</span>
        <button type="button" data-action="open-transition" data-id="${escapeHtml(photo.id)}">
          <strong>${transition.icon}</strong>
          <span>${transition.label}</span>
          <em>${transition.duration}</em>
        </button>
      </div>
    ` : "";
    return `
      <div class="timeline-item" draggable="true" data-id="${escapeHtml(photo.id)}">
        <button class="timeline-photo${isActive}" type="button" data-action="preview" data-id="${escapeHtml(photo.id)}">
          <img src="${getPhotoUrl(photo)}" alt="">
          <strong>${index + 1}</strong>
          <span>${effectLabel}</span>
          <em>${Number(photo.durationSeconds || getSecondsPerPhoto())}\ucd08</em>
        </button>
        ${transitionBlock}
      </div>
    `;
  }).join("");
  updateTimelineStatus();
}

function updateTimelineStatus() {
  if (!timelineStatus) return;
  const index = photos.findIndex(photo => photo.id === activePreviewId);
  const current = index >= 0 ? `${index + 1} / ${photos.length}` : "\ud604\uc7ac \uc120\ud0dd \uc5c6\uc74c";
  timelineStatus.textContent = `${photos.length}\uc7a5 / ${current}`;
}

function renderTransitionEditor(photoId) {
  const photo = photos.find(item => item.id === photoId);
  if (!photo) {
    transitionEditor.classList.add("is-hidden");
    transitionEditor.innerHTML = "";
    activeTransitionPhotoId = null;
    return;
  }
  activeTransitionPhotoId = photoId;
  const currentType = getTransitionType(photo.transitionAfter);
  const currentDuration = getTransitionDuration(photo.transitionAfter);
  transitionEditor.classList.remove("is-hidden");
  transitionEditor.innerHTML = `
    <div class="transition-editor-head">
      <strong>\uc804\ud658\ud6a8\uacfc \uc120\ud0dd</strong>
      <button type="button" data-action="close-transition">\ub2eb\uae30</button>
    </div>
    <label class="transition-duration-control">
      <span>\uc804\ud658\uc2dc\uac04</span>
      <select data-action="transition-duration" data-id="${escapeHtml(photo.id)}">
        ${transitionDurationOptions.map(duration => {
          const selected = duration === currentDuration ? " selected" : "";
          return `<option value="${duration}"${selected}>${formatTransitionDuration(duration)}</option>`;
        }).join("")}
      </select>
    </label>
    <div class="transition-option-grid">
      ${transitionOptions.map(option => {
        const activeClass = option.value === currentType ? " is-active" : "";
        return `<button type="button" class="transition-choice${activeClass}" data-action="choose-transition" data-value="${option.value}"><strong>${option.icon}</strong><span>${option.label}</span></button>`;
      }).join("")}
    </div>
  `;
}

function updateStudentPrep() {
  if (!studentPrepSummary) return;
  let targetPhotos = [];
  let label = "\uc804\uccb4 \uc0ac\uc9c4";

  if (activeFilter.startsWith("student:")) {
    const student = getStudent(activeFilter.slice("student:".length));
    if (student) {
      label = student.name;
      targetPhotos = photos.filter(photo => photo.studentIds.has(student.id));
    }
  } else if (activeFilter === "untagged") {
    label = "\ud0dc\uadf8 \uc5c6\ub294 \uc0ac\uc9c4";
    targetPhotos = photos.filter(photo => photo.studentIds.size === 0);
  } else {
    targetPhotos = photos;
  }

  studentPrepSummary.innerHTML = `
    <strong>${escapeHtml(label)}</strong>
    <span>${targetPhotos.length}\uc7a5 / ${formatDuration(targetPhotos.reduce((sum, photo) => sum + Number(photo.durationSeconds || getSecondsPerPhoto()), 0))}</span>
  `;
  selectStudentPhotosButton.disabled = !targetPhotos.length;
}

async function addFiles(fileList) {
  const files = Array.from(fileList || []).filter(file => supportedTypes.has(file.type));
  if (!files.length) {
    setMessage("JPG, PNG, WEBP \uc0ac\uc9c4\ub9cc \uc0ac\uc6a9\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.");
    return;
  }

  const defaultTransition = defaultTransitionInput.value || "fade";
  const nextPhotos = await Promise.all(files.map(async (file, index) => {
    const url = URL.createObjectURL(file);
    const size = await getImageSize(url);
    return {
      id: `${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
      file,
      previewUrl: url,
      url,
      selected: false,
      students: [],
      studentIds: new Set(),
      width: size.width,
      height: size.height,
      durationSeconds: getSecondsPerPhoto(),
      duration: getSecondsPerPhoto(),
      photoEffect: "none",
      caption: createCaption(),
      transitionAfter: createTransition(defaultTransition, 0.5)
    };
  }));

  photos = [...photos, ...nextPhotos];
  if (photos.length) photos[photos.length - 1].transitionAfter = null;
  if (!activePreviewId && photos.length) activePreviewId = photos[0].id;
  setMessage("\uc0ac\uc9c4\uc774 \ube0c\ub77c\uc6b0\uc800 \uba54\ubaa8\ub9ac\uc5d0 \ucd94\uac00\ub418\uc5c8\uc2b5\ub2c8\ub2e4. \ud0c0\uc784\ub77c\uc778 \uc804\ud658\ud6a8\uacfc\ub97c \uc124\uc815\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.");
  renderStudents();
  renderList();
}

function findIndexById(id) {
  return photos.findIndex(photo => photo.id === id);
}

function movePhoto(id, direction) {
  const fromIndex = findIndexById(id);
  const toIndex = fromIndex + direction;
  if (fromIndex < 0 || toIndex < 0 || toIndex >= photos.length) return;
  const next = [...photos];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  photos = next;
  normalizeLastTransition();
  activePreviewId = id;
  renderList();
}

function movePhotoTo(id, targetId) {
  if (!id || !targetId || id === targetId) return;
  const fromIndex = findIndexById(id);
  const toIndex = findIndexById(targetId);
  if (fromIndex < 0 || toIndex < 0) return;
  const next = [...photos];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  photos = next;
  normalizeLastTransition();
  activePreviewId = id;
  renderList();
}

function normalizeLastTransition() {
  photos.forEach((photo, index) => {
    if (index === photos.length - 1) photo.transitionAfter = null;
    else if (!photo.transitionAfter) photo.transitionAfter = createTransition(defaultTransitionInput.value || "fade", 0.5);
    else if (typeof photo.transitionAfter === "string") photo.transitionAfter = createTransition(photo.transitionAfter, 0.5);
  });
}

function removePhoto(id) {
  const photo = photos.find(item => item.id === id);
  if (photo) URL.revokeObjectURL(photo.url);
  photos = photos.filter(item => item.id !== id);
  selectedPhotoIds.delete(id);
  normalizeLastTransition();
  if (activePreviewId === id) activePreviewId = photos[0]?.id || null;
  renderStudents();
  renderList();
}

function clearAllPhotos() {
  photos.forEach(photo => URL.revokeObjectURL(photo.url));
  photos = [];
  selectedPhotoIds = new Set();
  activePreviewId = null;
  setMessage("\ubaa8\ub4e0 \uc0ac\uc9c4\uc774 \ube0c\ub77c\uc6b0\uc800 \uba54\ubaa8\ub9ac\uc5d0\uc11c \uc0ad\uc81c\ub418\uc5c8\uc2b5\ub2c8\ub2e4.");
  renderStudents();
  renderList();
}

function addStudent() {
  const name = studentNameInput.value.trim();
  if (!name) return;
  const student = {
    id: `student-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    color: labelColors[students.length % labelColors.length]
  };
  students = [...students, student];
  studentNameInput.value = "";
  setMessage(`${name} \ud559\uc0dd\uc744 \ucd94\uac00\ud588\uc2b5\ub2c8\ub2e4. \uac01 \uc0ac\uc9c4\uc5d0\uc11c \ud559\uc0dd\uc744 \uc218\ub3d9\uc73c\ub85c \ud0dc\uadf8\ud558\uc138\uc694.`);
  renderStudents();
  renderList();
}

function toggleTag(photoId, studentId) {
  const photo = photos.find(item => item.id === photoId);
  if (!photo) return;
  if (photo.studentIds.has(studentId)) photo.studentIds.delete(studentId);
  else photo.studentIds.add(studentId);
  photo.students = Array.from(photo.studentIds);
  activePreviewId = photoId;
  renderStudents();
  renderList();
}

function selectFilteredPhotos() {
  const targetIds = getFilteredPhotos().map(photo => photo.id);
  selectedPhotoIds = new Set(targetIds);
  photos.forEach(photo => { photo.selected = selectedPhotoIds.has(photo.id); });
  setMessage(`\ud604\uc7ac \ud544\ud130\uc758 \uc0ac\uc9c4 ${targetIds.length}\uc7a5\uc744 \uc120\ud0dd\ud588\uc2b5\ub2c8\ub2e4.`);
  renderList();
}

function updatePhotoEffect(photoId, value) {
  const photo = photos.find(item => item.id === photoId);
  if (!photo) return;
  photo.photoEffect = value;
  activePreviewId = photoId;
  renderList();
}

function updatePhotoDuration(photoId, value) {
  const photo = photos.find(item => item.id === photoId);
  if (!photo) return;
  photo.durationSeconds = Number(value) || getSecondsPerPhoto();
  photo.duration = photo.durationSeconds;
  activePreviewId = photoId;
  renderList();
}

function updatePhotoCaption(photoId, key, value, options = {}) {
  const photo = photos.find(item => item.id === photoId);
  if (!photo) return;
  photo.caption = {
    ...normalizeCaption(photo.caption),
    [key]: value
  };
  activePreviewId = photoId;
  if (options.render === false) {
    const captionTarget = largePreview.querySelector(".scene-caption");
    if (captionTarget) captionTarget.textContent = photo.caption.text.trim() || "\uc7a5\uba74\ubcc4 \uc790\ub9c9 \ubbf8\ub9ac\ubcf4\uae30";
    return;
  }
  renderPreview();
}

function updateTransitionAfter(photoId, value, duration) {
  const photo = photos.find(item => item.id === photoId);
  if (!photo) return;
  photo.transitionAfter = createTransition(value, duration || getTransitionDuration(photo.transitionAfter));
  setMessage("\uc0ac\uc9c4 \uc0ac\uc774 \uc804\ud658\ud6a8\uacfc\ub97c \uc218\uc815\ud588\uc2b5\ub2c8\ub2e4.");
  renderTimeline();
  renderTransitionEditor(photoId);
}

function updateTransitionDuration(photoId, value) {
  const photo = photos.find(item => item.id === photoId);
  if (!photo) return;
  photo.transitionAfter = createTransition(getTransitionType(photo.transitionAfter), Number(value));
  setMessage("\uc804\ud658\uc2dc\uac04\uc744 \uc218\uc815\ud588\uc2b5\ub2c8\ub2e4.");
  renderTimeline();
  renderTransitionEditor(photoId);
}

function applyTransitionPreset() {
  const preset = transitionPresetInput.value;
  const transitionPattern = transitionPresets[preset] || transitionPresets.basic;
  const photoEffectPattern = photoEffectPresets[preset] || photoEffectPresets.basic;
  photos.forEach((photo, index) => {
    photo.photoEffect = photoEffectPattern[index % photoEffectPattern.length];
    if (index < photos.length - 1) {
      const transition = transitionPattern[index % transitionPattern.length];
      photo.transitionAfter = createTransition(transition.type, transition.duration);
    }
  });
  normalizeLastTransition();
  setMessage("\ud504\ub9ac\uc14b\uc744 \uc801\uc6a9\ud588\uc2b5\ub2c8\ub2e4. \uc0ac\uc9c4\ubcc4 \ud6a8\uacfc\uc640 \uc804\ud658\ud6a8\uacfc\ub294 \ub2e4\uc2dc \uac1c\ubcc4 \uc218\uc815\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.");
  renderList();
}

photoInput.addEventListener("change", () => {
  addFiles(photoInput.files);
  photoInput.value = "";
});

["dragenter", "dragover"].forEach(eventName => {
  dropZone.addEventListener(eventName, event => {
    event.preventDefault();
    dropZone.classList.add("is-dragging");
  });
});

["dragleave", "drop"].forEach(eventName => {
  dropZone.addEventListener(eventName, event => {
    event.preventDefault();
    dropZone.classList.remove("is-dragging");
  });
});

dropZone.addEventListener("drop", event => {
  addFiles(event.dataTransfer.files);
});

photoList.addEventListener("click", event => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const id = target.dataset.id;
  const action = target.dataset.action;

  if (action === "preview") {
    activePreviewId = id;
    renderList();
  }
  if (action === "up") movePhoto(id, -1);
  if (action === "down") movePhoto(id, 1);
  if (action === "remove") removePhoto(id);
  if (action === "tag") toggleTag(id, target.dataset.studentId);
});

photoList.addEventListener("change", event => {
  const target = event.target;
  if (target.matches("input[data-action='select']")) {
    const id = target.dataset.id;
    if (target.checked) selectedPhotoIds.add(id);
    else selectedPhotoIds.delete(id);
    photos.forEach(photo => { photo.selected = selectedPhotoIds.has(photo.id); });
    updateStats();
  }
  if (target.matches("select[data-action='photo-effect']")) {
    updatePhotoEffect(target.dataset.id, target.value);
  }
});

largePreview.addEventListener("change", event => {
  const target = event.target;
  if (target.matches("select[data-action='property-photo-effect']")) {
    updatePhotoEffect(target.dataset.id, target.value);
  }
  if (target.matches("select[data-action='property-duration']")) {
    updatePhotoDuration(target.dataset.id, target.value);
  }
  if (target.matches("select[data-action='property-caption-position']")) {
    updatePhotoCaption(target.dataset.id, "position", target.value);
  }
  if (target.matches("select[data-action='property-caption-style']")) {
    updatePhotoCaption(target.dataset.id, "style", target.value);
  }
  if (target.matches("select[data-action='property-caption-timing']")) {
    updatePhotoCaption(target.dataset.id, "timing", target.value);
  }
});

largePreview.addEventListener("input", event => {
  const target = event.target;
  if (target.matches("textarea[data-action='property-caption-text']")) {
    updatePhotoCaption(target.dataset.id, "text", target.value, { render: false });
  }
});

largePreview.addEventListener("click", event => {
  const target = event.target.closest("[data-action='property-remove']");
  if (target) removePhoto(target.dataset.id);
});

timelineList.addEventListener("click", event => {
  const transitionTarget = event.target.closest("[data-action='open-transition']");
  if (transitionTarget) {
    renderTransitionEditor(transitionTarget.dataset.id);
    return;
  }
  const target = event.target.closest("[data-action='preview']");
  if (target) {
    activePreviewId = target.dataset.id;
    renderList();
  }
});

timelineList.addEventListener("dragstart", event => {
  const item = event.target.closest(".timeline-item");
  if (!item) return;
  draggedTimelinePhotoId = item.dataset.id;
  item.classList.add("is-dragging");
});

timelineList.addEventListener("dragend", event => {
  event.target.closest(".timeline-item")?.classList.remove("is-dragging");
  draggedTimelinePhotoId = null;
});

timelineList.addEventListener("dragover", event => {
  if (event.target.closest(".timeline-item")) event.preventDefault();
});

timelineList.addEventListener("drop", event => {
  event.preventDefault();
  const item = event.target.closest(".timeline-item");
  if (item) movePhotoTo(draggedTimelinePhotoId, item.dataset.id);
});

transitionEditor.addEventListener("click", event => {
  const closeTarget = event.target.closest("[data-action='close-transition']");
  if (closeTarget) {
    transitionEditor.classList.add("is-hidden");
    transitionEditor.innerHTML = "";
    activeTransitionPhotoId = null;
    return;
  }
  const choice = event.target.closest("[data-action='choose-transition']");
  if (choice && activeTransitionPhotoId) {
    updateTransitionAfter(activeTransitionPhotoId, choice.dataset.value);
  }
});

transitionEditor.addEventListener("change", event => {
  const target = event.target;
  if (target.matches("select[data-action='transition-duration']")) {
    updateTransitionDuration(target.dataset.id, target.value);
  }
});

photoList.addEventListener("dragstart", event => {
  const row = event.target.closest(".photo-row");
  if (!row) return;
  draggedPhotoId = row.dataset.id;
  row.classList.add("is-dragging");
});

photoList.addEventListener("dragend", event => {
  event.target.closest(".photo-row")?.classList.remove("is-dragging");
  draggedPhotoId = null;
});

photoList.addEventListener("dragover", event => {
  if (event.target.closest(".photo-row")) event.preventDefault();
});

photoList.addEventListener("drop", event => {
  event.preventDefault();
  const row = event.target.closest(".photo-row");
  if (row) movePhotoTo(draggedPhotoId, row.dataset.id);
});

selectAllButton.addEventListener("click", () => {
  selectedPhotoIds = new Set(getFilteredPhotos().map(photo => photo.id));
  photos.forEach(photo => { photo.selected = selectedPhotoIds.has(photo.id); });
  renderList();
});

clearSelectionButton.addEventListener("click", () => {
  selectedPhotoIds = new Set();
  photos.forEach(photo => { photo.selected = false; });
  renderList();
});

clearAllButton.addEventListener("click", clearAllPhotos);
secondsInput.addEventListener("change", updateStats);
titleInput.addEventListener("input", () => {
  projectName = titleInput.value.trim() || projectName;
});
bgmInput.addEventListener("change", () => {
  const file = bgmInput.files?.[0];
  bgmReference = file ? {
    name: file.name,
    type: file.type,
    size: file.size,
    lastModified: file.lastModified,
    referencePath: file.name
  } : null;
  bgmName.textContent = bgmReference ? `BGM: ${bgmReference.name}` : "\uc120\ud0dd\ub41c BGM \uc5c6\uc74c";
  setMessage(bgmReference ? "BGM \ucc38\uc870 \uc815\ubcf4\ub97c \ucd94\uac00\ud588\uc2b5\ub2c8\ub2e4. \uc6d0\ubcf8 \uc74c\uc6d0\uc740 .hsp\uc5d0 \ud3ec\ud568\ub418\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4." : "BGM \uc120\ud0dd\uc744 \ud574\uc81c\ud588\uc2b5\ub2c8\ub2e4.");
});
addStudentButton.addEventListener("click", addStudent);
studentNameInput.addEventListener("keydown", event => {
  if (event.key === "Enter") addStudent();
});
tagFilter.addEventListener("change", () => {
  activeFilter = tagFilter.value;
  renderList();
});
selectStudentPhotosButton.addEventListener("click", selectFilteredPhotos);
applyPresetButton.addEventListener("click", applyTransitionPreset);
document.querySelectorAll(".zoom-button").forEach(button => {
  button.addEventListener("click", () => {
    timelineZoom = Number(button.dataset.zoom) || 100;
    document.querySelectorAll(".zoom-button").forEach(item => item.classList.toggle("is-active", item === button));
    renderTimeline();
  });
});

newProjectButton.addEventListener("click", newProject);
openProjectButton.addEventListener("click", () => projectInput.click());
saveProjectButton.addEventListener("click", () => saveProject());
saveAsProjectButton.addEventListener("click", () => saveProject({ askName: true }));
projectInput.addEventListener("change", () => {
  openProjectFile(projectInput.files?.[0]);
  projectInput.value = "";
});

prevPreviewButton.addEventListener("click", () => {
  const index = findIndexById(activePreviewId);
  if (index > 0) {
    activePreviewId = photos[index - 1].id;
    renderList();
  }
});

nextPreviewButton.addEventListener("click", () => {
  const index = findIndexById(activePreviewId);
  if (index >= 0 && index < photos.length - 1) {
    activePreviewId = photos[index + 1].id;
    renderList();
  }
});

generateButton.addEventListener("click", () => {
  setMessage("\uc601\uc0c1 \uc0dd\uc131 \uc900\ube44 \uc644\ub8cc: \uc790\ub9c9\uacfc \ud0c0\uc784\ub77c\uc778 \ub370\uc774\ud130\ub9cc \uc900\ube44\ub418\uc5c8\uc2b5\ub2c8\ub2e4. \uc2e4\uc81c MP4 \uc0dd\uc131\uc740 \ub2e4\uc74c \ub2e8\uacc4\uc785\ub2c8\ub2e4.");
});

fetch("/health")
  .then(res => res.json())
  .then(data => { serverStatus.textContent = data.app ? `localhost:${data.port}` : "localhost:4000"; })
  .catch(() => { serverStatus.textContent = "localhost:4000"; });

defaultTransitionInput.innerHTML = optionMarkup(transitionOptions, "fade");
renderStudents();
renderList();
restoreAutosaveIfWanted();
setInterval(autosaveProject, 5 * 60 * 1000);
