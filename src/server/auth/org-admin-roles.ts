/**
 * Deliberately has no `"server-only"` import — this constant carries no DB
 * access, so client components can import it directly. Server code should
 * still prefer `get-org-membership.ts`'s re-export, which pairs it with the
 * actual DB-backed `getOrgMembership` lookup.
 */
export const ORG_ADMIN_ROLES = new Set(["owner", "admin"]);
