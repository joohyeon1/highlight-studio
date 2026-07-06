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

const supportedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const labelColors = ["#2563eb", "#16a34a", "#f97316", "#9333ea", "#0891b2", "#dc2626", "#4f46e5", "#0f766e"];

const photoEffectOptions = [
  { value: "none", label: "\uc5c6\uc74c" },
  { value: "slowZoomIn", label: "\ucc9c\ucc9c\ud788 \ud655\ub300" },
  { value: "slowZoomOut", label: "\ucc9c\ucc9c\ud788 \ucd95\uc18c" },
  { value: "panHorizontal", label: "\uc88c\uc6b0 \uc774\ub3d9" },
  { value: "panVertical", label: "\uc0c1\ud558 \uc774\ub3d9" },
  { value: "shake", label: "\ud754\ub4e4\ub9bc" },
  { value: "bright", label: "\ubc1d\uac8c" },
  { value: "dynamicZoom", label: "\uc5ed\ub3d9\ud615 \uc90c" }
];

const transitionOptions = [
  { value: "none", label: "\uc5c6\uc74c" },
  { value: "fade", label: "\ud398\uc774\ub4dc" },
  { value: "crossfade", label: "\ud06c\ub85c\uc2a4 \ud398\uc774\ub4dc" },
  { value: "slideLeft", label: "\uc67c\ucabd \uc2ac\ub77c\uc774\ub4dc" },
  { value: "slideRight", label: "\uc624\ub978\ucabd \uc2ac\ub77c\uc774\ub4dc" },
  { value: "slideUp", label: "\uc704\ub85c \uc2ac\ub77c\uc774\ub4dc" },
  { value: "slideDown", label: "\uc544\ub798\ub85c \uc2ac\ub77c\uc774\ub4dc" },
  { value: "zoomIn", label: "\ud655\ub300 \uc804\ud658" },
  { value: "zoomOut", label: "\ucd95\uc18c \uc804\ud658" },
  { value: "flash", label: "\ud50c\ub798\uc2dc" },
  { value: "blur", label: "\ube14\ub7ec" },
  { value: "push", label: "\ubc00\uc5b4\ub0b4\uae30" }
];

const transitionPresets = {
  basic: ["fade", "crossfade", "fade"],
  emotional: ["crossfade", "fade", "blur", "crossfade"],
  taekwondo: ["flash", "push", "slideLeft", "zoomIn", "slideRight"],
  dynamic: ["zoomIn", "flash", "push", "slideUp", "zoomOut"],
  kids: ["fade", "slideRight", "slideLeft", "crossfade"],
  competition: ["flash", "zoomIn", "push", "crossfade"]
};

let photos = [];
let students = [];
let selectedPhotoIds = new Set();
let activePreviewId = null;
let draggedPhotoId = null;
let activeFilter = "all";

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

function getSecondsPerPhoto() {
  return Number(secondsInput.value || 2);
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
  estimatedDuration.textContent = formatDuration(photos.length * getSecondsPerPhoto());
  generateButton.disabled = photos.length === 0;
  updateStudentPrep();
}

function setMessage(text) {
  message.textContent = text;
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
          <img src="${photo.url}" alt="">
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
  largePreview.innerHTML = `
    <img src="${activePhoto.url}" alt="">
    <div class="preview-caption">
      <strong>${escapeHtml(activePhoto.file.name)}</strong>
      <span>${activeIndex + 1} / ${photos.length} - ${resolution} - ${formatBytes(activePhoto.file.size)}</span>
      <span>\uc0ac\uc9c4 \ud6a8\uacfc: ${effectLabel}</span>
      <div class="tag-list">${renderPhotoTags(activePhoto)}</div>
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

  timelineList.innerHTML = photos.map((photo, index) => {
    const effectLabel = photoEffectOptions.find(option => option.value === photo.photoEffect)?.label || "\uc5c6\uc74c";
    const transitionBlock = index < photos.length - 1 ? `
      <div class="timeline-transition">
        <span>${index + 1} \u2192 ${index + 2}</span>
        <select data-action="transition-after" data-id="${escapeHtml(photo.id)}">
          ${optionMarkup(transitionOptions, photo.transitionAfter || "none")}
        </select>
      </div>
    ` : "";
    return `
      <div class="timeline-item">
        <button class="timeline-photo" type="button" data-action="preview" data-id="${escapeHtml(photo.id)}">
          <img src="${photo.url}" alt="">
          <strong>${index + 1}</strong>
          <span>${effectLabel}</span>
        </button>
        ${transitionBlock}
      </div>
    `;
  }).join("");
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
    <span>${targetPhotos.length}\uc7a5 / ${formatDuration(targetPhotos.length * getSecondsPerPhoto())}</span>
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
      photoEffect: "none",
      transitionAfter: defaultTransition
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
    else if (!photo.transitionAfter) photo.transitionAfter = defaultTransitionInput.value || "fade";
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

function updateTransitionAfter(photoId, value) {
  const photo = photos.find(item => item.id === photoId);
  if (!photo) return;
  photo.transitionAfter = value;
  setMessage("\uc0ac\uc9c4 \uc0ac\uc774 \uc804\ud658\ud6a8\uacfc\ub97c \uc218\uc815\ud588\uc2b5\ub2c8\ub2e4.");
  renderTimeline();
}

function applyTransitionPreset() {
  const pattern = transitionPresets[transitionPresetInput.value] || transitionPresets.basic;
  photos.forEach((photo, index) => {
    if (index < photos.length - 1) photo.transitionAfter = pattern[index % pattern.length];
  });
  normalizeLastTransition();
  setMessage("\ud504\ub9ac\uc14b\uc744 \uc801\uc6a9\ud588\uc2b5\ub2c8\ub2e4. \uac01 \uc0ac\uc9c4 \uc0ac\uc774 \uc804\ud658\ud6a8\uacfc\ub294 \ub2e4\uc2dc \uac1c\ubcc4 \uc218\uc815\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.");
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

timelineList.addEventListener("click", event => {
  const target = event.target.closest("[data-action='preview']");
  if (!target) return;
  activePreviewId = target.dataset.id;
  renderList();
});

timelineList.addEventListener("change", event => {
  const target = event.target;
  if (target.matches("select[data-action='transition-after']")) {
    updateTransitionAfter(target.dataset.id, target.value);
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
  setMessage("\uc601\uc0c1 \uc0dd\uc131 \uc900\ube44 \uc644\ub8cc: \ud0c0\uc784\ub77c\uc778 \ud6a8\uacfc \ub370\uc774\ud130\ub9cc \uc900\ube44\ub418\uc5c8\uc2b5\ub2c8\ub2e4. \uc2e4\uc81c MP4 \uc0dd\uc131\uc740 \ub2e4\uc74c \ub2e8\uacc4\uc785\ub2c8\ub2e4.");
});

fetch("/health")
  .then(res => res.json())
  .then(data => { serverStatus.textContent = data.app ? `localhost:${data.port}` : "localhost:4000"; })
  .catch(() => { serverStatus.textContent = "localhost:4000"; });

defaultTransitionInput.innerHTML = optionMarkup(transitionOptions, "fade");
renderStudents();
renderList();
