const photoInput = document.getElementById("photoInput");
const photoList = document.getElementById("photoList");
const photoCount = document.getElementById("photoCount");
const photoSize = document.getElementById("photoSize");
const generateButton = document.getElementById("generateButton");
const message = document.getElementById("message");
const bgmInput = document.getElementById("bgmInput");
const bgmName = document.getElementById("bgmName");
const serverStatus = document.getElementById("serverStatus");
const studentList = document.getElementById("studentList");

const students = [
  { id: "student-01", name: "김민준", group: "초등부" },
  { id: "student-02", name: "이서연", group: "품새반" },
  { id: "student-03", name: "박지호", group: "겨루기반" },
  { id: "student-04", name: "최하은", group: "유치부" },
  { id: "student-05", name: "정도윤", group: "중등부" },
  { id: "student-06", name: "한예린", group: "선수반" }
];

let selectedPhotos = [];
const selectedStudentIds = new Set();

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

function updateGenerateState() {
  const ready = selectedPhotos.length > 0;
  generateButton.disabled = !ready;
  message.textContent = ready
    ? "STEP 1 UI 준비가 완료되었습니다. 실제 MP4 생성은 STEP 2에서 연결합니다."
    : "사진을 선택하면 STEP 2에서 연결할 MP4 생성 버튼 UI를 확인할 수 있습니다.";
}

function renderStudents() {
  studentList.innerHTML = students.map(student => {
    const checked = selectedStudentIds.has(student.id) ? "checked" : "";
    return `
      <label class="student-option">
        <input type="checkbox" value="${student.id}" ${checked}>
        <span>
          <strong>${escapeHtml(student.name)}</strong>
          <small>${escapeHtml(student.group)}</small>
        </span>
      </label>
    `;
  }).join("");
}

function renderPhotos() {
  const totalSize = selectedPhotos.reduce((sum, item) => sum + item.file.size, 0);
  photoCount.textContent = `사진 ${selectedPhotos.length}장`;
  photoSize.textContent = selectedPhotos.length ? `총 ${formatBytes(totalSize)}` : "선택된 파일 없음";

  if (!selectedPhotos.length) {
    photoList.innerHTML = `<div class="empty-state">업로드한 사진 썸네일이 여기에 표시됩니다.</div>`;
    updateGenerateState();
    return;
  }

  photoList.innerHTML = selectedPhotos.map((item, index) => `
    <article class="photo-row" data-id="${escapeHtml(item.id)}">
      <img src="${item.url}" alt="">
      <div class="photo-meta">
        <strong>${index + 1}. ${escapeHtml(item.file.name)}</strong>
        <span>${formatBytes(item.file.size)}</span>
      </div>
      <div class="row-actions" aria-label="사진 순서 변경">
        <button type="button" data-action="up" data-index="${index}" ${index === 0 ? "disabled" : ""}>위</button>
        <button type="button" data-action="down" data-index="${index}" ${index === selectedPhotos.length - 1 ? "disabled" : ""}>아래</button>
        <button type="button" data-action="remove" data-index="${index}">삭제</button>
      </div>
    </article>
  `).join("");

  updateGenerateState();
}

function addPhotos(files) {
  selectedPhotos.forEach(item => URL.revokeObjectURL(item.url));
  selectedPhotos = files.map((file, index) => ({
    id: `${file.name}-${file.lastModified}-${index}`,
    file,
    url: URL.createObjectURL(file)
  }));
  renderPhotos();
}

function movePhoto(fromIndex, toIndex) {
  const nextPhotos = [...selectedPhotos];
  const [item] = nextPhotos.splice(fromIndex, 1);
  nextPhotos.splice(toIndex, 0, item);
  selectedPhotos = nextPhotos;
  renderPhotos();
}

photoInput.addEventListener("change", () => {
  addPhotos(Array.from(photoInput.files || []));
});

photoList.addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const index = Number(button.dataset.index);
  const action = button.dataset.action;

  if (action === "up" && index > 0) movePhoto(index, index - 1);
  if (action === "down" && index < selectedPhotos.length - 1) movePhoto(index, index + 1);
  if (action === "remove") {
    URL.revokeObjectURL(selectedPhotos[index].url);
    selectedPhotos.splice(index, 1);
    renderPhotos();
  }
});

studentList.addEventListener("change", event => {
  if (!event.target.matches("input[type='checkbox']")) return;
  if (event.target.checked) selectedStudentIds.add(event.target.value);
  else selectedStudentIds.delete(event.target.value);
});

bgmInput.addEventListener("change", () => {
  const file = bgmInput.files && bgmInput.files[0];
  bgmName.textContent = file ? `${file.name} - ${formatBytes(file.size)}` : "선택된 BGM 없음";
});

generateButton.addEventListener("click", () => {
  if (!selectedPhotos.length) return;
  message.textContent = "STEP 1 완료: MP4 생성 버튼은 배치만 했습니다. FFmpeg와 실제 다운로드는 STEP 2에서 연결합니다.";
});

fetch("/health")
  .then(res => res.json())
  .then(data => { serverStatus.textContent = data.app ? `localhost:${data.port}` : "localhost:4000"; })
  .catch(() => { serverStatus.textContent = "localhost:4000"; });

renderStudents();
renderPhotos();
