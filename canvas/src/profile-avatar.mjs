export function naviiAvatarUrl(person) {
  const accountId = avatarAccountId(person);
  return accountId ? `https://api.navii.dev/avatar/${encodeURIComponent(accountId)}.png?size=96&background=none` : null;
}

export function profileLabel(person) {
  return person?.isCurrentUser ? "You" : person?.name?.trim() || person?.email || "Collaborator";
}

export function initials(value) {
  return String(value).split(/\s+/u).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "?";
}

function avatarAccountId(person) {
  const accountId = String(person?.accountId ?? "").trim();
  if (accountId) return accountId;
  return person?.isOwner || person?.isCurrentUser ? String(person.id ?? "").trim() || null : null;
}
