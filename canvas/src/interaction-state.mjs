export function pendingActionMatches(pending, key, subjectId = null) {
  if (!pending || pending.key !== key) return false;
  return (pending.subjectId ?? null) === (subjectId ?? null);
}

export function actionButtonState(pending, options) {
  const busy = pendingActionMatches(pending, options.key, options.subjectId);
  return {
    busy,
    disabled: busy,
    ariaBusy: busy ? "true" : null,
    label: busy ? options.pendingLabel : options.label,
    icon: busy ? "loader" : options.icon,
  };
}
