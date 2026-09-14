export function trashSummary({ query, matchingCount, totalCount }) {
  return {
    isFiltered: Boolean(String(query ?? "").trim()),
    matchingCount: Number(matchingCount ?? 0),
    totalCount: Number(totalCount ?? 0),
  };
}
