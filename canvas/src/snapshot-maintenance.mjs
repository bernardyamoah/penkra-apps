const BASE_RETRY_MS = 5_000;
const MAX_RETRY_MS = 300_000;

export function createSnapshotMaintenance(options) {
  let running = false;
  let retryAttempt = 0;
  let retryTimer = null;

  const clearRetry = () => {
    if (retryTimer !== null) (options.clearTimeout ?? globalThis.clearTimeout)(retryTimer);
    retryTimer = null;
  };

  const request = async (documentId) => {
    if (running || !options.canRun(documentId)) return false;
    clearRetry();
    running = true;
    let repeat = false;
    try {
      const payload = options.createPayload(documentId);
      await options.upload(documentId, payload);
      retryAttempt = 0;
      options.onSuccess(documentId, payload);
      repeat = options.canRun(documentId);
      return true;
    } catch (error) {
      if (error?.status === 403 || error?.status === 404) {
        options.onAccessRemoved(error);
        return false;
      }
      const permanent = Number(error?.status) >= 400 && Number(error?.status) < 500;
      options.onFailure(error, { willRetry: !permanent });
      if (!permanent) {
        const delay = Math.min(BASE_RETRY_MS * (2 ** retryAttempt), MAX_RETRY_MS);
        retryAttempt += 1;
        const schedule = options.setTimeout ?? globalThis.setTimeout;
        retryTimer = schedule(() => {
          retryTimer = null;
          void request(documentId);
        }, delay);
      }
      return false;
    } finally {
      running = false;
      if (repeat) queueMicrotask(() => void request(documentId));
    }
  };

  return {
    request,
    cancel() {
      clearRetry();
      retryAttempt = 0;
    },
  };
}
