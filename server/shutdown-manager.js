function createShutdownManager(dependencies = {}) {
  const cancelAllRenderJobs = dependencies.cancelAllRenderJobs || (() => {});
  const logger = dependencies.logger || console;
  let shutdownPromise = null;

  function closeHttpServer(server) {
    if (!server || typeof server.close !== "function") return Promise.resolve();
    if (server.listening === false) return Promise.resolve();
    return new Promise((resolve, reject) => {
      server.close(error => {
        if (!error) {
          resolve();
          return;
        }
        if (error.code === "ERR_SERVER_NOT_RUNNING") {
          resolve();
          return;
        }
        reject(error);
      });
    });
  }

  function shutdownServer(server, reason = "shutdown") {
    if (shutdownPromise) return shutdownPromise;
    shutdownPromise = (async () => {
      logger.log?.(`Highlight Studio shutdown started: ${reason}`);
      cancelAllRenderJobs(reason);
      await closeHttpServer(server);
      logger.log?.("Highlight Studio shutdown completed");
    })().catch(error => {
      logger.error?.(`Highlight Studio shutdown failed: ${error.message || error}`);
      throw error;
    });
    return shutdownPromise;
  }

  function isShuttingDown() {
    return Boolean(shutdownPromise);
  }

  return {
    shutdownServer,
    isShuttingDown
  };
}

module.exports = {
  createShutdownManager
};
