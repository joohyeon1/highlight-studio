const renderJobs = new Map();
const renderQueue = [];
let activeRenderJobId = null;
let renderEncoders = {};

function configureRenderJobStore(options = {}) {
  renderEncoders = options.renderEncoders || renderEncoders;
}

function getRenderJobs() {
  return renderJobs;
}

function addRenderJob(job) {
  renderJobs.set(job.jobId, job);
}

function getRenderJob(jobId) {
  return renderJobs.get(jobId);
}

function deleteRenderJob(jobId) {
  return renderJobs.delete(jobId);
}

function getRenderQueue() {
  return renderQueue;
}

function getActiveRenderJobId() {
  return activeRenderJobId;
}

function setActiveRenderJobId(jobId) {
  activeRenderJobId = jobId;
}

function clearActiveRenderJobId() {
  activeRenderJobId = null;
}

function getQueuedRenderCount() {
  return renderQueue.filter(job => job.status === "queued").length;
}

function getQueuePosition(job) {
  if (!job || job.status !== "queued") return 0;
  const index = renderQueue.findIndex(item => item.jobId === job.jobId);
  return index >= 0 ? index + 1 : 0;
}

function publicJob(job) {
  if (!job) return null;
  const encoderInfo = renderEncoders[job.encoder] || null;
  return {
    jobId: job.jobId,
    status: job.status,
    progress: job.progress,
    currentPhoto: job.currentPhoto,
    currentPhotoName: job.currentPhotoName,
    totalPhotos: job.totalPhotos,
    filename: job.filename,
    downloadUrl: job.downloadUrl,
    durationSeconds: job.durationSeconds,
    bytes: job.bytes,
    error: job.error,
    failedPhotos: job.failedPhotos || [],
    logs: job.logs,
    encoderRequested: job.encoderRequested || "auto",
    encoder: job.encoder || "",
    encoderCodec: job.encoderCodec || "",
    encoderLabel: job.encoderLabel || encoderInfo?.label || "",
    encoderFallback: Boolean(job.encoderFallback),
    encoderFallbackMessage: job.encoderFallbackMessage || "",
    queuePosition: getQueuePosition(job),
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    updatedAt: job.updatedAt
  };
}

function publicQueue() {
  return Array.from(renderJobs.values())
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map(job => ({
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      currentPhoto: job.currentPhoto,
      currentPhotoName: job.currentPhotoName,
      totalPhotos: job.totalPhotos,
      queuePosition: getQueuePosition(job),
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      filename: job.filename,
      encoder: job.encoder || "",
      encoderCodec: job.encoderCodec || "",
      encoderLabel: job.encoderLabel || renderEncoders[job.encoder]?.label || "",
      encoderFallback: Boolean(job.encoderFallback),
      failedCount: (job.failedPhotos || []).length,
      error: job.error
    }));
}

module.exports = {
  configureRenderJobStore,
  getRenderJobs,
  addRenderJob,
  getRenderJob,
  deleteRenderJob,
  getRenderQueue,
  getActiveRenderJobId,
  setActiveRenderJobId,
  clearActiveRenderJobId,
  getQueuedRenderCount,
  getQueuePosition,
  publicJob,
  publicQueue
};
