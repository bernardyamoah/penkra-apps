export function createVisibleDocumentRestore({ openDocument, onQueued, onError }) {
  let active = false;
  let requestedDocumentId = null;
  let opening = false;
  let openingDocumentId = null;
  let openingGeneration = -1;
  let requestGeneration = 0;

  const drain = () => {
    if (!active || opening || !requestedDocumentId) return;
    const documentId = requestedDocumentId;
    const generation = requestGeneration;
    requestedDocumentId = null;
    opening = true;
    openingDocumentId = documentId;
    openingGeneration = generation;
    const isCurrent = () => generation === requestGeneration;
    void Promise.resolve(openDocument(documentId, isCurrent))
      .catch((error) => {
        if (isCurrent()) onError(error);
      })
      .finally(() => {
        opening = false;
        openingDocumentId = null;
        openingGeneration = -1;
        drain();
      });
  };

  return {
    restore(documentId) {
      if (
        documentId === requestedDocumentId
        || documentId === openingDocumentId && openingGeneration === requestGeneration
      ) return;
      requestGeneration += 1;
      requestedDocumentId = documentId;
      onQueued(documentId);
      drain();
    },
    setActive(nextActive) {
      active = nextActive;
      drain();
    },
    cancel() {
      requestGeneration += 1;
      requestedDocumentId = null;
    },
  };
}
