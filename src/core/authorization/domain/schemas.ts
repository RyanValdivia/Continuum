import { z } from "zod";

// ── Enums (mirror the Drizzle pg enums in authorization-schema.ts) ────────────
export const principalTypeSchema = z.enum(["person", "group", "ou"]);
export const aclResourceTypeSchema = z.enum([
    "knowledge_node",
    "source_document",
    "ou",
]);
export const permissionSchema = z.enum(["read", "write", "admin"]);
export const effectSchema = z.enum(["allow", "deny"]);
export const defaultAccessSchema = z.enum(["open", "closed"]);

// ── Wire shapes ─────────────────────────────────────────────────────────────
export const principalSchema = z.object({
    id: z.string(),
    organizationId: z.string(),
    type: principalTypeSchema,
    name: z.string(),
    description: z.string().nullable(),
    userId: z.string().nullable(),
    parentId: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

/**
 * Body for creating a `group` or `ou` principal. `person` principals are
 * never created through this endpoint — they're auto-provisioned when a
 * `member` row is created (see `provision-person-principal.ts`).
 */
export const createPrincipalSchema = z.object({
    type: z.enum(["group", "ou"]),
    name: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).optional(),
    parentId: z.string().trim().min(1).nullable().default(null),
});

/** Rename and/or move a principal to a different parent OU (or to the root). */
export const updatePrincipalSchema = z.object({
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    parentId: z.string().trim().min(1).nullable().optional(),
});

export const membershipSchema = z.object({
    id: z.string(),
    memberId: z.string(),
    groupId: z.string(),
    createdAt: z.string(),
});

/** Add or remove `memberId` (a `person` or `group` principal) from `groupId`. */
export const setMembershipSchema = z.object({
    memberId: z.string().trim().min(1),
    groupId: z.string().trim().min(1),
});

export const accessControlEntrySchema = z.object({
    id: z.string(),
    organizationId: z.string(),
    resourceType: aclResourceTypeSchema,
    resourceId: z.string(),
    principalId: z.string(),
    permission: permissionSchema,
    effect: effectSchema,
    inheritable: z.boolean(),
    createdBy: z.string().nullable(),
    createdAt: z.string(),
});

export const grantAccessSchema = z.object({
    resourceType: aclResourceTypeSchema,
    resourceId: z.string().trim().min(1),
    principalId: z.string().trim().min(1),
    permission: permissionSchema.default("read"),
    effect: effectSchema.default("allow"),
    inheritable: z.boolean().default(true),
});

/** The caller's resolved AD-style "access token": every principal id (self,
 *  OU ancestors, transitive group memberships) whose grants apply to them. */
export const accessTokenSchema = z.object({
    principalIds: z.array(z.string()),
});

export const organizationAccessPolicySchema = z.object({
    organizationId: z.string(),
    defaultAccess: defaultAccessSchema,
});

export const setOrgAccessPolicySchema = z.object({
    defaultAccess: defaultAccessSchema,
});
