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

const supportedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
let photos = [];
let selectedPhotoIds = new Set();
let activePreviewId = null;
let draggedPhotoId = null;

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

function getImageSize(url) {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve({ width: 0, height: 0 });
    image.src = url;
  });
}

function updateStats() {
  const totalSize = photos.reduce((sum, photo) => sum + photo.file.size, 0);
  const secondsPerPhoto = Number(secondsInput.value || 2);
  photoCount.textContent = `${photos.length} photos`;
  photoSize.textContent = formatBytes(totalSize);
  selectedCount.textContent = `${selectedPhotoIds.size} selected`;
  estimatedDuration.textContent = formatDuration(photos.length * secondsPerPhoto);
  generateButton.disabled = photos.length === 0;
}

function setMessage(text) {
  message.textContent = text;
}

function renderList() {
  if (!photos.length) {
    photoList.innerHTML = `<div class="empty-state">Uploaded thumbnails will appear here.</div>`;
    activePreviewId = null;
    renderPreview();
    updateStats();
    return;
  }

  photoList.innerHTML = photos.map((photo, index) => {
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
          <strong>${index + 1}. ${escapeHtml(photo.file.name)}</strong>
          <span>${resolution}</span>
          <span>${formatBytes(photo.file.size)}</span>
        </div>
        <div class="row-actions">
          <button type="button" data-action="up" data-id="${escapeHtml(photo.id)}" ${index === 0 ? "disabled" : ""}>Up</button>
          <button type="button" data-action="down" data-id="${escapeHtml(photo.id)}" ${index === photos.length - 1 ? "disabled" : ""}>Down</button>
          <button type="button" data-action="remove" data-id="${escapeHtml(photo.id)}">Delete</button>
        </div>
      </article>
    `;
  }).join("");

  if (!activePreviewId || !photos.some(photo => photo.id === activePreviewId)) {
    activePreviewId = photos[0].id;
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
    </div>
  `;
  prevPreviewButton.disabled = activeIndex <= 0;
  nextPreviewButton.disabled = activeIndex >= photos.length - 1;
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
      height: size.height
    };
  }));

  photos = [...photos, ...nextPhotos];
  if (!activePreviewId && photos.length) activePreviewId = photos[0].id;
  setMessage("Photos added in browser memory. Nothing was uploaded to the server.");
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
  renderList();
}

function clearAllPhotos() {
  photos.forEach(photo => URL.revokeObjectURL(photo.url));
  photos = [];
  selectedPhotoIds = new Set();
  activePreviewId = null;
  setMessage("All photos were removed from browser memory.");
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
  selectedPhotoIds = new Set(photos.map(photo => photo.id));
  renderList();
});

clearSelectionButton.addEventListener("click", () => {
  selectedPhotoIds = new Set();
  renderList();
});

clearAllButton.addEventListener("click", clearAllPhotos);

secondsInput.addEventListener("change", updateStats);

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
  setMessage("STEP 2 complete: photo management is ready. MP4 generation stays disabled until STEP 3.");
});

fetch("/health")
  .then(res => res.json())
  .then(data => { serverStatus.textContent = data.app ? `localhost:${data.port}` : "localhost:4000"; })
  .catch(() => { serverStatus.textContent = "localhost:4000"; });

renderList();
