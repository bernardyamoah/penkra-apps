export function createDocumentAssetCache(limit = 2) {
  const documents = new Map();

  return {
    take(documentId) {
      const assets = documents.get(documentId) ?? new Map();
      documents.delete(documentId);
      documents.set(documentId, assets);
      return assets;
    },
    remember(documentId, assets) {
      documents.delete(documentId);
      documents.set(documentId, assets);
      while (documents.size > limit) documents.delete(documents.keys().next().value);
    },
  };
}
