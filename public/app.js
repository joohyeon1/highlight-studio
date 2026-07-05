const photoInput = document.getElementById("photoInput");
const previewGrid = document.getElementById("previewGrid");
const photoCount = document.getElementById("photoCount");
const photoSize = document.getElementById("photoSize");
const generateButton = document.getElementById("generateButton");
const downloadButton = document.getElementById("downloadButton");
const message = document.getElementById("message");
const titleInput = document.getElementById("titleInput");
const secondsInput = document.getElementById("secondsInput");
const serverStatus = document.getElementById("serverStatus");
let selectedFiles = [];

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

function renderPreview() {
  const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
  photoCount.textContent = `사진 ${selectedFiles.length}장`;
  photoSize.textContent = selectedFiles.length ? `총 ${formatBytes(totalSize)}` : "선택된 파일 없음";
  generateButton.disabled = selectedFiles.length < 1;
  previewGrid.innerHTML = selectedFiles.map(file => {
    const url = URL.createObjectURL(file);
    return `<article class="preview-card"><img src="${url}" alt=""><span>${file.name}</span></article>`;
  }).join("");
  message.textContent = selectedFiles.length ? "영상 생성 버튼을 누르면 MP4를 만듭니다." : "사진을 선택하면 MP4 생성을 시작할 수 있습니다.";
  downloadButton.classList.add("is-hidden");
}

photoInput.addEventListener("change", () => {
  selectedFiles = Array.from(photoInput.files || []);
  renderPreview();
});

generateButton.addEventListener("click", async () => {
  if (!selectedFiles.length) return;
  generateButton.disabled = true;
  downloadButton.classList.add("is-hidden");
  message.textContent = "사진을 업로드하고 MP4를 생성하는 중입니다.";

  const form = new FormData();
  form.append("title", titleInput.value || "Highlight Studio");
  form.append("secondsPerPhoto", secondsInput.value || "2");
  selectedFiles.forEach(file => form.append("photos", file));

  try {
    const response = await fetch("/api/videos", { method: "POST", body: form });
    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch (_) {}
    if (!response.ok || data.ok === false) throw new Error(data.error || text || `HTTP ${response.status}`);
    message.textContent = `완료: ${data.video.photoCount}장, ${data.video.durationSeconds}초 영상이 생성되었습니다.`;
    downloadButton.href = data.video.downloadUrl;
    downloadButton.download = data.video.filename;
    downloadButton.classList.remove("is-hidden");
  } catch (error) {
    console.error("[Highlight Studio] generate failed", error);
    message.textContent = error.message || "영상 생성에 실패했습니다.";
  } finally {
    generateButton.disabled = selectedFiles.length < 1;
  }
});

fetch("/health")
  .then(res => res.json())
  .then(data => { serverStatus.textContent = data.app ? `localhost:${data.port}` : "localhost:4000"; })
  .catch(() => { serverStatus.textContent = "localhost:4000"; });
