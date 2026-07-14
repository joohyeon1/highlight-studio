function createRenderQueueController(dependencies = {}) {
  const {
    getRenderQueue,
    getActiveRenderJobId,
    setActiveRenderJobId,
    clearActiveRenderJobId,
    pushJobLog,
    updateJob,
    scheduleJobCleanup,
    createRenderFromProject,
    cleanupUploadedFiles
  } = dependencies;

  function processRenderQueue() {
    if (getActiveRenderJobId()) return;
    const nextJob = getRenderQueue().shift();
    if (!nextJob) return;
    if (nextJob.canceled || nextJob.status === "canceled") {
      process.nextTick(processRenderQueue);
      return;
    }
    setActiveRenderJobId(nextJob.jobId);
    pushJobLog(nextJob, "대기열에서 렌더링 시작");
    createRenderFromProject(nextJob.project, nextJob.files || [], nextJob)
      .then(result => {
        if (nextJob.canceled) return;
        updateJob(nextJob, {
          status: "completed",
          progress: 100,
          filename: result.filename,
          downloadUrl: result.downloadUrl,
          durationSeconds: result.durationSeconds,
          bytes: result.bytes,
          completedAt: new Date().toISOString()
        });
        scheduleJobCleanup(nextJob.jobId);
      })
      .catch(error => {
        updateJob(nextJob, {
          status: nextJob.canceled ? "canceled" : "failed",
          error: error.message || "MP4 생성에 실패했습니다.",
          progress: nextJob.canceled ? nextJob.progress : 0,
          completedAt: new Date().toISOString()
        });
        pushJobLog(nextJob, `오류 메시지: ${nextJob.error}`);
        cleanupUploadedFiles(nextJob.files || []);
        scheduleJobCleanup(nextJob.jobId);
      })
      .finally(() => {
        clearActiveRenderJobId();
        processRenderQueue();
      });
  }

  return {
    processRenderQueue
  };
}

module.exports = {
  createRenderQueueController
};
