import assert from 'node:assert/strict';
import test from 'node:test';
import { initials, naviiAvatarUrl, profileLabel, shareAccessPeople } from './share-people.mjs';

test('share access lists only unique real owners, members, and invitations', () => {
  const owner = { id: 'owner-account', name: 'Owner' };
  const people = shareAccessPeople(owner, [
    { id: 'member-grant', accountId: 'member-account', email: 'member@example.test', status: 'active' },
    { id: 'invite-grant', accountId: null, email: 'invite@example.test', status: 'pending' },
    { id: 'duplicate-member', accountId: 'member-account', email: 'member@example.test', status: 'active' },
    { id: 'revoked-grant', accountId: 'revoked-account', email: 'revoked@example.test', status: 'revoked' },
    { id: 'current-grant', accountId: 'owner-account', email: 'owner@example.test', status: 'active', isCurrentUser: true },
  ]);

  assert.deepEqual(people.map((person) => person.id), ['owner-account', 'member-grant', 'invite-grant']);
});

test('Navii receives only an account ID seed and initials remain local', () => {
  const member = { id: 'grant-id-must-not-be-used', accountId: 'account / id', email: 'person@example.test', name: 'Private Name', status: 'active' };
  assert.equal(naviiAvatarUrl(member), 'https://api.navii.dev/avatar/account%20%2F%20id.png?size=96&background=none');
  assert.equal(naviiAvatarUrl({ id: 'pending-grant', email: 'invite@example.test', status: 'pending' }), null);
  assert.equal(naviiAvatarUrl({ id: 'owner-account', isOwner: true }), 'https://api.navii.dev/avatar/owner-account.png?size=96&background=none');
  assert.equal(profileLabel({ email: 'invite@example.test' }), 'invite@example.test');
  assert.equal(initials('invite@example.test'), 'I');
});
