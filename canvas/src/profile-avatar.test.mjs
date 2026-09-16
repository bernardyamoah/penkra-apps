import assert from "node:assert/strict";
import test from "node:test";
import { initials, naviiAvatarUrl, profileLabel } from "./profile-avatar.mjs";

test("Navii avatar URLs use only the non-PII account ID seed", () => {
  const person = { id: "grant-id", accountId: "account / id", email: "person@example.test", name: "Private Name" };
  assert.equal(naviiAvatarUrl(person), "https://api.navii.dev/avatar/account%20%2F%20id.png?size=96&background=none");
  assert.equal(naviiAvatarUrl({ id: "pending-grant", email: "person@example.test" }), null);
  assert.equal(initials("Private Name"), "PN");
  assert.equal(profileLabel({ email: "person@example.test" }), "person@example.test");
});
