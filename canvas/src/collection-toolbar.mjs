export const COLLECTION_SORT_OPTIONS = Object.freeze([
  { id: "updated", label: "Last edited" },
  { id: "name", label: "Name" },
  { id: "created", label: "Date created" },
]);

export function sortCollection(items, sort = "updated") {
  return [...items].sort((left, right) => {
    if (sort === "name") return itemName(left).localeCompare(itemName(right), undefined, { sensitivity: "base" });
    const field = sort === "created" ? "createdAt" : "updatedAt";
    const dateOrder = String(right[field] ?? right.updatedAt ?? "").localeCompare(String(left[field] ?? left.updatedAt ?? ""));
    return dateOrder || itemName(left).localeCompare(itemName(right), undefined, { sensitivity: "base" });
  });
}

function itemName(item) {
  return String(item.name ?? item.title ?? "");
}
