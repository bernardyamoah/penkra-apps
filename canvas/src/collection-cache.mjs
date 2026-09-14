const VERSION = 1;

export function readCollectionCache(storage, accountId) {
  if (!storage || !accountId) return null;
  try {
    const value = JSON.parse(storage.getItem(key(accountId)) ?? "null");
    if (value?.version !== VERSION || !Array.isArray(value.documents)
      || !Array.isArray(value.folders) || !Array.isArray(value.recentFolders)
      || !Array.isArray(value.folderCollections)) return null;
    return {
      documents: value.documents,
      folders: value.folders,
      recentFolders: value.recentFolders,
      folderCollections: new Map(value.folderCollections.filter((entry) =>
        Array.isArray(entry) && typeof entry[0] === "string" && entry[1]?.folder?.id === entry[0])),
    };
  } catch {
    return null;
  }
}

export function writeCollectionCache(storage, accountId, value) {
  if (!storage || !accountId) return;
  storage.setItem(key(accountId), JSON.stringify({
    version: VERSION,
    documents: value.documents,
    folders: value.folders,
    recentFolders: value.recentFolders,
    folderCollections: [...value.folderCollections],
  }));
}

function key(accountId) {
  return `canvas.collections.v${VERSION}.${accountId}`;
}
