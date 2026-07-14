let getRenderQueue = () => [];
let getQueuePosition = () => 0;
let pushJobLog = () => {};
let processRenderQueue = () => {};

function configureRenderQueueOperations(dependencies = {}) {
  getRenderQueue = dependencies.getRenderQueue || getRenderQueue;
  getQueuePosition = dependencies.getQueuePosition || getQueuePosition;
  pushJobLog = dependencies.pushJobLog || pushJobLog;
  processRenderQueue = dependencies.processRenderQueue || processRenderQueue;
}

function removeQueuedJob(jobId) {
  const queue = getRenderQueue();
  const index = queue.findIndex(item => item.jobId === jobId);
  if (index >= 0) return queue.splice(index, 1)[0];
  return null;
}

function enqueueRenderJob(job) {
  getRenderQueue().push(job);
  pushJobLog(job, `렌더링 대기열 추가: ${getQueuePosition(job)}번째`);
  processRenderQueue();
}

module.exports = {
  configureRenderQueueOperations,
  removeQueuedJob,
  enqueueRenderJob
};
