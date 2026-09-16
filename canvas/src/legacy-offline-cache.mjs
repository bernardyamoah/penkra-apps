export function migrateLegacyOfflineCache(documentId, serverStateVector, options = {}) {
  const WorkerConstructor = options.Worker ?? globalThis.Worker;
  if (!WorkerConstructor) return Promise.reject(new Error("Canvas cannot migrate offline changes without a Worker."));
  const workerUrl = options.workerUrl
    ?? new URL("./legacy-offline-cache-worker.js", import.meta.url);
  const worker = new WorkerConstructor(workerUrl, { type: "module" });

  return new Promise((resolve, reject) => {
    worker.onmessage = (event) => {
      worker.terminate();
      if (event.data?.error) reject(new Error(event.data.error));
      else resolve(event.data?.item ?? null);
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(event.error ?? new Error(event.message || "Canvas could not migrate its legacy offline cache."));
    };
    const vector = serverStateVector.slice();
    worker.postMessage({ documentId, serverStateVector: vector }, [vector.buffer]);
  });
}
