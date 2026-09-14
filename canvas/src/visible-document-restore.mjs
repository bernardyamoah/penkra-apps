export function createVisibleDocumentRestore({ openDocument, onQueued, onError }) {
  let active = false;
  let requestedDocumentId = null;
  let opening = false;

  const drain = () => {
    if (!active || opening || !requestedDocumentId) return;
    const documentId = requestedDocumentId;
    requestedDocumentId = null;
    opening = true;
    void Promise.resolve(openDocument(documentId))
      .catch(onError)
      .finally(() => {
        opening = false;
        drain();
      });
  };

  return {
    restore(documentId) {
      requestedDocumentId = documentId;
      onQueued(documentId);
      drain();
    },
    setActive(nextActive) {
      active = nextActive;
      drain();
    },
    cancel() {
      requestedDocumentId = null;
    },
  };
}
