export function shareAccessPeople(owner, grants = []) {
  const people = [];
  const seen = new Set();
  for (const person of [owner ? { ...owner, isOwner: true, isCurrentUser: true } : null, ...grants]) {
    if (!person) continue;
    if (!person.isOwner && (!['active', 'pending'].includes(person.status) || person.isCurrentUser)) continue;
    const key = sharePersonKey(person);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    people.push(person);
  }
  return people;
}

export function naviiAvatarUrl(person) {
  const accountId = avatarAccountId(person);
  return accountId ? `https://api.navii.dev/avatar/${encodeURIComponent(accountId)}.png?size=96&background=none` : null;
}

export function avatarAccountId(person) {
  const accountId = String(person?.accountId ?? '').trim();
  if (accountId) return accountId;
  return person?.isOwner ? String(person.id ?? '').trim() || null : null;
}

export function profileLabel(person) {
  return person?.isCurrentUser ? 'You' : person?.name?.trim() || person?.email || 'Collaborator';
}

export function initials(value) {
  return String(value).split(/\s+/u).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?';
}

function sharePersonKey(person) {
  return person.accountId ?? person.email ?? (person.isOwner ? person.id : `grant:${person.id}`);
}
