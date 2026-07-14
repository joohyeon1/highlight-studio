let getRenderJob = () => null;
let deleteRenderJob = () => false;

function configureRenderJobUtils(dependencies = {}) {
  getRenderJob = dependencies.getRenderJob || getRenderJob;
  deleteRenderJob = dependencies.deleteRenderJob || deleteRenderJob;
}

function pushJobLog(job, message) {
  if (!job) return;
  job.logs.push({ time: new Date().toISOString(), message });
  if (job.logs.length > 300) job.logs.shift();
}

function updateJob(job, patch = {}) {
  if (!job) return;
  Object.assign(job, patch, { updatedAt: new Date().toISOString() });
}

function scheduleJobCleanup(jobId) {
  setTimeout(() => {
    const job = getRenderJob(jobId);
    if (job && ["completed", "failed", "canceled"].includes(job.status)) {
      deleteRenderJob(jobId);
    }
  }, 30 * 60 * 1000);
}

module.exports = {
  configureRenderJobUtils,
  pushJobLog,
  updateJob,
  scheduleJobCleanup
};
