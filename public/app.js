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

const supportedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const labelColors = ["#2563eb", "#16a34a", "#f97316", "#9333ea", "#0891b2", "#dc2626", "#4f46e5", "#0f766e"];

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
  return minutes ? `${minutes}m ${rest}s` : `${rest}s`;
}

function getSecondsPerPhoto() {
  return Number(secondsInput.value || 2);
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
  photoCount.textContent = `${photos.length} photos`;
  photoSize.textContent = formatBytes(totalSize);
  selectedCount.textContent = `${selectedPhotoIds.size} selected`;
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
  if (!studentList) return;
  if (!students.length) {
    studentList.innerHTML = `<div class="empty-state compact">Add students to start manual tagging.</div>`;
  } else {
    studentList.innerHTML = students.map(student => {
      const taggedCount = photos.filter(photo => photo.studentIds.has(student.id)).length;
      return `
        <article class="student-card">
          <span class="student-dot" style="background:${student.color}"></span>
          <div>
            <strong>${escapeHtml(student.name)}</strong>
            <small>${taggedCount} photos tagged</small>
          </div>
        </article>
      `;
    }).join("");
  }

  const options = [
    `<option value="all">All photos</option>`,
    ...students.map(student => `<option value="student:${student.id}">${escapeHtml(student.name)} only</option>`),
    `<option value="untagged">Untagged photos</option>`
  ];
  tagFilter.innerHTML = options.join("");
  tagFilter.value = activeFilter;
}

function renderPhotoTags(photo) {
  if (!photo.studentIds.size) return `<span class="tag-empty">No student tags</span>`;
  return Array.from(photo.studentIds).map(studentId => {
    const student = getStudent(studentId);
    if (!student) return "";
    return `<span class="student-pill" style="--tag-color:${student.color}">${escapeHtml(student.name)}</span>`;
  }).join("");
}

function renderTagButtons(photo) {
  if (!students.length) return `<span class="tag-hint">Add a student first.</span>`;
  return students.map(student => {
    const pressed = photo.studentIds.has(student.id) ? "true" : "false";
    const activeClass = photo.studentIds.has(student.id) ? " is-on" : "";
    return `
      <button class="tag-toggle${activeClass}" type="button" data-action="tag" data-id="${photo.id}" data-student-id="${student.id}" aria-pressed="${pressed}" style="--tag-color:${student.color}">
        ${escapeHtml(student.name)}
      </button>
    `;
  }).join("");
}

function renderList() {
  const visiblePhotos = getFilteredPhotos();
  if (!photos.length) {
    photoList.innerHTML = `<div class="empty-state">Uploaded thumbnails will appear here.</div>`;
    activePreviewId = null;
    renderPreview();
    updateStats();
    return;
  }

  if (!visiblePhotos.length) {
    photoList.innerHTML = `<div class="empty-state">No photos match this filter.</div>`;
    renderPreview();
    updateStats();
    return;
  }

  photoList.innerHTML = visiblePhotos.map(photo => {
    const realIndex = photos.findIndex(item => item.id === photo.id);
    const isSelected = selectedPhotoIds.has(photo.id) ? "checked" : "";
    const isActive = photo.id === activePreviewId ? " is-active" : "";
    const resolution = photo.width && photo.height ? `${photo.width} x ${photo.height}` : "Reading size";
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
          <div class="tag-list">${renderPhotoTags(photo)}</div>
          <div class="tag-controls">${renderTagButtons(photo)}</div>
        </div>
        <div class="row-actions">
          <button type="button" data-action="up" data-id="${escapeHtml(photo.id)}" ${realIndex === 0 ? "disabled" : ""}>Up</button>
          <button type="button" data-action="down" data-id="${escapeHtml(photo.id)}" ${realIndex === photos.length - 1 ? "disabled" : ""}>Down</button>
          <button type="button" data-action="remove" data-id="${escapeHtml(photo.id)}">Delete</button>
        </div>
      </article>
    `;
  }).join("");

  if (!activePreviewId || !photos.some(photo => photo.id === activePreviewId)) {
    activePreviewId = visiblePhotos[0]?.id || photos[0].id;
  }
  renderPreview();
  updateStats();
}

function renderPreview() {
  const activeIndex = photos.findIndex(photo => photo.id === activePreviewId);
  const activePhoto = photos[activeIndex];

  if (!activePhoto) {
    largePreview.innerHTML = `<div class="empty-state">Select a photo to preview it here.</div>`;
    prevPreviewButton.disabled = true;
    nextPreviewButton.disabled = true;
    return;
  }

  const resolution = activePhoto.width && activePhoto.height ? `${activePhoto.width} x ${activePhoto.height}` : "Reading size";
  largePreview.innerHTML = `
    <img src="${activePhoto.url}" alt="">
    <div class="preview-caption">
      <strong>${escapeHtml(activePhoto.file.name)}</strong>
      <span>${activeIndex + 1} / ${photos.length} - ${resolution} - ${formatBytes(activePhoto.file.size)}</span>
      <div class="tag-list">${renderPhotoTags(activePhoto)}</div>
    </div>
  `;
  prevPreviewButton.disabled = activeIndex <= 0;
  nextPreviewButton.disabled = activeIndex >= photos.length - 1;
}

function updateStudentPrep() {
  if (!studentPrepSummary) return;
  let targetPhotos = [];
  let label = "All photos";

  if (activeFilter.startsWith("student:")) {
    const student = getStudent(activeFilter.slice("student:".length));
    if (student) {
      label = student.name;
      targetPhotos = photos.filter(photo => photo.studentIds.has(student.id));
    }
  } else if (activeFilter === "untagged") {
    label = "Untagged photos";
    targetPhotos = photos.filter(photo => photo.studentIds.size === 0);
  } else {
    targetPhotos = photos;
  }

  studentPrepSummary.innerHTML = `
    <strong>${escapeHtml(label)}</strong>
    <span>${targetPhotos.length} photos / ${formatDuration(targetPhotos.length * getSecondsPerPhoto())}</span>
  `;
  selectStudentPhotosButton.disabled = !targetPhotos.length;
}

async function addFiles(fileList) {
  const files = Array.from(fileList || []).filter(file => supportedTypes.has(file.type));
  if (!files.length) {
    setMessage("Only JPG, PNG, and WEBP photos are supported.");
    return;
  }

  const nextPhotos = await Promise.all(files.map(async (file, index) => {
    const url = URL.createObjectURL(file);
    const size = await getImageSize(url);
    return {
      id: `${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
      file,
      url,
      width: size.width,
      height: size.height,
      studentIds: new Set()
    };
  }));

  photos = [...photos, ...nextPhotos];
  if (!activePreviewId && photos.length) activePreviewId = photos[0].id;
  setMessage("Photos added in browser memory. Manual student tagging is ready.");
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
  activePreviewId = id;
  renderList();
}

function removePhoto(id) {
  const photo = photos.find(item => item.id === id);
  if (photo) URL.revokeObjectURL(photo.url);
  photos = photos.filter(item => item.id !== id);
  selectedPhotoIds.delete(id);
  if (activePreviewId === id) activePreviewId = photos[0]?.id || null;
  renderStudents();
  renderList();
}

function clearAllPhotos() {
  photos.forEach(photo => URL.revokeObjectURL(photo.url));
  photos = [];
  selectedPhotoIds = new Set();
  activePreviewId = null;
  setMessage("All photos were removed from browser memory.");
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
  setMessage(`${name} was added. Tag photos manually from each thumbnail.`);
  renderStudents();
  renderList();
}

function toggleTag(photoId, studentId) {
  const photo = photos.find(item => item.id === photoId);
  if (!photo) return;
  if (photo.studentIds.has(studentId)) photo.studentIds.delete(studentId);
  else photo.studentIds.add(studentId);
  activePreviewId = photoId;
  renderStudents();
  renderList();
}

function selectFilteredPhotos() {
  const targetIds = getFilteredPhotos().map(photo => photo.id);
  selectedPhotoIds = new Set(targetIds);
  setMessage(`${targetIds.length} photos selected for the current student/filter.`);
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
  if (!event.target.matches("input[data-action='select']")) return;
  const id = event.target.dataset.id;
  if (event.target.checked) selectedPhotoIds.add(id);
  else selectedPhotoIds.delete(id);
  updateStats();
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
  renderList();
});

clearSelectionButton.addEventListener("click", () => {
  selectedPhotoIds = new Set();
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
  setMessage("STEP 3 complete: manual student tagging is ready. MP4 generation stays disabled until STEP 4.");
});

fetch("/health")
  .then(res => res.json())
  .then(data => { serverStatus.textContent = data.app ? `localhost:${data.port}` : "localhost:4000"; })
  .catch(() => { serverStatus.textContent = "localhost:4000"; });

renderStudents();
renderList();
