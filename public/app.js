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
const cancelRenderButton = document.getElementById("cancelRenderButton");
const message = document.getElementById("message");
const renderStatusText = document.getElementById("renderStatusText");
const renderProgressText = document.getElementById("renderProgressText");
const renderProgressBar = document.getElementById("renderProgressBar");
const renderPhotoText = document.getElementById("renderPhotoText");
const renderLog = document.getElementById("renderLog");
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
const templateNameInput = document.getElementById("templateNameInput");
const templateCategoryInput = document.getElementById("templateCategoryInput");
const templateDescriptionInput = document.getElementById("templateDescriptionInput");
const saveTemplateButton = document.getElementById("saveTemplateButton");
const updateTemplateButton = document.getElementById("updateTemplateButton");
const templateSummary = document.getElementById("templateSummary");
const templateList = document.getElementById("templateList");
const openingCaptionInput = document.getElementById("openingCaptionInput");
const endingCaptionInput = document.getElementById("endingCaptionInput");
const newProjectButton = document.getElementById("newProjectButton");
const openProjectButton = document.getElementById("openProjectButton");
const saveProjectButton = document.getElementById("saveProjectButton");
const saveAsProjectButton = document.getElementById("saveAsProjectButton");
const restoreRecentButton = document.getElementById("restoreRecentButton");
const projectInput = document.getElementById("projectInput");
const projectStatus = document.getElementById("projectStatus");
const recentProjectsPanel = document.getElementById("recentProjectsPanel");
const recentProjectsList = document.getElementById("recentProjectsList");
const restoreBanner = document.getElementById("restoreBanner");
const restoreAutosaveButton = document.getElementById("restoreAutosaveButton");
const dismissAutosaveButton = document.getElementById("dismissAutosaveButton");
const outputResolutionInput = document.getElementById("outputResolutionInput");
const customResolutionFields = document.getElementById("customResolutionFields");
const customWidthInput = document.getElementById("customWidthInput");
const customHeightInput = document.getElementById("customHeightInput");
const outputFpsInput = document.getElementById("outputFpsInput");
const outputQualityInput = document.getElementById("outputQualityInput");
const outputFormatInput = document.getElementById("outputFormatInput");
const renderEncoderInput = document.getElementById("renderEncoderInput");
const encoderDetectionText = document.getElementById("encoderDetectionText");
const activeEncoderText = document.getElementById("activeEncoderText");
const outputFileNameInput = document.getElementById("outputFileNameInput");
const outputDirectoryInput = document.getElementById("outputDirectoryInput");
const outputEstimateList = document.getElementById("outputEstimateList");
const aiRecommendButton = document.getElementById("aiRecommendButton");
const aiAutoEditButton = document.getElementById("aiAutoEditButton");
const aiCaptionModeInput = document.getElementById("aiCaptionModeInput");
const recommendationSummary = document.getElementById("recommendationSummary");
const aiAnalysisList = document.getElementById("aiAnalysisList");
const storyboardList = document.getElementById("storyboardList");
const outputPreviewVideo = document.getElementById("outputPreviewVideo");
const outputPreviewEmpty = document.getElementById("outputPreviewEmpty");
const downloadLatestOutputButton = document.getElementById("downloadLatestOutputButton");
const copyLatestShareButton = document.getElementById("copyLatestShareButton");
const kakaoLatestShareButton = document.getElementById("kakaoLatestShareButton");
const bandLatestShareButton = document.getElementById("bandLatestShareButton");
const shareStatusText = document.getElementById("shareStatusText");
const refreshOutputsButton = document.getElementById("refreshOutputsButton");
const outputsSummary = document.getElementById("outputsSummary");
const outputsList = document.getElementById("outputsList");
const refreshQueueButton = document.getElementById("refreshQueueButton");
const renderQueueSummary = document.getElementById("renderQueueSummary");
const renderQueueList = document.getElementById("renderQueueList");
const loginStateBadge = document.getElementById("loginStateBadge");
const loginForm = document.getElementById("loginForm");
const loginEmailInput = document.getElementById("loginEmailInput");
const loginPasswordInput = document.getElementById("loginPasswordInput");
const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");
const authMessage = document.getElementById("authMessage");
const licenseStatusList = document.getElementById("licenseStatusList");
const checkUpdateButton = document.getElementById("checkUpdateButton");
const updateStatusList = document.getElementById("updateStatusList");

const supportedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const autosaveKey = "highlightStudio.autosaveProject";
const recentProjectsKey = "highlightStudio.recentProjects";
const authStorageKey = "highlightStudio.localAuth";
const projectFormatVersion = 1;
const labelColors = ["#2563eb", "#16a34a", "#f97316", "#9333ea", "#0891b2", "#dc2626", "#4f46e5", "#0f766e"];
const encoderLabels = {
  auto: "\uc790\ub3d9 \uc120\ud0dd",
  cpu: "CPU",
  nvenc: "NVIDIA NVENC",
  qsv: "Intel Quick Sync",
  amf: "AMD AMF"
};
const templateCategoryLabels = {
  basic: "\uae30\ubcf8",
  emotional: "\uac10\ub3d9\ud615",
  sports: "\uc2a4\ud3ec\uce20\ud615",
  competition: "\ub300\ud68c\ud615",
  promotion: "\ud64d\ubcf4\ud615",
  graduation: "\uc878\uc5c5/\uc2b9\uae09\ud615",
  custom: "\uc0ac\uc6a9\uc790 \uc815\uc758"
};

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
let draggedStoryboardPhotoId = null;
let activeFilter = "all";
let timelineZoom = 100;
let activeTransitionPhotoId = null;
let projectName = "\ud0dc\uad8c\ub3c4 \ud558\uc774\ub77c\uc774\ud2b8";
let projectCreatedAt = new Date().toISOString();
let projectModifiedAt = projectCreatedAt;
let currentProjectFileName = "";
let bgmReference = null;
let outputFileNameTouched = false;
let pendingAutosaveData = null;
let activeRenderJobId = null;
let renderPollTimer = null;
let queuePollTimer = null;
let latestOutputFile = null;
let templates = [];
let selectedTemplateId = "";

const renderStatusLabels = {
  queued: "\ub300\uae30",
  preparing: "\uc900\ube44 \uc911",
  rendering: "\ub80c\ub354\ub9c1 \uc911",
  completed: "\uc644\ub8cc",
  failed: "\uc2e4\ud328",
  canceled: "\ucde8\uc18c"
};

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

function getAuthSession() {
  try {
    return JSON.parse(localStorage.getItem(authStorageKey) || "null");
  } catch (_) {
    return null;
  }
}

function setAuthSession(session) {
  if (session?.email) {
    localStorage.setItem(authStorageKey, JSON.stringify(session));
  } else {
    localStorage.removeItem(authStorageKey);
  }
}

function licenseLabel(status) {
  return {
    trial: "체험판",
    active: "정상",
    expired: "만료",
    blocked: "차단"
  }[status] || status || "체험판";
}

function renderLicenseStatus(license = {}) {
  const features = Array.isArray(license.features) ? license.features.join(", ") : "";
  licenseStatusList.innerHTML = `
    <div><dt>로그인</dt><dd>${license.loggedIn ? "로그인됨" : "로그아웃"}</dd></div>
    <div><dt>이메일</dt><dd>${escapeHtml(license.email || "-")}</dd></div>
    <div><dt>상태</dt><dd>${escapeHtml(licenseLabel(license.licenseStatus))}</dd></div>
    <div><dt>만료일</dt><dd>${license.expiresAt ? formatDateTime(license.expiresAt) : "-"}</dd></div>
    <div><dt>남은 일수</dt><dd>${Number(license.daysLeft || 0)}일</dd></div>
    <div><dt>기능</dt><dd>${escapeHtml(features || "-")}</dd></div>
  `;
}

function renderAuthState(session = getAuthSession()) {
  const loggedIn = Boolean(session?.email);
  loginStateBadge.textContent = loggedIn ? `로그인: ${session.email}` : "로그아웃";
  logoutButton.disabled = !loggedIn;
  loginButton.disabled = false;
  if (loggedIn && !loginEmailInput.value) loginEmailInput.value = session.email;
}

async function loadLicenseStatus() {
  const session = getAuthSession();
  const headers = session?.email ? { "x-highlight-email": session.email } : {};
  const response = await fetch("/api/license/status", { headers });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || "라이선스 상태를 확인하지 못했습니다.");
  renderLicenseStatus(result.license);
  renderAuthState(session);
  return result.license;
}

async function loginLocalAccount(event) {
  event.preventDefault();
  loginButton.disabled = true;
  authMessage.textContent = "로그인 확인 중입니다.";
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: loginEmailInput.value.trim(),
        password: loginPasswordInput.value
      })
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || "로그인에 실패했습니다.");
    setAuthSession(result.session);
    loginPasswordInput.value = "";
    authMessage.textContent = "로그인되었습니다.";
    renderLicenseStatus(result.license);
    renderAuthState(result.session);
  } catch (error) {
    authMessage.textContent = error.message || "로그인에 실패했습니다.";
  } finally {
    loginButton.disabled = false;
  }
}

async function logoutLocalAccount() {
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  setAuthSession(null);
  loginPasswordInput.value = "";
  authMessage.textContent = "로그아웃되었습니다.";
  renderAuthState(null);
  await loadLicenseStatus().catch(error => { authMessage.textContent = error.message; });
}

async function checkForUpdates() {
  updateStatusList.innerHTML = `<div><dt>상태</dt><dd>확인 중</dd></div>`;
  try {
    const response = await fetch("/api/update/check");
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || "업데이트 정보를 확인하지 못했습니다.");
    const update = result.update;
    updateStatusList.innerHTML = `
      <div><dt>현재 버전</dt><dd>${escapeHtml(update.currentVersion)}</dd></div>
      <div><dt>최신 버전</dt><dd>${escapeHtml(update.latestVersion)}</dd></div>
      <div><dt>업데이트</dt><dd>${update.updateAvailable ? "가능" : "최신 상태"}</dd></div>
      <div><dt>다운로드</dt><dd>${update.downloadUrl ? `<a href="${escapeHtml(update.downloadUrl)}" target="_blank" rel="noreferrer">열기</a>` : "-"}</dd></div>
      <div><dt>안내</dt><dd>${escapeHtml(update.releaseNote || "-")}</dd></div>
    `;
  } catch (error) {
    updateStatusList.innerHTML = `<div><dt>오류</dt><dd>${escapeHtml(error.message || "업데이트 확인 실패")}</dd></div>`;
  }
}

function outputUrl(filename) {
  return `/outputs/${encodeURIComponent(filename)}`;
}

function outputDownloadUrl(filename) {
  return `/api/outputs/${encodeURIComponent(filename)}/download`;
}

function outputShareInfoUrl(filename) {
  return `/api/outputs/${encodeURIComponent(filename)}/share-info`;
}

function setShareStatus(text = "") {
  if (shareStatusText) shareStatusText.textContent = text;
}

function setLatestShareButtonsEnabled(enabled) {
  for (const button of [copyLatestShareButton, kakaoLatestShareButton, bandLatestShareButton]) {
    if (button) button.disabled = !enabled;
  }
}

function setOutputPreview(file) {
  latestOutputFile = file || null;
  if (!outputPreviewVideo || !downloadLatestOutputButton) return;
  if (!file) {
    outputPreviewVideo.removeAttribute("src");
    outputPreviewVideo.load();
    outputPreviewVideo.parentElement.classList.remove("has-video");
    downloadLatestOutputButton.href = "#";
    downloadLatestOutputButton.removeAttribute("download");
    downloadLatestOutputButton.classList.add("is-disabled");
    setLatestShareButtonsEnabled(false);
    setShareStatus("");
    return;
  }
  outputPreviewVideo.src = file.url || outputUrl(file.filename);
  outputPreviewVideo.load();
  outputPreviewVideo.parentElement.classList.add("has-video");
  downloadLatestOutputButton.href = file.downloadUrl || outputDownloadUrl(file.filename);
  downloadLatestOutputButton.download = file.filename;
  downloadLatestOutputButton.classList.remove("is-disabled");
  setLatestShareButtonsEnabled(true);
  setShareStatus("");
}

async function getShareInfo(filename) {
  if (!filename) throw new Error("공유할 파일을 선택해 주세요.");
  const response = await fetch(outputShareInfoUrl(filename));
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || "공유 정보를 불러오지 못했습니다.");
  return result.share;
}

async function copyShareLink(filename) {
  try {
    const share = await getShareInfo(filename);
    if (!navigator.clipboard) throw new Error("브라우저에서 클립보드를 사용할 수 없습니다.");
    await navigator.clipboard.writeText(share.shareUrl);
    setShareStatus("공유 링크를 복사했습니다.");
    setMessage("공유 링크를 복사했습니다.");
  } catch (error) {
    setShareStatus(error.message || "공유 링크 복사에 실패했습니다.");
    setMessage(error.message || "공유 링크 복사에 실패했습니다.");
  }
}

async function shareToKakao(filename) {
  try {
    const share = await getShareInfo(filename);
    if (!share.kakao?.ready) {
      setShareStatus("카카오 공유 준비 필요: .env에 KAKAO_JAVASCRIPT_KEY를 설정해 주세요.");
      setMessage("카카오 공유 준비 필요: .env에 KAKAO_JAVASCRIPT_KEY를 설정해 주세요.");
      return;
    }
    setShareStatus("카카오 공유 데이터가 준비되었습니다. 실제 SDK 연동은 배포 단계에서 연결합니다.");
    setMessage(`카카오 공유 준비: ${share.title}`);
  } catch (error) {
    setShareStatus(error.message || "카카오 공유 정보를 만들지 못했습니다.");
    setMessage(error.message || "카카오 공유 정보를 만들지 못했습니다.");
  }
}

async function shareToBand(filename) {
  try {
    const share = await getShareInfo(filename);
    const body = `${share.title}\n${share.description}\n${share.shareUrl}`;
    const bandUrl = `https://band.us/plugin/share?body=${encodeURIComponent(body)}&route=${encodeURIComponent(location.origin)}`;
    window.open(bandUrl, "_blank", "noopener,noreferrer");
    setShareStatus("밴드 공유 창을 열었습니다.");
    setMessage("밴드 공유 창을 열었습니다.");
  } catch (error) {
    setShareStatus(error.message || "밴드 공유 URL을 만들지 못했습니다.");
    setMessage(error.message || "밴드 공유 URL을 만들지 못했습니다.");
  }
}

function renderOutputs(outputs = []) {
  outputsSummary.textContent = `${outputs.length}개`;
  if (!outputs.length) {
    outputsList.innerHTML = `<p class="muted-text">outputs 폴더에 MP4 파일이 없습니다.</p>`;
    if (!latestOutputFile) setOutputPreview(null);
    return;
  }
  outputsList.innerHTML = outputs.map(file => `
    <article class="output-item">
      <div>
        <strong>${escapeHtml(file.filename)}</strong>
        <div class="output-meta">
          <span>${formatDateTime(file.createdAt)}</span>
          <span>${formatBytes(file.size)}</span>
        </div>
      </div>
      <div class="output-actions">
        <button type="button" class="secondary-button" data-action="preview-output" data-filename="${escapeHtml(file.filename)}">미리보기</button>
        <a class="secondary-button" href="${file.downloadUrl}" download="${escapeHtml(file.filename)}">다운로드</a>
        <button type="button" class="secondary-button" data-action="copy-share" data-filename="${escapeHtml(file.filename)}">링크 복사</button>
        <button type="button" class="secondary-button" data-action="kakao-share" data-filename="${escapeHtml(file.filename)}">카카오 공유</button>
        <button type="button" class="secondary-button" data-action="band-share" data-filename="${escapeHtml(file.filename)}">밴드 공유</button>
        <button type="button" class="danger-button" data-action="delete-output" data-filename="${escapeHtml(file.filename)}">삭제</button>
      </div>
    </article>
  `).join("");
  if (!latestOutputFile) setOutputPreview(outputs[0]);
}

async function loadOutputs(preferredFileName = "") {
  try {
    const response = await fetch("/api/outputs");
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || "outputs 목록을 불러오지 못했습니다.");
    const outputs = result.outputs || [];
    renderOutputs(outputs);
    const preferred = outputs.find(file => file.filename === preferredFileName);
    if (preferred) setOutputPreview(preferred);
    if (!preferredFileName && outputs.length && (!latestOutputFile || !outputs.some(file => file.filename === latestOutputFile.filename))) {
      setOutputPreview(outputs[0]);
    }
    if (!outputs.length) setOutputPreview(null);
    return outputs;
  } catch (error) {
    outputsList.innerHTML = `<p class="muted-text">${escapeHtml(error.message || "outputs 목록을 불러오지 못했습니다.")}</p>`;
    return [];
  }
}

async function deleteOutputFile(filename) {
  if (!filename) return;
  const confirmed = window.confirm(`${filename} 파일을 삭제하시겠습니까?`);
  if (!confirmed) return;
  try {
    const response = await fetch(`/api/outputs/${encodeURIComponent(filename)}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || "출력 파일을 삭제하지 못했습니다.");
    if (latestOutputFile?.filename === filename) setOutputPreview(null);
    await loadOutputs();
    setMessage(`${filename} 파일을 삭제했습니다.`);
  } catch (error) {
    setMessage(error.message || "출력 파일 삭제에 실패했습니다.");
  }
}

function renderQueueJobs(jobs = [], activeJobId = "") {
  const queuedCount = jobs.filter(job => job.status === "queued").length;
  const runningJob = jobs.find(job => job.jobId === activeJobId || ["preparing", "rendering"].includes(job.status));
  renderQueueSummary.textContent = runningJob
    ? `현재 작업: ${runningJob.jobId} / 대기 ${queuedCount}개 / 전체 ${jobs.length}개`
    : `대기 작업 ${queuedCount}개 / 전체 ${jobs.length}개`;

  if (!jobs.length) {
    renderQueueList.innerHTML = `<p class="muted-text">렌더링 대기열이 비어 있습니다.</p>`;
    return;
  }

  renderQueueList.innerHTML = jobs.map((job, index) => {
    const progress = Math.max(0, Math.min(100, Number(job.progress || 0)));
    const canCancel = ["queued", "preparing", "rendering"].includes(job.status);
    const position = job.status === "queued" ? `대기 ${job.queuePosition || index + 1}번째` : `#${index + 1}`;
    const fileLabel = job.filename || job.currentPhotoName || "결과 파일 대기";
    return `
      <article class="queue-job">
        <div>
          <strong>${escapeHtml(fileLabel)}</strong>
          <div class="queue-job-meta">
            <span>${escapeHtml(position)}</span>
            <span>생성 ${formatDateTime(job.createdAt)}</span>
            ${job.startedAt ? `<span>시작 ${formatDateTime(job.startedAt)}</span>` : ""}
            ${job.completedAt ? `<span>완료 ${formatDateTime(job.completedAt)}</span>` : ""}
            ${job.error ? `<span>${escapeHtml(job.error)}</span>` : ""}
          </div>
          <div class="queue-job-progress">
            <span>${progress}%</span>
            <div class="queue-progress-bar"><div style="width:${progress}%"></div></div>
          </div>
        </div>
        <div class="queue-actions">
          <span class="status-badge ${escapeHtml(job.status)}">${renderStatusLabels[job.status] || job.status}</span>
          ${canCancel ? `<button type="button" class="secondary-button" data-action="cancel-queue-job" data-job-id="${escapeHtml(job.jobId)}">취소</button>` : ""}
        </div>
      </article>
    `;
  }).join("");
}

async function loadRenderQueue() {
  try {
    const response = await fetch("/api/render/queue");
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || "렌더링 대기열을 불러오지 못했습니다.");
    renderQueueJobs(result.jobs || [], result.activeJobId || "");
    return result.jobs || [];
  } catch (error) {
    renderQueueList.innerHTML = `<p class="muted-text">${escapeHtml(error.message || "렌더링 대기열을 불러오지 못했습니다.")}</p>`;
    return [];
  }
}

async function cancelQueueJob(jobId) {
  if (!jobId) return;
  try {
    const response = await fetch(`/api/render/cancel/${encodeURIComponent(jobId)}`, { method: "POST" });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || "렌더링 취소에 실패했습니다.");
    if (activeRenderJobId === jobId) {
      await pollRenderStatus(jobId);
    }
    await loadRenderQueue();
    setMessage("렌더링 작업 취소를 요청했습니다.");
  } catch (error) {
    setMessage(error.message || "렌더링 작업 취소에 실패했습니다.");
  }
}

function safeFileName(value) {
  return String(value || "highlight-studio-project")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 80) || "highlight-studio-project";
}

function todayStamp() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createDefaultOutputFileName() {
  return `${safeFileName(titleInput.value || projectName)}_${todayStamp()}.mp4`;
}

function getOutputResolution() {
  if (outputResolutionInput.value === "custom") {
    return {
      mode: "custom",
      width: Number(customWidthInput.value) || 1080,
      height: Number(customHeightInput.value) || 1920,
      label: "\uc0ac\uc6a9\uc790 \uc9c0\uc815"
    };
  }
  const [width, height] = outputResolutionInput.value.split("x").map(Number);
  const labels = {
    "1080x1920": "\uc138\ub85c \uc1fc\uce20",
    "1920x1080": "\uac00\ub85c",
    "1080x1080": "\uc815\uc0ac\uac01\ud615"
  };
  return {
    mode: outputResolutionInput.value,
    width,
    height,
    label: labels[outputResolutionInput.value] || ""
  };
}

function getOutputQualityMultiplier() {
  return {
    standard: 0.018,
    high: 0.03,
    best: 0.045
  }[outputQualityInput.value] || 0.018;
}

function estimateOutputSize() {
  const resolution = getOutputResolution();
  const seconds = Math.max(1, getEstimatedSeconds());
  const fps = Number(outputFpsInput.value) || 30;
  const pixels = resolution.width * resolution.height;
  const bytes = pixels * seconds * fps * getOutputQualityMultiplier();
  return Math.max(1, Math.round(bytes));
}

function getCaptionCount() {
  const sceneCaptionCount = photos.filter(photo => normalizeCaption(photo.caption).text.trim()).length;
  const opening = openingCaptionInput.value.trim() ? 1 : 0;
  const ending = endingCaptionInput.value.trim() ? 1 : 0;
  return sceneCaptionCount + opening + ending;
}

function getTransitionCount() {
  return photos.filter(photo => photo.transitionAfter && getTransitionType(photo.transitionAfter) !== "none").length;
}

function getOutputOptions() {
  const resolution = getOutputResolution();
  return {
    resolution,
    fps: Number(outputFpsInput.value) || 30,
    quality: outputQualityInput.value,
    format: outputFormatInput.value,
    encoder: renderEncoderInput?.value || "auto",
    defaultPhotoDuration: getSecondsPerPhoto(),
    fileName: outputFileNameInput.value.trim() || createDefaultOutputFileName(),
    directory: outputDirectoryInput.value.trim() || "outputs/",
    estimatedSize: estimateOutputSize(),
    generationEnabled: false
  };
}

function createTemplateSettings() {
  const commonPhotoEffect = photos[0]?.photoEffect || "none";
  const commonCaption = photos[0]?.caption ? normalizeCaption(photos[0].caption) : createCaption();
  const commonTransition = photos.find(photo => photo.transitionAfter)?.transitionAfter || createTransition(defaultTransitionInput.value || "fade", 0.5);
  return {
    template: templateInput.value,
    title: titleInput.value,
    secondsPerPhoto: getSecondsPerPhoto(),
    captionStyle: commonCaption.style || "shadow",
    captionPosition: commonCaption.position || "bottom",
    captionTiming: commonCaption.timing || "full",
    openingCaption: openingCaptionInput.value,
    endingCaption: endingCaptionInput.value,
    defaultTransition: defaultTransitionInput.value,
    transitionAfter: createTransition(getTransitionType(commonTransition), getTransitionDuration(commonTransition)),
    photoEffect: commonPhotoEffect,
    music: bgmReference ? { name: bgmReference.name, type: bgmReference.type, size: bgmReference.size } : { name: "", type: "", size: 0 },
    outputOptions: getOutputOptions()
  };
}

function applyTemplateSettings(settings = {}) {
  if (settings.template) templateInput.value = settings.template;
  if (settings.title) titleInput.value = settings.title;
  if (settings.secondsPerPhoto) secondsInput.value = String(settings.secondsPerPhoto);
  if (settings.defaultTransition) defaultTransitionInput.value = settings.defaultTransition;
  if (settings.openingCaption !== undefined) openingCaptionInput.value = settings.openingCaption;
  if (settings.endingCaption !== undefined) endingCaptionInput.value = settings.endingCaption;
  const outputOptions = settings.outputOptions || {};
  if (outputOptions.resolution?.mode) outputResolutionInput.value = outputOptions.resolution.mode;
  if (outputOptions.resolution?.width) customWidthInput.value = outputOptions.resolution.width;
  if (outputOptions.resolution?.height) customHeightInput.value = outputOptions.resolution.height;
  if (outputOptions.fps) outputFpsInput.value = String(outputOptions.fps);
  if (outputOptions.quality) outputQualityInput.value = outputOptions.quality;
  if (outputOptions.format) outputFormatInput.value = outputOptions.format;
  if (outputOptions.encoder && renderEncoderInput) renderEncoderInput.value = outputOptions.encoder;

  const photoEffect = settings.photoEffect || "none";
  const transition = settings.transitionAfter || createTransition(settings.defaultTransition || "fade", 0.5);
  photos = photos.map((photo, index) => {
    const caption = normalizeCaption(photo.caption);
    return {
      ...photo,
      photoEffect,
      caption: {
        ...caption,
        style: settings.captionStyle || caption.style,
        position: settings.captionPosition || caption.position,
        timing: settings.captionTiming || caption.timing
      },
      transitionAfter: index === photos.length - 1 ? null : createTransition(getTransitionType(transition), getTransitionDuration(transition))
    };
  });

  bgmReference = settings.music?.name ? {
    name: settings.music.name,
    type: settings.music.type || "audio/reference",
    size: Number(settings.music.size || 0),
    lastModified: null,
    referenceOnly: true
  } : null;
  bgmName.textContent = bgmReference ? `BGM: ${bgmReference.name}` : "\uc120\ud0dd\ub41c BGM \uc5c6\uc74c";
  outputFileNameTouched = Boolean(outputOptions.fileName);
  if (outputOptions.fileName) outputFileNameInput.value = outputOptions.fileName;
  if (outputOptions.directory) outputDirectoryInput.value = outputOptions.directory;
  renderList();
  renderOutputEstimate();
}

function describeEncoder(value, codec = "") {
  const label = encoderLabels[value] || value || "CPU";
  return codec ? `${label} (${codec})` : label;
}

async function loadRenderEncoders() {
  if (!encoderDetectionText || !activeEncoderText) return;
  try {
    const response = await fetch("/api/render/encoders");
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || "\uc778\ucf54\ub354\ub97c \ud655\uc778\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.");
    const gpuNames = (result.encoders || [])
      .filter(encoder => encoder.value !== "cpu" && encoder.available)
      .map(encoder => encoder.label);
    encoderDetectionText.textContent = gpuNames.length ? gpuNames.join(", ") : "GPU \ubbf8\uc9c0\uc6d0 / CPU \uc0ac\uc6a9";
    activeEncoderText.textContent = describeEncoder(result.selected, result.selectedCodec);
  } catch (error) {
    encoderDetectionText.textContent = "\uac10\uc9c0 \uc2e4\ud328 / CPU \uc0ac\uc6a9";
    activeEncoderText.textContent = "CPU (libx264)";
  }
}

function getRenderablePhotos() {
  const selected = photos.filter(photo => selectedPhotoIds.size ? selectedPhotoIds.has(photo.id) : photo.selected);
  const target = selected.length ? selected : photos;
  return target.filter(photo => photo.file instanceof File);
}

function renderTemplates() {
  if (!templateList || !templateSummary) return;
  templateSummary.textContent = `${templates.length}\uac1c`;
  if (!templates.length) {
    templateList.innerHTML = `<p class="muted-text">\ud15c\ud50c\ub9bf \ubaa9\ub85d\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.</p>`;
    return;
  }
  templateList.innerHTML = templates.map(template => {
    const activeClass = selectedTemplateId === template.id ? " is-active" : "";
    const categoryLabel = templateCategoryLabels[template.category] || template.category || "\uc0ac\uc6a9\uc790 \uc815\uc758";
    const originLabel = template.builtIn ? "\uae30\ubcf8" : "\uc0ac\uc6a9\uc790";
    return `
      <article class="template-item${activeClass}" data-id="${escapeHtml(template.id)}">
        <div>
          <strong>${escapeHtml(template.name)}</strong>
          <span>${escapeHtml(categoryLabel)} / ${originLabel}</span>
          <p>${escapeHtml(template.description || "\uc124\uba85 \uc5c6\uc74c")}</p>
        </div>
        <div class="template-item-actions">
          <button type="button" data-action="select-template" data-id="${escapeHtml(template.id)}">\uc120\ud0dd</button>
          <button type="button" data-action="apply-template" data-id="${escapeHtml(template.id)}">\uc801\uc6a9</button>
          <button type="button" data-action="delete-template" data-id="${escapeHtml(template.id)}" ${template.builtIn ? "disabled" : ""}>\uc0ad\uc81c</button>
        </div>
      </article>
    `;
  }).join("");
}

async function loadTemplates() {
  try {
    const response = await fetch("/api/templates");
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || "\ud15c\ud50c\ub9bf \ubaa9\ub85d\uc744 \ubd88\ub7ec\uc624\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.");
    templates = result.templates || [];
    if (!selectedTemplateId && templates[0]) selectedTemplateId = templates[0].id;
    renderTemplates();
    fillTemplateForm(getSelectedTemplate());
  } catch (error) {
    if (templateList) templateList.innerHTML = `<p class="muted-text">${escapeHtml(error.message)}</p>`;
  }
}

function getSelectedTemplate() {
  return templates.find(template => template.id === selectedTemplateId);
}

function fillTemplateForm(template) {
  if (!template || !templateNameInput) return;
  templateNameInput.value = template.name || "";
  templateCategoryInput.value = template.category || "custom";
  templateDescriptionInput.value = template.description || "";
  updateTemplateButton.disabled = Boolean(template.builtIn);
}

async function saveTemplate() {
  try {
    const response = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: templateNameInput.value,
        category: templateCategoryInput.value,
        description: templateDescriptionInput.value,
        settings: createTemplateSettings()
      })
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || "\ud15c\ud50c\ub9bf \uc800\uc7a5\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.");
    selectedTemplateId = result.template.id;
    setMessage("\ud604\uc7ac \ud3b8\uc9d1 \uc124\uc815\uc744 \ud15c\ud50c\ub9bf\uc73c\ub85c \uc800\uc7a5\ud588\uc2b5\ub2c8\ub2e4.");
    await loadTemplates();
  } catch (error) {
    setMessage(error.message);
  }
}

async function updateTemplate() {
  const template = getSelectedTemplate();
  if (!template || template.builtIn) {
    setMessage("\uae30\ubcf8 \ud15c\ud50c\ub9bf\uc740 \uc218\uc815\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.");
    return;
  }
  try {
    const response = await fetch(`/api/templates/${encodeURIComponent(template.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: templateNameInput.value,
        category: templateCategoryInput.value,
        description: templateDescriptionInput.value,
        settings: createTemplateSettings()
      })
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || "\ud15c\ud50c\ub9bf \uc218\uc815\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.");
    setMessage("\uc120\ud0dd\ud55c \ud15c\ud50c\ub9bf\uc744 \uc218\uc815\ud588\uc2b5\ub2c8\ub2e4.");
    await loadTemplates();
  } catch (error) {
    setMessage(error.message);
  }
}

async function deleteTemplate(templateId) {
  const template = templates.find(item => item.id === templateId);
  if (!template || template.builtIn) {
    setMessage("\uae30\ubcf8 \ud15c\ud50c\ub9bf\uc740 \uc0ad\uc81c\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.");
    return;
  }
  if (!window.confirm(`"${template.name}" \ud15c\ud50c\ub9bf\uc744 \uc0ad\uc81c\ud560\uae4c\uc694?`)) return;
  try {
    const response = await fetch(`/api/templates/${encodeURIComponent(templateId)}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || "\ud15c\ud50c\ub9bf \uc0ad\uc81c\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.");
    selectedTemplateId = "";
    setMessage("\ud15c\ud50c\ub9bf\uc744 \uc0ad\uc81c\ud588\uc2b5\ub2c8\ub2e4.");
    await loadTemplates();
  } catch (error) {
    setMessage(error.message);
  }
}

function applySelectedTemplate(templateId) {
  const template = templates.find(item => item.id === templateId);
  if (!template) return;
  if (!window.confirm(`"${template.name}" \ud15c\ud50c\ub9bf\uc744 \ud604\uc7ac \ud504\ub85c\uc81d\ud2b8\uc5d0 \uc801\uc6a9\ud560\uae4c\uc694?`)) return;
  selectedTemplateId = template.id;
  applyTemplateSettings(template.settings || {});
  fillTemplateForm(template);
  renderTemplates();
  setMessage(`"${template.name}" \ud15c\ud50c\ub9bf\uc744 \uc801\uc6a9\ud588\uc2b5\ub2c8\ub2e4.`);
}

function updateOutputFileName() {
  if (!outputFileNameTouched) outputFileNameInput.value = createDefaultOutputFileName();
}

function renderOutputEstimate() {
  if (!outputEstimateList) return;
  updateOutputFileName();
  const output = getOutputOptions();
  customResolutionFields.classList.toggle("is-hidden", outputResolutionInput.value !== "custom");
  outputEstimateList.innerHTML = `
    <div><dt>\uc608\uc0c1 \uc601\uc0c1 \uae38\uc774</dt><dd>${formatDuration(getEstimatedSeconds())}</dd></div>
    <div><dt>\uc0ac\uc9c4 \uac1c\uc218</dt><dd>${photos.length}\uc7a5</dd></div>
    <div><dt>\uc790\ub9c9 \uac1c\uc218</dt><dd>${getCaptionCount()}\uac1c</dd></div>
    <div><dt>\uc804\ud658\ud6a8\uacfc \uac1c\uc218</dt><dd>${getTransitionCount()}\uac1c</dd></div>
    <div><dt>BGM \uc0ac\uc6a9 \uc5ec\ubd80</dt><dd>${bgmReference ? "\uc0ac\uc6a9" : "\uc0ac\uc6a9 \uc548 \ud568"}</dd></div>
    <div><dt>\uc608\uc0c1 \ucd9c\ub825 \ud574\uc0c1\ub3c4</dt><dd>${output.resolution.width} x ${output.resolution.height}</dd></div>
    <div><dt>\uc608\uc0c1 \ud30c\uc77c \ud06c\uae30</dt><dd>${formatBytes(output.estimatedSize)}</dd></div>
  `;
}

function applyDesktopSettings(settings = {}) {
  if (settings.defaultResolution && outputResolutionInput) {
    outputResolutionInput.value = ["1080x1920", "1920x1080", "1080x1080", "custom"].includes(settings.defaultResolution)
      ? settings.defaultResolution
      : "1080x1920";
  }
  if (settings.defaultFps && outputFpsInput) outputFpsInput.value = String(settings.defaultFps);
  if (settings.defaultTransition && defaultTransitionInput) defaultTransitionInput.value = settings.defaultTransition;
  if (settings.defaultEncoder && renderEncoderInput) renderEncoderInput.value = settings.defaultEncoder;
  renderOutputEstimate();
}

function handleDesktopCommand(command) {
  if (command === "new-project") newProject();
  if (command === "open-project") projectInput.click();
  if (command === "save-project") saveProject();
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
    caption: normalizeCaption(photo.caption),
    favorite: Boolean(photo.favorite),
    locked: Boolean(photo.locked),
    rating: Number(photo.rating || 3),
    recommended: Boolean(photo.recommended),
    aiScore: Number(photo.aiScore || 0),
    aiExcluded: Boolean(photo.aiExcluded),
    aiReasons: Array.isArray(photo.aiReasons) ? photo.aiReasons : [],
    storyRole: photo.storyRole || ""
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
      outputOptions: getOutputOptions()
    },
    storyboard: {
      scenes: photos.map((photo, index) => ({
        photoId: photo.id,
        order: index,
        role: photo.storyRole || "",
        favorite: Boolean(photo.favorite),
        locked: Boolean(photo.locked),
        rating: Number(photo.rating || 3),
        recommended: Boolean(photo.recommended)
      }))
    },
    renderSettings: {
      encoder: renderEncoderInput?.value || "auto",
      defaultPhotoDuration: getSecondsPerPhoto(),
      defaultTransition: defaultTransitionInput.value,
      outputDirectory: outputDirectoryInput.value || "outputs/"
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
  const outputOptions = data.video?.outputOptions || {};
  const resolutionMode = outputOptions.resolution?.mode || "1080x1920";
  outputResolutionInput.value = ["1080x1920", "1920x1080", "1080x1080", "custom"].includes(resolutionMode) ? resolutionMode : "1080x1920";
  customWidthInput.value = outputOptions.resolution?.width || 1080;
  customHeightInput.value = outputOptions.resolution?.height || 1920;
  outputFpsInput.value = String(outputOptions.fps || 30);
  outputQualityInput.value = outputOptions.quality || "standard";
  outputFormatInput.value = outputOptions.format || "mp4";
  if (renderEncoderInput) renderEncoderInput.value = outputOptions.encoder || "auto";
  outputFileNameInput.value = outputOptions.fileName || createDefaultOutputFileName();
  outputFileNameTouched = Boolean(outputOptions.fileName);
  outputDirectoryInput.value = outputOptions.directory || "outputs/";

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
        transitionAfter: photo.transitionAfter ? createTransition(getTransitionType(photo.transitionAfter), getTransitionDuration(photo.transitionAfter)) : null,
        favorite: Boolean(photo.favorite),
        locked: Boolean(photo.locked),
        rating: Number(photo.rating || 3),
        recommended: Boolean(photo.recommended),
        aiScore: Number(photo.aiScore || 0),
        aiExcluded: Boolean(photo.aiExcluded),
        aiReasons: Array.isArray(photo.aiReasons) ? photo.aiReasons : [],
        storyRole: photo.storyRole || ""
      };
    });
  selectedPhotoIds = new Set(photos.filter(photo => photo.selected).map(photo => photo.id));
  activePreviewId = photos[0]?.id || null;
  activeFilter = "all";
  normalizeLastTransition();
  setProjectStatus(`\ubd88\ub7ec\uc634: ${formatDateTime(projectModifiedAt)}`);
  renderStudents();
  renderList();
  renderOutputEstimate();
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
  renderOutputEstimate();
}

function setMessage(text) {
  message.textContent = text;
}

function renderLogLines(logs = []) {
  renderLog.textContent = logs.map(item => {
    const time = item.time ? new Date(item.time).toLocaleTimeString("ko-KR", { hour12: false }) : "";
    return `[${time}] ${item.message}`;
  }).join("\n");
  renderLog.scrollTop = renderLog.scrollHeight;
}

function updateRenderStatus(job = {}) {
  const progress = Math.max(0, Math.min(100, Number(job.progress || 0)));
  renderStatusText.textContent = renderStatusLabels[job.status] || "\ub300\uae30";
  renderProgressText.textContent = `${progress}%`;
  renderProgressBar.style.width = `${progress}%`;
  const current = Number(job.currentPhoto || 0);
  const total = Number(job.totalPhotos || 0);
  const currentName = job.currentPhotoName ? ` - ${job.currentPhotoName}` : "";
  renderPhotoText.textContent = total ? `\ud604\uc7ac \ucc98\ub9ac: ${current} / ${total}${currentName}` : "\ud604\uc7ac \ucc98\ub9ac \uc911\uc778 \uc0ac\uc9c4 \uc5c6\uc74c";
  if (activeEncoderText && job.encoder) activeEncoderText.textContent = describeEncoder(job.encoder, job.encoderCodec);
  renderLogLines(job.logs || []);
}

function stopRenderPolling() {
  if (renderPollTimer) clearInterval(renderPollTimer);
  renderPollTimer = null;
}

async function pollRenderStatus(jobId) {
  const response = await fetch(`/api/render/status/${encodeURIComponent(jobId)}`);
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || "\ub80c\ub354\ub9c1 \uc0c1\ud0dc\ub97c \ud655\uc778\ud558\uc9c0 \ubabb\ud588\uc2b5\ub2c8\ub2e4.");
  const job = result.job;
  updateRenderStatus(job);
  loadRenderQueue();
  if (["completed", "failed", "canceled"].includes(job.status)) {
    stopRenderPolling();
    activeRenderJobId = null;
    cancelRenderButton.disabled = true;
    generateButton.disabled = photos.length === 0;
    if (job.status === "completed") {
      const skipped = Array.isArray(job.failedPhotos) && job.failedPhotos.length ? ` / \uc2a4\ud0b5 ${job.failedPhotos.length}\uc7a5` : "";
      setMessage(`MP4 \uc0dd\uc131 \uc644\ub8cc: ${job.filename} / ${formatDuration(Math.round(job.durationSeconds || 0))} / ${formatBytes(job.bytes || 0)}${skipped}`);
      loadOutputs(job.filename);
    } else if (job.status === "canceled") {
      setMessage("MP4 \uc0dd\uc131\uc744 \ucde8\uc18c\ud588\uc2b5\ub2c8\ub2e4. \uc784\uc2dc \ud30c\uc77c\uc740 \uc815\ub9ac\ub429\ub2c8\ub2e4.");
    } else {
      setMessage(job.error || "MP4 \uc0dd\uc131\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.");
    }
  }
}

async function renderMp4() {
  const renderablePhotos = getRenderablePhotos();
  if (!renderablePhotos.length) {
    setMessage("MP4 \uc0dd\uc131\uc5d0 \uc0ac\uc6a9\ud560 \uc6d0\ubcf8 \uc0ac\uc9c4 \ud30c\uc77c\uc774 \uc5c6\uc2b5\ub2c8\ub2e4. \uc0ac\uc9c4\uc744 \uc5c5\ub85c\ub4dc\ud558\uac70\ub098 \uc120\ud0dd\ud558\uc138\uc694.");
    return;
  }

  const project = createProjectData();
  project.photos = project.photos
    .filter(photo => renderablePhotos.some(item => item.id === photo.id))
    .map(photo => ({ ...photo, selected: true }));
  const formData = new FormData();
  formData.append("project", JSON.stringify(project));
  for (const photo of renderablePhotos) {
    formData.append("photos", photo.file, photo.id + (photo.file.name.match(/\.[^.]+$/)?.[0] || ".jpg"));
  }

  updateRenderStatus({ status: "queued", progress: 1, currentPhoto: 0, currentPhotoName: "", totalPhotos: renderablePhotos.length, logs: [{ time: new Date().toISOString(), message: "\ub80c\ub354\ub9c1 \uc694\uccad \uc900\ube44" }] });
  generateButton.disabled = true;
  cancelRenderButton.disabled = true;
  setMessage("MP4 \uc0dd\uc131 \uc694\uccad\uc744 \ub300\uae30\uc5f4\uc5d0 \ucd94\uac00\ud558\ub294 \uc911\uc785\ub2c8\ub2e4.");

  try {
    const response = await fetch("/api/render", {
      method: "POST",
      body: formData
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || "MP4 \uc0dd\uc131\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.");
    activeRenderJobId = result.jobId;
    cancelRenderButton.disabled = false;
    generateButton.disabled = photos.length === 0;
    setMessage(`MP4 \uc0dd\uc131 \uc791\uc5c5\uc744 \ub300\uae30\uc5f4\uc5d0 \ucd94\uac00\ud588\uc2b5\ub2c8\ub2e4: ${result.jobId}`);
    await loadRenderQueue();
    await pollRenderStatus(activeRenderJobId);
    renderPollTimer = setInterval(() => {
      if (!activeRenderJobId) return;
      pollRenderStatus(activeRenderJobId).catch(error => {
        stopRenderPolling();
        activeRenderJobId = null;
        cancelRenderButton.disabled = true;
        generateButton.disabled = photos.length === 0;
        setMessage(error.message);
      });
    }, 1000);
  } catch (error) {
    setMessage(error.message || "MP4 \uc0dd\uc131\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4. FFmpeg \uc124\uce58 \uc0c1\ud0dc\ub97c \ud655\uc778\ud558\uc138\uc694.");
    generateButton.disabled = photos.length === 0;
    cancelRenderButton.disabled = true;
  }
}

async function cancelRender() {
  if (!activeRenderJobId) return;
  cancelRenderButton.disabled = true;
  setMessage("\ub80c\ub354\ub9c1 \ucde8\uc18c \uc694\uccad \uc911\uc785\ub2c8\ub2e4.");
  try {
    await fetch(`/api/render/cancel/${encodeURIComponent(activeRenderJobId)}`, { method: "POST" });
    await pollRenderStatus(activeRenderJobId);
    await loadRenderQueue();
  } catch (error) {
    setMessage(error.message || "\ub80c\ub354\ub9c1 \ucde8\uc18c\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.");
  }
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

async function projectApi(path, payload) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || "프로젝트 API 요청에 실패했습니다.");
  return result;
}

function readLocalRecentProjects() {
  try {
    const parsed = JSON.parse(localStorage.getItem(recentProjectsKey) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function writeLocalRecentProject(data, fileName, source = "local") {
  const item = {
    name: data.project?.name || data.video?.title || "Highlight Studio Project",
    fileName: fileName.endsWith(".hsp") ? fileName : `${fileName}.hsp`,
    source,
    photoCount: Array.isArray(data.photos) ? data.photos.length : 0,
    studentCount: Array.isArray(data.students) ? data.students.length : 0,
    modifiedAt: data.project?.modifiedAt || new Date().toISOString(),
    addedAt: new Date().toISOString()
  };
  const recent = readLocalRecentProjects().filter(project => project.fileName !== item.fileName || project.name !== item.name);
  recent.unshift(item);
  localStorage.setItem(recentProjectsKey, JSON.stringify(recent.slice(0, 10)));
  return item;
}

async function loadRecentProjects() {
  const localRecent = readLocalRecentProjects();
  let serverRecent = [];
  try {
    const response = await fetch("/api/project/recent");
    const result = await response.json();
    if (response.ok && result.ok) serverRecent = result.recent || [];
  } catch (_) {}
  renderRecentProjects([...localRecent, ...serverRecent]);
}

function renderRecentProjects(recent = []) {
  if (!recentProjectsList) return;
  const unique = [];
  const seen = new Set();
  for (const item of recent) {
    const key = `${item.name || ""}|${item.fileName || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  if (!unique.length) {
    recentProjectsList.innerHTML = `<p class="muted-text">최근 프로젝트 기록이 없습니다.</p>`;
    return;
  }
  recentProjectsList.innerHTML = unique.slice(0, 10).map(item => `
    <div class="recent-project-row">
      <div>
        <strong>${escapeHtml(item.name || "Highlight Studio Project")}</strong>
        <span>${escapeHtml(item.fileName || ".hsp")} / 사진 ${Number(item.photoCount || 0)}장 / ${formatDateTime(item.modifiedAt || item.addedAt)}</span>
      </div>
      <button type="button" data-action="open-recent-project">불러오기</button>
    </div>
  `).join("");
}

async function saveProject(options = {}) {
  const data = createProjectData();
  if (options.askName || !currentProjectFileName) {
    const nextName = window.prompt("\ud504\ub85c\uc81d\ud2b8 \ud30c\uc77c\uba85\uc744 \uc785\ub825\ud558\uc138\uc694.", currentProjectFileName || safeFileName(data.project.name));
    if (!nextName) return;
    currentProjectFileName = safeFileName(nextName.replace(/\.hsp$/i, ""));
  }
  try {
    const result = await projectApi("/api/project/save", { project: data, fileName: currentProjectFileName });
    const savedProject = result.project || data;
    downloadProject(savedProject, result.fileName || currentProjectFileName);
    localStorage.setItem(autosaveKey, JSON.stringify(savedProject));
    writeLocalRecentProject(savedProject, result.fileName || currentProjectFileName, "save");
    loadRecentProjects();
    setProjectStatus(`\uc800\uc7a5\ub428: ${formatDateTime(savedProject.project.modifiedAt)}`);
    setMessage(".hsp \ud504\ub85c\uc81d\ud2b8 \ud30c\uc77c\uc744 \uc800\uc7a5\ud588\uc2b5\ub2c8\ub2e4. \uc0ac\uc9c4 \uc6d0\ubcf8\uc740 \ud3ec\ud568\ub418\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.");
  } catch (error) {
    setMessage(error.message || "프로젝트 저장에 실패했습니다.");
  }
}

async function autosaveProject() {
  try {
    const data = createProjectData();
    localStorage.setItem(autosaveKey, JSON.stringify(data));
    projectApi("/api/project/autosave", { project: data }).catch(() => {});
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
  outputResolutionInput.value = "1080x1920";
  customWidthInput.value = "1080";
  customHeightInput.value = "1920";
  outputFpsInput.value = "30";
  outputQualityInput.value = "standard";
  outputFormatInput.value = "mp4";
  if (renderEncoderInput) renderEncoderInput.value = "auto";
  outputDirectoryInput.value = "outputs/";
  outputFileNameTouched = false;
  updateOutputFileName();
  localStorage.removeItem(autosaveKey);
  setProjectStatus("\uc0c8 \ud504\ub85c\uc81d\ud2b8");
  setMessage("\uc0c8 \ud504\ub85c\uc81d\ud2b8\ub97c \uc2dc\uc791\ud588\uc2b5\ub2c8\ub2e4.");
  renderStudents();
  renderList();
  renderOutputEstimate();
}

function openProjectFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const data = JSON.parse(reader.result);
      const result = await projectApi("/api/project/load", { project: data, fileName: file.name });
      const projectData = result.project || data;
      currentProjectFileName = safeFileName(file.name.replace(/\.hsp$/i, ""));
      restoreProjectData(projectData);
      localStorage.setItem(autosaveKey, JSON.stringify(createProjectData()));
      writeLocalRecentProject(projectData, file.name, "load");
      loadRecentProjects();
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
    pendingAutosaveData = data;
    restoreBanner.classList.remove("is-hidden");
    setProjectStatus("\uc774\uc804 \uc791\uc5c5 \ubcf5\uc6d0 \uac00\ub2a5");
  } catch (error) {
    localStorage.removeItem(autosaveKey);
  }
}

async function restoreServerAutosaveIfAvailable() {
  if (pendingAutosaveData) return;
  try {
    const response = await fetch("/api/project/autosave");
    const result = await response.json();
    if (!response.ok || !result.ok || !result.project) return;
    pendingAutosaveData = result.project;
    restoreBanner.classList.remove("is-hidden");
    setProjectStatus("최근 작업 복원 가능");
  } catch (_) {}
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

function renderRating(photo) {
  const rating = Number(photo.rating || 3);
  return [1, 2, 3, 4, 5].map(value => {
    const activeClass = value <= rating ? " is-active" : "";
    return `<button type="button" class="star-button${activeClass}" data-action="rating" data-id="${escapeHtml(photo.id)}" data-rating="${value}" aria-label="${value}\uc810">\u2605</button>`;
  }).join("");
}

function renderStoryboard() {
  if (!storyboardList) return;
  if (!photos.length) {
    storyboardList.innerHTML = `<div class="empty-state">\uc0ac\uc9c4\uc744 \ucd94\uac00\ud558\uba74 \uc2a4\ud1a0\ub9ac\ubcf4\ub4dc\uac00 \uc5ec\uae30\uc5d0 \ud45c\uc2dc\ub429\ub2c8\ub2e4.</div>`;
    recommendationSummary.textContent = "\uc0ac\uc9c4\uc744 \ucd94\uac00\ud558\uba74 \uc784\uc2dc \ucd94\ucc9c \uc54c\uace0\ub9ac\uc998\uc73c\ub85c \uad6c\uc131\uc744 \uc81c\uc548\ud569\ub2c8\ub2e4.";
    return;
  }

  const sceneCards = photos.map((photo, index) => {
    const orientation = photo.height > photo.width ? "\uc138\ub85c" : photo.width > photo.height ? "\uac00\ub85c" : "\uc815\uc0ac\uac01";
    const studentLabel = (photo.students || []).map(id => getStudent(id)?.name).filter(Boolean).join(", ") || "\ud559\uc0dd \ud0dc\uadf8 \uc5c6\uc74c";
    return `
      <article class="storyboard-card${photo.locked ? " is-locked" : ""}${photo.recommended ? " is-recommended" : ""}" draggable="${photo.locked ? "false" : "true"}" data-id="${escapeHtml(photo.id)}">
        <div class="storyboard-flow">\u2193</div>
        <button class="storyboard-thumb" type="button" data-action="preview" data-id="${escapeHtml(photo.id)}">
          <img src="${getPhotoUrl(photo)}" alt="">
        </button>
        <div class="storyboard-meta">
          <strong>${index + 1}. ${escapeHtml(photo.file.name)}</strong>
          <span>${orientation} / ${Number(photo.durationSeconds || getSecondsPerPhoto())}\ucd08 / ${studentLabel}</span>
          <div class="storyboard-badges">
            ${photo.favorite ? `<em>\u2605 \uc990\uaca8\ucc3e\uae30</em>` : ""}
            ${photo.locked ? `<em>\uD83D\uDD12 \uc7a0\uae08</em>` : ""}
            ${photo.recommended ? `<em>AI \ucd94\ucc9c</em>` : ""}
            ${photo.aiExcluded ? `<em>AI \uc81c\uc678</em>` : ""}
            ${photo.aiScore ? `<em>${Math.round(photo.aiScore)}\uc810</em>` : ""}
          </div>
          <div class="rating-control">${renderRating(photo)}</div>
          <div class="storyboard-actions">
            <button type="button" data-action="favorite" data-id="${escapeHtml(photo.id)}">${photo.favorite ? "\uc990\uaca8\ucc3e\uae30 \ud574\uc81c" : "\u2605 \uc990\uaca8\ucc3e\uae30"}</button>
            <button type="button" data-action="lock" data-id="${escapeHtml(photo.id)}">${photo.locked ? "\uc7a0\uae08 \ud574\uc81c" : "\uD83D\uDD12 \uc7a0\uae08"}</button>
            <button type="button" data-action="toggle-recommended" data-id="${escapeHtml(photo.id)}">${photo.recommended ? "\ucd94\ucc9c \ud574\uc81c" : "\ucd94\ucc9c \uc801\uc6a9"}</button>
          </div>
        </div>
      </article>
    `;
  }).join("");

  storyboardList.innerHTML = `
    <article class="storyboard-card storyboard-fixed">
      <div class="storyboard-scene-label">\uc624\ud504\ub2dd</div>
      <strong>${escapeHtml(openingCaptionInput.value || "\uc624\ud504\ub2dd \uc790\ub9c9")}</strong>
    </article>
    ${sceneCards}
    <article class="storyboard-card storyboard-fixed">
      <div class="storyboard-flow">\u2193</div>
      <div class="storyboard-scene-label">\uc5d4\ub529</div>
      <strong>${escapeHtml(endingCaptionInput.value || "\uc5d4\ub529 \uc790\ub9c9")}</strong>
    </article>
  `;
}

function renderList() {
  const visiblePhotos = getFilteredPhotos();
  if (!photos.length) {
    photoList.innerHTML = `<div class="empty-state">\uc5c5\ub85c\ub4dc\ud55c \uc0ac\uc9c4\uc774 \uc5ec\uae30\uc5d0 \ud45c\uc2dc\ub429\ub2c8\ub2e4.</div>`;
    activePreviewId = null;
    renderPreview();
    renderTimeline();
    renderStoryboard();
    updateStats();
    return;
  }

  if (!visiblePhotos.length) {
    photoList.innerHTML = `<div class="empty-state">\ud604\uc7ac \ud544\ud130\uc5d0 \ud574\ub2f9\ud558\ub294 \uc0ac\uc9c4\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.</div>`;
    renderPreview();
    renderTimeline();
    renderStoryboard();
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
          ${photo.aiScore ? `<span>AI ${Math.round(photo.aiScore)}\uc810 / ${photo.aiExcluded ? "\uc81c\uc678" : photo.recommended ? "\ucd94\ucc9c" : "\ubcf4\ub958"}</span>` : ""}
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
  renderStoryboard();
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
      favorite: false,
      locked: false,
      rating: 3,
      recommended: false,
      aiScore: 0,
      aiExcluded: false,
      aiReasons: [],
      storyRole: "",
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
  if (photos[fromIndex]?.locked || photos[toIndex]?.locked) {
    setMessage("\uc7a0\uae08\ub41c \uc7a5\uba74\uc740 \uc21c\uc11c\ub97c \ubcc0\uacbd\ud560 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4.");
    return;
  }
  const next = [...photos];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  photos = next;
  normalizeLastTransition();
  activePreviewId = id;
  renderList();
}

function toggleStoryboardFlag(photoId, key) {
  const photo = photos.find(item => item.id === photoId);
  if (!photo) return;
  photo[key] = !photo[key];
  activePreviewId = photoId;
  renderList();
}

function updatePhotoRating(photoId, rating) {
  const photo = photos.find(item => item.id === photoId);
  if (!photo) return;
  photo.rating = Math.max(1, Math.min(5, Number(rating) || 3));
  if (photo.rating >= 4) photo.duration = Math.max(Number(photo.duration || photo.durationSeconds || getSecondsPerPhoto()), getSecondsPerPhoto() + 1);
  activePreviewId = photoId;
  renderList();
}

function duplicateSignature(photo) {
  return `${photo.file?.name || photo.fileName || ""}-${photo.file?.size || photo.fileSize || 0}-${photo.width || 0}x${photo.height || 0}`;
}

async function analyzePhotoPixels(photo) {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = () => {
      const size = 48;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(image, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;
      let brightness = 0;
      let colorfulness = 0;
      let sharpness = 0;
      const gray = [];
      for (let index = 0; index < data.length; index += 4) {
        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const value = (r + g + b) / 3;
        gray.push(value);
        brightness += value;
        colorfulness += Math.abs(r - g) + Math.abs(g - b) + Math.abs(b - r);
      }
      for (let y = 1; y < size - 1; y += 1) {
        for (let x = 1; x < size - 1; x += 1) {
          const i = y * size + x;
          sharpness += Math.abs(gray[i] - gray[i - 1]) + Math.abs(gray[i] - gray[i - size]);
        }
      }
      const count = size * size;
      resolve({
        brightness: brightness / count,
        colorfulness: colorfulness / count,
        sharpness: sharpness / count
      });
    };
    image.onerror = () => resolve({ brightness: 70, colorfulness: 20, sharpness: 25 });
    image.src = getPhotoUrl(photo);
  });
}

async function buildAiPhotoPayload(targetPhotos) {
  const metrics = await Promise.all(targetPhotos.map(analyzePhotoPixels));
  return targetPhotos.map((photo, index) => ({
    id: photo.id,
    fileName: photo.file?.name || photo.fileName || `photo-${index + 1}`,
    width: photo.width || 0,
    height: photo.height || 0,
    size: photo.file?.size || photo.fileSize || 0,
    selected: selectedPhotoIds.has(photo.id) || photo.selected,
    favorite: photo.favorite,
    locked: photo.locked,
    rating: photo.rating || 3,
    students: Array.from(photo.studentIds || []),
    order: photos.findIndex(item => item.id === photo.id),
    duplicateKey: duplicateSignature(photo),
    ...metrics[index]
  }));
}

function renderAiAnalysis(analysis = []) {
  if (!aiAnalysisList) return;
  if (!analysis.length) {
    aiAnalysisList.innerHTML = "";
    return;
  }
  aiAnalysisList.innerHTML = analysis.map(item => `
    <article class="ai-analysis-item${item.excluded ? " is-excluded" : item.recommended ? " is-recommended" : ""}">
      <strong>${escapeHtml(item.fileName)}</strong>
      <span>${Math.round(item.score)}\uc810 / ${item.excluded ? "\uc81c\uc678" : item.recommended ? "\ucd94\ucc9c" : "\ubcf4\ub958"}</span>
      <em>${escapeHtml([...(item.reasons || []), ...(item.excludeReasons || [])].join(", "))}</em>
    </article>
  `).join("");
}

function applyAiAnalysisToPhotos(analysis = []) {
  const byId = new Map(analysis.map(item => [item.id, item]));
  photos = photos.map(photo => {
    const result = byId.get(photo.id);
    if (!result) return photo;
    return {
      ...photo,
      aiScore: result.score,
      aiExcluded: result.excluded,
      aiReasons: [...(result.reasons || []), ...(result.excludeReasons || [])],
      recommended: photo.locked || result.recommended
    };
  });
}

function applyStoryboard(storyboard) {
  if (!storyboard) return;
  const selectedIds = new Set(storyboard.selectedPhotoIds || []);
  const sceneByPhotoId = new Map((storyboard.scenes || []).filter(scene => scene.photoId).map(scene => [scene.photoId, scene]));
  const lockedByIndex = new Map();
  photos.forEach((photo, index) => {
    if (photo.locked) lockedByIndex.set(index, photo);
  });
  const ordered = (storyboard.selectedPhotoIds || [])
    .map(id => photos.find(photo => photo.id === id))
    .filter(Boolean)
    .filter(photo => !photo.locked)
    .map(photo => {
      const scene = sceneByPhotoId.get(photo.id);
      return {
        ...photo,
        selected: true,
        recommended: true,
        aiExcluded: false,
        storyRole: scene?.type || "",
        durationSeconds: scene?.duration || photo.durationSeconds,
        duration: scene?.duration || photo.duration,
        caption: {
          ...normalizeCaption(photo.caption),
          text: normalizeCaption(photo.caption).text || scene?.caption || "",
          position: "bottom",
          style: "shadow",
          timing: "full"
        }
      };
    });
  const excluded = photos
    .filter(photo => !selectedIds.has(photo.id) && !photo.locked)
    .map(photo => ({ ...photo, selected: false, recommended: false }));
  const next = [...ordered, ...excluded];
  photos = photos.map((photo, index) => lockedByIndex.get(index) || next.shift()).filter(Boolean);
  const opening = storyboard.scenes?.find(scene => scene.type === "opening");
  const ending = storyboard.scenes?.find(scene => scene.type === "ending");
  if (opening?.caption) openingCaptionInput.value = opening.caption;
  if (ending?.caption) endingCaptionInput.value = ending.caption;
}

async function runAiAutoEdit() {
  if (!photos.length) {
    setMessage("\uc790\ub3d9 \ud3b8\uc9d1\ud560 \uc0ac\uc9c4\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.");
    return;
  }
  const targetPhotos = selectedPhotoIds.size ? photos.filter(photo => selectedPhotoIds.has(photo.id)) : photos;
  aiAutoEditButton.disabled = true;
  aiRecommendButton.disabled = true;
  recommendationSummary.textContent = "\uc0ac\uc9c4 \ud488\uc9c8\uc744 \ubd84\uc11d\ud558\uace0 \uc2a4\ud1a0\ub9ac\ubcf4\ub4dc\ub97c \ub9cc\ub4dc\ub294 \uc911\uc785\ub2c8\ub2e4.";
  try {
    const payloadPhotos = await buildAiPhotoPayload(targetPhotos);
    const analysisResponse = await fetch("/api/ai/analyze-photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photos: payloadPhotos })
    });
    const analysisResult = await analysisResponse.json();
    if (!analysisResponse.ok || !analysisResult.ok) throw new Error(analysisResult.error || "AI \ubd84\uc11d\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.");
    applyAiAnalysisToPhotos(analysisResult.photos);
    renderAiAnalysis(analysisResult.photos);

    const storyboardResponse = await fetch("/api/ai/create-storyboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        photos: payloadPhotos,
        analysis: analysisResult.photos,
        captionMode: aiCaptionModeInput?.value || "promotion"
      })
    });
    const storyboardResult = await storyboardResponse.json();
    if (!storyboardResponse.ok || !storyboardResult.ok) throw new Error(storyboardResult.error || "\uc2a4\ud1a0\ub9ac\ubcf4\ub4dc \uc0dd\uc131\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.");
    applyStoryboard(storyboardResult.storyboard);
    normalizeLastTransition();
    activePreviewId = photos.find(photo => photo.recommended)?.id || photos[0]?.id || null;
    const summary = analysisResult.summary;
    recommendationSummary.textContent = `AI \uc790\ub3d9 \ud3b8\uc9d1 \uc644\ub8cc: ${summary.total}\uc7a5 \ubd84\uc11d, ${summary.recommended}\uc7a5 \ucd94\ucc9c, ${summary.excluded}\uc7a5 \uc81c\uc678, \ud3c9\uade0 ${summary.averageScore}\uc810.`;
    setMessage("\ub85c\uceec \uaddc\uce59 \uae30\ubc18 AI \uc790\ub3d9 \ud3b8\uc9d1\uc744 \uc801\uc6a9\ud588\uc2b5\ub2c8\ub2e4. \uc678\ubd80 AI API\ub294 \uc0ac\uc6a9\ud558\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4.");
    renderList();
  } catch (error) {
    recommendationSummary.textContent = error.message || "AI \uc790\ub3d9 \ud3b8\uc9d1\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4.";
    setMessage(recommendationSummary.textContent);
  } finally {
    aiAutoEditButton.disabled = false;
    aiRecommendButton.disabled = false;
  }
}

async function applyAiRecommendation() {
  if (!photos.length) {
    setMessage("\ucd94\ucc9c\ud560 \uc0ac\uc9c4\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.");
    return;
  }
  await runAiAutoEdit();
}

function applyLegacyAiRecommendation() {
  const lockedByIndex = new Map();
  const duplicateKeys = new Set();
  const seenKeys = new Set();
  photos.forEach((photo, index) => {
    if (photo.locked) lockedByIndex.set(index, photo);
    const duplicateKey = `${photo.file?.name || photo.fileName || ""}-${photo.file?.size || photo.fileSize || 0}`;
    if (seenKeys.has(duplicateKey)) duplicateKeys.add(photo.id);
    else seenKeys.add(duplicateKey);
  });

  const movable = photos
    .filter(photo => !photo.locked)
    .map((photo, index) => ({ photo, originalIndex: index }))
    .sort((a, b) => {
      const aPortrait = a.photo.height > a.photo.width ? 1 : 0;
      const bPortrait = b.photo.height > b.photo.width ? 1 : 0;
      const aFavorite = a.photo.favorite ? 1 : 0;
      const bFavorite = b.photo.favorite ? 1 : 0;
      const aDuplicate = duplicateKeys.has(a.photo.id) ? 1 : 0;
      const bDuplicate = duplicateKeys.has(b.photo.id) ? 1 : 0;
      const ratingDiff = Number(b.photo.rating || 3) - Number(a.photo.rating || 3);
      return (aDuplicate - bDuplicate) || (bFavorite - aFavorite) || (bPortrait - aPortrait) || ratingDiff || (a.originalIndex - b.originalIndex);
    })
    .map(item => item.photo);

  const next = [];
  let movableIndex = 0;
  for (let index = 0; index < photos.length; index += 1) {
    if (lockedByIndex.has(index)) next.push(lockedByIndex.get(index));
    else next.push(movable[movableIndex++]);
  }

  photos = next.map(photo => ({
    ...photo,
    recommended: !photo.locked && !duplicateKeys.has(photo.id)
  }));
  normalizeLastTransition();
  activePreviewId = photos[0]?.id || null;
  const lockedCount = lockedByIndex.size;
  const portraitCount = photos.filter(photo => photo.height > photo.width).length;
  recommendationSummary.textContent = `AI \uc0ac\uc6a9 \uc5c6\uc774 \uc784\uc2dc \uc54c\uace0\ub9ac\uc998\uc73c\ub85c \uc7ac\uad6c\uc131: \uc138\ub85c \uc0ac\uc9c4 ${portraitCount}\uc7a5 \uc6b0\uc120, \uc911\ubcf5 ${duplicateKeys.size}\uc7a5 \ud6c4\ubc18 \ubc30\uce58, \uc7a0\uae08 ${lockedCount}\uc7a5 \uc704\uce58 \uc720\uc9c0, \ud750\ub9bc/\ud559\uc0dd \uc5f0\uc18d \ud310\ubcc4\uc740 \ucd94\ud6c4 \uc801\uc6a9 \uc608\uc815.`;
  setMessage("AI \ucd94\ucc9c \uad6c\uc131\uc744 \uc801\uc6a9\ud588\uc2b5\ub2c8\ub2e4. \uc2e4\uc81c AI API\ub294 \uc0ac\uc6a9\ud558\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4.");
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

saveTemplateButton.addEventListener("click", saveTemplate);
updateTemplateButton.addEventListener("click", updateTemplate);
templateList.addEventListener("click", event => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const templateId = target.dataset.id;
  if (target.dataset.action === "select-template") {
    selectedTemplateId = templateId;
    fillTemplateForm(getSelectedTemplate());
    renderTemplates();
  }
  if (target.dataset.action === "apply-template") applySelectedTemplate(templateId);
  if (target.dataset.action === "delete-template") deleteTemplate(templateId);
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
    renderOutputEstimate();
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

storyboardList.addEventListener("click", event => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const { action, id } = target.dataset;
  if (action === "preview") {
    activePreviewId = id;
    renderList();
  }
  if (action === "favorite") toggleStoryboardFlag(id, "favorite");
  if (action === "lock") toggleStoryboardFlag(id, "locked");
  if (action === "toggle-recommended") toggleStoryboardFlag(id, "recommended");
  if (action === "rating") updatePhotoRating(id, target.dataset.rating);
});

storyboardList.addEventListener("dragstart", event => {
  const card = event.target.closest(".storyboard-card[data-id]");
  if (!card || card.classList.contains("is-locked")) return;
  draggedStoryboardPhotoId = card.dataset.id;
  card.classList.add("is-dragging");
});

storyboardList.addEventListener("dragend", event => {
  event.target.closest(".storyboard-card")?.classList.remove("is-dragging");
  draggedStoryboardPhotoId = null;
});

storyboardList.addEventListener("dragover", event => {
  if (event.target.closest(".storyboard-card[data-id]")) event.preventDefault();
});

storyboardList.addEventListener("drop", event => {
  event.preventDefault();
  const card = event.target.closest(".storyboard-card[data-id]");
  if (card) movePhotoTo(draggedStoryboardPhotoId, card.dataset.id);
});

aiAutoEditButton.addEventListener("click", runAiAutoEdit);
aiRecommendButton.addEventListener("click", applyAiRecommendation);

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
  updateOutputFileName();
  renderOutputEstimate();
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
  renderOutputEstimate();
});
openingCaptionInput.addEventListener("input", () => {
  renderOutputEstimate();
  renderStoryboard();
});
endingCaptionInput.addEventListener("input", () => {
  renderOutputEstimate();
  renderStoryboard();
});
[
  outputResolutionInput,
  customWidthInput,
  customHeightInput,
  outputFpsInput,
  outputQualityInput,
  outputFormatInput,
  renderEncoderInput,
  outputDirectoryInput
].forEach(input => {
  if (!input) return;
  input.addEventListener("input", renderOutputEstimate);
  input.addEventListener("change", renderOutputEstimate);
});
outputFileNameInput.addEventListener("input", () => {
  outputFileNameTouched = true;
  renderOutputEstimate();
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
restoreRecentButton.addEventListener("click", () => {
  recentProjectsPanel.classList.toggle("is-hidden");
  loadRecentProjects();
});
projectInput.addEventListener("change", () => {
  openProjectFile(projectInput.files?.[0]);
  projectInput.value = "";
});
recentProjectsList.addEventListener("click", event => {
  const target = event.target.closest("[data-action='open-recent-project']");
  if (!target) return;
  setMessage("브라우저 보안상 최근 파일 경로를 직접 열 수 없습니다. .hsp 파일을 선택해 주세요.");
  projectInput.click();
});
restoreAutosaveButton.addEventListener("click", () => {
  if (!pendingAutosaveData) return;
  restoreProjectData(pendingAutosaveData);
  restoreBanner.classList.add("is-hidden");
  pendingAutosaveData = null;
  setMessage("\uc774\uc804 \uc790\ub3d9 \uc800\uc7a5 \uc791\uc5c5\uc744 \ubcf5\uc6d0\ud588\uc2b5\ub2c8\ub2e4.");
});
dismissAutosaveButton.addEventListener("click", () => {
  pendingAutosaveData = null;
  localStorage.removeItem(autosaveKey);
  restoreBanner.classList.add("is-hidden");
  setProjectStatus("\uc0c8\ub85c \uc2dc\uc791");
  setMessage("\uc774\uc804 \uc790\ub3d9 \uc800\uc7a5 \uc791\uc5c5\uc744 \uc0ac\uc6a9\ud558\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.");
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
  renderMp4();
});
cancelRenderButton.addEventListener("click", cancelRender);
loginForm.addEventListener("submit", loginLocalAccount);
logoutButton.addEventListener("click", logoutLocalAccount);
checkUpdateButton.addEventListener("click", checkForUpdates);
copyLatestShareButton.addEventListener("click", () => {
  copyShareLink(latestOutputFile?.filename);
});
kakaoLatestShareButton.addEventListener("click", () => {
  shareToKakao(latestOutputFile?.filename);
});
bandLatestShareButton.addEventListener("click", () => {
  shareToBand(latestOutputFile?.filename);
});
refreshQueueButton.addEventListener("click", () => {
  loadRenderQueue();
});
renderQueueList.addEventListener("click", event => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  if (target.dataset.action === "cancel-queue-job") {
    cancelQueueJob(target.dataset.jobId);
  }
});
refreshOutputsButton.addEventListener("click", () => {
  loadOutputs();
});
outputsList.addEventListener("click", event => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const filename = target.dataset.filename;
  if (target.dataset.action === "preview-output") {
    setOutputPreview({
      filename,
      url: outputUrl(filename),
      downloadUrl: outputDownloadUrl(filename)
    });
  }
  if (target.dataset.action === "copy-share") {
    copyShareLink(filename);
  }
  if (target.dataset.action === "kakao-share") {
    shareToKakao(filename);
  }
  if (target.dataset.action === "band-share") {
    shareToBand(filename);
  }
  if (target.dataset.action === "delete-output") {
    deleteOutputFile(filename);
  }
});

if (window.highlightDesktop) {
  window.highlightDesktop.onCommand(handleDesktopCommand);
  window.highlightDesktop.onSettings(applyDesktopSettings);
}

fetch("/health")
  .then(res => res.json())
  .then(data => { serverStatus.textContent = data.app ? `localhost:${data.port}` : "localhost:4000"; })
  .catch(() => { serverStatus.textContent = "localhost:4000"; });

defaultTransitionInput.innerHTML = optionMarkup(transitionOptions, "fade");
renderStudents();
renderList();
renderAuthState();
loadLicenseStatus().catch(error => { authMessage.textContent = error.message; });
checkForUpdates();
loadTemplates();
loadRenderEncoders();
loadOutputs();
loadRenderQueue();
queuePollTimer = setInterval(loadRenderQueue, 2000);
restoreAutosaveIfWanted();
restoreServerAutosaveIfAvailable();
loadRecentProjects();
setInterval(autosaveProject, 5 * 60 * 1000);
